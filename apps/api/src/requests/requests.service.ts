import { BadRequestException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AnalysisFilters, filterSql, normalizeFilters } from '../analytics/filters';

interface PageOptions { pageSize?: string; cursor?: string; requestId?: string }
const SELECT = `request_id, to_char(created_at_local, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at_local,
  to_char(closed_at_local, 'YYYY-MM-DD"T"HH24:MI:SS') AS closed_at_local,
  problem, problem_detail, agency_code, agency_name, status_raw, status_normalized,
  borough, community_board, incident_zip, quality_flags,
  CASE WHEN closed_at_local >= created_at_local
    THEN round((extract(epoch FROM closed_at_local - created_at_local)/3600)::numeric, 1)
    ELSE NULL END AS close_hours,
  to_char(ingested_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD"T"HH24:MI:SS') AS ingested_at`;

function readCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { created: string; id: string };
    if (typeof decoded.created !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(decoded.created)
      || typeof decoded.id !== 'string' || decoded.id.length > 80) throw new Error('bad cursor');
    return decoded;
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }
}

@Injectable()
export class RequestsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(input: Partial<AnalysisFilters>, options: PageOptions) {
    const filters = normalizeFilters(input);
    const size = options.pageSize == null ? 25 : Number(options.pageSize);
    if (!Number.isInteger(size) || size < 1 || size > 100) {
      throw new BadRequestException('pageSize must be an integer from 1 to 100');
    }
    if (options.requestId && !/^[A-Za-z0-9_-]{1,80}$/.test(options.requestId)) {
      throw new BadRequestException('Invalid request ID');
    }
    const cursor = readCursor(options.cursor);
    const { where, values } = filterSql(filters);
    const result = await this.pool.query(`
      SELECT ${SELECT} FROM requests r WHERE ${where}
        AND ($8::text IS NULL OR request_id = $8)
        AND ($9::timestamp IS NULL OR (created_at_local, request_id) < ($9::timestamp, $10::text))
      ORDER BY created_at_local DESC, request_id DESC
      LIMIT $11
    `, [...values, options.requestId ?? null, cursor?.created ?? null, cursor?.id ?? null, size + 1]);
    const hasMore = result.rows.length > size;
    const rows = result.rows.slice(0, size);
    const last = rows.at(-1) as { created_at_local: string; request_id: string } | undefined;
    return {
      items: rows,
      nextCursor: hasMore && last
        ? Buffer.from(JSON.stringify({ created: last.created_at_local, id: last.request_id })).toString('base64url')
        : null,
      pageSize: size,
    };
  }

  async detail(id: string) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw new BadRequestException('Invalid request ID');
    const result = await this.pool.query(`SELECT ${SELECT} FROM requests WHERE request_id = $1`, [id]);
    if (!result.rows[0]) throw new NotFoundException('Request not found');
    return {
      ...result.rows[0],
      source_url: `https://data.cityofnewyork.us/resource/erm2-nwe9.json?unique_key=${encodeURIComponent(id)}`,
    };
  }

  async exportCsv(input: Partial<AnalysisFilters>, requestId?: string) {
    const filters = normalizeFilters(input);
    if (requestId && !/^[A-Za-z0-9_-]{1,80}$/.test(requestId)) {
      throw new BadRequestException('Invalid request ID');
    }
    const { where, values } = filterSql(filters);
    const result = await this.pool.query(`
      SELECT ${SELECT} FROM requests r WHERE ${where}
        AND ($8::text IS NULL OR request_id = $8)
      ORDER BY created_at_local DESC, request_id DESC LIMIT 5001
    `, [...values, requestId ?? null]);
    if (result.rows.length > 5000) {
      throw new PayloadTooLargeException('Export exceeds 5,000 rows; narrow the filters');
    }
    const fields = [
      'request_id', 'created_at_local', 'problem', 'problem_detail', 'borough',
      'community_board', 'agency_code', 'status_normalized', 'closed_at_local', 'close_hours',
    ];
    const cell = (value: unknown) => {
      const raw = String(value ?? '');
      // Spreadsheet programs may evaluate a source value as a formula on open.
      const safe = /^[\s\x00-\x1f]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    return [fields.join(','), ...result.rows.map((row) => fields.map((field) => cell(row[field])).join(','))].join('\r\n') + '\r\n';
  }
}
