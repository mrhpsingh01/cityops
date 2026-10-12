"use client";

import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, ReactNode, useState } from 'react';
import {
  ChartBarIcon, CompassIcon, DatabaseIcon, MapTrifoldIcon,
  NotebookIcon, PulseIcon, RowsIcon, ShieldCheckIcon,
} from '@phosphor-icons/react';
import { DEFAULT_FILTERS, Metadata } from '@/lib/api';

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: ChartBarIcon },
  { href: '/explore', label: 'Explore', icon: RowsIcon },
  { href: '/map', label: 'Map', icon: MapTrifoldIcon },
  { href: '/resolution', label: 'Resolution', icon: PulseIcon },
  { href: '/risk', label: 'Risk', icon: ShieldCheckIcon },
  { href: '/insights', label: 'Insights', icon: CompassIcon },
  { href: '/methodology', label: 'Methodology', icon: NotebookIcon },
];
const FALLBACK_PROBLEMS = ['Noise - Residential', 'HEAT/HOT WATER', 'Illegal Parking'];
const FALLBACK_BOROUGHS = ['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'];
const globalKeys = ['from', 'toExclusive', 'problem', 'borough', 'agency', 'communityBoard', 'incidentZip'];
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;

function FilterFields({ metadata, search, error, reset }: { metadata: Metadata | null; search: URLSearchParams; error: string; reset: () => void }) {
  const min = metadata?.supportedScope.from ?? '2025-01-01';
  const max = metadata?.supportedScope.toExclusive ?? '2025-02-01';
  return <>
    <label>From<input type="date" name="from" min={min} max={max} defaultValue={search.get('from') ?? DEFAULT_FILTERS.from} required /></label>
    <label>To (exclusive)<input type="date" name="toExclusive" min={min} max={max} defaultValue={search.get('toExclusive') ?? DEFAULT_FILTERS.toExclusive} required /></label>
    <label>Borough<select name="borough" defaultValue={search.get('borough') ?? ''}><option value="">All boroughs</option>{(metadata?.filters.boroughs.length ? metadata.filters.boroughs : FALLBACK_BOROUGHS).map((v) => <option key={v}>{v}</option>)}</select></label>
    <label>Problem<select name="problem" defaultValue={search.get('problem') ?? ''}><option value="">All supported problems</option>{(metadata?.filters.problems.length ? metadata.filters.problems : FALLBACK_PROBLEMS).map((v) => <option key={v}>{v}</option>)}</select></label>
    <label>Agency<select name="agency" defaultValue={search.get('agency') ?? ''}><option value="">All agencies</option>{(metadata?.filters.agencies ?? []).map((v) => <option key={v}>{v}</option>)}</select></label>
    <label className="narrow-filter">Board<input name="communityBoard" defaultValue={search.get('communityBoard') ?? ''} placeholder="Any" /></label>
    <label className="narrow-filter">ZIP<input name="incidentZip" defaultValue={search.get('incidentZip') ?? ''} placeholder="Any" inputMode="numeric" /></label>
    <button type="submit" className="filter-apply">Apply</button>
    <button type="button" className="filter-reset" onClick={reset}>Reset</button>
    {error && <p className="filter-error" role="alert">{error}</p>}
  </>;
}

export function Shell({ children, metadata }: { children: ReactNode; metadata: Metadata | null }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterError, setFilterError] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const globalQuery = new URLSearchParams();
  for (const key of globalKeys) {
    const value = search.get(key);
    if (value) globalQuery.set(key, value);
  }
  const query = globalQuery.toString();
  const reset = () => { setFilterError(''); router.push(pathname); setFiltersOpen(false); };
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const from = String(values.get('from') ?? '');
    const to = String(values.get('toExclusive') ?? '');
    const min = metadata?.supportedScope.from ?? '2025-01-01';
    const max = metadata?.supportedScope.toExclusive ?? '2025-02-01';
    if (!validDate(from) || !validDate(to) || from >= to || from < min || to > max) {
      setFilterError(`Choose a valid range from ${min} through ${max} (exclusive).`);
      return;
    }
    const next = new URLSearchParams();
    for (const key of globalKeys) {
      const value = String(values.get(key) ?? '').trim();
      if (value) next.set(key, value);
    }
    if (pathname === '/dashboard' && search.get('grouping') === 'week') next.set('grouping', 'week');
    if (pathname === '/map' && search.get('view') === 'change') next.set('view', 'change');
    setFilterError('');
    router.push(pathname + '?' + next.toString());
    setFiltersOpen(false);
  };
  const navHref = (href: string) => href + (query ? '?' + query : '');
  const checked = metadata?.asOf ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(metadata.asOf)) : null;
  const coverage = metadata?.loadedCoverage;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className="side-nav">
      <Link href="/" className="brand" aria-label="CityOps home"><span className="brand-mark"><DatabaseIcon size={22} weight="duotone" /></span><span>City<span className="brand-accent">Ops</span></span></Link>
      <div className="nav-caption">311 OPERATIONS INTELLIGENCE</div>
      <nav aria-label="Main navigation" className="nav-list">
        {navigation.map(({ href, label, icon: Icon }) => <Link className={'nav-link ' + (pathname === href ? 'active' : '')} href={navHref(href)} key={href}><Icon size={19} weight={pathname === href ? 'fill' : 'regular'} /><span>{label}</span></Link>)}
      </nav>
      <div className="nav-footer">
        <div className="nav-rule" />
        <p>Public data, carefully interpreted.</p>
        <a href={metadata?.sourceUrl ?? 'https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9'} target="_blank" rel="noreferrer">NYC Open Data ↗</a>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="mobile-brand">City<span>Ops</span></div>
        <div className="topbar-title">NYC 311 / SERVICE REQUESTS</div>
        <div className={'freshness ' + (checked ? '' : 'muted')}>
          <span className="freshness-dot" />
          {checked ? `Source checked ${checked}` : 'No published refresh'}
        </div>
      </header>
      <Dialog.Root open={filtersOpen} onOpenChange={(open) => { setFiltersOpen(open); setFilterError(''); }}>
        <div className="mobile-filter-row"><Dialog.Trigger asChild><button type="button" className="mobile-filter-toggle">Filter requests <span>↗</span></button></Dialog.Trigger></div>
        <Dialog.Portal><Dialog.Overlay className="dialog-overlay mobile-only" /><Dialog.Content className="filter-dialog mobile-only" aria-describedby={undefined}><div className="mobile-filter-heading"><Dialog.Title>Filter requests</Dialog.Title><Dialog.Close className="drawer-close" aria-label="Close filters">✕</Dialog.Close></div><form id="global-filter-form" className="filter-bar mobile-dialog-form" key={query} onSubmit={apply} aria-label="Global filters"><FilterFields metadata={metadata} search={search} error={filterError} reset={reset} /></form></Dialog.Content></Dialog.Portal>
      </Dialog.Root>
      <form className="filter-bar desktop-filter-bar" key={query} onSubmit={apply} aria-label="Global filters"><FilterFields metadata={metadata} search={search} error={filterError} reset={reset} /></form>
      <div className="coverage-strip">
        <span><strong>Historical case study</strong> · supported Jan 1–31, 2025 · 3 problems</span>
        <span>{coverage?.requestCount ? `${coverage.requestCount.toLocaleString()} records loaded · ${coverage.oldest ?? '—'} to ${coverage.newest ?? '—'}` : 'Run the importer to load records'}</span>
      </div>
      <main id="main-content" tabIndex={-1} className="page-content">{children}</main>
    </div>
  </div>;
}
