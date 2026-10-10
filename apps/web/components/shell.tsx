"use client";

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
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

export function Shell({ children, metadata }: { children: ReactNode; metadata: Metadata | null }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFiltersOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', closeOnEscape); };
  }, [filtersOpen]);
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const globalKeys = ['from', 'toExclusive', 'problem', 'borough', 'agency', 'communityBoard', 'incidentZip'];
  const globalQuery = new URLSearchParams();
  for (const key of globalKeys) {
    const value = search.get(key);
    if (value) globalQuery.set(key, value);
  }
  const query = globalQuery.toString();
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of globalKeys) {
      const value = String(values.get(key) ?? '');
      if (value) next.set(key, value);
    }
    router.push(pathname + '?' + next.toString());
    setFiltersOpen(false);
  };
  const navHref = (href: string) => href + (query ? '?' + query : '');
  return <div className="app-shell">
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
        <div className={'freshness ' + (metadata?.asOf ? '' : 'muted')}>
          <span className="freshness-dot" />
          {metadata?.asOf ? `Updated ${metadata.asOf.replace('T', ' ')} ET` : 'No published refresh'}
        </div>
      </header>
      <div className="mobile-filter-row"><button type="button" className="mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="global-filter-form" onClick={() => setFiltersOpen(true)}>Filter requests <span>↗</span></button></div>
      {filtersOpen && <button type="button" className="filter-scrim" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
      <form id="global-filter-form" className={'filter-bar' + (filtersOpen ? ' mobile-open' : '')} key={query} onSubmit={apply} aria-label="Global filters">
        <div className="mobile-filter-heading"><strong>Filter requests</strong><button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>✕</button></div>
        <label>From<input type="date" name="from" defaultValue={search.get('from') ?? DEFAULT_FILTERS.from} /></label>
        <label>To (exclusive)<input type="date" name="toExclusive" defaultValue={search.get('toExclusive') ?? DEFAULT_FILTERS.toExclusive} /></label>
        <label>Borough<select name="borough" defaultValue={search.get('borough') ?? ''}><option value="">All boroughs</option>{(metadata?.filters.boroughs.length ? metadata.filters.boroughs : FALLBACK_BOROUGHS).map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Problem<select name="problem" defaultValue={search.get('problem') ?? ''}><option value="">All supported problems</option>{(metadata?.filters.problems.length ? metadata.filters.problems : FALLBACK_PROBLEMS).map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>Agency<select name="agency" defaultValue={search.get('agency') ?? ''}><option value="">All agencies</option>{(metadata?.filters.agencies ?? []).map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="narrow-filter">Board<input name="communityBoard" defaultValue={search.get('communityBoard') ?? ''} placeholder="Any" /></label>
        <label className="narrow-filter">ZIP<input name="incidentZip" defaultValue={search.get('incidentZip') ?? ''} placeholder="Any" inputMode="numeric" /></label>
        <button type="submit" className="filter-apply">Apply</button>
        <button type="button" className="filter-reset" onClick={() => { router.push(pathname); setFiltersOpen(false); }}>Reset</button>
      </form>
      <div className="coverage-strip">
        <span><strong>Supported slice</strong> · Jan 1–31, 2025 · 3 problems</span>
        <span>{metadata?.loadedCoverage.requestCount ? `${metadata.loadedCoverage.requestCount.toLocaleString()} records loaded` : 'Run the importer to load records'}</span>
      </div>
      <main className="page-content">{children}</main>
    </div>
  </div>;
}
