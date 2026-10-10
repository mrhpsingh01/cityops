import Link from 'next/link';
import { ArrowUpRightIcon, ChartLineUpIcon, DatabaseIcon, MapTrifoldIcon, PulseIcon } from '@phosphor-icons/react/ssr';

const profile = [
  { label: 'Noise - Residential', count: 70837 },
  { label: 'HEAT/HOT WATER', count: 67229 },
  { label: 'Illegal Parking', count: 43139 },
];
export function Landing() {
  return <div className="landing">
    <header className="landing-header"><Link href="/" className="landing-brand"><DatabaseIcon size={25} weight="duotone" />City<span>Ops</span></Link><div><Link href="/methodology">Methodology</Link><Link className="landing-header-cta" href="/dashboard">Open dashboard <ArrowUpRightIcon size={16} /></Link></div></header>
    <main>
      <section className="landing-hero"><div className="hero-copy"><div className="eyebrow">NYC 311 / PUBLIC DATA EXPLORER</div><h1>Understand the work behind the numbers.</h1><p>Follow reported problems from intake to closure. Compare places, inspect records, and see exactly how each metric is defined.</p><div className="hero-actions"><Link className="primary-action" href="/dashboard">Explore the dashboard <ArrowUpRightIcon size={18} /></Link><Link className="secondary-action" href="/insights">Read the findings</Link></div><div className="hero-source">Independent analysis of NYC Open Data · January 2025 supported slice · three problem categories</div></div>
        <div className="hero-visual"><div className="hero-visual-top"><span>NYC 311 / SOURCE PROFILE</span><span>JAN 2025</span></div><div className="hero-number">181,205<span>source requests in selected categories</span></div><div className="hero-bars">{profile.map((row) => <div className="hero-bar-row" key={row.label}><div><span>{row.label}</span><strong>{row.count.toLocaleString()}</strong></div><div className="hero-bar-track"><span style={{ width: `${row.count / profile[0].count * 100}%` }} /></div></div>)}</div><div className="hero-visual-bottom">Source counts checked October 10, 2026 · Dataset erm2-nwe9</div></div>
      </section>
      <section className="landing-capabilities"><div className="landing-section-head"><div className="eyebrow">ONE CONNECTED WORKFLOW</div><h2>From signal to evidence.</h2></div><div className="capability-grid"><div><ChartLineUpIcon size={30} /><h3>Find the change</h3><p>Track intake, compare equal periods, and see which categories move the total.</p></div><div><MapTrifoldIcon size={30} /><h3>Place it on the map</h3><p>Use official borough boundaries, filter the view, and inspect matching requests.</p></div><div><PulseIcon size={30} /><h3>Examine closure</h3><p>Read mature cohorts, duration distributions, and the latest open snapshot.</p></div></div></section>
      <section className="landing-trust"><div><div className="eyebrow">BUILT FOR INTERPRETATION</div><h2>Every figure has a definition.</h2><p>CityOps shows source coverage, exclusions, and refresh time alongside the charts. Counts mean reports received, and seven days is an analytical threshold, never a claim about an official service target.</p></div><Link href="/methodology" className="text-action">See the method <ArrowUpRightIcon size={17} /></Link></section>
    </main>
    <footer className="landing-footer"><span>CityOps · Independent portfolio project</span><a href="https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9" target="_blank" rel="noreferrer">Data: NYC Open Data ↗</a></footer>
  </div>;
}
