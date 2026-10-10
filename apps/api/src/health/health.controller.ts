import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@ApiTags('operations')
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}
  @Get()
  async readiness() {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'ok', database: 'ready' };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded', database: 'unavailable' });
    }
  }
}
