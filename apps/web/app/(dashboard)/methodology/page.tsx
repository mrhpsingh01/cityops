import Link from 'next/link';
import { ErrorPanel, SectionHeading, integer } from '@/components/data-display';
import { getMetadata, rest } from '@/lib/api';

type Quality = {
  latestRun: { run_id: string; status: string; rows_seen: string; rows_inserted: string; rows_updated: string; error_message: string | null } | null;
  flags: Record<string, number>; quarantined: number;
};
const metrics = [
  ['Requests created', 'Distinct request IDs with source NYC-local created time in the half-open selected range.', 'Reports received, not confirmed incidents.'],
  ['Currently open', 'Selected requests whose latest ingested status is normalized as open.', 'A current status cannot reconstruct historical backlog.'],
  ['Time to close', 'Recorded closed time minus created time when both timestamps are valid and nonnegative.', 'Open requests have no completed duration.'],
  ['Seven-day closure', 'Mature creation-cohort requests with valid closure recorded within seven days, divided by all eligible requests.', 'Seven days is an analytical threshold, not an NYC SLA.'],
  ['Period change', 'Current count against the preceding equal-length period.', 'No percentage is shown when the prior count is zero.'],
  ['Problem share', 'Problem count divided by all requests under the current filters.', 'Changes when filters change.'],
];
export default async function MethodologyPage() {
  let metadata; let quality: Quality;
  try { [metadata, quality] = await Promise.all([getMetadata(), rest<Quality>('data-quality')]); }
  catch (error) { return <><div className="page-heading"><div className="eyebrow">METHODOLOGY</div><h1>How CityOps measures requests.</h1></div><ErrorPanel message={String(error)} /></>; }
  return <>
    <div className="page-heading"><div className="eyebrow">METHODOLOGY / SOURCE & DEFINITIONS</div><h1>How CityOps measures requests.</h1><p>Source coverage, refresh health, metric contracts, and limitations are part of every interpretation.</p></div>
    <div className="method-grid">
      <section className="panel"><SectionHeading eyebrow="DATA SOURCE" title="NYC Open Data 311" /><dl className="detail-list compact"><div><dt>Dataset</dt><dd><a href={metadata.sourceUrl} target="_blank" rel="noreferrer">erm2-nwe9 ↗</a></dd></div><div><dt>Supported source window</dt><dd>Jan 1–31, 2025</dd></div><div><dt>Problems</dt><dd>{metadata.supportedScope.problems.join(' · ')}</dd></div><div><dt>Loaded records</dt><dd>{integer(metadata.loadedCoverage.requestCount)}</dd></div><div><dt>Oldest / newest loaded</dt><dd>{metadata.loadedCoverage.oldest ?? '—'} / {metadata.loadedCoverage.newest ?? '—'}</dd></div><div><dt>Last successful refresh</dt><dd>{metadata.asOf ?? 'None yet'}</dd></div></dl></section>
      <section className="panel"><SectionHeading eyebrow="QUALITY MONITOR" title="Latest ingestion status" /><dl className="detail-list compact"><div><dt>Run status</dt><dd>{quality.latestRun?.status ?? 'No run yet'}</dd></div><div><dt>Rows seen</dt><dd>{quality.latestRun ? integer(Number(quality.latestRun.rows_seen)) : '—'}</dd></div><div><dt>Inserted / updated</dt><dd>{quality.latestRun ? `${integer(Number(quality.latestRun.rows_inserted))} / ${integer(Number(quality.latestRun.rows_updated))}` : '—'}</dd></div><div><dt>Quarantined</dt><dd>{integer(quality.quarantined)}</dd></div>{Object.entries(quality.flags).map(([flag, count]) => <div key={flag}><dt>{flag.replaceAll('_', ' ')}</dt><dd>{integer(count)}</dd></div>)}</dl>{quality.latestRun?.error_message && <p className="error-inline">{quality.latestRun.error_message}</p>}</section>
    </div>
    <section className="panel"><SectionHeading eyebrow="METRIC DICTIONARY" title="Definitions before charts" /><div className="table-scroll"><table className="method-table"><thead><tr><th>Metric</th><th>Definition</th><th>Interpretation limit</th></tr></thead><tbody>{metrics.map(([name, definition, caveat]) => <tr key={name}><td>{name}</td><td>{definition}</td><td>{caveat}</td></tr>)}</tbody></table></div></section>
    <section className="method-note"><h2>Source time and data limitations</h2><p>NYC publishes floating civil timestamps in this dataset. CityOps preserves them as NYC-local timestamps without inventing a UTC offset. Durations near daylight saving transitions inherit that ambiguity. Latest status does not reveal every prior reopening or reassignment. Coordinates may be absent or invalid. Counts reflect reporting behavior, population, and awareness as well as conditions.</p><p>Model features must be known at creation. The risk queue remains hidden until a future-period test beats a simple grouped historical-rate rule and calibration is documented.</p><Link href="/insights" className="text-action">See the analyses ↗</Link></section>
  </>;
}
