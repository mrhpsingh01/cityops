"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import { Area, filterParams, Filters } from '@/lib/api';
import { integer, percent } from './data-display';

type BoroughFeature = FeatureCollection<MultiPolygon, { boroname: string }>;
const name = (value: string) => value.toUpperCase();

export function BoroughMap({ areas, prior, filters, mode }: {
  areas: Area[]; prior: Area[]; filters: Filters; mode: 'volume' | 'change';
}) {
  const router = useRouter();
  const [geometry, setGeometry] = useState<BoroughFeature | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/boroughs.geojson').then((r) => r.json()).then((data: BoroughFeature) => { if (live) setGeometry(data); });
    return () => { live = false; };
  }, []);
  const paths = useMemo(() => {
    if (!geometry) return [];
    const projection = geoMercator().fitExtent([[18, 18], [782, 482]], geometry);
    const path = geoPath(projection);
    return geometry.features.map((feature) => ({ name: name(feature.properties.boroname), d: path(feature) ?? '' }));
  }, [geometry]);
  const current = Object.fromEntries(areas.map((a) => [name(a.borough), a.requestCount]));
  const before = Object.fromEntries(prior.map((a) => [name(a.borough), a.requestCount]));
  const max = Math.max(...areas.map((a) => a.requestCount), 1);
  const selected = filters.borough?.toUpperCase();
  const pick = (borough: string) => router.push('/map?' + filterParams({ ...filters, borough: selected === borough ? undefined : borough }));
  return <div className="map-wrap">
    {geometry ? <svg className="borough-svg" viewBox="0 0 800 500" role="img" aria-label="NYC boroughs colored by selected request count or change">
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
    </svg> : <div className="map-loading">Loading official NYC borough boundaries…</div>}
    <div className="map-legend"><span>{mode === 'volume' ? 'Fewer reports' : 'Decrease'}</span><span className={'legend-ramp ' + mode} /><span>{mode === 'volume' ? 'More reports' : 'Increase'}</span></div>
    {hover && <div className="map-hover"><strong>{hover}</strong><span>{integer(current[hover] ?? 0)} selected reports</span>{mode === 'change' && <span>{percent(before[hover] ? ((current[hover] ?? 0) - before[hover]) / before[hover] : null)} versus prior period</span>}</div>}
  </div>;
}
