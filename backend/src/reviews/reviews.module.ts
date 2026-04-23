import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Document } from '../documents/document.entity';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';
import { ReviewAction } from './review-action.entity';
import { ReviewAssignment } from './review-assignment.entity';
import { ReviewCycle } from './review-cycle.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, ReviewCycle, ReviewAssignment, ReviewAction, Comment, User]),
    UsersModule,
    DocumentsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService, TypeOrmModule],
})
export class ReviewsModule {}
