import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { RoleCode } from '../common/enums/app.enums';
import { AuthUser } from '../common/types/auth-user.type';
import { Document } from '../documents/document.entity';
import { Notification } from '../notifications/notification.entity';
import { ReviewAssignment } from '../reviews/review-assignment.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Document) private readonly documentRepo: Repository<Document>,
    @InjectRepository(ReviewAssignment) private readonly assignmentRepo: Repository<ReviewAssignment>,
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
  ) {}

  async summary(user: AuthUser) {
    const now = new Date();
    const documentWhere = user.roleCode === RoleCode.ADMIN ? {} : { department: { id: user.departmentId ?? '' } };
    const assignments = await this.assignmentRepo.find({
      where: user.roleCode === RoleCode.EMPLOYEE ? { user: { id: user.id } } : {},
    });
    const filteredAssignments =
      user.roleCode === RoleCode.ADMIN
        ? assignments
        : assignments.filter((a) => a.cycle.document.department.id === user.departmentId || a.user.id === user.id);

    const [activeDocuments, inactiveDocuments, overdueDocuments, unreadNotifications] = await Promise.all([
      this.documentRepo.count({ where: { ...documentWhere, active: true } }),
      this.documentRepo.count({ where: { ...documentWhere, active: false } }),
      this.documentRepo.count({ where: { ...documentWhere, active: true, nextReviewAt: LessThan(now) } }),
      this.notificationRepo.count({ where: { user: { id: user.id }, read: false } }),
    ]);

    return {
      activeDocuments,
      inactiveDocuments,
      overdueDocuments,
      openAssignments: filteredAssignments.filter((a) => ['offen', 'in_pruefung'].includes(a.status)).length,
      escalatedAssignments: filteredAssignments.filter((a) => ['eskaliert', 'ueberfaellig'].includes(a.status)).length,
      completedAssignments: filteredAssignments.filter((a) => ['freigegeben', 'gelesen', 'abgeschlossen'].includes(a.status)).length,
      unreadNotifications,
      recentAssignments: filteredAssignments.slice(0, 6),
    };
  }
}
