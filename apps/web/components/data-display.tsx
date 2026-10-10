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
  return <div className="error-panel" role="alert"><strong>Data is unavailable</strong><p>{message}</p><p>Start PostgreSQL, run the migration and importer, then refresh this page.</p></div>;
}
export function MetricCard({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return <article className={'metric-card ' + (accent ? 'accent' : '')}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></article>;
}
export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}
export function TrendChart({ points, filters }: { points: TrendPoint[]; filters: Filters }) {
  if (!points.length) return <EmptyState />;
  const max = Math.max(...points.map((p) => p.requestCount), 1);
  const selected = points.length > 17 ? points.filter((_, i) => i % 2 === 0) : points;
  return <>
    <div className="trend-chart" role="img" aria-label="Daily requests created; each bar opens matching requests">
      {selected.map((point) => {
        const next = new Date(Date.parse(point.period + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
        const query = filterParams({ ...filters, from: point.period, toExclusive: next });
        return <Link className="trend-col" key={point.period} href={'/explore?' + query} title={`${point.period}: ${integer(point.requestCount)} requests`} aria-label={`${point.period}: ${integer(point.requestCount)} requests. Explore records.`}>
          <span className="trend-count">{integer(point.requestCount)}</span>
          <span className="trend-bar" style={{ height: `${Math.max(8, point.requestCount / max * 100)}%` }} />
          <span className="trend-date">{point.period.slice(5)}</span>
        </Link>;
      })}
    </div>
    <p className="chart-caption">Daily count of selected requests. Click a bar to inspect records for that date.</p>
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
