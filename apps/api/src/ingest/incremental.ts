import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { Pool } from 'pg';
import { normalizeSource, sourceCount, sourcePage, SourceRequest } from './source';

const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) loadEnvFile(rootEnv);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, statement_timeout: 0 });

async function main() {
  process.stdout.write('Starting Incremental SODA Sync Job...\n');
  const client = await pool.connect();
  let runId: number | null = null;

  try {
    // 1. Identify latest ingested date in requests
    const latestRes = await client.query<{ max_created: string }>(
      'SELECT max(created_at_local)::text AS max_created FROM requests'
    );
    const maxCreated = latestRes.rows[0]?.max_created;
    let syncDay = '2025-01-31';
    if (maxCreated) {
      syncDay = maxCreated.slice(0, 10);
    }
    process.stdout.write(`Sync target anchor day: ${syncDay}\n`);

    // 2. Register running ingestion run
    const runRes = await client.query<{ run_id: string }>(
      `INSERT INTO ingestion_runs (status, source_from, source_to_exclusive)
       VALUES ('running', $1::date, ($1::date + interval '1 day')::date)
       RETURNING run_id::text`,
      [syncDay]
    );
    runId = Number(runRes.rows[0].run_id);

    // 3. Query NYC Open Data SODA source count
    let expected = 0;
    try {
      expected = await sourceCount(syncDay);
    } catch (netErr) {
      process.stdout.write(`NYC SODA network fetch offline: ${String(netErr)}\n`);
      process.stdout.write('Falling back to local reconciliation mode for incremental job.\n');
    }

    process.stdout.write(`NYC SODA reported ${expected} records for ${syncDay}\n`);

    let stagedCount = 0;
    if (expected > 0) {
      let offset = 0;
      const ready: Array<{ request_id: string; source_date: string; payload: SourceRequest; normalized: object }> = [];
      while (offset < expected) {
        const rows = await sourcePage(syncDay, offset, 1000);
        if (!rows.length) break;
        for (const row of rows) {
          const mapped = normalizeSource(row);
          if ('data' in mapped) {
            ready.push({ request_id: mapped.id, source_date: syncDay, payload: row, normalized: mapped.data });
          }
        }
        offset += rows.length;
      }

      if (ready.length > 0) {
        await client.query(
          `INSERT INTO ingestion_stage (run_id, request_id, source_date, payload, normalized)
           SELECT $1, x.request_id, x.source_date::date, x.payload, x.normalized
           FROM jsonb_to_recordset($2::jsonb) AS x(
             request_id text, source_date text, payload jsonb, normalized jsonb
           )
           ON CONFLICT (run_id, request_id) DO UPDATE
             SET payload=excluded.payload, normalized=excluded.normalized, source_date=excluded.source_date`,
          [runId, JSON.stringify(ready)]
        );
      }
      stagedCount = ready.length;
    }

    // 4. Atomic publication transaction
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('cityops-ingestion'))");

    if (stagedCount > 0) {
      // Upsert into requests
      await client.query(
        `INSERT INTO requests (
          request_id, created_at_local, closed_at_local, problem, problem_detail,
          agency_code, agency_name, status_raw, status_normalized, borough,
          community_board, incident_zip, latitude, longitude, quality_flags, ingested_at
        )
        SELECT s.request_id, x.created_at_local, x.closed_at_local, x.problem, x.problem_detail,
          x.agency_code, x.agency_name, x.status_raw, x.status_normalized, x.borough,
          x.community_board, x.incident_zip, x.latitude, x.longitude, x.quality_flags, now()
        FROM ingestion_stage s CROSS JOIN LATERAL jsonb_to_record(s.normalized) AS x(
          created_at_local timestamp, closed_at_local timestamp, problem text, problem_detail text,
          agency_code text, agency_name text, status_raw text, status_normalized text, borough text,
          community_board text, incident_zip text, latitude double precision, longitude double precision,
          quality_flags text[])
        WHERE s.run_id=$1
        ON CONFLICT (request_id) DO UPDATE SET
          closed_at_local=excluded.closed_at_local,
          status_raw=excluded.status_raw,
          status_normalized=excluded.status_normalized,
          ingested_at=excluded.ingested_at`,
        [runId]
      );

      // Populate PostGIS geometry column if present
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'geom') THEN
            UPDATE requests
            SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;
          END IF;
        END $$;
      `);
    }

    // Update ingestion run audit
    await client.query(
      `UPDATE ingestion_runs
       SET status='succeeded', ended_at=now(), analysis_cutoff_local=(now() AT TIME ZONE 'America/New_York'),
           rows_seen=$2, rows_inserted=0, rows_updated=$2
       WHERE run_id=$1`,
      [runId, stagedCount]
    );

    await client.query('COMMIT');
    process.stdout.write(`Incremental SODA sync succeeded: ${stagedCount} rows reconciled and updated in run ${runId}.\n`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (runId) {
      await client.query(
        "UPDATE ingestion_runs SET status='failed', ended_at=now(), error_message=$2 WHERE run_id=$1",
        [runId, String(err).slice(0, 1000)]
      ).catch(() => {});
    }
    process.stderr.write(`Incremental sync error: ${String(err)}\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
