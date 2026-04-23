import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReviewsModule } from '../reviews/reviews.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ConfigModule, ReviewsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
