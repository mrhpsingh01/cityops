"use client";

import * as Dialog from '@radix-ui/react-dialog';
import { Filters } from '@/lib/api';

export function MetricExplain({ title, definition, filters, exclusions, queryName }: {
  title: string; definition: string; filters: Filters; exclusions: string; queryName: string;
}) {
  return <Dialog.Root>
    <Dialog.Trigger className="explain-trigger" type="button">Explain this chart ↗</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="explain-drawer" aria-describedby={undefined}>
        <div className="drawer-top"><div><div className="eyebrow">METRIC NOTES</div><Dialog.Title>{title}</Dialog.Title></div><Dialog.Close className="drawer-close" aria-label="Close chart explanation">✕</Dialog.Close></div>
        <dl className="detail-list">
          <div><dt>Definition</dt><dd>{definition}</dd></div>
          <div><dt>Creation period</dt><dd>{filters.from} to {filters.toExclusive} (exclusive)</dd></div>
          <div><dt>Filters</dt><dd>{[['Problem', filters.problem], ['Borough', filters.borough], ['Agency', filters.agency], ['Board', filters.communityBoard], ['ZIP', filters.incidentZip]].filter((item) => item[1]).map((item) => `${item[0]}: ${item[1]}`).join(' · ') || 'All supported records'}</dd></div>
          <div><dt>Exclusions</dt><dd>{exclusions}</dd></div>
          <div><dt>Transformation</dt><dd><code>{queryName}</code></dd></div>
        </dl>
        <p className="explain-note">Counts describe reports received in the imported slice. They are not confirmed incident counts.</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
