import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { HotspotsService } from './hotspots.service';
import { DispatchAlertResultType, HotspotClusterType, HotspotFilterInput } from './hotspots.dto';

@Resolver(() => HotspotClusterType)
export class HotspotsResolver {
  constructor(private readonly hotspotsService: HotspotsService) {}

  @Query(() => [HotspotClusterType], {
    name: 'hotspots',
    description: 'PostGIS ST_ClusterDBSCAN detected spatial anomaly clusters',
  })
  async hotspots(
    @Args('filters', { type: () => HotspotFilterInput, nullable: true })
    filters?: HotspotFilterInput,
  ): Promise<HotspotClusterType[]> {
    return this.hotspotsService.getHotspots(filters);
  }

  @Mutation(() => DispatchAlertResultType, {
    name: 'dispatchHotspotAlert',
    description: 'Dispatch outage triage alert to configured webhook with audit logging',
  })
  async dispatchHotspotAlert(
    @Args('clusterId', { type: () => String }) clusterId: string,
  ): Promise<DispatchAlertResultType> {
    return this.hotspotsService.dispatchAlert(clusterId);
  }
}
