import Link from 'next/link';
import { SectionHeading, integer, percent } from '@/components/data-display';
import { filterParams } from '@/lib/api';

const noiseFilters = { from: '2025-01-18', toExclusive: '2025-02-01', problem: 'Noise - Residential' };
const heatFilters = { from: '2025-01-18', toExclusive: '2025-02-01', problem: 'HEAT/HOT WATER' };
const noiseChange = (14158 - 44150) / 44150;
const heatChange = (30624 - 32312) / 32312;

export default function InsightsPage() {
  return <>
    <div className="page-heading"><div className="eyebrow">INSIGHTS / REPRODUCIBLE ANALYSIS</div><h1>Findings with their assumptions attached.</h1><p>Source counts checked against NYC Open Data on October 10, 2026. The filters and calculations are preserved here.</p></div>
    <div className="insight-stack">
      <article className="insight-card"><div className="insight-index">01</div><div><div className="eyebrow">CATEGORY DISCONTINUITY</div><h2>Residential noise reports fell sharply after mid-January.</h2><p>There were {integer(44_150)} Noise - Residential requests from Jan 4–17, versus {integer(14_158)} from Jan 18–31, an equal-length change of {percent(noiseChange)}. HEAT/HOT WATER changed {percent(heatChange)} over the same periods. Daily noise counts fell from several thousand to roughly 700 around Jan 14.</p><div className="insight-detail"><strong>Interpretation limit</strong><span>The step change is category-specific. It could reflect reporting, intake, classification, or real behavior. CityOps cannot establish a cause from these records alone.</span></div><div className="insight-detail"><strong>Next analytical step</strong><span>Check source documentation and compare descriptor, channel, and agency patterns before recommending operational changes.</span></div><Link href={'/dashboard?' + filterParams(noiseFilters)} className="primary-action">Open the filtered trend ↗</Link></div></article>
      <article className="insight-card"><div className="insight-index">02</div><div><div className="eyebrow">AREA COMPOSITION</div><h2>Heat reports stayed concentrated in the Bronx, with little shift in share.</h2><p>For Jan 18–31, the Bronx accounted for {integer(11_422)} of {integer(30_624)} selected HEAT/HOT WATER reports ({percent(11422 / 30624)}). Its preceding two-week share was {percent(12294 / 32312)}. The share moved less than one percentage point while the category total fell {percent(heatChange)}.</p><div className="insight-detail"><strong>Interpretation limit</strong><span>Raw reports are influenced by population, housing stock, reporting access, and repeat reports. This is not a per-resident rate or proof of service quality.</span></div><div className="insight-detail"><strong>Next analytical step</strong><span>Compare with a documented population or housing denominator and inspect closure cohorts before making a resource recommendation.</span></div><Link href={'/map?' + filterParams(heatFilters)} className="primary-action">Open the filtered map ↗</Link></div></article>
    </div>
    <section className="panel insight-method"><SectionHeading eyebrow="REPRODUCIBILITY" title="How these counts were checked" detail="Source dataset erm2-nwe9 · NYC-local created dates · inclusive start, exclusive end" /><p>Each case uses the API fields <code>created_date</code>, <code>complaint_type</code>, and where relevant <code>borough</code>. The repository stores the exact SoQL checks and calculation in <code>docs/findings/january-2025.md</code>. A later source correction can change live dashboard counts; these published figures remain tied to the stated source check date.</p></section>
  </>;
}
