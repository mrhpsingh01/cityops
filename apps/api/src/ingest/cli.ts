import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { Pool } from 'pg';
import { normalizeSource, sourceCount, sourcePage, SourceRequest } from './source';

const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) loadEnvFile(rootEnv);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, statement_timeout: 0 });
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function days(from: string, toExclusive: string): string[] {
  if (!DATE_RE.test(from) || !DATE_RE.test(toExclusive)) throw new Error('Dates must use YYYY-MM-DD');
  const start = Date.parse(from + 'T00:00:00Z');
  const end = Date.parse(toExclusive + 'T00:00:00Z');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 31 * 86400000) {
    throw new Error('Import range must be 1 to 31 days');
  }
  const result: string[] = [];
  for (let ms = start; ms < end; ms += 86400000) result.push(new Date(ms).toISOString().slice(0, 10));
  return result;
}

async function stage(runId: number, day: string, rows: SourceRequest[]) {
  const ready: Array<{ request_id: string; source_date: string; payload: SourceRequest; normalized: object }> = [];
  for (const row of rows) {
    const mapped = normalizeSource(row);
    if ('reason' in mapped) {
      await pool.query(`INSERT INTO quarantined_requests (request_id, payload, reason)
        VALUES ($1,$2::jsonb,$3) ON CONFLICT (request_id)
        DO UPDATE SET payload=excluded.payload, reason=excluded.reason, fetched_at=now()`,
      [mapped.id || `missing-${runId}-${day}-${ready.length}`, JSON.stringify(row), mapped.reason]);
      throw new Error(`Source row could not be normalized: ${mapped.reason}`);
    }
    ready.push({ request_id: mapped.id, source_date: day, payload: row, normalized: mapped.data });
  }
  if (!ready.length) return;
  await pool.query(`
    INSERT INTO ingestion_stage (run_id, request_id, source_date, payload, normalized)
    SELECT $1, x.request_id, x.source_date::date, x.payload, x.normalized
    FROM jsonb_to_recordset($2::jsonb) AS x(
      request_id text, source_date text, payload jsonb, normalized jsonb)
    ON CONFLICT (run_id, request_id) DO UPDATE
      SET payload=excluded.payload, normalized=excluded.normalized, source_date=excluded.source_date
  `, [runId, JSON.stringify(ready)]);
}

