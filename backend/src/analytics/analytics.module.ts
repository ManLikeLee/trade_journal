import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AnalyticsService, InsightsService],
  controllers: [AnalyticsController, InsightsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
