import { Module } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { GovernanceController } from './governance.controller';
import { GovernanceResolver } from './governance.resolver';
import { TtcService } from './ttc.service';

@Module({
  controllers: [GovernanceController],
  providers: [GovernanceService, GovernanceResolver, TtcService],
  exports: [GovernanceService, TtcService],
})
export class GovernanceModule {}
