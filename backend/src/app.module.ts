import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { DocumentsModule } from './documents/documents.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { MailModule } from './mail/mail.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportsModule } from './exports/exports.module';
import { DatabaseModule } from './database/database.module';
import { Role } from './users/role.entity';
import { User } from './users/user.entity';
import { Department } from './departments/department.entity';
import { DocumentType } from './document-types/document-type.entity';
import { Document } from './documents/document.entity';
import { ReviewCycle } from './reviews/review-cycle.entity';
import { ReviewAssignment } from './reviews/review-assignment.entity';
import { ReviewAction } from './reviews/review-action.entity';
import { Comment } from './reviews/comment.entity';
import { Notification } from './notifications/notification.entity';
import { AuditLog } from './audit/audit-log.entity';
import { SystemSetting } from './settings/system-setting.entity';
import { EmailTemplate } from './settings/email-template.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST', 'db'),
        port: configService.get<number>('POSTGRES_PORT', 5432),
        username: configService.get<string>('POSTGRES_USER', 'postgres'),
        password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
        database: configService.get<string>('POSTGRES_DB', 'document_manager'),
        synchronize: configService.get<string>('DB_SYNC', 'true') === 'true',
        logging: false,
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
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    DocumentTypesModule,
    DocumentsModule,
    ReviewsModule,
    NotificationsModule,
    AuditModule,
    SettingsModule,
    MailModule,
    SchedulerModule,
    DashboardModule,
    ExportsModule,
  ],
})
export class AppModule {}
