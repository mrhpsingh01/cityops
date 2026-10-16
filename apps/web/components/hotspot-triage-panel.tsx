"use client";

import { useState } from 'react';
import {
  WarningCircleIcon,
  FlameIcon,
  CarIcon,
  SpeakerHighIcon,
  PaperPlaneTiltIcon,
  ClockIcon,
  MapPinIcon,
} from '@phosphor-icons/react';
import { HotspotCluster } from '@/lib/api';
import { DispatchAlertModal } from './dispatch-alert-modal';

interface HotspotTriagePanelProps {
  hotspots: HotspotCluster[];
  onSelectCluster?: (cluster: HotspotCluster) => void;
  selectedClusterId?: string;
}

export function HotspotTriagePanel({
  hotspots,
  onSelectCluster,
  selectedClusterId,
}: HotspotTriagePanelProps) {
  const [activeModalCluster, setActiveModalCluster] = useState<HotspotCluster | null>(null);

  const getIcon = (problem: string) => {
    const p = problem.toUpperCase();
    if (p.includes('HEAT') || p.includes('WATER')) return <FlameIcon size={16} className="text-amber-400" />;
    if (p.includes('PARKING')) return <CarIcon size={16} className="text-sky-400" />;
    if (p.includes('NOISE')) return <SpeakerHighIcon size={16} className="text-purple-400" />;
    return <WarningCircleIcon size={16} className="text-rose-400" />;
  };

  return (
    <>
      <div className="hotspot-triage-panel">
        <div className="hotspot-triage-header">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
              Active Outage Hotspots (PostGIS DBSCAN)
            </h3>
          </div>
          <span className="text-xs font-mono text-[var(--muted)]">
            {hotspots.length} Clusters Detected
          </span>
        </div>

        <div className="hotspot-triage-list">
          {hotspots.map((cluster) => {
            const isSelected = selectedClusterId === cluster.clusterId;
            return (
              <div
                key={cluster.clusterId}
                onClick={() => onSelectCluster?.(cluster)}
                className={`hotspot-card ${cluster.severityTier.toLowerCase()} ${
                  isSelected ? 'selected' : ''
                }`}
              >
                <div className="hotspot-card-top">
                  <div className="flex items-center gap-1.5">
                    {getIcon(cluster.complaintType)}
                    <span className="font-semibold text-xs text-[var(--foreground)]">
                      {cluster.complaintType}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--muted)]">
                      · {cluster.borough}
                    </span>
                  </div>
                  <span className={`severity-badge ${cluster.severityTier.toLowerCase()}`}>
                    {cluster.severityTier}
                  </span>
                </div>

                <p className="hotspot-hypothesis">{cluster.triageHypothesis}</p>

                <div className="hotspot-metrics-grid">
                  <div className="metric-chip">
                    <MapPinIcon size={13} className="text-[var(--muted)]" />
                    <span>
                      <strong>{cluster.incidentCount}</strong> reports in{' '}
                      <strong>{Math.round(cluster.radiusMeters)}m</strong>
                    </span>
                  </div>
                  <div className="metric-chip">
                    <ClockIcon size={13} className="text-emerald-400" />
                    <span>
                      Est. TTC: <strong className="text-emerald-400">{cluster.predictedTtcHours}h</strong>
                    </span>
                  </div>
                </div>

                <div className="hotspot-card-footer">
                  <span className="text-[10px] text-[var(--muted)]">
                    {cluster.ttcComparison}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModalCluster(cluster);
                    }}
                    className="dispatch-trigger-btn"
                  >
                    <PaperPlaneTiltIcon size={12} weight="fill" />
                    <span>Preview / Dispatch Alert</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DispatchAlertModal
        cluster={activeModalCluster}
        open={Boolean(activeModalCluster)}
        onOpenChange={(open) => {
          if (!open) setActiveModalCluster(null);
        }}
      />
    </>
  );
}
