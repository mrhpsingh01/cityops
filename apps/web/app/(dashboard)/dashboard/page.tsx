import Link from 'next/link';
import { Breakdown, Areas, ErrorPanel, MetricCard, SectionHeading, TrendChart, closurePercent, hours, integer, percent } from '@/components/data-display';
import { Area, Filters, gql, Overview, Problem, Search, TrendPoint, filtersFromSearch, filterParams } from '@/lib/api';

const QUERY = `query Dashboard($filters: AnalysisFilterInput!) {
  overview(filters: $filters) {
    requestCount previousCount periodChange openCount eligibleCount
    sevenDayClosureRate medianCloseHours closedSample invalidDurationCount
    asOf from toExclusive
  }
  intakeTrend(filters: $filters, grouping: "day") { period requestCount }
  problemBreakdown(filters: $filters) { problem requestCount }
  areaComparison(filters: $filters) { borough requestCount }
}`;
type DashboardData = { overview: Overview; intakeTrend: TrendPoint[]; problemBreakdown: Problem[]; areaComparison: Area[] };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters: Filters = filtersFromSearch(await searchParams);
  let data: DashboardData;
  try { data = await gql<DashboardData>(QUERY, { filters }); }
  catch (error) { return <><div className="page-heading"><div className="eyebrow">OVERVIEW</div><h1>What changed in reported requests?</h1></div><ErrorPanel message={String(error)} /></>; }
  const { overview: summary } = data;
  const current = summary.requestCount;
  const previous = summary.previousCount;
  const change = summary.periodChange;
  return <>
    <div className="page-heading spread"><div><div className="eyebrow">OVERVIEW / JANUARY 2025 SLICE</div><h1>What changed in reported requests?</h1><p>Intake, closure, and area signals for the selected creation period.</p></div><Link className="text-action" href={'/methodology?' + filterParams(filters)}>How these metrics work ↗</Link></div>
    <div className="metric-grid">
      <MetricCard label="REQUESTS CREATED" value={integer(current)} note={`${filters.from} to ${filters.toExclusive} (exclusive)`} accent />
      <MetricCard label="VS. PREVIOUS PERIOD" value={change == null ? 'No baseline' : `${change >= 0 ? '+' : ''}${percent(change)}`} note={`${integer(previous)} in the prior equal-length period`} />
      <MetricCard label="OPEN IN SELECTED COHORT" value={integer(summary.openCount)} note="Latest ingested status at refresh" />
      <MetricCard label="CLOSED WITHIN 7 DAYS" value={closurePercent(summary.sevenDayClosureRate)} note={`${integer(summary.eligibleCount)} mature requests eligible`} />
      <MetricCard label="MEDIAN TIME TO CLOSE" value={hours(summary.medianCloseHours)} note={`${integer(summary.closedSample)} valid closed requests`} />
    </div>
    <div className="dashboard-grid">
      <section className="panel wide"><SectionHeading eyebrow="INTAKE TREND" title="Requests through the month" detail="Daily request count · selected filters" action={<Link className="text-action" href={'/explore?' + filterParams(filters)}>Explore all ↗</Link>} /><TrendChart points={data.intakeTrend} filters={filters} /></section>
      <section className="panel"><SectionHeading eyebrow="PROBLEM MIX" title="What residents reported" detail="Share within the selected requests" /><Breakdown rows={data.problemBreakdown} filters={filters} /></section>
      <section className="panel"><SectionHeading eyebrow="AREA COMPARISON" title="Across boroughs" detail="Raw report counts, not incident prevalence" /><Areas rows={data.areaComparison} filters={filters} /></section>
    </div>
    <section className="finding-card"><div><div className="eyebrow">ANALYST NOTE</div><h2>Read the change in context.</h2><p>{current && previous ? `Selected reports ${current >= previous ? 'rose' : 'fell'} ${percent(Math.abs(change ?? 0))} against the preceding equal-length period. Check problem mix and borough patterns before treating a count shift as an operational change.` : 'A previous-period comparison needs imported records for both time windows. Expand the source slice to support that view.'}</p></div><Link href={'/insights?' + filterParams(filters)}>Read the analysis <span>↗</span></Link></section>
    <p className="footnote">311 counts measure reports received. The seven-day threshold is an analytical definition, not an official NYC service target. {summary.invalidDurationCount ? `${integer(summary.invalidDurationCount)} invalid durations are excluded.` : ''}</p>
  </>;
}
