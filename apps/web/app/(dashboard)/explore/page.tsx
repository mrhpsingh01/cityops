import Link from 'next/link';
import { EmptyState, ErrorPanel, hours, integer } from '@/components/data-display';
import { RequestDetailDrawer } from '@/components/request-detail-drawer';
import { Overview, RequestRow, Search, browserApi, filterParams, filtersFromSearch, rest } from '@/lib/api';

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
  let matchingCount = 0;
  try {
    const [rows, overview, selectedRow] = await Promise.all([
      rest<Listing>('requests', params),
      requestId ? Promise.resolve(null) : rest<Overview>('overview', filterParams(filters)),
      selected ? rest<RequestRow>('requests/' + encodeURIComponent(selected)) : Promise.resolve(null),
    ]);
    listing = rows; detail = selectedRow;
    matchingCount = requestId ? rows.items.length : (overview?.requestCount ?? 0);
  } catch (error) {
    return <><div className="page-heading"><div className="eyebrow">EXPLORE</div><h1>Inspect the requests behind the chart.</h1></div><ErrorPanel message={String(error)} /></>;
  }
  const exportParams = filterParams(filters);
  if (requestId) exportParams.set('requestId', requestId);
  const exportHref = browserApi + '/api/v1/exports/requests.csv?' + exportParams;
  const canExport = matchingCount > 0 && matchingCount <= 5000;
  const detailBase = filterParams(filters);
  if (requestId) detailBase.set('requestId', requestId);
  if (cursor) detailBase.set('cursor', cursor);
  return <>
    <div className="page-heading spread"><div><div className="eyebrow">EXPLORE / REQUEST RECORDS</div><h1>Inspect the requests behind the chart.</h1><p>{integer(matchingCount)} matching requests. Select a record to see source fields and derived measures.</p></div><div className="export-control">{canExport ? <a className="primary-action" href={exportHref}>Export {integer(matchingCount)} rows ↗</a> : <span className="primary-action disabled" aria-disabled="true">CSV export unavailable</span>}{!canExport && <small>{matchingCount > 5000 ? 'Narrow filters to 5,000 rows or fewer.' : 'No matching rows to export.'}</small>}</div></div>
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
        <div className="request-card-list">{listing.items.map((row) => { const q = new URLSearchParams(detailBase); q.set('selected', row.request_id); return <Link className="request-card" href={'/explore?' + q} key={row.request_id}><span className="request-card-top"><strong>#{row.request_id}</strong><span className={'status status-' + row.status_normalized}>{row.status_normalized}</span></span><span className="request-card-problem">{row.problem}</span><span>{row.created_at_local.slice(0, 16).replace('T', ' ')} · {row.borough ?? 'Unknown area'}</span><span>{row.agency_code ?? 'Agency unknown'} · Close time {hours(row.close_hours == null ? null : Number(row.close_hours))}</span></Link>; })}</div>
        <div className="pagination"><span>{integer(listing.items.length)} rows shown on this page</span><div>{cursor && <Link href={'/explore?' + filterParams(filters)}>First page</Link>}{listing.nextCursor && <Link href={'/explore?' + (() => { const q = filterParams(filters); if (requestId) q.set('requestId', requestId); q.set('cursor', listing.nextCursor!); return q; })()}>Next page →</Link>}</div></div>
      </> : <EmptyState detail="No requests match the selected filters or request ID." />}
    </section>
    <p className="footnote">CSV exports use the same filters and have a 5,000-row cap. Coordinates and free text are excluded.</p>
    {detail && <RequestDetailDrawer detail={detail} closeHref={'/explore?' + detailBase} />}
  </>;
}
