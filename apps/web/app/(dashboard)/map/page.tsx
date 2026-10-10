import Link from 'next/link';
import { BoroughMap } from '@/components/borough-map';
import { EmptyState, ErrorPanel, SectionHeading, integer, percent } from '@/components/data-display';
import { Area, Search, filterParams, filtersFromSearch, rest } from '@/lib/api';

export default async function MapPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const filters = filtersFromSearch(search);
  const length = Date.parse(filters.toExclusive) - Date.parse(filters.from);
  const priorFrom = new Date(Date.parse(filters.from) - length).toISOString().slice(0, 10);
  const prior = { ...filters, from: priorFrom, toExclusive: filters.from };
  const mode = search.view === 'change' ? 'change' : 'volume';
  let current: Area[]; let previous: Area[];
  try {
    [current, previous] = await Promise.all([
      rest<Area[]>('areas', filterParams(filters)),
      rest<Area[]>('areas', filterParams(prior)),
    ]);
  } catch (error) {
    return <><div className="page-heading"><div className="eyebrow">MAP</div><h1>Where reports concentrate.</h1></div><ErrorPanel message={String(error)} /></>;
  }
  const total = current.reduce((sum, row) => sum + row.requestCount, 0);
  return <>
    <div className="page-heading spread"><div><div className="eyebrow">MAP / BOROUGH VIEW</div><h1>Where reports concentrate.</h1><p>Compare the number of selected requests across NYC boroughs.</p></div><div className="segmented"><Link className={mode === 'volume' ? 'selected' : ''} href={'/map?' + (() => { const p = filterParams(filters); p.set('view', 'volume'); return p; })()}>Volume</Link><Link className={mode === 'change' ? 'selected' : ''} href={'/map?' + (() => { const p = filterParams(filters); p.set('view', 'change'); return p; })()}>Change</Link></div></div>
    <div className="map-layout"><section className="panel map-panel"><SectionHeading eyebrow="GEOGRAPHY" title={mode === 'volume' ? 'Reported request volume' : 'Change from prior period'} detail="Click or use keyboard to filter to a borough" />{total ? <BoroughMap areas={current} prior={previous} filters={filters} mode={mode} /> : <EmptyState />}</section>
      <section className="panel map-table"><SectionHeading eyebrow="BOROUGH COMPARISON" title="Area detail" detail={`${integer(total)} selected reports`} /><table><thead><tr><th>Borough</th><th>Requests</th><th>Share</th><th>Change</th></tr></thead><tbody>{current.map((row) => {
        const past = previous.find((p) => p.borough === row.borough)?.requestCount ?? 0;
        return <tr key={row.borough}><td><Link href={'/explore?' + filterParams({ ...filters, borough: row.borough })}>{row.borough}</Link></td><td>{integer(row.requestCount)}</td><td>{percent(total ? row.requestCount / total : null)}</td><td>{percent(past ? (row.requestCount - past) / past : null)}</td></tr>;
      })}</tbody></table></section></div>
    <p className="footnote">Boundaries: NYC Department of City Planning, Borough Boundaries dataset gthc-hcne. Darker color means more reports under this view. Counts reflect reporting behavior as well as underlying conditions; they do not measure confirmed incidents or per-resident rates.</p>
  </>;
}
