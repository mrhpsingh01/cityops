import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GovernanceModule } from '../governance/governance.module';
import { HotspotsService } from './hotspots.service';
import { HotspotsController } from './hotspots.controller';
import { HotspotsResolver } from './hotspots.resolver';

@Module({
  imports: [DatabaseModule, GovernanceModule],
  controllers: [HotspotsController],
  providers: [HotspotsService, HotspotsResolver],
  exports: [HotspotsService],
})
export class HotspotsModule {}
