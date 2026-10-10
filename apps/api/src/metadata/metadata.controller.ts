import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@ApiTags('metadata')
@Controller()
export class MetadataController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('metadata')
  async metadata() {
    const [coverage, problems, boroughs, agencies, boards, refresh] = await Promise.all([
      this.pool.query<{ oldest: string | null; newest: string | null; count: string }>(`
        SELECT to_char(min(created_at_local), 'YYYY-MM-DD') AS oldest,
               to_char(max(created_at_local), 'YYYY-MM-DD') AS newest,
               count(*)::text AS count FROM requests`),
      this.pool.query<{ problem: string }>('SELECT DISTINCT problem FROM requests ORDER BY problem'),
      this.pool.query<{ borough: string }>('SELECT DISTINCT borough FROM requests WHERE borough IS NOT NULL ORDER BY borough'),
      this.pool.query<{ agency_code: string }>('SELECT DISTINCT agency_code FROM requests WHERE agency_code IS NOT NULL ORDER BY agency_code'),
      this.pool.query<{ community_board: string }>('SELECT DISTINCT community_board FROM requests WHERE community_board IS NOT NULL ORDER BY community_board'),
      this.pool.query<{ ended_at: string; status: string; source_from: string; source_to_exclusive: string }>(`
        SELECT to_char(ended_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD"T"HH24:MI:SS') AS ended_at,
               status, source_from::text, source_to_exclusive::text
        FROM ingestion_runs WHERE status = 'succeeded' ORDER BY ended_at DESC LIMIT 1`),
    ]);
    return {
      source: 'NYC Open Data 311 Service Requests from 2020 to Present',
      sourceUrl: 'https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9',
      datasetId: 'erm2-nwe9',
      supportedScope: {
        from: '2025-01-01', toExclusive: '2025-02-01',
        problems: ['Noise - Residential', 'HEAT/HOT WATER', 'Illegal Parking'],
      },
      loadedCoverage: {
        oldest: coverage.rows[0]?.oldest ?? null,
        newest: coverage.rows[0]?.newest ?? null,
        requestCount: Number(coverage.rows[0]?.count ?? 0),
      },
      asOf: refresh.rows[0]?.ended_at ?? null,
      refreshCadence: 'Daily when scheduled; local setup requires an ingestion run',
      filters: {
        problems: problems.rows.map((r) => r.problem),
        boroughs: boroughs.rows.map((r) => r.borough),
        agencies: agencies.rows.map((r) => r.agency_code),
        communityBoards: boards.rows.map((r) => r.community_board),
      },
      metricNotes: {
        intake: 'Distinct requests created in the selected NYC-local, half-open date range.',
        sevenDayClosure: 'Mature creation cohorts with a recorded valid closure within seven days.',
        openNow: 'Latest ingested status for selected requests; this is a snapshot, not historical backlog.',
      },
    };
  }

  @Get('data-quality')
  async quality() {
    const [flags, run, quarantined] = await Promise.all([
      this.pool.query<{ flag: string; count: string }>(`
        SELECT flag, count(*)::text AS count FROM requests, unnest(quality_flags) AS flag
        GROUP BY flag ORDER BY count(*) DESC`),
      this.pool.query(`SELECT run_id, started_at, ended_at, status, rows_seen, rows_inserted,
        rows_updated, error_message FROM ingestion_runs ORDER BY started_at DESC LIMIT 1`),
      this.pool.query<{ count: string }>('SELECT count(*)::text AS count FROM quarantined_requests'),
    ]);
    return {
      latestRun: run.rows[0] ?? null,
      flags: Object.fromEntries(flags.rows.map((r) => [r.flag, Number(r.count)])),
      quarantined: Number(quarantined.rows[0]?.count ?? 0),
    };
  }
}
