import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Department } from '../departments/department.entity';
import { DocumentType } from '../document-types/document-type.entity';
import { Comment } from '../reviews/comment.entity';
import { ReviewAction } from '../reviews/review-action.entity';
import { ReviewAssignment } from '../reviews/review-assignment.entity';
import { ReviewCycle } from '../reviews/review-cycle.entity';
import { User } from '../users/user.entity';
import { Document } from './document.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentType, Department, User, ReviewCycle, ReviewAssignment, ReviewAction, Comment]),
    AuditModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService, TypeOrmModule],
})
export class DocumentsModule {}
