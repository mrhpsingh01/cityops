"use client";

import Link from 'next/link';
import { SparkleIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { Filters, filterParams } from '@/lib/api';

export type DurationRow = { problem: string; sample: number; p50Hours: number | null };

interface HeadlineBannerProps {
  filters: Filters;
  durations: DurationRow[];
  hotspotCount: number;
}

const label = (problem: string) => problem.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const fmtHours = (h: number) => `${h.toFixed(1)} hours`;

export function buildHeadline(durations: DurationRow[], hotspotCount: number, filters: Filters): string {
  const rows = durations.filter((d) => d.p50Hours !== null && d.sample > 0) as Array<DurationRow & { p50Hours: number }>;
  const spots = hotspotCount === 1 ? '1 active spatial hotspot' : `${hotspotCount} active spatial hotspots`;
  const scope = filters.borough ? ` in ${label(filters.borough)}` : '';
  if (rows.length === 0) return `No closed requests in the selected range to compare; ${spots} detected${scope}.`;
  const sorted = [...rows].sort((a, b) => b.p50Hours - a.p50Hours);
  const slow = sorted[0];
  const fast = sorted[sorted.length - 1];
  if (sorted.length === 1) {
    return `Key Finding: ${label(slow.problem)} requests take a median of ${fmtHours(slow.p50Hours)} to close${scope}, with ${spots}.`;
  }
  const ratio = fast.p50Hours > 0 ? slow.p50Hours / fast.p50Hours : null;
  return `Key Finding: ${label(slow.problem)} requests take a median of ${fmtHours(slow.p50Hours)} to close${scope}${
    ratio ? ` - ${ratio.toFixed(1)}x longer than ${label(fast.problem)} (${fmtHours(fast.p50Hours)})` : ''
  }, with ${spots} detected.`;
}

export function HeadlineBanner({ filters, durations, hotspotCount }: HeadlineBannerProps) {
  return (
    <div className="headline-banner">
      <div className="headline-badge">
        <SparkleIcon size={14} weight="fill" className="text-amber-400" />
        <span>EXECUTIVE CIVIC INTELLIGENCE</span>
      </div>
      <p className="headline-text">{buildHeadline(durations, hotspotCount, filters)}</p>
      <div className="headline-action">
        <Link href={'/map?' + filterParams(filters)} className="headline-link">
          <span>Inspect Active Outage Hotspots</span>
          <ArrowRightIcon size={13} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
