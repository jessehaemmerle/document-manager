import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType, ReviewAssignmentStatus, ReviewIntervalType, RoleCode } from '../common/enums/app.enums';
import { AuthUser } from '../common/types/auth-user.type';
import { Department } from '../departments/department.entity';
import { DocumentType } from '../document-types/document-type.entity';
import { Comment } from '../reviews/comment.entity';
import { ReviewAction } from '../reviews/review-action.entity';
import { ReviewAssignment } from '../reviews/review-assignment.entity';
import { ReviewCycle } from '../reviews/review-cycle.entity';
import { User } from '../users/user.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DeactivateDocumentDto } from './dto/deactivate-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentType) private readonly typeRepo: Repository<DocumentType>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ReviewCycle) private readonly cycleRepo: Repository<ReviewCycle>,
    @InjectRepository(ReviewAssignment) private readonly assignmentRepo: Repository<ReviewAssignment>,
    @InjectRepository(ReviewAction) private readonly actionRepo: Repository<ReviewAction>,
    @InjectRepository(Comment) private readonly commentRepo: Repository<Comment>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: DocumentQueryDto, currentUser: AuthUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.documentRepo.createQueryBuilder('document')
      .leftJoinAndSelect('document.documentType', 'documentType')
      .leftJoinAndSelect('document.department', 'department')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.responsibleUser', 'responsibleUser')
      .leftJoin('comments', 'comment', 'comment.document_id = document.id');

    if (currentUser.roleCode !== RoleCode.ADMIN) {
      qb.andWhere('department.id = :ownDepartmentId', { ownDepartmentId: currentUser.departmentId });
    }
    if (query.departmentId) qb.andWhere('department.id = :departmentId', { departmentId: query.departmentId });
    if (query.documentTypeId) qb.andWhere('documentType.id = :documentTypeId', { documentTypeId: query.documentTypeId });
    if (query.responsibleUserId) qb.andWhere('responsibleUser.id = :responsibleUserId', { responsibleUserId: query.responsibleUserId });
    if (query.createdById) qb.andWhere('createdBy.id = :createdById', { createdById: query.createdById });
    if (query.status) qb.andWhere('document.currentStatus = :status', { status: query.status });
    if (query.active !== undefined) qb.andWhere('document.active = :active', { active: query.active === 'true' });
    if (query.dueFrom) qb.andWhere('document.nextReviewAt >= :dueFrom', { dueFrom: query.dueFrom });
    if (query.dueTo) qb.andWhere('document.nextReviewAt <= :dueTo', { dueTo: query.dueTo });
    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('document.title ILIKE :search')
            .orWhere('document.description ILIKE :search')
            .orWhere('document.linkUrl ILIKE :search')
            .orWhere('comment.content ILIKE :search');
        }),
      ).setParameter('search', `%${query.search}%`);
    }

    const [items, total] = await qb
      .distinct(true)
      .orderBy('document.nextReviewAt', 'ASC', 'NULLS LAST')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total, page, pageSize };
  }

  async findOne(id: string, currentUser: AuthUser) {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) throw new NotFoundException('Dokument nicht gefunden.');
    this.ensureDepartmentAccess(document, currentUser);

    const [cycles, comments, actions] = await Promise.all([
      this.cycleRepo.find({ where: { document: { id } }, relations: { assignments: true }, order: { startedAt: 'DESC' } }),
      this.commentRepo.find({ where: { document: { id } }, order: { createdAt: 'DESC' } }),
      this.actionRepo.find({ where: { document: { id } }, order: { timestamp: 'DESC' } }),
    ]);

    return { ...document, cycles, comments, actions };
  }

  async create(dto: CreateDocumentDto, currentUser: AuthUser) {
    if (currentUser.roleCode !== RoleCode.ADMIN && dto.departmentId !== currentUser.departmentId) {
      throw new ForbiddenException('Dokumente duerfen nur in der eigenen Abteilung angelegt werden.');
    }
    const document = await this.buildDocument(dto, currentUser);
    const saved = await this.documentRepo.save(document);
    await this.auditService.record({
      userId: currentUser.id,
      actionType: 'document.created',
      entityType: AuditEntityType.DOCUMENT,
      entityId: saved.id,
      afterJson: this.serializeDocument(saved),
    });
    return saved;
  }

  async update(id: string, dto: UpdateDocumentDto, currentUser: AuthUser) {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) throw new NotFoundException('Dokument nicht gefunden.');
    this.ensureCanManage(document, currentUser);
    if (dto.active === false && !dto.removalComment) {
      throw new BadRequestException('Beim Deaktivieren ist ein Kommentar Pflicht.');
    }
    const before = this.serializeDocument(document);
    await this.applyDocumentUpdates(document, dto);
    const saved = await this.documentRepo.save(document);
    await this.auditService.record({
      userId: currentUser.id,
      actionType: 'document.updated',
      entityType: AuditEntityType.DOCUMENT,
      entityId: saved.id,
      beforeJson: before,
      afterJson: this.serializeDocument(saved),
      comment: dto.removalComment ?? null,
    });
    return saved;
  }

  async deactivate(id: string, dto: DeactivateDocumentDto, currentUser: AuthUser) {
    return this.update(id, { active: false, removalComment: dto.comment }, currentUser);
  }

  calculateNextReview(currentDate: Date, intervalType: string, intervalDays?: number | null) {
    const next = new Date(currentDate);
    switch (intervalType) {
      case ReviewIntervalType.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case ReviewIntervalType.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case ReviewIntervalType.HALF_YEARLY:
        next.setMonth(next.getMonth() + 6);
        break;
      case ReviewIntervalType.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
      case ReviewIntervalType.CUSTOM_DAYS:
        next.setDate(next.getDate() + (intervalDays ?? 30));
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  private async buildDocument(dto: CreateDocumentDto, currentUser: AuthUser) {
    const document = this.documentRepo.create();
    const creator = await this.userRepo.findOne({ where: { id: currentUser.id } });
    if (!creator) throw new NotFoundException('Ersteller nicht gefunden.');
    document.createdBy = creator;
    await this.applyDocumentUpdates(document, dto);
    document.currentStatus = ReviewAssignmentStatus.OPEN;
    document.active = true;
    return document;
  }

  private async applyDocumentUpdates(document: Document, dto: Partial<CreateDocumentDto & UpdateDocumentDto>) {
    if (dto.documentTypeId) {
      const type = await this.typeRepo.findOne({ where: { id: dto.documentTypeId } });
      if (!type) throw new NotFoundException('Dokumenttyp nicht gefunden.');
      document.documentType = type;
    }
    if (dto.departmentId) {
      const department = await this.departmentRepo.findOne({ where: { id: dto.departmentId } });
      if (!department) throw new NotFoundException('Abteilung nicht gefunden.');
      document.department = department;
    }
    if (dto.responsibleUserId !== undefined) {
      document.responsibleUser = dto.responsibleUserId
        ? await this.userRepo.findOne({ where: { id: dto.responsibleUserId } })
        : null;
      if (dto.responsibleUserId && !document.responsibleUser) throw new NotFoundException('Verantwortliche Person nicht gefunden.');
    }
    if (dto.title !== undefined) document.title = dto.title;
    if (dto.description !== undefined) document.description = dto.description;
    if (dto.linkUrl !== undefined) document.linkUrl = dto.linkUrl;
    if (dto.sourceType !== undefined) document.sourceType = dto.sourceType;
    if (dto.reviewIntervalType !== undefined) document.reviewIntervalType = dto.reviewIntervalType;
    if (dto.reviewIntervalDays !== undefined) document.reviewIntervalDays = dto.reviewIntervalDays;
    if (dto.nextReviewAt !== undefined) document.nextReviewAt = new Date(dto.nextReviewAt);
    if (dto.multiStageApprovalEnabled !== undefined) {
      document.multiStageApprovalEnabled = dto.multiStageApprovalEnabled;
      document.approvalStages = dto.multiStageApprovalEnabled
        ? [
            { stageNumber: 1, roleCode: RoleCode.EMPLOYEE, label: 'Mitarbeitende Sichtung' },
            { stageNumber: 2, roleCode: RoleCode.MANAGER, label: 'Fuehrungskraft Freigabe' },
          ]
        : [{ stageNumber: 1, roleCode: RoleCode.EMPLOYEE, label: 'Sichtung' }];
    }
    if (dto.commentRequiredOnRevision !== undefined) document.commentRequiredOnRevision = dto.commentRequiredOnRevision;
    if (dto.reminderAfterHours !== undefined) document.reminderAfterHours = dto.reminderAfterHours;
    if (dto.escalationAfterHours !== undefined) document.escalationAfterHours = dto.escalationAfterHours;
    if (dto.active !== undefined) document.active = dto.active;
    if (dto.removalComment !== undefined) document.removalComment = dto.removalComment;
  }

  private ensureDepartmentAccess(document: Document, currentUser: AuthUser) {
    if (currentUser.roleCode === RoleCode.ADMIN) return;
    if (document.department.id !== currentUser.departmentId) throw new NotFoundException('Dokument nicht gefunden.');
  }

  private ensureCanManage(document: Document, currentUser: AuthUser) {
    if (currentUser.roleCode === RoleCode.ADMIN) return;
    if (currentUser.roleCode === RoleCode.MANAGER && document.department.id === currentUser.departmentId) return;
    throw new ForbiddenException('Dokument darf nicht verwaltet werden.');
  }

  private serializeDocument(document: Document) {
    return {
      id: document.id,
      title: document.title,
      active: document.active,
      departmentId: document.department?.id,
      documentTypeId: document.documentType?.id,
      nextReviewAt: document.nextReviewAt,
      currentStatus: document.currentStatus,
    };
  }
}
