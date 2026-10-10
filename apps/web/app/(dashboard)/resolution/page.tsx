import Link from 'next/link';
import { EmptyState, ErrorPanel, SectionHeading, closurePercent, hours, integer } from '@/components/data-display';
import { Resolution, Search, filtersFromSearch, gql, filterParams } from '@/lib/api';

const QUERY = `query Dashboard($filters: AnalysisFilterInput!) {
  resolution(filters: $filters) {
    asOf
    cohorts { week eligible closedWithin7 rate }
    durations { problem sample p50Hours p75Hours p90Hours openCount }
    backlog { band requestCount }
  }
}`;
export default async function ResolutionPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = filtersFromSearch(await searchParams);
  let data: Resolution;
  try { data = (await gql<{ resolution: Resolution }>(QUERY, { filters })).resolution; }
  catch (error) { return <><div className="page-heading"><div className="eyebrow">RESOLUTION</div><h1>How long do requests take to close?</h1></div><ErrorPanel message={String(error)} /></>; }
  const maxBacklog = Math.max(...data.backlog.map((r) => r.requestCount), 1);
  return <>
    <div className="page-heading spread"><div><div className="eyebrow">RESOLUTION / CREATION COHORTS</div><h1>How long do requests take to close?</h1><p>Closure patterns, mature seven-day cohorts, and the latest observed open work.</p></div><Link className="text-action" href={'/methodology?' + filterParams(filters)}>Metric definitions ↗</Link></div>
    <div className="resolution-grid">
      <section className="panel wide"><SectionHeading eyebrow="SEVEN-DAY OUTCOME" title="Closure by creation week" detail="Only complete weeks with a full seven-day observation window" />
        {data.cohorts.length ? <div className="cohort-chart">{data.cohorts.map((row) => <div className="cohort-row" key={row.week}><span>{row.week}</span><div className="cohort-track"><div style={{ width: `${(row.rate ?? 0) * 100}%` }} /></div><strong>{closurePercent(row.rate)}</strong><small>{integer(row.closedWithin7)} / {integer(row.eligible)}</small></div>)}</div> : <EmptyState title="No mature weekly cohorts" detail="Choose an earlier date range with fully observed creation weeks." />}</section>
      <section className="panel"><SectionHeading eyebrow="OPEN AT LAST REFRESH" title="Age of open requests" detail="Selected cohort only · latest ingested status" /><div className="backlog-bars">{data.backlog.map((row) => <div key={row.band}><div className="backlog-label"><span>{row.band} days</span><strong>{integer(row.requestCount)}</strong></div><div className="backlog-track"><span style={{ width: `${row.requestCount / maxBacklog * 100}%` }} /></div></div>)}</div><p className="chart-caption">A historical backlog series requires saved daily status snapshots; current status is not projected backward.</p></section>
      <section className="panel full"><SectionHeading eyebrow="CLOSE DURATION" title="Distribution by problem" detail="Valid closed requests only · hours shown as days where helpful" /><div className="table-scroll"><table className="duration-table"><thead><tr><th>Problem</th><th>Closed sample</th><th>Median</th><th>75th percentile</th><th>90th percentile</th><th>Still open</th></tr></thead><tbody>{data.durations.map((row) => <tr key={row.problem}><td>{row.problem}</td><td>{integer(row.sample)}</td><td>{hours(row.p50Hours)}</td><td>{hours(row.p75Hours)}</td><td>{hours(row.p90Hours)}</td><td>{integer(row.openCount)}</td></tr>)}</tbody></table></div></section>
    </div>
    <p className="footnote">Closure is a recorded administrative state, not proof that a resident’s underlying issue was resolved. CityOps does not assert an official seven-day service target.</p>
  </>;
}
