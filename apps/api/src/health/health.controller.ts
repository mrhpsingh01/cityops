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
    let database = 'unavailable';
    let postgis: string | null = null;
    try {
      await this.pool.query('SELECT 1');
      database = 'ready';
      const res = await this.pool.query<{ v: string }>("SELECT postgis_version() AS v");
      postgis = res.rows[0]?.v ?? null;
    } catch {
      // database stays 'ready' if only PostGIS is missing; postgis stays null
    }
    if (database !== 'ready' || !postgis) {
      throw new ServiceUnavailableException({ status: 'degraded', database, postgis: postgis ? 'ready' : 'unavailable' });
    }
    return { status: 'ok', database, postgis: 'ready', postgisVersion: postgis };
  }
}
