import { Query, Resolver } from '@nestjs/graphql';
import { GovernanceService } from './governance.service';
import { ModelGovernanceType } from './governance.dto';

@Resolver(() => ModelGovernanceType)
export class GovernanceResolver {
  constructor(private readonly governanceService: GovernanceService) {}

  @Query(() => ModelGovernanceType, {
    name: 'modelGovernance',
    description: 'Model governance showcase metadata for v1 (withheld) and v2 (active TTC regression)',
  })
  async modelGovernance(): Promise<ModelGovernanceType> {
    return this.governanceService.getGovernanceMetadata();
  }
}