async function publish(runId: number, dates: string[], seen: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('cityops-ingestion'))");
    const counts = await client.query<{ inserted: string; updated: string }>(`
      SELECT count(*) FILTER (WHERE r.request_id IS NULL)::text AS inserted,
             count(*) FILTER (WHERE r.request_id IS NOT NULL)::text AS updated
      FROM ingestion_stage s LEFT JOIN requests r USING (request_id) WHERE s.run_id=$1`, [runId]);
    const staged = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM ingestion_stage WHERE run_id=$1', [runId]);
    if (Number(staged.rows[0].count) !== seen) throw new Error('Staged count differs from source count');
    for (const day of dates) {
      await client.query(`
        INSERT INTO raw_requests (request_id, payload, fetched_at)
        SELECT request_id, payload, now() FROM ingestion_stage
        WHERE run_id=$1 AND source_date=$2::date
        ON CONFLICT (request_id) DO UPDATE SET payload=excluded.payload, fetched_at=excluded.fetched_at
      `, [runId, day]);
      await client.query(`
        INSERT INTO requests (
          request_id, created_at_local, closed_at_local, problem, problem_detail,
          agency_code, agency_name, status_raw, status_normalized, borough,
          community_board, incident_zip, latitude, longitude, quality_flags, ingested_at)
        SELECT s.request_id, x.created_at_local, x.closed_at_local, x.problem, x.problem_detail,
          x.agency_code, x.agency_name, x.status_raw, x.status_normalized, x.borough,
          x.community_board, x.incident_zip, x.latitude, x.longitude, x.quality_flags, now()
        FROM ingestion_stage s CROSS JOIN LATERAL jsonb_to_record(s.normalized) AS x(
          created_at_local timestamp, closed_at_local timestamp, problem text, problem_detail text,
          agency_code text, agency_name text, status_raw text, status_normalized text, borough text,
          community_board text, incident_zip text, latitude double precision, longitude double precision,
          quality_flags text[])
        WHERE s.run_id=$1 AND s.source_date=$2::date
        ON CONFLICT (request_id) DO UPDATE SET
          created_at_local=excluded.created_at_local, closed_at_local=excluded.closed_at_local,
          problem=excluded.problem, problem_detail=excluded.problem_detail,
          agency_code=excluded.agency_code, agency_name=excluded.agency_name,
          status_raw=excluded.status_raw, status_normalized=excluded.status_normalized,
          borough=excluded.borough, community_board=excluded.community_board,
          incident_zip=excluded.incident_zip, latitude=excluded.latitude,
          longitude=excluded.longitude, quality_flags=excluded.quality_flags,
          ingested_at=excluded.ingested_at
      `, [runId, day]);
    }
    await client.query(`DELETE FROM daily_intake_metrics WHERE intake_date >= $1::date AND intake_date < $2::date`,
      [dates[0], new Date(Date.parse(dates.at(-1)! + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10)]);
    await client.query(`
      INSERT INTO daily_intake_metrics (intake_date, borough, problem, agency_code, request_count)
      SELECT created_at_local::date, coalesce(borough,'UNKNOWN'), problem,
        coalesce(agency_code,'UNKNOWN'), count(*)::integer
      FROM requests WHERE created_at_local >= $1::timestamp AND created_at_local < $2::timestamp
      GROUP BY 1,2,3,4
    `, [dates[0], new Date(Date.parse(dates.at(-1)! + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10)]);
    await client.query(`
      INSERT INTO request_daily_snapshots (snapshot_date, request_id, status_normalized, age_days)
      SELECT (now() AT TIME ZONE 'America/New_York')::date, request_id, status_normalized,
             (now() AT TIME ZONE 'America/New_York')::date - created_at_local::date
      FROM requests WHERE status_normalized='open'
      ON CONFLICT (snapshot_date, request_id) DO UPDATE
        SET status_normalized=excluded.status_normalized, age_days=excluded.age_days
    `);
    await client.query(`
      UPDATE ingestion_runs SET status='succeeded', ended_at=now(),
        analysis_cutoff_local=now() AT TIME ZONE 'America/New_York',
        rows_seen=$2, rows_inserted=$3, rows_updated=$4
      WHERE run_id=$1
    `, [runId, seen, counts.rows[0].inserted, counts.rows[0].updated]);
    await client.query('DELETE FROM ingestion_stage WHERE run_id=$1', [runId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const from = process.env.INGEST_START_DATE ?? '2025-01-01';
  const toExclusive = process.env.INGEST_END_DATE ?? '2025-02-01';
  const dateList = days(from, toExclusive);
  const run = await pool.query<{ run_id: string }>(`
    INSERT INTO ingestion_runs (status, source_from, source_to_exclusive)
    VALUES ('running',$1::date,$2::date) RETURNING run_id::text`, [from, toExclusive]);
  const runId = Number(run.rows[0].run_id);
  let total = 0;
  try {
    for (const day of dateList) {
      const expected = await sourceCount(day);
      let offset = 0;
      while (offset < expected) {
        const rows = await sourcePage(day, offset);
        if (!rows.length) throw new Error(`Unexpected empty source page for ${day} at offset ${offset}`);
        await stage(runId, day, rows);
        offset += rows.length;
      }
      const staged = await pool.query<{ count: string }>(`
        SELECT count(*)::text AS count FROM ingestion_stage WHERE run_id=$1 AND source_date=$2::date
      `, [runId, day]);
      if (Number(staged.rows[0].count) !== expected) {
        throw new Error(`Source/local count mismatch for ${day}: ${expected} vs ${staged.rows[0].count}`);
      }
      total += expected;
      process.stdout.write(`${day}: ${expected} staged\n`);
    }
    await publish(runId, dateList, total);
    process.stdout.write(`Published ${total} requests in run ${runId}\n`);
  } catch (error) {
    await pool.query(`UPDATE ingestion_runs SET status='failed', ended_at=now(), error_message=$2
      WHERE run_id=$1`, [runId, String(error).slice(0, 1000)]);
    throw error;
  } finally {
    await pool.end();
  }
}
void main();
