import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsResolver } from './analytics.resolver';

import { HotspotsModule } from '../hotspots/hotspots.module';

@Module({
  imports: [HotspotsModule],
  providers: [MetricsService, AnalyticsResolver],
  controllers: [AnalyticsController],
  exports: [MetricsService],
})
export class AnalyticsModule {}
