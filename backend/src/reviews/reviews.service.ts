import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditEntityType,
  NotificationType,
  ReviewActionType,
  ReviewAssignmentStatus,
  ReviewCycleStatus,
  RoleCode,
} from '../common/enums/app.enums';
import { AuthUser } from '../common/types/auth-user.type';
import { Document } from '../documents/document.entity';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReviewActionDto } from './dto/review-action.dto';
import { ReviewAction } from './review-action.entity';
import { ReviewAssignment } from './review-assignment.entity';
import { ReviewCycle } from './review-cycle.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Document) private readonly documentRepo: Repository<Document>,
    @InjectRepository(ReviewCycle) private readonly cycleRepo: Repository<ReviewCycle>,
    @InjectRepository(ReviewAssignment) private readonly assignmentRepo: Repository<ReviewAssignment>,
    @InjectRepository(ReviewAction) private readonly actionRepo: Repository<ReviewAction>,
    @InjectRepository(Comment) private readonly commentRepo: Repository<Comment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly documentsService: DocumentsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async myAssignments(currentUser: AuthUser, query: AssignmentQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await this.assignmentRepo.findAndCount({
      where: {
        user: { id: currentUser.id },
        ...(query.status ? { status: query.status } : {}),
      },
      order: { assignedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async allAssignments(currentUser: AuthUser, query: AssignmentQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.assignmentRepo.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('assignment.cycle', 'cycle')
      .leftJoinAndSelect('cycle.document', 'document')
      .leftJoinAndSelect('document.department', 'department')
      .orderBy('assignment.assignedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (currentUser.roleCode !== RoleCode.ADMIN) qb.andWhere('department.id = :departmentId', { departmentId: currentUser.departmentId });
    if (query.status) qb.andWhere('assignment.status = :status', { status: query.status });
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async submitAction(id: string, dto: ReviewActionDto, currentUser: AuthUser) {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Pruefaufgabe nicht gefunden.');
    const document = assignment.cycle.document;
    this.ensureAssignmentAccess(assignment, currentUser);
    if (document.commentRequiredOnRevision && dto.status === ReviewAssignmentStatus.REVISION_REQUIRED && !dto.comment) {
      throw new BadRequestException('Bei "ueberarbeitet noetig" ist ein Kommentar erforderlich.');
    }

    const previousStatus = assignment.status;
    assignment.status = dto.status;
    assignment.completedAt = new Date();
    if (dto.status === ReviewAssignmentStatus.ESCALATED) assignment.escalatedAt = new Date();
    const saved = await this.assignmentRepo.save(assignment);

    const actor = await this.userRepo.findOne({ where: { id: currentUser.id } });
    if (!actor) throw new NotFoundException('Benutzer nicht gefunden.');
    const action = await this.actionRepo.save(
      this.actionRepo.create({
        document,
        cycle: assignment.cycle,
        assignment,
        user: actor,
        actionType: this.mapStatusToAction(dto.status),
        comment: dto.comment ?? null,
      }),
    );

    if (dto.comment) {
      await this.commentRepo.save(this.commentRepo.create({ document, cycle: assignment.cycle, assignment, user: actor, content: dto.comment }));
    }

    document.currentStatus = dto.status;
    await this.documentRepo.save(document);
    await this.auditService.record({
      userId: currentUser.id,
      actionType: 'review.status_changed',
      entityType: AuditEntityType.REVIEW_ASSIGNMENT,
      entityId: saved.id,
      beforeJson: { status: previousStatus },
      afterJson: { status: saved.status, comment: dto.comment ?? null },
    });

    await this.advanceWorkflow(assignment);
    return { assignment: saved, action };
  }

  async createComment(dto: CreateCommentDto, currentUser: AuthUser) {
    const document = await this.documentRepo.findOne({ where: { id: dto.documentId } });
    if (!document) throw new NotFoundException('Dokument nicht gefunden.');
    if (currentUser.roleCode !== RoleCode.ADMIN && document.department.id !== currentUser.departmentId) {
      throw new ForbiddenException('Kein Zugriff auf dieses Dokument.');
    }
    const user = await this.userRepo.findOne({ where: { id: currentUser.id } });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden.');
    const cycle = dto.cycleId ? await this.cycleRepo.findOne({ where: { id: dto.cycleId } }) : null;
    const assignment = dto.assignmentId ? await this.assignmentRepo.findOne({ where: { id: dto.assignmentId } }) : null;
    const comment = await this.commentRepo.save(this.commentRepo.create({ document, cycle, assignment, user, content: dto.content }));
    await this.auditService.record({
      userId: currentUser.id,
      actionType: 'comment.created',
      entityType: AuditEntityType.COMMENT,
      entityId: comment.id,
      afterJson: { documentId: document.id, content: dto.content },
    });
    return comment;
  }

  async createDueCycles(now = new Date()) {
    const documents = await this.documentRepo.find({
      where: { active: true, nextReviewAt: LessThanOrEqual(now) },
    });

    const created: ReviewCycle[] = [];
    for (const document of documents) {
      const openCycle = await this.cycleRepo.findOne({
        where: { document: { id: document.id }, status: In([ReviewCycleStatus.OPEN, ReviewCycleStatus.IN_REVIEW]) },
      });
      if (openCycle) continue;

      const cycle = await this.cycleRepo.save(this.cycleRepo.create({ document, dueAt: now, status: ReviewCycleStatus.OPEN }));
      await this.createStageAssignments(cycle, document, 1);
      document.nextReviewAt = this.documentsService.calculateNextReview(now, document.reviewIntervalType, document.reviewIntervalDays);
      document.currentStatus = ReviewAssignmentStatus.OPEN;
      await this.documentRepo.save(document);
      await this.auditService.record({
        actionType: 'review_cycle.created',
        entityType: AuditEntityType.REVIEW_CYCLE,
        entityId: cycle.id,
        afterJson: { documentId: document.id, dueAt: cycle.dueAt },
      });
      created.push(cycle);
    }
    return created;
  }

  async processRemindersAndEscalations(now = new Date()) {
    const openStatuses = [ReviewAssignmentStatus.OPEN, ReviewAssignmentStatus.IN_REVIEW];
    const assignments = await this.assignmentRepo.find({ where: { status: In(openStatuses) } });
    for (const assignment of assignments) {
      const document = assignment.cycle.document;
      const assignedAtMs = assignment.assignedAt.getTime();
      const ageHours = (now.getTime() - assignedAtMs) / 36e5;
      if (!assignment.remindedAt && ageHours >= document.reminderAfterHours) {
        assignment.remindedAt = now;
        await this.assignmentRepo.save(assignment);
        await this.notificationsService.notify({
          user: assignment.user,
          type: NotificationType.REMINDER,
          title: 'Erinnerung: Dokument pruefen',
          message: `Bitte pruefen Sie "${document.title}".`,
          entityType: 'document',
          entityId: document.id,
          email: true,
        });
        await this.auditService.record({
          actionType: 'review.reminder_sent',
          entityType: AuditEntityType.REVIEW_ASSIGNMENT,
          entityId: assignment.id,
        });
      }
      if (!assignment.escalatedAt && ageHours >= document.escalationAfterHours) {
        assignment.escalatedAt = now;
        assignment.status = ReviewAssignmentStatus.OVERDUE;
        await this.assignmentRepo.save(assignment);
        await this.escalateToManagers(document, assignment);
      }
    }
  }

  private async advanceWorkflow(assignment: ReviewAssignment) {
    const document = assignment.cycle.document;
    if ([ReviewAssignmentStatus.REVISION_REQUIRED, ReviewAssignmentStatus.ESCALATED].includes(assignment.status as ReviewAssignmentStatus)) {
      assignment.cycle.status = ReviewCycleStatus.COMPLETED;
      assignment.cycle.completedAt = new Date();
      await this.cycleRepo.save(assignment.cycle);
      return;
    }

    const currentStageAssignments = await this.assignmentRepo.find({
      where: { cycle: { id: assignment.cycle.id }, stageNumber: assignment.stageNumber },
    });
    const stageDone = currentStageAssignments.every((item) =>
      [ReviewAssignmentStatus.READ, ReviewAssignmentStatus.APPROVED, ReviewAssignmentStatus.COMPLETED].includes(item.status as ReviewAssignmentStatus),
    );
    if (!stageDone) return;

    const nextStage = document.approvalStages?.find((stage) => stage.stageNumber === assignment.stageNumber + 1);
    if (document.multiStageApprovalEnabled && nextStage) {
      await this.createStageAssignments(assignment.cycle, document, nextStage.stageNumber);
      assignment.cycle.status = ReviewCycleStatus.IN_REVIEW;
      await this.cycleRepo.save(assignment.cycle);
      return;
    }

    assignment.cycle.status = ReviewCycleStatus.COMPLETED;
    assignment.cycle.completedAt = new Date();
    await this.cycleRepo.save(assignment.cycle);
  }

  private async createStageAssignments(cycle: ReviewCycle, document: Document, stageNumber: number) {
    let recipients: User[] = [];
    if (stageNumber === 1 && document.responsibleUser) {
      recipients = [document.responsibleUser];
    } else {
      const stage = document.approvalStages?.find((item) => item.stageNumber === stageNumber);
      const roleCode = (stage?.roleCode as RoleCode) ?? RoleCode.EMPLOYEE;
      recipients = await this.usersService.activeUsersForDepartment(document.department.id, roleCode);
      if (!recipients.length && roleCode === RoleCode.EMPLOYEE) {
        recipients = await this.usersService.activeUsersForDepartment(document.department.id);
      }
    }

    for (const user of recipients) {
      const assignment = await this.assignmentRepo.save(this.assignmentRepo.create({ cycle, user, stageNumber, status: ReviewAssignmentStatus.OPEN }));
      await this.notificationsService.notify({
        user,
        type: stageNumber > 1 ? NotificationType.NEXT_STAGE : NotificationType.REVIEW_DUE,
        title: stageNumber > 1 ? 'Freigabe wartet' : 'Neues Dokument zur Pruefung',
        message: `Das Dokument "${document.title}" wartet auf Ihre Bearbeitung.`,
        entityType: 'document',
        entityId: document.id,
        email: true,
      });
      await this.actionRepo.save(
        this.actionRepo.create({ document, cycle, assignment, user, actionType: ReviewActionType.CREATED, comment: null }),
      );
    }
  }

  private async escalateToManagers(document: Document, assignment: ReviewAssignment) {
    const managers = await this.usersService.activeUsersForDepartment(document.department.id, RoleCode.MANAGER);
    for (const manager of managers) {
      await this.notificationsService.notify({
        user: manager,
        type: NotificationType.ESCALATION,
        title: 'Pruefung ueberfaellig',
        message: `${assignment.user.firstName} ${assignment.user.lastName} hat "${document.title}" noch nicht bearbeitet.`,
        entityType: 'document',
        entityId: document.id,
        email: true,
      });
    }
    await this.auditService.record({
      actionType: 'review.escalated',
      entityType: AuditEntityType.REVIEW_ASSIGNMENT,
      entityId: assignment.id,
      afterJson: { documentId: document.id, userId: assignment.user.id },
    });
  }

  private ensureAssignmentAccess(assignment: ReviewAssignment, currentUser: AuthUser) {
    if (assignment.user.id === currentUser.id || currentUser.roleCode === RoleCode.ADMIN) return;
    if (currentUser.roleCode === RoleCode.MANAGER && assignment.cycle.document.department.id === currentUser.departmentId) return;
    throw new ForbiddenException('Kein Zugriff auf diese Pruefaufgabe.');
  }

  private mapStatusToAction(status: string) {
    if (status === ReviewAssignmentStatus.READ) return ReviewActionType.READ;
    if (status === ReviewAssignmentStatus.REVISION_REQUIRED) return ReviewActionType.REVISION_REQUIRED;
    if (status === ReviewAssignmentStatus.APPROVED) return ReviewActionType.APPROVED;
    if (status === ReviewAssignmentStatus.ESCALATED) return ReviewActionType.ESCALATED;
    return ReviewActionType.COMMENTED;
  }
}
