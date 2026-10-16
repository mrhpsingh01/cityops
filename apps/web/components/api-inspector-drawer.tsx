"use client";

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LightningIcon, CopyIcon, CheckIcon, CaretDownIcon } from '@phosphor-icons/react';
import { browserApi } from '@/lib/api';

interface ApiInspectorDrawerProps {
  open: boolean;
  onToggle: () => void;
}

type Probe = { status: number | null; ms: number | null; cursor: string | null; error: string | null };
const EMPTY: Probe = { status: null, ms: null, cursor: null, error: null };

const GQL_QUERY = `query ViewQuery($filters: AnalysisFilterInput!, $hotspotFilters: HotspotFilterInput) {
  overview(filters: $filters) {
    requestCount
    openCount
    sevenDayClosureRate
    medianCloseHours
  }
  hotspots(filters: $hotspotFilters) {
    clusterId
    complaintType
    incidentCount
    severityTier
    predictedTtcHours
  }
}`;

async function timed(run: () => Promise<Response>): Promise<{ res: Response; ms: number }> {
  const start = performance.now();
  const res = await run();
  return { res, ms: Math.round(performance.now() - start) };
}

export function ApiInspectorDrawer({ open, onToggle }: ApiInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<'rest' | 'graphql'>('rest');
  const [copied, setCopied] = useState(false);
  const [rest, setRest] = useState<Probe>(EMPTY);
  const [gql, setGql] = useState<Probe>(EMPTY);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get('from') ?? '2025-01-18';
  const toExclusive = searchParams.get('toExclusive') ?? '2025-02-01';
  const problem = searchParams.get('problem');
  const borough = searchParams.get('borough');

  const queryParams = new URLSearchParams();
  queryParams.set('from', from);
  queryParams.set('toExclusive', toExclusive);
  if (problem) queryParams.set('problem', problem);
  if (borough) queryParams.set('borough', borough);

  let endpoint = 'overview';
  const extra = new URLSearchParams();
  if (pathname === '/explore') extra.set('pageSize', '25');
  const route = pathname === '/explore' ? 'requests' : pathname === '/map' ? 'hotspots'
    : pathname === '/resolution' ? 'resolution' : pathname === '/risk' ? 'models/governance' : 'overview';
  endpoint = route;
  const restParams = route === 'models/governance' ? new URLSearchParams() : new URLSearchParams([...queryParams, ...extra]);
  const restUrl = `${browserApi}/api/v1/${endpoint}${restParams.toString() ? '?' + restParams.toString() : ''}`;
  const restCurl = `curl -s -X GET "${restUrl}" \\\n  -H "Accept: application/json"`;

  const gqlVariables = {
    filters: { from, toExclusive, problem: problem ?? undefined, borough: borough ?? undefined },
    hotspotFilters: { from, toExclusive, problem: problem ?? undefined, borough: borough ?? undefined },
  };
  const gqlVariablesJson = JSON.stringify(gqlVariables, null, 2);
  const gqlCurl = `curl -s -X POST "${browserApi}/graphql" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ query: GQL_QUERY, variables: gqlVariables })}'`;

  const probeKey = `${restUrl}|${gqlVariablesJson}`;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRest(EMPTY);
    setGql(EMPTY);
    (async () => {
      try {
        const { res, ms } = await timed(() => fetch(restUrl, { cache: 'no-store' }));
        let cursor: string | null = null;
        try { cursor = ((await res.clone().json()) as { nextCursor?: string | null }).nextCursor ?? null; } catch { /* non-JSON body */ }
        if (!cancelled) setRest({ status: res.status, ms, cursor, error: null });
      } catch (err) {
        if (!cancelled) setRest({ ...EMPTY, error: String(err) });
      }
      try {
        const { res, ms } = await timed(() => fetch(`${browserApi}/graphql`, {
          method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: GQL_QUERY, variables: gqlVariables }),
        }));
        const body = await res.json() as { errors?: Array<{ message: string }> };
        if (!cancelled) setGql({ status: res.status, ms, cursor: null, error: body.errors?.[0]?.message ?? null });
      } catch (err) {
        if (!cancelled) setGql({ ...EMPTY, error: String(err) });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, probeKey]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  const probe = activeTab === 'rest' ? rest : gql;
  const ok = probe.status !== null && probe.status >= 200 && probe.status < 300 && !probe.error;

  return (
    <aside
      aria-label="API Developer Inspector"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface-sunken)] border-t border-[var(--border)] shadow-2xl transition-transform duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <LightningIcon size={16} weight="fill" />
              <span>LIVE API INSPECTOR</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]" data-testid="inspector-probe">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono ${ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                {probe.status === null && !probe.error ? 'probing…' : probe.error && probe.status === null ? 'request failed' : `HTTP ${probe.status}${probe.error ? ' (errors)' : ''}`}
              </span>
              <span className="font-mono text-[var(--foreground)]">Latency: {probe.ms === null ? '-' : `${probe.ms}ms`}</span>
              <span className="font-mono text-[var(--muted)]">
                Keyset cursor: {probe.cursor ?? (route === 'requests' ? 'none (last page)' : 'n/a for this view')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md bg-[var(--surface-raised)] border border-[var(--border)] p-0.5 text-xs">
              {(['rest', 'graphql'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === tab ? 'bg-emerald-600 text-white font-medium' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {tab === 'rest' ? 'REST (curl)' : 'GraphQL'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => copyText(activeTab === 'rest' ? restCurl : `${GQL_QUERY}\n\n# Variables:\n${gqlVariablesJson}\n\n# curl:\n${gqlCurl}`)}
              className="p-1.5 rounded hover:bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] text-xs flex items-center gap-1"
              title="Copy to clipboard"
            >
              {copied ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
              <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={onToggle}
              className="p-1.5 rounded hover:bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
              title="Collapse Inspector"
            >
              <CaretDownIcon size={14} />
            </button>
          </div>
        </div>

        <div className="pt-2 text-xs font-mono">
          {activeTab === 'rest' ? (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Equivalent REST request for this view (executed live):</div>
              <pre className="p-2.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-emerald-300 overflow-x-auto text-[11px]">{restCurl}</pre>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">GraphQL Query (executed live):</div>
                <pre className="p-2 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-cyan-300 overflow-x-auto max-h-32 text-[11px]">{GQL_QUERY}</pre>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Variables:</div>
                <pre className="p-2 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-amber-300 overflow-x-auto max-h-32 text-[11px]">{gqlVariablesJson}</pre>
              </div>
            </div>
          )}
          {probe.error && <p className="pt-1 text-[11px] text-rose-400">{probe.error}</p>}
        </div>
      </div>
    </aside>
  );
}
