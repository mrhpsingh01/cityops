import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AnalysisFilters, filterSql, normalizeFilters } from './filters';
import { HotspotsService } from '../hotspots/hotspots.service';
import { HotspotQueryDto } from '../hotspots/hotspots.dto';

function n(value: unknown): number { return value == null ? 0 : Number(value); }
function previousFilters(filters: AnalysisFilters): AnalysisFilters {
  const length = Date.parse(filters.toExclusive) - Date.parse(filters.from);
  return {
    ...filters,
    from: new Date(Date.parse(filters.from) - length).toISOString().slice(0, 10),
    toExclusive: filters.from,
  };
}

@Injectable()
export class MetricsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly hotspotsService: HotspotsService,
  ) {}

  async getHotspots(query?: HotspotQueryDto) {
    return this.hotspotsService.getHotspots(query);
  }

  async cutoff() {
    const result = await this.pool.query<{ as_of: string; cutoff: string }>(`
      SELECT to_char(ended_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD"T"HH24:MI:SS') AS as_of,
             to_char(analysis_cutoff_local, 'YYYY-MM-DD HH24:MI:SS') AS cutoff
      FROM ingestion_runs WHERE status = 'succeeded' ORDER BY ended_at DESC LIMIT 1
    `);
    return result.rows[0] ?? { as_of: '', cutoff: '' };
  }

  async getOverview(input: Partial<AnalysisFilters>) {
    const filters = normalizeFilters(input);
    const { where, values } = filterSql(filters);
    const prior = filterSql(previousFilters(filters));
    const [current, previous, refresh] = await Promise.all([
      this.pool.query<{
        request_count: string; open_count: string; eligible: string; seven_day_closed: string;
        median_hours: string | null; closed_sample: string; invalid_duration: string;
      }>(`
        SELECT count(*)::text AS request_count,
               count(*) FILTER (WHERE status_normalized = 'open')::text AS open_count,
               count(*) FILTER (WHERE created_at_local <= $8::timestamp - interval '7 days')::text AS eligible,
               count(*) FILTER (WHERE created_at_local <= $8::timestamp - interval '7 days'
                 AND closed_at_local >= created_at_local
                 AND closed_at_local <= created_at_local + interval '7 days')::text AS seven_day_closed,
               percentile_cont(0.5) WITHIN GROUP
                 (ORDER BY extract(epoch FROM (closed_at_local - created_at_local))/3600)
                 FILTER (WHERE closed_at_local >= created_at_local)::text AS median_hours,
               count(*) FILTER (WHERE closed_at_local >= created_at_local)::text AS closed_sample,
               count(*) FILTER (WHERE closed_at_local < created_at_local)::text AS invalid_duration
        FROM requests r WHERE ${where}
      `, [...values, (await this.cutoff()).cutoff || '1900-01-01 00:00:00']),
      this.pool.query<{ request_count: string }>(
        `SELECT count(*)::text AS request_count FROM requests r WHERE ${prior.where}`, prior.values),
      this.cutoff(),
    ]);
    const row = current.rows[0];
    const previousCount = n(previous.rows[0]?.request_count);
    const requestCount = n(row.request_count);
    const eligible = n(row.eligible);
    return {
      requestCount,
      previousCount,
      periodChange: previousCount ? (requestCount - previousCount) / previousCount : null,
      openCount: n(row.open_count),
      eligibleCount: eligible,
      sevenDayClosureRate: eligible ? n(row.seven_day_closed) / eligible : null,
      medianCloseHours: row.median_hours == null ? null : Number(row.median_hours),
      closedSample: n(row.closed_sample),
      invalidDurationCount: n(row.invalid_duration),
      asOf: refresh.as_of,
      from: filters.from,
      toExclusive: filters.toExclusive,
    };
  }

  async getTrend(input: Partial<AnalysisFilters>, grouping: 'day' | 'week' = 'day') {
    const filters = normalizeFilters(input);
    const { where, values } = filterSql(filters);
    const unit = grouping === 'week' ? 'week' : 'day';
    const result = await this.pool.query<{ period: string; request_count: string }>(`
      SELECT to_char(date_trunc('${unit}', created_at_local), 'YYYY-MM-DD') AS period,
             count(*)::text AS request_count
      FROM requests r WHERE ${where}
      GROUP BY 1 ORDER BY 1
    `, values);
    return result.rows.map((row) => ({ period: row.period, requestCount: n(row.request_count) }));
  }

  async getProblems(input: Partial<AnalysisFilters>) {
    const { where, values } = filterSql(normalizeFilters(input));
    const result = await this.pool.query<{ problem: string; request_count: string }>(`
      SELECT problem, count(*)::text AS request_count FROM requests r
      WHERE ${where} GROUP BY problem ORDER BY count(*) DESC, problem LIMIT 30
    `, values);
    return result.rows.map((row) => ({ problem: row.problem, requestCount: n(row.request_count) }));
  }

  async getAreas(input: Partial<AnalysisFilters>) {
    const { where, values } = filterSql(normalizeFilters(input));
    const result = await this.pool.query<{ borough: string; request_count: string }>(`
      SELECT coalesce(borough, 'UNKNOWN') AS borough, count(*)::text AS request_count
      FROM requests r WHERE ${where}
      GROUP BY 1 ORDER BY count(*) DESC, borough LIMIT 10
    `, values);
    return result.rows.map((row) => ({ borough: row.borough, requestCount: n(row.request_count) }));
  }

  async getProblemSignals(input: Partial<AnalysisFilters>) {
    const filters = normalizeFilters(input);
    const prior = previousFilters(filters);
    const { where, values } = filterSql({ ...filters, from: prior.from });
    const cutoff = (await this.cutoff()).cutoff || '1900-01-01 00:00:00';
    const result = await this.pool.query<{
      problem: string; current_count: string; prior_count: string;
      eligible_count: string; closed_within_7_count: string;
    }>(`
      SELECT problem,
             count(*) FILTER (WHERE created_at_local >= $8::timestamp)::text AS current_count,
             count(*) FILTER (WHERE created_at_local < $8::timestamp)::text AS prior_count,
             count(*) FILTER (WHERE created_at_local >= $8::timestamp
               AND created_at_local <= $9::timestamp - interval '7 days')::text AS eligible_count,
             count(*) FILTER (WHERE created_at_local >= $8::timestamp
               AND created_at_local <= $9::timestamp - interval '7 days'
               AND closed_at_local >= created_at_local
               AND closed_at_local <= created_at_local + interval '7 days')::text AS closed_within_7_count
      FROM requests r WHERE ${where}
      GROUP BY problem ORDER BY count(*) FILTER (WHERE created_at_local >= $8::timestamp) DESC, problem
    `, [...values, filters.from, cutoff]);
    return result.rows.map((row) => ({
      problem: row.problem,
      currentCount: n(row.current_count),
      priorCount: n(row.prior_count),
      eligibleCount: n(row.eligible_count),
      closedWithin7Count: n(row.closed_within_7_count),
    }));
  }

  async getAreaProblemMix(input: Partial<AnalysisFilters>) {
    const { where, values } = filterSql(normalizeFilters(input));
    const result = await this.pool.query<{ borough: string; problem: string; request_count: string }>(`
      SELECT coalesce(borough, 'UNKNOWN') AS borough, problem, count(*)::text AS request_count
      FROM requests r WHERE ${where}
      GROUP BY 1, 2 ORDER BY 1, 2
    `, values);
    return result.rows.map((row) => ({
      borough: row.borough, problem: row.problem, requestCount: n(row.request_count),
    }));
  }

  async getResolution(input: Partial<AnalysisFilters>) {
    const filters = normalizeFilters(input);
    const { where, values } = filterSql(filters);
    const cutoff = (await this.cutoff()).cutoff || '1900-01-01 00:00:00';
    const [cohorts, durations, backlog] = await Promise.all([
      this.pool.query<{ creation_week: string; eligible: string; closed_7: string }>(`
        SELECT to_char(date_trunc('week', created_at_local), 'YYYY-MM-DD') AS creation_week,
               count(*)::text AS eligible,
               count(*) FILTER (WHERE closed_at_local >= created_at_local
                 AND closed_at_local <= created_at_local + interval '7 days')::text AS closed_7
        FROM requests r WHERE ${where}
          AND date_trunc('week', created_at_local) + interval '14 days' <= $8::timestamp
        GROUP BY 1 ORDER BY 1
      `, [...values, cutoff]),
      this.pool.query<{ problem: string; sample: string; p50: string | null; p75: string | null; p90: string | null; open_count: string }>(`
        SELECT problem,
               count(*) FILTER (WHERE closed_at_local >= created_at_local)::text AS sample,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM closed_at_local - created_at_local)/3600)
                 FILTER (WHERE closed_at_local >= created_at_local)::text AS p50,
               percentile_cont(0.75) WITHIN GROUP (ORDER BY extract(epoch FROM closed_at_local - created_at_local)/3600)
                 FILTER (WHERE closed_at_local >= created_at_local)::text AS p75,
               percentile_cont(0.9) WITHIN GROUP (ORDER BY extract(epoch FROM closed_at_local - created_at_local)/3600)
                 FILTER (WHERE closed_at_local >= created_at_local)::text AS p90,
               count(*) FILTER (WHERE status_normalized = 'open')::text AS open_count
        FROM requests r WHERE ${where} GROUP BY problem ORDER BY count(*) DESC LIMIT 30
      `, values),
      this.pool.query<{ band: string; request_count: string }>(`
        WITH open_rows AS (
          SELECT floor(extract(epoch FROM ($8::timestamp - created_at_local))/86400)::integer AS age
          FROM requests r WHERE ${where} AND status_normalized = 'open'
        )
        SELECT CASE WHEN age <= 2 THEN '0–2' WHEN age <= 7 THEN '3–7'
                    WHEN age <= 14 THEN '8–14' WHEN age <= 30 THEN '15–30'
                    ELSE '31+' END AS band, count(*)::text AS request_count
        FROM open_rows WHERE age >= 0 GROUP BY 1
      `, [...values, cutoff]),
    ]);
    return {
      cohorts: cohorts.rows.map((r) => ({
        week: r.creation_week, eligible: n(r.eligible), closedWithin7: n(r.closed_7),
        rate: n(r.eligible) ? n(r.closed_7) / n(r.eligible) : null,
      })),
      durations: durations.rows.map((r) => ({
        problem: r.problem, sample: n(r.sample), p50Hours: r.p50 == null ? null : n(r.p50),
        p75Hours: r.p75 == null ? null : n(r.p75),
        p90Hours: r.p90 == null ? null : n(r.p90), openCount: n(r.open_count),
      })),
      backlog: ['0–2', '3–7', '8–14', '15–30', '31+'].map((band) => ({
        band, requestCount: n(backlog.rows.find((r) => r.band === band)?.request_count),
      })),
      asOf: (await this.cutoff()).as_of,
    };
  }
}
