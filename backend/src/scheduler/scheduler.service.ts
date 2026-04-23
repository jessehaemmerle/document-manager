import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly reviewsService: ReviewsService, private readonly config: ConfigService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    if (this.config.get<string>('SCHEDULER_ENABLED', 'true') !== 'true') return;
    const cycles = await this.reviewsService.createDueCycles();
    await this.reviewsService.processRemindersAndEscalations();
    if (cycles.length) this.logger.log(`${cycles.length} neue Pruefzyklen erzeugt.`);
  }
}
