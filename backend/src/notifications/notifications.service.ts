import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType, NotificationType } from '../common/enums/app.enums';
import { MailService } from '../mail/mail.service';
import { User } from '../users/user.entity';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { Notification } from './notification.entity';

interface NotifyInput {
  user: User;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  email?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  async notify(input: NotifyInput) {
    const notification = await this.notificationRepo.save(
      this.notificationRepo.create({
        user: input.user,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      }),
    );
    if (input.email) {
      await this.mailService.sendMail(input.user.email, input.title, input.message);
    }
    await this.auditService.record({
      userId: input.user.id,
      actionType: input.type,
      entityType: AuditEntityType.NOTIFICATION,
      entityId: notification.id,
      afterJson: { title: input.title, entityType: input.entityType, entityId: input.entityId },
    });
    return notification;
  }

  async findForUser(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await this.notificationRepo.findAndCount({
      where: {
        user: { id: userId },
        ...(query.read !== undefined ? { read: query.read === 'true' } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.notificationRepo.findOne({ where: { id, user: { id: userId } } });
    if (!notification) throw new NotFoundException('Benachrichtigung nicht gefunden.');
    notification.read = true;
    return this.notificationRepo.save(notification);
  }

  async markAllRead(userId: string) {
    await this.notificationRepo.update({ user: { id: userId } }, { read: true });
    return this.findForUser(userId, { page: 1, pageSize: 20 });
  }

  async findUser(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }
}
