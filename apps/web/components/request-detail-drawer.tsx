"use client";

import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { RequestRow } from '@/lib/api';
import { hours } from './data-display';

export function RequestDetailDrawer({ detail, closeHref }: { detail: RequestRow; closeHref: string }) {
  const router = useRouter();
  return <Dialog.Root open onOpenChange={(open) => { if (!open) router.push(closeHref); }}>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="request-drawer" aria-describedby={undefined}>
      <div className="drawer-top"><div><div className="eyebrow">REQUEST DETAIL</div><Dialog.Title>#{detail.request_id}</Dialog.Title></div><Dialog.Close className="drawer-close" aria-label="Close request detail">✕</Dialog.Close></div>
      <dl className="detail-list">
        <div><dt>Problem</dt><dd>{detail.problem}</dd></div><div><dt>Problem detail</dt><dd>{detail.problem_detail ?? 'Not provided'}</dd></div>
        <div><dt>Created</dt><dd>{detail.created_at_local.replace('T', ' ')} NYC local</dd></div><div><dt>Closed</dt><dd>{detail.closed_at_local?.replace('T', ' ') ?? 'No closure recorded'}</dd></div>
        <div><dt>Latest reported status</dt><dd>{detail.status_raw ?? 'Unknown'}</dd></div><div><dt>Agency</dt><dd>{detail.agency_name ?? detail.agency_code ?? 'Not provided'}</dd></div>
        <div><dt>Area</dt><dd>{[detail.borough, detail.community_board, detail.incident_zip].filter(Boolean).join(' · ') || 'Not provided'}</dd></div>
        <div><dt>Valid close duration</dt><dd>{hours(detail.close_hours == null ? null : Number(detail.close_hours))}</dd></div>
        <div><dt>Quality flags</dt><dd>{detail.quality_flags.length ? detail.quality_flags.join(', ') : 'None'}</dd></div>
        <div><dt>Last imported</dt><dd>{detail.ingested_at.replace('T', ' ')}</dd></div>
      </dl><a href={detail.source_url} target="_blank" rel="noreferrer" className="primary-action">Open NYC source record ↗</a>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
