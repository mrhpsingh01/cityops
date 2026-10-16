import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface TtcEstimate {
  hours: number;
  sampleSize: number;
  basis: 'problem_borough' | 'problem';
  comparison: string;
}

export interface TtcBenchmark {
  problem: string;
  medianHours: number;
  sampleSize: number;
  comparison: string;
}

const MIN_BOROUGH_SAMPLE = 20;

/**
 * Serves Time-to-Close estimates (Model v2). The served estimator is the grouped median of
 * observed closure time per (problem, borough), computed from `requests` - the baseline that
 * the HistGradientBoosting challenger is evaluated against (see analytics/modeling/train_ttc.py).
 */
@Injectable()
export class TtcService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async load() {
    const res = await this.pool.query<{ problem: string | null; borough: string | null; n: number; g: number; median_hours: number }>(`
      SELECT problem, coalesce(borough, 'UNKNOWN') AS borough, grouping(problem, borough)::int AS g, count(*)::int AS n,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (closed_at_local - created_at_local)) / 3600.0) AS median_hours
      FROM requests
      WHERE closed_at_local IS NOT NULL AND closed_at_local >= created_at_local
        AND NOT ('negative_duration' = ANY(quality_flags))
      GROUP BY GROUPING SETS ((problem, borough), (problem), ())`);
    const byProblemBorough = new Map<string, { n: number; hours: number }>();
    const byProblem = new Map<string, { n: number; hours: number }>();
    let overall = { n: 0, hours: 0 };
    for (const r of res.rows) {
      const v = { n: Number(r.n), hours: Number(r.median_hours) };
      if (r.g === 3) overall = v;
      else if (r.g === 1) byProblem.set(r.problem as string, v);
      else byProblemBorough.set(`${r.problem}|${r.borough}`, v);
    }
    return { byProblemBorough, byProblem, overall };
  }

  private compare(hours: number, overall: number): string {
    if (!overall) return 'No citywide baseline available';
    const ratio = hours / overall;
    return ratio >= 1
      ? `${ratio.toFixed(1)}x slower than the citywide median (${overall.toFixed(1)}h)`
      : `${(1 / ratio).toFixed(1)}x faster than the citywide median (${overall.toFixed(1)}h)`;
  }

  async estimate(problem: string, borough: string): Promise<TtcEstimate | null> {
    const { byProblemBorough, byProblem, overall } = await this.load();
    const pb = byProblemBorough.get(`${problem}|${borough}`);
    if (pb && pb.n >= MIN_BOROUGH_SAMPLE) {
      return { hours: round(pb.hours), sampleSize: pb.n, basis: 'problem_borough', comparison: this.compare(pb.hours, overall.hours) };
    }
    const p = byProblem.get(problem);
    if (p) return { hours: round(p.hours), sampleSize: p.n, basis: 'problem', comparison: this.compare(p.hours, overall.hours) };
    return null;
  }

  async benchmarks(): Promise<TtcBenchmark[]> {
    const { byProblem, overall } = await this.load();
    return [...byProblem.entries()]
      .map(([problem, v]) => ({ problem, medianHours: round(v.hours), sampleSize: v.n, comparison: this.compare(v.hours, overall.hours) }))
      .sort((a, b) => b.medianHours - a.medianHours);
  }
}

const round = (n: number) => Math.round(n * 10) / 10;
