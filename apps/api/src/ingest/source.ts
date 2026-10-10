export const DATASET_URL = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json';
export const PROBLEMS = ['Noise - Residential', 'HEAT/HOT WATER', 'Illegal Parking'] as const;
export const SOURCE_FIELDS = [
  'unique_key', 'created_date', 'closed_date', 'status', 'agency', 'agency_name',
  'complaint_type', 'descriptor', 'borough', 'community_board', 'incident_zip',
  'latitude', 'longitude', 'resolution_description', 'council_district',
] as const;

export interface SourceRequest {
  unique_key?: string;
  created_date?: string;
  closed_date?: string;
  status?: string;
  agency?: string;
  agency_name?: string;
  complaint_type?: string;
  descriptor?: string;
  borough?: string;
  community_board?: string;
  incident_zip?: string;
  latitude?: string;
  longitude?: string;
  resolution_description?: string;
  council_district?: string;
}

export interface CleanRequest {
  created_at_local: string;
  closed_at_local: string | null;
  problem: string;
  problem_detail: string | null;
  agency_code: string | null;
  agency_name: string | null;
  status_raw: string | null;
  status_normalized: 'open' | 'closed' | 'unknown';
  borough: string | null;
  community_board: string | null;
  incident_zip: string | null;
  latitude: number | null;
  longitude: number | null;
  quality_flags: string[];
}

function localTimestamp(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return null;
  const civil = value.slice(0, 19).replace('T', ' ');
  const [y, m, d, h, min, s] = civil.match(/\d+/g)!.map(Number);
  const test = new Date(Date.UTC(y, m - 1, d, h, min, s));
  if (test.getUTCFullYear() !== y || test.getUTCMonth() !== m - 1 || test.getUTCDate() !== d
    || test.getUTCHours() !== h || test.getUTCMinutes() !== min || test.getUTCSeconds() !== s) return null;
  return civil;
}

export function normalizeSource(row: SourceRequest): { id: string; data: CleanRequest } | { id: string; reason: string } {
  const id = String(row.unique_key ?? '');
  if (!id) return { id: '', reason: 'missing_unique_key' };
  const created = localTimestamp(row.created_date);
  if (!created) return { id, reason: 'missing_or_invalid_created_date' };
  const closed = localTimestamp(row.closed_date);
  const flags: string[] = [];
  if (row.closed_date && !closed) flags.push('invalid_closed_date');
  if (closed && closed < created) flags.push('negative_duration');
  if (!row.agency) flags.push('missing_agency');
  if (!row.complaint_type) flags.push('missing_problem');

  const status = row.status?.trim().toLowerCase() ?? '';
  const normalized: CleanRequest['status_normalized'] =
    status === 'closed' ? 'closed'
    : ['open', 'in progress', 'pending', 'assigned'].includes(status) ? 'open' : 'unknown';
  if (normalized === 'unknown') flags.push('unknown_status');
  if (normalized === 'closed' && !closed || normalized === 'open' && closed) {
    flags.push('status_date_inconsistent');
  }
  const lat = row.latitude == null ? NaN : Number(row.latitude);
  const lon = row.longitude == null ? NaN : Number(row.longitude);
  const validCoordinates = Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= 40.45 && lat <= 40.95 && lon >= -74.3 && lon <= -73.65;
  if (!validCoordinates) flags.push('missing_or_invalid_coordinates');
  return {
    id,
    data: {
      created_at_local: created,
      closed_at_local: closed,
      problem: row.complaint_type ?? 'UNKNOWN',
      problem_detail: row.descriptor ?? null,
      agency_code: row.agency ?? null,
      agency_name: row.agency_name ?? null,
      status_raw: row.status ?? null,
      status_normalized: normalized,
      borough: row.borough ?? null,
      community_board: row.community_board ?? null,
      incident_zip: row.incident_zip ?? null,
      latitude: validCoordinates ? lat : null,
      longitude: validCoordinates ? lon : null,
      quality_flags: flags,
    },
  };
}

function soqlWhere(day: string) {
  const next = new Date(Date.parse(day + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
  const escaped = PROBLEMS.map((problem) => "'" + problem.replace(/'/g, "''") + "'").join(',');
  return `created_date >= '${day}T00:00:00' AND created_date < '${next}T00:00:00' AND complaint_type IN(${escaped})`;
}

async function fetchJson<T>(params: URLSearchParams): Promise<T> {
  const url = DATASET_URL + '?' + params.toString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, {
      headers: process.env.NYC_311_APP_TOKEN ? { 'X-App-Token': process.env.NYC_311_APP_TOKEN } : {},
      signal: AbortSignal.timeout(45000),
    });
    if (response.ok) return await response.json() as T;
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`NYC API returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
  throw new Error('NYC API retries exhausted');
}

export async function sourceCount(day: string): Promise<number> {
  const params = new URLSearchParams({
    '$select': 'count(*) as n', '$where': soqlWhere(day),
  });
  const rows = await fetchJson<Array<{ n: string }>>(params);
  return Number(rows[0]?.n ?? 0);
}

export async function sourcePage(day: string, offset: number, limit = 1000): Promise<SourceRequest[]> {
  const params = new URLSearchParams({
    '$select': SOURCE_FIELDS.join(','),
    '$where': soqlWhere(day),
    '$order': 'created_date ASC,unique_key ASC',
    '$offset': String(offset),
    '$limit': String(limit),
  });
  return fetchJson<SourceRequest[]>(params);
}
