import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { HotspotsService } from './hotspots.service';
import { DispatchAlertResultType, HotspotClusterType, HotspotQueryDto } from './hotspots.dto';

@ApiTags('hotspots')
@Controller('hotspots')
export class HotspotsController {
  constructor(private readonly hotspotsService: HotspotsService) {}

  @Get()
  @ApiOperation({
    summary: 'Detect spatial complaint anomaly hotspots using PostGIS ST_ClusterDBSCAN',
    description: 'Clusters 311 incident reports within 200m (eps=656.168ft) with minimum 15 points in SRID 2263.',
  })
  @ApiOkResponse({
    description: 'Active spatial clusters with centroid, bounding hull, severity tier, and triage hypothesis',
    type: [HotspotClusterType],
  })
  async listHotspots(@Query() query: HotspotQueryDto): Promise<HotspotClusterType[]> {
    return this.hotspotsService.getHotspots(query);
  }

  @Post(':clusterId/dispatch-alert')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Dispatch production-grade Slack/PagerDuty webhook alert for a detected hotspot',
    description: 'Constructs verified payload, records dispatch audit event, and delivers to ALERT_WEBHOOK_URL (or dry-run simulated receipt).',
  })
  @ApiParam({ name: 'clusterId', description: 'Target cluster identifier' })
  @ApiOkResponse({
    description: 'Dispatch audit receipt and payload preview',
    type: DispatchAlertResultType,
  })
  async dispatchAlert(@Param('clusterId') clusterId: string): Promise<DispatchAlertResultType> {
    return this.hotspotsService.dispatchAlert(clusterId);
  }
}
