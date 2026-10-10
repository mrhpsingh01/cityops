import Link from 'next/link';
import { SectionHeading } from '@/components/data-display';

export default function RiskPage() {
  return <>
    <div className="page-heading"><div className="eyebrow">RISK / EVALUATION GATE</div><h1>Seven-day unresolved estimate.</h1><p>This analytical prioritization view becomes available after a trained model beats the grouped historical-rate baseline on a later test period.</p></div>
    <section className="panel risk-gate"><div className="risk-gate-icon">7</div><div><SectionHeading eyebrow="MODEL STATUS" title="Ranking withheld pending evaluation" detail="No probabilities or priority bands are published without measured, future-period performance." /><p>The modeling pipeline and feature contract live in the repository. CityOps will show a risk queue only with a model version, scoring time, calibration, and comparisons against simple rules.</p><Link className="primary-action" href="/methodology">Read the model criteria ↗</Link></div></section>
    <p className="footnote">This is a portfolio analysis product. It cannot assign or prioritize work inside a city agency.</p>
  </>;
}
