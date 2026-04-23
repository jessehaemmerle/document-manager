import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLog } from '../audit/audit-log.entity';
import { Department } from '../departments/department.entity';
import { DocumentType } from '../document-types/document-type.entity';
import { Document } from '../documents/document.entity';
import { Notification } from '../notifications/notification.entity';
import { Comment } from '../reviews/comment.entity';
import { ReviewAction } from '../reviews/review-action.entity';
import { ReviewAssignment } from '../reviews/review-assignment.entity';
import { ReviewCycle } from '../reviews/review-cycle.entity';
import { EmailTemplate } from '../settings/email-template.entity';
import { SystemSetting } from '../settings/system-setting.entity';
import { Role } from '../users/role.entity';
import { User } from '../users/user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'document_manager',
  synchronize: process.env.DB_SYNC === 'true',
  entities: [
    Role,
    User,
    Department,
    DocumentType,
    Document,
    ReviewCycle,
    ReviewAssignment,
    ReviewAction,
    Comment,
    Notification,
    AuditLog,
    SystemSetting,
    EmailTemplate,
  ],
  migrations: ['dist/database/migrations/*.js'],
});
