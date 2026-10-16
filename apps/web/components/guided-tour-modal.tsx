"use client";

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  CheckCircleIcon,
  MapPinIcon,
  ShieldCheckIcon,
  LightningIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@phosphor-icons/react';

interface GuidedTourModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    step: 1,
    title: 'Source-Count Reconciled Ingestion',
    badge: 'Count-Reconciled Ingestion',
    icon: CheckCircleIcon,
    color: 'text-emerald-400',
    summary:
      'Zero silent drops. The SODA ingestion engine queries NYC 311 API erm2-nwe9, fetches distinct record counts per civil date, stages every payload in PostgreSQL, and verifies row equality before transactional publication.',
    details: [
      'Transactional advisory lock (pg_advisory_xact_lock) ensures idempotent single-writer safety.',
      'Quarantine table isolates corrupt source rows with structured failure reasons.',
      'Audit log (ingestion_runs) preserves immutable timestamps and analysis cutoffs.',
    ],
    codeSnippet: `SELECT count(*) FROM ingestion_stage WHERE run_id = $1 AND source_date = $2;
-- Verified against NYC SODA daily count before atomic COMMIT`,
  },
  {
    step: 2,
    title: 'PostGIS ST_ClusterDBSCAN Outage Detection',
    badge: '200m Spatial Clustering',
    icon: MapPinIcon,
    color: 'text-rose-400',
    summary:
      'Active civic triage replaces static charts. PostGIS DBSCAN clusters complaints within 200 meters (eps = 656.168 ft in SRID 2263 NY Long Island) with minimum 15 reports to detect infrastructure outages in real-time.',
    details: [
      'Computes metric centroids, bounding convex hulls, and maximum cluster radii.',
      'Generates automated human-readable triage hypotheses (e.g. boiler/steam main failure).',
      'Dual REST & GraphQL dispatch endpoint triggers verified Slack/PagerDuty webhook alerts with audit logs.',
    ],
    codeSnippet: `ST_ClusterDBSCAN(ST_Transform(geom, 2263), eps := 656.168, minpoints := 15)
  OVER (PARTITION BY problem) AS cluster_num`,
  },
  {
    step: 3,
    title: 'Senior ML Governance Gate & TTC Regression',
    badge: 'Target Reframing',
    icon: ShieldCheckIcon,
    color: 'text-amber-400',
    summary:
      'Withholding low-signal models demonstrates senior engineering judgment. Because 99.96% of tickets close within 7 days (leaving only 3 positive holdout instances), Model v1 7-day risk was withheld at the publication gate.',
    details: [
      'Model v1 (7-day risk) was blocked to prevent publishing a spurious, ungrounded priority queue.',
      'Model v2 reframes the objective to Expected Resolution Time in Hours (predicted_ttc_hours) using HistGradientBoostingRegressor.',
      'Model v2 outputs holdout MAE and feature importances, powering SLA comparisons across all hotspots.',
    ],
    codeSnippet: `report["publication_gate_passed"] = bool(
  positive_count >= 50 and model_top_100_precision > baseline_precision
) # FAILED -> Ranking Withheld`,
  },
  {
    step: 4,
    title: 'Dual NestJS GraphQL & REST Architecture',
    badge: 'Full-Stack Symmetry',
    icon: LightningIcon,
    color: 'text-cyan-400',
    summary:
      'A single unified domain service powers both REST (with Swagger OpenAPI at /docs) and Apollo GraphQL at /graphql with strict keyset pagination and field budgets.',
    details: [
      'REST endpoints (/api/v1/overview, /api/v1/hotspots, etc.) and GraphQL queries delegate to the same MetricsService.',
      'Keyset pagination uses base64url-encoded (created_at_local, request_id) cursors.',
      'Live API Inspector drawer lets reviewers inspect the exact GraphQL query and curl equivalent for any view.',
    ],
    codeSnippet: `@Query(() => [HotspotClusterType]) / @Get('hotspots')
-> delegate to shared MetricsService / HotspotsService`,
  },
];

export function GuidedTourModal({ open, onOpenChange }: GuidedTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const current = steps[currentStep];
  const Icon = current.icon;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content max-w-2xl" aria-describedby="tour-desc">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--muted)]">
                Step {current.step} of {steps.length}
              </span>
              <Dialog.Title className="text-base font-semibold text-[var(--foreground)]">
                60-Second Architecture Tour
              </Dialog.Title>
            </div>
            <Dialog.Close className="drawer-close" aria-label="Close">✕</Dialog.Close>
          </div>

          <div id="tour-desc" className="py-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)] ${current.color}`}>
                <Icon size={28} weight="duotone" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--foreground)]">{current.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-sunken)] border border-[var(--border)] text-emerald-400 font-semibold">
                    {current.badge}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                  {current.summary}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted)]">
                Technical Highlights
              </h4>
              <ul className="space-y-1 text-xs text-[var(--foreground)]">
                {current.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">▸</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <pre className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)] text-[11px] font-mono overflow-x-auto text-emerald-300">
              {current.codeSnippet}
            </pre>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((s) => s - 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface-sunken)] hover:bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ArrowLeftIcon size={14} />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1.5">
              {steps.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep ? 'w-5 bg-emerald-400' : 'bg-[var(--border)] hover:bg-[var(--muted)]'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
              >
                <span>Next Step</span>
                <ArrowRightIcon size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Finish Tour
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
