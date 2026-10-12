import Link from 'next/link';
import { Area, Filters, filterParams, Problem, TrendPoint } from '@/lib/api';

export const integer = (value: number) => new Intl.NumberFormat('en-US').format(value);
export const percent = (value: number | null) => value == null ? '—' : new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value);
export const closurePercent = (value: number | null) => value == null ? '—' : new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: value < 1 && value >= 0.999 ? 3 : 1,
}).format(value);
export const hours = (value: number | null) => value == null ? '—' : value < 24 ? `${value.toFixed(1)} h` : `${(value / 24).toFixed(1)} d`;

export function EmptyState({ title = 'No records for this view', detail }: { title?: string; detail?: string }) {
  return <div className="empty-state"><div className="empty-symbol">∅</div><h3>{title}</h3><p>{detail ?? 'Try a broader date range or remove a filter. CityOps only includes the stated supported slice.'}</p></div>;
}
export function ErrorPanel({ message }: { message: string }) {
  const invalid = /date|filter|range|invalid|validation|bad request/i.test(message);
  return <div className="error-panel" role="alert"><strong>{invalid ? 'Check the selected filters' : 'Data is unavailable'}</strong><p>{message}</p><p>{invalid ? 'Choose dates within the supported coverage, with From earlier than To.' : 'The published data could not be loaded. Refresh the page or check the local API and database.'}</p><Link href="/dashboard">Reset to the supported view ↗</Link></div>;
}
export function MetricCard({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return <article className={'metric-card ' + (accent ? 'accent' : '')}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></article>;
}
export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}
const day = 86400000;
const dateAt = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);
export function TrendChart({ current, previous, filters, grouping, priorAvailable }: { current: TrendPoint[]; previous: TrendPoint[]; filters: Filters; grouping: 'day' | 'week'; priorAvailable: boolean }) {
  const start = Date.parse(filters.from + 'T00:00:00Z');
  const end = Date.parse(filters.toExclusive + 'T00:00:00Z');
  const days = Math.round((end - start) / day);
  if (!Number.isFinite(days) || days < 1) return <EmptyState detail="Choose a valid date range to compare periods." />;
  const priorStart = start - (end - start);
  const currentByDate = new Map(current.map((point) => [point.period, point.requestCount]));
  const previousByDate = new Map(previous.map((point) => [point.period, point.requestCount]));
  const step = grouping === 'week' ? 7 : 1;
  const bins = Array.from({ length: Math.ceil(days / step) }, (_, index) => {
    const offset = index * step;
    const span = Math.min(step, days - offset);
    const selectedFrom = dateAt(start + offset * day);
    const selectedTo = dateAt(start + (offset + span) * day);
    const priorFrom = dateAt(priorStart + offset * day);
    const priorTo = dateAt(priorStart + (offset + span) * day);
    let selectedCount = 0; let priorCount = 0;
    for (let i = 0; i < span; i++) {
      selectedCount += currentByDate.get(dateAt(start + (offset + i) * day)) ?? 0;
      priorCount += previousByDate.get(dateAt(priorStart + (offset + i) * day)) ?? 0;
    }
    return { selectedFrom, selectedTo, priorFrom, priorTo, selectedCount, priorCount, partial: span < step };
  });
  const max = Math.max(1, ...bins.flatMap((bin) => priorAvailable ? [bin.selectedCount, bin.priorCount] : [bin.selectedCount]));
  return <>
    <div className="comparison-legend"><span><i className="legend-selected" />Selected · {filters.from} to {dateAt(end - day)}</span><span>{priorAvailable && <i className="legend-prior" />}Prior · {priorAvailable ? `${dateAt(priorStart)} to ${dateAt(start - day)}` : 'outside imported coverage'}</span></div>
    <div className="trend-scroll"><div className="trend-chart comparison-chart" style={{ minWidth: `${Math.max(100, bins.length * (grouping === 'week' ? 93 : 49))}px` }}>
      {bins.map((bin) => <div className="trend-pair" key={bin.selectedFrom}>
        {priorAvailable && <Link className="trend-col prior" href={'/explore?' + filterParams({ ...filters, from: bin.priorFrom, toExclusive: bin.priorTo })} title={`Prior ${bin.priorFrom}–${bin.priorTo}: ${integer(bin.priorCount)} requests`} aria-label={`Prior ${bin.priorFrom} to ${bin.priorTo}: ${integer(bin.priorCount)} reports. Explore records.`}><span className="trend-bar" style={{ height: `${Math.max(2, bin.priorCount / max * 100)}%` }} /></Link>}
        <Link className="trend-col selected" href={'/explore?' + filterParams({ ...filters, from: bin.selectedFrom, toExclusive: bin.selectedTo })} title={`Selected ${bin.selectedFrom}–${bin.selectedTo}: ${integer(bin.selectedCount)} requests`} aria-label={`Selected ${bin.selectedFrom} to ${bin.selectedTo}: ${integer(bin.selectedCount)} reports. Explore records.`}><span className="trend-bar" style={{ height: `${Math.max(2, bin.selectedCount / max * 100)}%` }} /></Link>
        <span className="trend-date">{bin.selectedFrom.slice(5)}{bin.partial ? ' *' : ''}</span>
      </div>)}
    </div></div>
    <p className="chart-caption">{grouping === 'week' ? 'Seven-day bins start at the selected From date. * Final bin is shorter.' : 'One bin per day; scroll to inspect the full period.'} Bars open matching request records. {priorAvailable ? 'Missing days within coverage count as zero.' : 'The earlier comparison is unavailable because that window precedes the import.'}</p>
  </>;
}
export function Breakdown({ rows, filters }: { rows: Problem[]; filters: Filters }) {
  if (!rows.length) return <EmptyState />;
  const total = rows.reduce((sum, row) => sum + row.requestCount, 0);
  return <div className="breakdown-list">{rows.map((row, i) => <Link className="breakdown-row" key={row.problem} href={'/explore?' + filterParams({ ...filters, problem: row.problem })}>
    <span className="rank">{String(i + 1).padStart(2, '0')}</span><span className="breakdown-name">{row.problem}<span className="breakdown-track"><span style={{ width: `${row.requestCount / total * 100}%` }} /></span></span>
    <span className="breakdown-value">{integer(row.requestCount)}<small>{percent(row.requestCount / total)}</small></span>
  </Link>)}</div>;
}
export function Areas({ rows, filters }: { rows: Area[]; filters: Filters }) {
  if (!rows.length) return <EmptyState />;
  const max = Math.max(...rows.map((r) => r.requestCount), 1);
  return <div className="area-list">{rows.map((row) => <Link className="area-row" href={'/map?' + filterParams({ ...filters, borough: row.borough })} key={row.borough}>
    <span>{row.borough}</span><span className="area-track"><span style={{ width: `${row.requestCount / max * 100}%` }} /></span><strong>{integer(row.requestCount)}</strong>
  </Link>)}</div>;
}
