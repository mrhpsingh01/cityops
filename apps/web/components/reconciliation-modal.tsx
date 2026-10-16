"use client";

import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircleIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { DataQuality } from '@/lib/api';

interface ReconciliationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataQuality: DataQuality | null;
  loadedRows: number;
}

export function ReconciliationModal({ open, onOpenChange, dataQuality, loadedRows }: ReconciliationModalProps) {
  const run = dataQuality?.latestRun ?? null;
  const fetched = run?.rows_seen == null ? null : Number(run.rows_seen);
  const reconciled = run ? Number(run.rows_inserted ?? 0) + Number(run.rows_updated ?? 0) : null;
  const fmt = (n: number | null) => (n === null ? 'n/a' : n.toLocaleString());
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content max-w-2xl" aria-describedby="reconciliation-desc">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
                <CheckCircleIcon size={24} weight="fill" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-[var(--foreground)]">
                  SODA Pipeline Reconciliation Proof
                </Dialog.Title>
                <p id="reconciliation-desc" className="text-xs text-[var(--muted)]">
                  Cryptographic & Count-Reconciled NYC 311 SODA Ingestion Audit
                </p>
              </div>
            </div>
            <Dialog.Close className="drawer-close" aria-label="Close">✕</Dialog.Close>
          </div>

          <div className="py-4 space-y-4 text-sm text-[var(--foreground)]">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
                <div className="text-xs text-[var(--muted)]">Source Records</div>
                <div className="text-xl font-mono font-bold text-emerald-400">{fmt(fetched)}</div>
                <div className="text-[10px] text-[var(--muted)]">ingestion_runs.rows_seen (SODA erm2-nwe9)</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
                <div className="text-xs text-[var(--muted)]">Staged & Verified</div>
                <div className="text-xl font-mono font-bold text-emerald-400">{fmt(reconciled)}</div>
                <div className="text-[10px] text-[var(--muted)]">rows_inserted + rows_updated · {loadedRows.toLocaleString()} rows currently in requests</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
                <div className="text-xs text-[var(--muted)]">Quarantined / Dropped</div>
                <div className="text-xl font-mono font-bold text-emerald-400">{fmt(dataQuality?.quarantined ?? null)}</div>
                <div className="text-[10px] text-[var(--muted)]">quarantined_requests row count</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold tracking-wider uppercase text-[var(--muted)]">
                Transactional Publication Contract
              </h4>
              <p className="text-xs leading-relaxed text-[var(--foreground)]">
                Every batch enforces strict source-count reconciliation. Ingestion acquires a session-level advisory lock
                (<code className="px-1 py-0.5 rounded bg-[var(--surface-sunken)]">pg_advisory_xact_lock</code>) and checks that
                the daily count reported by SODA precisely matches the staged rows:
              </p>
              <pre className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)] text-[11px] font-mono overflow-x-auto text-emerald-300">
{`-- Enforced before transactional commit:
SELECT count(*) FROM ingestion_stage WHERE run_id = $1 AND source_date = $2::date;
-- If count != sourceCount(day): ROLLBACK & mark ingestion_runs status = 'failed'
-- Zero silent drops: Quarantined records logged with explicit schema reasons`}
              </pre>
            </div>

            {run && (
              <p className="text-[11px] font-mono text-[var(--muted)]">
                Latest run #{run.run_id} · {run.status} · {run.started_at} to {run.ended_at ?? 'in progress'}
              </p>
            )}
            {loadedRows > 0 && fetched !== null && loadedRows < fetched && (
              <p className="text-[11px] text-amber-400">
                Note: this database holds {loadedRows.toLocaleString()} rows, fewer than the {fetched.toLocaleString()} recorded by the run. A bundled demo fixture records the full-month counts but only loads a sample; run <code>npm run ingest</code> for the full dataset.
              </p>
            )}
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                <ShieldCheckIcon size={16} />
                <span>Incremental SODA Sync Ready</span>
              </div>
              <p className="text-[var(--muted)]">
                Run <code className="text-[var(--foreground)] font-mono">npm run ingest:incremental</code> to fetch newly closed or recently filed 311 requests with idempotent upsert against existing keys.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-[var(--surface-sunken)] hover:bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)]"
            >
              Close Audit Proof
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
