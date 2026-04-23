import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/document.entity';
import { Notification } from '../notifications/notification.entity';
import { ReviewAssignment } from '../reviews/review-assignment.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, ReviewAssignment, Notification])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
