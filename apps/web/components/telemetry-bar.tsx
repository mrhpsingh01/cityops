"use client";

import { useState } from 'react';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  PlayIcon,
  LightningIcon,
} from '@phosphor-icons/react';
import { ReconciliationModal } from './reconciliation-modal';
import { ModelGovernanceModal } from './model-governance-modal';
import { GuidedTourModal } from './guided-tour-modal';
import { ApiInspectorDrawer } from './api-inspector-drawer';
import { DataQuality, Metadata, ModelGovernance } from '@/lib/api';

interface TelemetryBarProps {
  metadata?: Metadata | null;
  governance?: ModelGovernance | null;
  dataQuality?: DataQuality | null;
}

export function TelemetryBar({ metadata, governance, dataQuality }: TelemetryBarProps) {
  const [reconOpen, setReconOpen] = useState(false);
  const [govOpen, setGovOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const run = dataQuality?.latestRun ?? null;
  const fetched = run?.rows_seen == null ? null : Number(run.rows_seen);
  const reconciled = run ? Number(run.rows_inserted ?? 0) + Number(run.rows_updated ?? 0) : null;
  const quarantined = dataQuality?.quarantined ?? null;
  const loaded = metadata?.loadedCoverage?.requestCount ?? 0;
  const fmt = (n: number | null) => (n === null ? 'n/a' : n.toLocaleString());
  const v1 = governance?.modelV1;
  const v2 = governance?.modelV2;

  return (
    <>
      <div className="telemetry-bar">
        <div className="telemetry-container">
          <div className="telemetry-items">
            {/* SODA Pipeline Telemetry Button */}
            <button
              type="button"
              onClick={() => setReconOpen(true)}
              className="telemetry-pill success"
              title="Click to view SODA Reconciliation Proof & Audit SQL"
            >
              <span className="telemetry-dot live" />
              <span className="telemetry-label">
                <strong>{run ? `SODA Pipeline ${run.status}:` : 'SODA Pipeline:'}</strong>{' '}
                {run ? `${fmt(fetched)} fetched | ${fmt(reconciled)} reconciled | ${fmt(quarantined)} quarantined` : 'no ingestion run recorded'}
              </span>
            </button>

            {/* ML Gate Telemetry Button */}
            <button
              type="button"
              onClick={() => setGovOpen(true)}
              className="telemetry-pill warning"
              title="Click to view Model Governance Card (v1 Gate & v2 TTC Regression)"
            >
              <ShieldCheckIcon size={14} weight="fill" className="text-amber-400" />
              <span className="telemetry-label">
                <strong>ML Gate:</strong>{' '}
                {governance && v1 && v2
                  ? `v1 Risk ${v1.gatePassed ? 'Active' : 'Withheld'} (${(v1.baseRate * 100).toFixed(3)}% holdout base rate) | v2 Time-to-Close ${v2.status === 'ACTIVE_PRODUCTION' ? 'Active' : v2.status}`
                  : 'governance data unavailable'}
              </span>
            </button>
          </div>

          <div className="telemetry-actions">
            {/* 60-Second Architecture Tour Button */}
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="telemetry-action-btn tour"
              title="Launch 60-Second Architecture Walkthrough"
            >
              <PlayIcon size={12} weight="fill" />
              <span>60-Sec Architecture Tour</span>
            </button>

            {/* Developer API Inspector Toggle */}
            <button
              type="button"
              onClick={() => setInspectorOpen((prev) => !prev)}
              className={`telemetry-action-btn inspector ${inspectorOpen ? 'active' : ''}`}
              title="Toggle Live GraphQL & REST Query Inspector"
            >
              <LightningIcon size={13} weight="fill" />
              <span>Inspect API: GraphQL | REST</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Modals & Drawers */}
      <ReconciliationModal open={reconOpen} onOpenChange={setReconOpen} dataQuality={dataQuality ?? null} loadedRows={loaded} />
      <ModelGovernanceModal open={govOpen} onOpenChange={setGovOpen} governance={governance} />
      <GuidedTourModal open={tourOpen} onOpenChange={setTourOpen} />
      <ApiInspectorDrawer open={inspectorOpen} onToggle={() => setInspectorOpen(false)} />
    </>
  );
}
