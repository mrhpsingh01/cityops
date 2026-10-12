import Link from 'next/link';
import { AreaProblemMix, Filters, ProblemSignal, filterParams } from '@/lib/api';
import { EmptyState, integer, percent } from './data-display';

const palette = ['#277f73', '#be7951', '#687f9a', '#8b7699', '#9b9a5d', '#597b68'];
const dashboardHref = (filters: Filters, grouping: 'day' | 'week') => {
  const params = filterParams(filters);
  if (grouping === 'week') params.set('grouping', 'week');
  return '/dashboard?' + params;
};

export function ProblemMovement({ rows, filters, priorAvailable, grouping }: { rows: ProblemSignal[]; filters: Filters; priorAvailable: boolean; grouping: 'day' | 'week' }) {
  if (!priorAvailable) return <EmptyState title="Prior period outside coverage" detail="Choose a later From date so both equal-length windows fall inside the import." />;
  if (!rows.length) return <EmptyState />;
  const maxDelta = Math.max(1, ...rows.map((row) => Math.abs(row.currentCount - row.priorCount)));
  return <div className="movement-list">
    <div className="movement-axis" aria-hidden="true"><span>Fewer reports</span><span>More reports</span></div>
    {rows.map((row) => {
      const delta = row.currentCount - row.priorCount;
      const change = row.priorCount ? delta / row.priorCount : null;
      return <Link className="movement-row" href={dashboardHref({ ...filters, problem: row.problem }, grouping)} key={row.problem} aria-label={`${row.problem}: ${integer(row.currentCount)} reports, ${integer(row.priorCount)} prior, ${change == null ? 'no percentage baseline' : `${percent(change)} change`}. Filter overview to this problem.`}>
        <span className="movement-name">{row.problem}<small>{integer(row.currentCount)} selected · {integer(row.priorCount)} prior</small></span>
        <span className="movement-track" aria-hidden="true"><span className={'movement-fill ' + (delta >= 0 ? 'up' : 'down')} style={{ width: `${Math.abs(delta) / maxDelta * 48}%` }} /></span>
        <strong className={delta >= 0 ? 'movement-up' : 'movement-down'}>{change == null ? 'No baseline' : `${delta > 0 ? '+' : ''}${percent(change)}`}</strong>
      </Link>;
    })}
    <p className="chart-caption">Bar length compares absolute count change within this view. A zero prior count has no percentage change. Select a problem to filter the dashboard.</p>
  </div>;
}

export function SevenDayOutcomes({ rows, filters }: { rows: ProblemSignal[]; filters: Filters }) {
  const eligible = rows.filter((row) => row.currentCount > 0);
  if (!eligible.length) return <EmptyState />;
  const rate = (row: ProblemSignal) => (row.eligibleCount - row.closedWithin7Count) / row.eligibleCount * 1000;
  const measured = eligible.filter((row) => row.eligibleCount >= 30);
  const maxRate = Math.max(0, ...measured.map(rate));
  return <div className="outcome-list">
    <div className="outcome-scale"><span>0</span><span>{maxRate.toFixed(2)} per 1,000</span></div>
    {eligible.map((row) => {
      const enough = row.eligibleCount >= 30;
      const unresolved = row.eligibleCount - row.closedWithin7Count;
      return <Link className="outcome-row" href={'/resolution?' + filterParams({ ...filters, problem: row.problem })} key={row.problem} aria-label={`${row.problem}: ${enough ? `${rate(row).toFixed(2)} not closed within seven days per 1,000 eligible requests` : 'fewer than 30 eligible requests, rate withheld'}. Open resolution view.`}>
        <span className="outcome-name">{row.problem}<small>{integer(row.eligibleCount)} eligible · {integer(unresolved)} not closed within 7 days</small></span>
        <span className="outcome-track" aria-hidden="true">{enough && rate(row) > 0 && <span style={{ width: `${Math.min(100, rate(row) / maxRate * 100)}%` }} />}</span>
        <strong>{enough ? rate(row).toFixed(2) : 'n < 30'}</strong>
      </Link>;
    })}
    <p className="chart-caption">Not closed within seven days per 1,000 eligible requests. Bars use a relative scale; values are labeled. Rates with fewer than 30 eligible requests are withheld. This is distinct from currently open work.</p>
  </div>;
}

export function BoroughProblemMix({ rows, filters, problemOrder, grouping }: { rows: AreaProblemMix[]; filters: Filters; problemOrder: string[]; grouping: 'day' | 'week' }) {
  const mapped = rows.filter((row) => ['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'].includes(row.borough.toUpperCase()));
  const excluded = rows.filter((row) => !mapped.includes(row)).reduce((sum, row) => sum + row.requestCount, 0);
  if (!mapped.length) return <EmptyState title="No mapped boroughs" detail="Selected requests have no source borough among the five NYC boroughs." />;
  const problems = Array.from(new Set(mapped.map((row) => row.problem)));
  const color = (problem: string) => palette[Math.max(0, problemOrder.indexOf(problem)) % palette.length];
  const boroughs = Array.from(new Set(mapped.map((row) => row.borough))).map((borough) => ({
    borough,
    segments: mapped.filter((row) => row.borough === borough),
    total: mapped.filter((row) => row.borough === borough).reduce((sum, row) => sum + row.requestCount, 0),
  })).sort((a, b) => b.total - a.total);
  return <div className="mix-chart">
    <div className="mix-legend">{problems.map((problem) => <span key={problem}><i style={{ backgroundColor: color(problem) }} />{problem}</span>)}</div>
    <div className="mix-rows">{boroughs.map((area) => <div className="mix-row" key={area.borough}>
      <Link className="mix-area" href={dashboardHref({ ...filters, borough: area.borough }, grouping)} aria-label={`Filter overview to ${area.borough}`}>{area.borough}</Link>
      <div className="mix-stack">{area.segments.map((segment) => <Link key={segment.problem} href={dashboardHref({ ...filters, borough: area.borough, problem: segment.problem }, grouping)} className="mix-segment" style={{ width: `${segment.requestCount / area.total * 100}%`, backgroundColor: color(segment.problem) }} title={`${area.borough} · ${segment.problem}: ${integer(segment.requestCount)} (${percent(segment.requestCount / area.total)})`} aria-label={`${area.borough}, ${segment.problem}: ${integer(segment.requestCount)} reports, ${percent(segment.requestCount / area.total)} of this borough's selected requests. Filter overview.`} />)}</div>
      <strong>{integer(area.total)}</strong>
    </div>)}</div>
    <p className="chart-caption">Each bar totals 100% of selected requests in that borough. Length is composition, not borough volume; totals are shown at right. Select a segment to filter both area and problem. {excluded ? `${integer(excluded)} request${excluded === 1 ? '' : 's'} with an unmapped borough ${excluded === 1 ? 'is' : 'are'} excluded.` : ''}</p>
  </div>;
}
