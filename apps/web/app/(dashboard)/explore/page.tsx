import Link from 'next/link';
import { EmptyState, ErrorPanel, hours, integer } from '@/components/data-display';
import { RequestRow, Search, browserApi, filterParams, filtersFromSearch, rest } from '@/lib/api';

type Listing = { items: RequestRow[]; nextCursor: string | null; pageSize: number };
const one = (value: string | string[] | undefined) => typeof value === 'string' ? value : undefined;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const filters = filtersFromSearch(search);
  const requestId = one(search.requestId) ?? '';
  const cursor = one(search.cursor);
  const selected = one(search.selected);
  const params = filterParams(filters);
  if (requestId) params.set('requestId', requestId);
  if (cursor) params.set('cursor', cursor);
  let listing: Listing;
  let detail: RequestRow | null = null;
  try {
    listing = await rest<Listing>('requests', params);
    if (selected) detail = await rest<RequestRow>('requests/' + encodeURIComponent(selected));
  } catch (error) {
    return <><div className="page-heading"><div className="eyebrow">EXPLORE</div><h1>Inspect the requests behind the chart.</h1></div><ErrorPanel message={String(error)} /></>;
  }
  const exportParams = filterParams(filters);
  if (requestId) exportParams.set('requestId', requestId);
  const exportHref = browserApi + '/api/v1/exports/requests.csv?' + exportParams;
  const detailBase = filterParams(filters);
  if (requestId) detailBase.set('requestId', requestId);
  if (cursor) detailBase.set('cursor', cursor);
  return <>
    <div className="page-heading spread"><div><div className="eyebrow">EXPLORE / REQUEST RECORDS</div><h1>Inspect the requests behind the chart.</h1><p>Server-side results. Select a row to see source fields and derived measures.</p></div><a className="primary-action" href={exportHref}>Export filtered CSV ↗</a></div>
    <section className="panel table-panel">
      <div className="table-toolbar"><form action="/explore" method="get" className="request-search">
        {Array.from(filterParams(filters)).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <label htmlFor="request-id-search">Request ID</label><input id="request-id-search" name="requestId" defaultValue={requestId} placeholder="Search exact ID" /><button type="submit">Search</button>
      </form><span>Sorted newest first · 25 per page</span></div>
      {listing.items.length ? <>
        <div className="table-scroll"><table className="request-table"><thead><tr><th>ID</th><th>Created (NYC local)</th><th>Problem</th><th>Detail</th><th>Borough</th><th>Agency</th><th>Status</th><th>Close time</th></tr></thead><tbody>
          {listing.items.map((row) => {
            const q = new URLSearchParams(detailBase); q.set('selected', row.request_id);
            return <tr key={row.request_id}><td><Link href={'/explore?' + q}>{row.request_id}</Link></td><td>{row.created_at_local.replace('T', ' ')}</td><td>{row.problem}</td><td>{row.problem_detail ?? '—'}</td><td>{row.borough ?? 'Unknown'}</td><td>{row.agency_code ?? '—'}</td><td><span className={'status status-' + row.status_normalized}>{row.status_normalized}</span></td><td>{hours(row.close_hours == null ? null : Number(row.close_hours))}</td></tr>;
          })}
        </tbody></table></div>
        <div className="pagination"><span>{integer(listing.items.length)} rows shown on this page</span><div>{cursor && <Link href={'/explore?' + filterParams(filters)}>First page</Link>}{listing.nextCursor && <Link href={'/explore?' + (() => { const q = filterParams(filters); if (requestId) q.set('requestId', requestId); q.set('cursor', listing.nextCursor!); return q; })()}>Next page →</Link>}</div></div>
      </> : <EmptyState detail="No requests match the selected filters or request ID." />}
    </section>
    <p className="footnote">CSV exports use the same filters and fail if more than 5,000 rows match. Coordinates and free text are excluded.</p>
    {detail && <div className="drawer-backdrop"><aside className="request-drawer" aria-label="Request details"><div className="drawer-top"><div><div className="eyebrow">REQUEST DETAIL</div><h2>#{detail.request_id}</h2></div><Link href={'/explore?' + detailBase} aria-label="Close request detail">✕</Link></div>
      <dl className="detail-list">
        <div><dt>Problem</dt><dd>{detail.problem}</dd></div><div><dt>Problem detail</dt><dd>{detail.problem_detail ?? 'Not provided'}</dd></div>
        <div><dt>Created</dt><dd>{detail.created_at_local.replace('T', ' ')} NYC local</dd></div><div><dt>Closed</dt><dd>{detail.closed_at_local?.replace('T', ' ') ?? 'No closure recorded'}</dd></div>
        <div><dt>Latest reported status</dt><dd>{detail.status_raw ?? 'Unknown'}</dd></div><div><dt>Agency</dt><dd>{detail.agency_name ?? detail.agency_code ?? 'Not provided'}</dd></div>
        <div><dt>Area</dt><dd>{[detail.borough, detail.community_board, detail.incident_zip].filter(Boolean).join(' · ') || 'Not provided'}</dd></div>
        <div><dt>Valid close duration</dt><dd>{hours(detail.close_hours == null ? null : Number(detail.close_hours))}</dd></div>
        <div><dt>Quality flags</dt><dd>{detail.quality_flags.length ? detail.quality_flags.join(', ') : 'None'}</dd></div>
        <div><dt>Last imported</dt><dd>{detail.ingested_at.replace('T', ' ')} ET</dd></div>
      </dl><a href={detail.source_url} target="_blank" rel="noreferrer" className="primary-action">Open NYC source record ↗</a>
    </aside></div>}
  </>;
}
