import Link from 'next/link';
import { SectionHeading } from '@/components/data-display';
import report from '@/data/model-summary.json';

export default function RiskPage() {
  return <>
    <div className="page-heading"><div className="eyebrow">RISK / EVALUATION GATE</div><h1>Seven-day unresolved estimate.</h1><p>The trained model was evaluated on later requests. Its ranking did not clear the publication gate, so this view shows the evidence instead of a priority queue.</p></div>
    <section className="panel risk-gate"><div className="risk-gate-icon">7</div><div><SectionHeading eyebrow="MODEL STATUS" title="Ranking withheld after test" detail={`${report.modelVersion} · held-out ${report.testFrom} to ${report.testToExclusive} (exclusive)`} /><p>Only {report.positiveCount} of {report.testCount.toLocaleString()} test requests lacked a valid closure within seven days. The logistic model did not beat the grouped historical-rate baseline on PR-AUC, and neither method found a positive case in its top 100.</p><div className="risk-evidence"><div><span>Logistic PR-AUC</span><strong>{report.logisticPrAuc.toFixed(6)}</strong></div><div><span>Grouped baseline PR-AUC</span><strong>{report.groupedBaselinePrAuc.toFixed(6)}</strong></div><div><span>Top 100 precision</span><strong>{(report.logisticTop100Precision * 100).toFixed(0)}%</strong></div><div><span>High-risk band precision</span><strong>{(report.highRiskPrecision * 100).toFixed(0)}%</strong></div></div><p>The validation-derived high-risk threshold selected {report.highRiskCount.toLocaleString()} test requests and found no positive cases. These results do not support individual probabilities or a review queue for this slice.</p><Link className="primary-action" href="/methodology">Read the model criteria ↗</Link></div></section>
    <p className="footnote">This is a portfolio analysis product. It cannot assign or prioritize work inside a city agency.</p>
  </>;
}
