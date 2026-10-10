import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalysisQueryDto } from './filters';
import { MetricsService } from './metrics.service';

@ApiTags('analytics')
@Controller()
export class AnalyticsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Overview metrics for a creation-date cohort' })
  @ApiOkResponse({ description: 'Counts, equal-length prior comparison, closure metrics, and refresh time' })
  overview(@Query() filters: AnalysisQueryDto) { return this.metrics.getOverview(filters); }

  @Get('trends')
  @ApiOperation({ summary: 'Daily or weekly intake trend' })
  trends(@Query() filters: AnalysisQueryDto) {
    return this.metrics.getTrend(filters, filters.grouping);
  }

  @Get('problems')
  problems(@Query() filters: AnalysisQueryDto) { return this.metrics.getProblems(filters); }

  @Get('areas')
  areas(@Query() filters: AnalysisQueryDto) { return this.metrics.getAreas(filters); }

  @Get('resolution')
  resolution(@Query() filters: AnalysisQueryDto) { return this.metrics.getResolution(filters); }
}
