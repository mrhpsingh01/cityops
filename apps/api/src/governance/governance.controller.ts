import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';
import { ModelGovernanceType } from './governance.dto';

@ApiTags('governance')
@Controller('models/governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get()
  @ApiOperation({
    summary: 'Model Governance Showcase: v1 Gate Failure & v2 Time-to-Close Production Artifact',
    description:
      'Exposes audit status, holdout evaluation metrics, and feature importances for both Model v1 (7-day unresolved risk, withheld) and Model v2 (Time-to-Close regression, active).',
  })
  @ApiOkResponse({
    description: 'Structured model governance metadata and benchmarks',
    type: ModelGovernanceType,
  })
  async getGovernance(): Promise<ModelGovernanceType> {
    return this.governanceService.getGovernanceMetadata();
  }
}
