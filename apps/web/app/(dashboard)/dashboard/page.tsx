import Link from 'next/link';
import { Breakdown, Areas, ErrorPanel, MetricCard, SectionHeading, TrendChart, closurePercent, hours, integer, percent } from '@/components/data-display';
import { MetricExplain } from '@/components/metric-explain';
import { HeadlineBanner } from '@/components/headline-banner';
import { BoroughProblemMix, ProblemMovement, SevenDayOutcomes } from '@/components/overview-visuals';
import { Area, AreaProblemMix, Filters, getHotspots, getMetadata, gql, Metadata, Overview, Problem, ProblemSignal, Search, TrendPoint, filtersFromSearch, filterParams } from '@/lib/api';

const QUERY = `query Dashboard($filters: AnalysisFilterInput!, $priorFilters: AnalysisFilterInput!) {
  overview(filters: $filters) {
    requestCount previousCount periodChange openCount eligibleCount
    sevenDayClosureRate medianCloseHours closedSample invalidDurationCount
    asOf from toExclusive
  }
  currentTrend: intakeTrend(filters: $filters, grouping: "day") { period requestCount }
  priorTrend: intakeTrend(filters: $priorFilters, grouping: "day") { period requestCount }
  problemBreakdown(filters: $filters) { problem requestCount }
  areaComparison(filters: $filters) { borough requestCount }
  problemSignals(filters: $filters) { problem currentCount priorCount eligibleCount closedWithin7Count }
  areaProblemMix(filters: $filters) { borough problem requestCount }
  resolution(filters: $filters) { durations { problem sample p50Hours } }
}`;
type DashboardData = { overview: Overview; currentTrend: TrendPoint[]; priorTrend: TrendPoint[]; problemBreakdown: Problem[]; areaComparison: Area[]; problemSignals: ProblemSignal[]; areaProblemMix: AreaProblemMix[]; resolution: { durations: Array<{ problem: string; sample: number; p50Hours: number | null }> } };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const filters: Filters = filtersFromSearch(search);
  const grouping = search.grouping === 'week' ? 'week' : 'day';
  const length = Date.parse(filters.toExclusive) - Date.parse(filters.from);
  const priorFrom = Number.isFinite(length) && length > 0 ? new Date(Date.parse(filters.from) - length).toISOString().slice(0, 10) : filters.from;
  const priorFilters = { ...filters, from: priorFrom, toExclusive: filters.from };
  let data: DashboardData;
  let metadata: Metadata;
  let hotspotCount = 0;
  const hotspotParams = new URLSearchParams();
  if (filters.problem) hotspotParams.set('problem', filters.problem);
  if (filters.borough) hotspotParams.set('borough', filters.borough);
  try { let spots; [data, metadata, spots] = await Promise.all([gql<DashboardData>(QUERY, { filters, priorFilters }), getMetadata(), getHotspots(hotspotParams)]); hotspotCount = spots.length; }
  catch (error) { return <><div className="page-heading"><div className="eyebrow">OVERVIEW</div><h1>What changed in reported requests?</h1></div><ErrorPanel message={String(error)} /></>; }
  const { overview: summary } = data;
  const current = summary.requestCount;
  const previous = summary.previousCount;
  const change = summary.periodChange;
  const priorAvailable = priorFrom >= metadata.supportedScope.from && filters.from <= metadata.supportedScope.toExclusive;
  return <>
    <div className="page-heading spread"><div><div className="eyebrow">OVERVIEW / HISTORICAL CASE STUDY</div><h1>What changed in reported requests?</h1><p>Intake, closure, and area signals for the selected creation period.</p></div><Link className="text-action" href={'/methodology?' + filterParams(filters)}>How these metrics work ↗</Link></div>
    <HeadlineBanner filters={filters} durations={data.resolution.durations} hotspotCount={hotspotCount} />
    <div className="metric-grid">
      <MetricCard label="REQUESTS CREATED" value={integer(current)} note={`${filters.from} to ${filters.toExclusive} (exclusive)`} accent />
      <MetricCard label="VS. PREVIOUS PERIOD" value={change == null ? 'No baseline' : `${change >= 0 ? '+' : ''}${percent(change)}`} note={`${integer(previous)} in the prior equal-length period`} />
      <MetricCard label="OPEN IN SELECTED COHORT" value={integer(summary.openCount)} note="Latest ingested status at refresh" />
      <MetricCard label="CLOSED WITHIN 7 DAYS" value={closurePercent(summary.sevenDayClosureRate)} note={`${integer(summary.eligibleCount)} mature requests eligible`} />
      <MetricCard label="MEDIAN TIME TO CLOSE" value={hours(summary.medianCloseHours)} note={`${integer(summary.closedSample)} valid closed requests`} />
    </div>
    <div className="dashboard-grid">
      <section className="panel wide"><SectionHeading eyebrow="INTAKE TREND" title="Selected versus prior period" detail="Reported requests · equal-length windows" action={<Link className="text-action" href={'/explore?' + filterParams(filters)}>Explore all ↗</Link>} /><div className="chart-tools"><div className="segmented" aria-label="Trend grouping"><Link aria-current={grouping === 'day' ? 'page' : undefined} className={grouping === 'day' ? 'selected' : ''} href={'/dashboard?' + (() => { const p = filterParams(filters); p.set('grouping', 'day'); return p; })()}>Daily</Link><Link aria-current={grouping === 'week' ? 'page' : undefined} className={grouping === 'week' ? 'selected' : ''} href={'/dashboard?' + (() => { const p = filterParams(filters); p.set('grouping', 'week'); return p; })()}>Weekly</Link></div><MetricExplain title="Intake trend" definition="Distinct imported requests by NYC-local creation date. The prior series uses the immediately preceding window of the same length when that window is covered by the import; zero-count days inside coverage are included." filters={filters} exclusions="Records missing a valid creation date are excluded from the clean request table. Prior periods before the imported scope are omitted." queryName="analytics.metrics.getTrend + aligned seven-day bins" /></div><TrendChart current={data.currentTrend} previous={data.priorTrend} filters={filters} grouping={grouping} priorAvailable={priorAvailable} /></section>
      <section className="panel"><SectionHeading eyebrow="PROBLEM MIX" title="What residents reported" detail="Share within the selected requests" /><MetricExplain title="Problem mix" definition="Count of distinct requests per problem divided by all requests matching the current filters." filters={filters} exclusions="Only the three imported problem categories are represented." queryName="analytics.metrics.getProblems" /><Breakdown rows={data.problemBreakdown} filters={filters} /></section>
      <section className="panel"><SectionHeading eyebrow="AREA COMPARISON" title="Across boroughs" detail="Raw report counts, not incident prevalence" /><MetricExplain title="Borough comparison" definition="Distinct created requests grouped by source borough for the selected period." filters={filters} exclusions="Records without a mapped borough do not appear in borough rows." queryName="analytics.metrics.getAreas" /><Areas rows={data.areaComparison} filters={filters} /></section>
    </div>
    <div className="overview-section-intro"><div className="eyebrow">INVESTIGATE THE DRIVERS</div><h2>What sits behind the headline?</h2><p>Compare problem movement, seven-day outcomes, and the mix within each borough. Every view uses the filters above.</p></div>
    <div className="overview-deep-grid">
      <section className="panel"><SectionHeading eyebrow="PROBLEM MOMENTUM" title="Which problems moved?" detail="Selected minus preceding equal-length period" action={<Link className="text-action" href={'/explore?' + filterParams(filters)}>Inspect records ↗</Link>} /><MetricExplain title="Problem momentum" definition="Distinct request counts by problem for the selected creation period and the immediately preceding equal-length period. Percentage change is calculated only when the prior count is above zero." filters={filters} exclusions="The comparison is withheld if the prior window begins before the imported source scope." queryName="analytics.metrics.getProblemSignals" /><ProblemMovement rows={data.problemSignals} filters={filters} priorAvailable={priorAvailable} grouping={grouping} /></section>
      <section className="panel"><SectionHeading eyebrow="SEVEN-DAY OUTCOME" title="Without closure by day seven" detail="Not closed within seven days · per 1,000 eligible requests" action={<Link className="text-action" href={'/resolution?' + filterParams(filters)}>Resolution detail ↗</Link>} /><MetricExplain title="Seven-day outcome by problem" definition="For requests with a full seven-day observation window, count those without a valid closure recorded within seven days. Divide by all eligible requests for that problem and multiply by 1,000." filters={filters} exclusions="Rates are withheld for groups with fewer than 30 eligible requests. Invalid closure durations do not count as closed within seven days." queryName="analytics.metrics.getProblemSignals" /><SevenDayOutcomes rows={data.problemSignals} filters={filters} /></section>
      <section className="panel full"><SectionHeading eyebrow="GEOGRAPHIC COMPOSITION" title="What each borough reports" detail="Share of selected requests within each borough · totals shown at right" action={<Link className="text-action" href={'/map?' + filterParams(filters)}>Open map ↗</Link>} /><MetricExplain title="Borough problem mix" definition="For each mapped NYC borough, a problem's request count divided by all imported requests matching the selected filters in that borough." filters={filters} exclusions="Boroughs with no matching requests are absent. Requests with an unmapped or unspecified source borough are excluded and counted in the chart note." queryName="analytics.metrics.getAreaProblemMix" /><BoroughProblemMix rows={data.areaProblemMix} filters={filters} problemOrder={metadata.supportedScope.problems} grouping={grouping} /></section>
    </div>
    <section className="finding-card"><div><div className="eyebrow">ANALYST NOTE</div><h2>Read the change in context.</h2><p>{current && previous ? `Selected reports ${current >= previous ? 'rose' : 'fell'} ${percent(Math.abs(change ?? 0))} against the preceding equal-length period. Check problem mix and borough patterns before treating a count shift as an operational change.` : 'A previous-period comparison needs imported records for both time windows. Expand the source slice to support that view.'}</p></div><Link href={'/insights?' + filterParams(filters)}>Read the analysis <span>↗</span></Link></section>
    <p className="footnote">311 counts measure reports received. The seven-day threshold is an analytical definition, not an official NYC service target. {summary.invalidDurationCount ? `${integer(summary.invalidDurationCount)} invalid durations are excluded.` : ''}</p>
  </>;
}
