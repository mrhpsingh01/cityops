"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import { Area, filterParams, Filters, HotspotCluster } from '@/lib/api';
import { integer, percent } from './data-display';

type BoroughFeature = FeatureCollection<MultiPolygon, { boroname: string }>;
const name = (value: string) => value.toUpperCase();

export function BoroughMap({
  areas,
  prior,
  filters,
  mode,
  hotspots = [],
  selectedClusterId,
  onSelectCluster,
}: {
  areas: Area[];
  prior: Area[];
  filters: Filters;
  mode: 'volume' | 'change';
  hotspots?: HotspotCluster[];
  selectedClusterId?: string;
  onSelectCluster?: (cluster: HotspotCluster) => void;
}) {
  const router = useRouter();
  const [geometry, setGeometry] = useState<BoroughFeature | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [hotspotHover, setHotspotHover] = useState<HotspotCluster | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/boroughs.geojson').then((r) => r.json()).then((data: BoroughFeature) => { if (live) setGeometry(data); });
    return () => { live = false; };
  }, []);

  const { paths, projection } = useMemo(() => {
    if (!geometry) return { paths: [], projection: null };
    const proj = geoMercator().fitExtent([[18, 18], [782, 482]], geometry);
    const path = geoPath(proj);
    const p = geometry.features.map((feature) => ({
      name: name(feature.properties.boroname),
      d: path(feature) ?? '',
    }));
    return { paths: p, projection: proj };
  }, [geometry]);

  const current = Object.fromEntries(areas.map((a) => [name(a.borough), a.requestCount]));
  const before = Object.fromEntries(prior.map((a) => [name(a.borough), a.requestCount]));
  const max = Math.max(...areas.map((a) => a.requestCount), 1);
  const selected = filters.borough?.toUpperCase();
  const pick = (borough: string) => {
    const params = filterParams({ ...filters, borough: selected === borough ? undefined : borough });
    params.set('view', mode);
    router.push('/map?' + params);
  };

  return <div className="map-wrap">
    {geometry && projection ? (
      <svg className="borough-svg" viewBox="0 0 800 500" role="img" aria-label="NYC boroughs colored by selected request count or change with PostGIS hotspot clusters">
        {paths.map((feature) => {
          const count = current[feature.name] ?? 0;
          const baseline = before[feature.name] ?? 0;
          const change = baseline ? (count - baseline) / baseline : null;
          const intensity = count / max;
          const fill = mode === 'volume'
            ? `rgba(28, 110, 102, ${0.18 + intensity * 0.78})`
            : change == null ? '#d8ddda' : change >= 0 ? `rgba(192, 104, 60, ${0.28 + Math.min(Math.abs(change), 1) * 0.7})` : `rgba(28, 110, 102, ${0.28 + Math.min(Math.abs(change), 1) * 0.7})`;
          return <path key={feature.name} d={feature.d} fill={fill} stroke={selected === feature.name ? '#153c39' : '#f7f8f5'} strokeWidth={selected === feature.name ? 3 : 1.5} tabIndex={0} role="button"
            aria-label={`${feature.name}: ${integer(count)} reports${mode === 'change' ? `, change ${percent(change)}` : ''}. Select borough.`}
            onClick={() => pick(feature.name)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(feature.name); } }}
            onMouseEnter={() => setHover(feature.name)} onMouseLeave={() => setHover(null)} />;
        })}

        {/* PostGIS DBSCAN Hotspot Overlay */}
        {hotspots.map((h) => {
          const coords = projection(h.centroid.coordinates);
          if (!coords) return null;
          const [cx, cy] = coords;
          const isCritical = h.severityTier === 'CRITICAL';
          const isSelected = selectedClusterId === h.clusterId;
          const color = isCritical ? '#e11d48' : '#f59e0b';

          return (
            <g
              key={h.clusterId}
              className="hotspot-marker cursor-pointer"
              tabIndex={0}
              role="button"
              aria-label={`Hotspot cluster: ${h.incidentCount} ${h.complaintType} in ${h.borough}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCluster?.(h);
              }}
              onMouseEnter={() => setHotspotHover(h)}
              onMouseLeave={() => setHotspotHover(null)}
            >
              {/* Outer pulsing radar ring */}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 26 : 18}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                opacity={0.4}
                className="animate-ping origin-center"
              />
              {/* Semi-transparent buffer ring */}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 20 : 14}
                fill={color}
                fillOpacity={0.25}
                stroke={color}
                strokeWidth={isSelected ? 2 : 1}
              />
              {/* Solid core indicator */}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 7 : 5}
                fill={color}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              {/* Incident count label */}
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill="#ffffff"
                pointerEvents="none"
              >
                {h.incidentCount}
              </text>
            </g>
          );
        })}
      </svg>
    ) : <div className="map-loading">Loading official NYC borough boundaries & spatial hotspots…</div>}

    <div className="map-legend">
      <span>{mode === 'volume' ? 'Fewer reports' : 'Decrease'}</span>
      <span className={'legend-ramp ' + mode} />
      <span>{mode === 'volume' ? 'More reports' : 'Increase'}</span>
      {hotspots.length > 0 && (
        <span className="flex items-center gap-1.5 ml-3 pl-3 border-l border-[var(--border)] text-xs text-[var(--muted)]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span>PostGIS DBSCAN Cluster</span>
        </span>
      )}
    </div>

    {hover && !hotspotHover && (
      <div className="map-hover">
        <strong>{hover}</strong>
        <span>{integer(current[hover] ?? 0)} selected reports</span>
        {mode === 'change' && (
          <span>
            {percent(before[hover] ? ((current[hover] ?? 0) - before[hover]) / before[hover] : null)} versus {integer(before[hover] ?? 0)} prior reports
          </span>
        )}
      </div>
    )}

    {hotspotHover && (
      <div className="map-hover hotspot-tooltip">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-2 h-2 rounded-full ${hotspotHover.severityTier === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`} />
          <strong>{hotspotHover.complaintType} Outage Hotspot</strong>
          <span className="text-[10px] font-mono uppercase text-[var(--muted)]">({hotspotHover.severityTier})</span>
        </div>
        <div className="text-xs text-[var(--foreground)] mb-1">{hotspotHover.triageHypothesis}</div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
          <span>{hotspotHover.incidentCount} reports in {Math.round(hotspotHover.radiusMeters)}m</span>
          <span>Est. TTC: <strong className="text-emerald-400">{hotspotHover.predictedTtcHours}h</strong></span>
        </div>
      </div>
    )}
  </div>;
}
