import Link from 'next/link';
import { BoroughMap } from '@/components/borough-map';
import { EmptyState, ErrorPanel, SectionHeading, integer, percent } from '@/components/data-display';
import { MetricExplain } from '@/components/metric-explain';
import { Area, Metadata, Search, filterParams, filtersFromSearch, rest } from '@/lib/api';

export default async function MapPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const filters = filtersFromSearch(search);
  const length = Date.parse(filters.toExclusive) - Date.parse(filters.from);
  const priorFrom = Number.isFinite(length) && length > 0 ? new Date(Date.parse(filters.from) - length).toISOString().slice(0, 10) : filters.from;
  const prior = { ...filters, from: priorFrom, toExclusive: filters.from };
  const mode = search.view === 'change' ? 'change' : 'volume';
  let current: Area[]; let previous: Area[]; let metadata: Metadata;
  try {
    [current, previous, metadata] = await Promise.all([
      rest<Area[]>('areas', filterParams(filters)),
      rest<Area[]>('areas', filterParams(prior)),
      rest<Metadata>('metadata'),
    ]);
  } catch (error) {
    return <><div className="page-heading"><div className="eyebrow">MAP</div><h1>Where reports concentrate.</h1></div><ErrorPanel message={String(error)} /></>;
  }
  const total = current.reduce((sum, row) => sum + row.requestCount, 0);
  const priorAvailable = priorFrom >= metadata.supportedScope.from;
  const comparisonRows = Array.from(new Set([...current.map((row) => row.borough), ...previous.map((row) => row.borough)])).map((borough) => ({ borough, requestCount: current.find((row) => row.borough === borough)?.requestCount ?? 0 }));
  return <>
    <div className="page-heading spread"><div><div className="eyebrow">MAP / BOROUGH VIEW</div><h1>{mode === 'volume' ? 'Where reports concentrate.' : 'Where reports changed.'}</h1><p>{mode === 'volume' ? 'Compare the number of selected requests across NYC boroughs.' : priorAvailable ? `Compare ${filters.from}–${filters.toExclusive} with the preceding equal-length period beginning ${priorFrom}. A zero prior count has no percentage change.` : 'The preceding equal-length period is outside the imported January 2025 source window.'}</p></div><div className="segmented"><Link className={mode === 'volume' ? 'selected' : ''} href={'/map?' + (() => { const p = filterParams(filters); p.set('view', 'volume'); return p; })()}>Volume</Link><Link className={mode === 'change' ? 'selected' : ''} href={'/map?' + (() => { const p = filterParams(filters); p.set('view', 'change'); return p; })()}>Change</Link></div></div>
    <div className="map-layout"><section className="panel map-panel"><SectionHeading eyebrow="GEOGRAPHY" title={mode === 'volume' ? 'Reported request volume' : 'Change from prior period'} detail="Click or use keyboard to filter to a borough" /><MetricExplain title={mode === 'volume' ? 'Borough report volume' : 'Borough period change'} definition={mode === 'volume' ? 'Distinct requests created in each source borough during the selected period.' : 'Selected period count minus prior equal-length period count, divided by the prior count. Areas with zero prior reports have no defined percentage change.'} filters={filters} exclusions="Requests without a mapped borough are excluded from the map; comparisons outside the imported coverage are withheld." queryName="analytics.metrics.getAreas · NYC borough boundaries gthc-hcne" />{mode === 'change' && !priorAvailable ? <EmptyState title="Prior period outside coverage" detail="Choose a later From date so both equal-length windows fall in the January 2025 import." /> : comparisonRows.length ? <BoroughMap areas={current} prior={previous} filters={filters} mode={mode} /> : <EmptyState />}</section>
      <section className="panel map-table"><SectionHeading eyebrow="BOROUGH COMPARISON" title="Area detail" detail={`${integer(total)} selected reports`} /><table><thead><tr><th>Borough</th><th>Requests</th><th>Share</th><th>Change</th></tr></thead><tbody>{comparisonRows.map((row) => {
        const past = previous.find((p) => p.borough === row.borough)?.requestCount ?? 0;
        return <tr key={row.borough}><td><Link href={'/explore?' + filterParams({ ...filters, borough: row.borough })}>{row.borough}</Link></td><td>{integer(row.requestCount)}</td><td>{percent(total ? row.requestCount / total : null)}</td><td>{percent(priorAvailable && past ? (row.requestCount - past) / past : null)}</td></tr>;
      })}</tbody></table></section></div>
    <p className="footnote">Boundaries: NYC Department of City Planning, Borough Boundaries dataset gthc-hcne. {mode === 'volume' ? 'Darker teal means more reports.' : 'Teal means fewer reports; copper means more reports versus the prior equal-length period; gray means no defined percentage change.'} Counts reflect reporting behavior and do not measure confirmed incidents or per-resident rates.</p>
  </>;
}
