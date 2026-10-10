export type Filters = {
  from: string;
  toExclusive: string;
  problem?: string;
  borough?: string;
  agency?: string;
  communityBoard?: string;
  incidentZip?: string;
};
export const DEFAULT_FILTERS: Filters = { from: '2025-01-18', toExclusive: '2025-02-01' };
export type Search = Record<string, string | string[] | undefined>;

export function filtersFromSearch(search: Search): Filters {
  const one = (key: string) => typeof search[key] === 'string' ? search[key] as string : undefined;
  return {
    from: one('from') ?? DEFAULT_FILTERS.from,
    toExclusive: one('toExclusive') ?? DEFAULT_FILTERS.toExclusive,
    problem: one('problem'), borough: one('borough'), agency: one('agency'),
    communityBoard: one('communityBoard'), incidentZip: one('incidentZip'),
  };
}
export function filterParams(filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params;
}
const base = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
export const browserApi = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `API returned ${response.status}`;
    try {
      const body = await response.json() as { message?: string | string[] };
      if (body.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {}
    throw new Error(message);
  }
  return await response.json() as T;
}

export async function rest<T>(path: string, params?: URLSearchParams): Promise<T> {
  const url = base + '/api/v1/' + path + (params ? '?' + params : '');
  return responseJson<T>(await fetch(url, { cache: 'no-store' }));
}
export async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(base + '/graphql', {
    method: 'POST', cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operationName: 'Dashboard', query, variables }),
  });
  const body = await responseJson<{ data?: T; errors?: Array<{ message: string }> }>(response);
  if (body.errors?.length || !body.data) throw new Error(body.errors?.map((e) => e.message).join('; ') || 'GraphQL returned no data');
  return body.data;
}

export type Metadata = {
  source: string; sourceUrl: string; datasetId: string;
  supportedScope: { from: string; toExclusive: string; problems: string[] };
  loadedCoverage: { oldest: string | null; newest: string | null; requestCount: number };
  asOf: string | null; refreshCadence: string;
  filters: { problems: string[]; boroughs: string[]; agencies: string[]; communityBoards: string[] };
  metricNotes: Record<string, string>;
};
export type Overview = {
  requestCount: number; previousCount: number; periodChange: number | null;
  openCount: number; eligibleCount: number; sevenDayClosureRate: number | null;
  medianCloseHours: number | null; closedSample: number; invalidDurationCount: number;
  asOf: string; from: string; toExclusive: string;
};
export type TrendPoint = { period: string; requestCount: number };
export type Problem = { problem: string; requestCount: number };
export type Area = { borough: string; requestCount: number };
export type Resolution = {
  cohorts: Array<{ week: string; eligible: number; closedWithin7: number; rate: number | null }>;
  durations: Array<{ problem: string; sample: number; p50Hours: number | null; p75Hours: number | null; p90Hours: number | null; openCount: number }>;
  backlog: Array<{ band: string; requestCount: number }>; asOf: string;
};
export type RequestRow = {
  request_id: string; created_at_local: string; closed_at_local: string | null;
  problem: string; problem_detail: string | null; agency_code: string | null;
  agency_name: string | null; status_raw: string | null; status_normalized: string;
  borough: string | null; community_board: string | null; incident_zip: string | null;
  close_hours: string | null; quality_flags: string[]; ingested_at: string;
  source_url?: string;
};

export async function getMetadata(): Promise<Metadata> { return rest<Metadata>('metadata'); }
