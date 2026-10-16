"use client";

import Link from 'next/link';
import { SectionHeading } from '@/components/data-display';
import report from '@/data/model-summary.json';
import { ModelGovernance } from '@/lib/api';
import { CpuIcon } from '@phosphor-icons/react';

export function RiskShowcase({ governance }: { governance: ModelGovernance | null }) {
  if (!governance) {
    return <div className="page-heading"><div className="eyebrow">RISK & ML GOVERNANCE</div><h1>Model governance unavailable</h1><p>The API did not return /api/v1/models/governance. Check that the API is running and model artifacts are present.</p></div>;
  }
  const v2 = governance.modelV2;

  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">RISK & ML GOVERNANCE SHOWCASE</div>
        <h1>Model Evaluation Gates & Target Reframing.</h1>
        <p>
          Senior ML Governance: Model v1 was withheld after rigorous temporal holdout evaluation. Model v2 reframes the target to Expected Resolution Time with real signal.
        </p>
      </div>

      {/* Model v2: Active Production Showcase */}
      <section className="panel mb-6 border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
              <CpuIcon size={22} weight="duotone" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  Model v2: Time-to-Close Regression ({v2.modelVersion})
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {v2.status}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Target: <code className="font-mono text-emerald-300">predicted_ttc_hours</code> · Challenger: HistGradientBoostingRegressor ({v2.beatsBaseline ? 'beats' : 'does not beat'} grouped-median baseline) · Served: {v2.servingMethod}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">Passed Temporal Holdout Gate</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
            <div className="text-xs text-[var(--muted)]">Holdout Test MAE</div>
            <div className="text-xl font-mono font-bold text-emerald-400">{v2.holdoutMae} hrs</div>
            <div className="text-[10px] text-[var(--muted)]">Mean Absolute Error</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
            <div className="text-xs text-[var(--muted)]">Holdout MedAE</div>
            <div className="text-xl font-mono font-bold text-emerald-400">{v2.holdoutMedAe} hrs</div>
            <div className="text-[10px] text-[var(--muted)]">Median Absolute Error</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
            <div className="text-xs text-[var(--muted)]">Holdout RMSE</div>
            <div className="text-xl font-mono font-bold text-[var(--foreground)]">{v2.holdoutRmse} hrs</div>
            <div className="text-[10px] text-[var(--muted)]">Root Mean Squared Error</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
            <div className="text-xs text-[var(--muted)]">Grouped Baseline MAE</div>
            <div className="text-xl font-mono font-bold text-[var(--foreground)]">{v2.baselineMae} hrs</div>
            <div className="text-[10px] text-[var(--muted)]">Problem × Borough Median</div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[var(--muted)]">
            Learned Feature Importances
          </h3>
          <div className="space-y-2">
            {v2.featureImportances.map((f) => (
              <div key={f.feature} className="p-2.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono font-semibold text-[var(--foreground)]">{f.feature}</span>
                  <span className="font-semibold text-emerald-400">{f.importancePct}%</span>
                </div>
                <div className="w-full bg-[var(--surface-raised)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(f.importancePct, 100)}%` }} />
                </div>
                <div className="text-[11px] text-[var(--muted)] mt-1">{f.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Model v1: Gate Failure & Withholding Evidence */}
      <section className="panel risk-gate">
        <div className="risk-gate-icon">7</div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {governance.modelV1.status}
            </span>
            <span className="text-xs text-[var(--muted)]">Holdout base rate: {(governance.modelV1.baseRate * 100).toFixed(3)}% ({governance.modelV1.testPositiveCount} of {governance.modelV1.testHoldoutRecords.toLocaleString()})</span>
          </div>
          <SectionHeading
            eyebrow="MODEL v1 EVALUATION GATE"
            title="Ranking withheld after test"
            detail={`${report.modelVersion} · held-out ${report.testFrom} to ${report.testToExclusive} (exclusive)`}
          />
          <p>
            Only {report.positiveCount} of {report.testCount.toLocaleString()} test requests lacked a valid closure within seven days. The logistic model did not beat the grouped historical-rate baseline on PR-AUC, and neither method found a positive case in its top 100.
          </p>
          <div className="risk-evidence">
            <div><span>Logistic PR-AUC</span><strong>{report.logisticPrAuc.toFixed(6)}</strong></div>
            <div><span>Grouped baseline PR-AUC</span><strong>{report.groupedBaselinePrAuc.toFixed(6)}</strong></div>
            <div><span>Top 100 precision</span><strong>{(report.logisticTop100Precision * 100).toFixed(0)}%</strong></div>
            <div><span>High-risk band precision</span><strong>{(report.highRiskPrecision * 100).toFixed(0)}%</strong></div>
          </div>
          <p>
            The validation-derived high-risk threshold selected {report.highRiskCount.toLocaleString()} test requests and found no positive cases. These results do not support individual probabilities or a review queue for this slice.
          </p>
          <Link className="primary-action" href="/methodology">
            Read the model criteria ↗
          </Link>
        </div>
      </section>

      <p className="footnote">
        This is a portfolio analysis product. It cannot assign or prioritize work inside a city agency.
      </p>
    </>
  );
}
