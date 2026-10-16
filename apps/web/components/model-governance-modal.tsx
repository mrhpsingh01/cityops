"use client";

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ShieldCheckIcon, ShieldWarningIcon, CpuIcon, TrendUpIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { ModelGovernance } from '@/lib/api';

interface ModelGovernanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  governance?: ModelGovernance | null;
}

export function ModelGovernanceModal({ open, onOpenChange, governance }: ModelGovernanceModalProps) {
  const [tab, setTab] = useState<'v2' | 'v1'>('v2');

  if (!governance) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content max-w-md" aria-describedby="governance-unavailable">
            <Dialog.Title className="text-base font-semibold text-[var(--foreground)]">Model governance unavailable</Dialog.Title>
            <p id="governance-unavailable" className="text-xs text-[var(--muted)] py-3">
              The API did not return /api/v1/models/governance. Check that the API is running and model artifacts are present.
            </p>
            <Dialog.Close className="drawer-close" aria-label="Close">Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
  const v1 = governance.modelV1;
  const v2 = governance.modelV2;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content max-w-3xl" aria-describedby="governance-desc">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-md bg-indigo-500/10 text-indigo-400">
                <CpuIcon size={24} weight="duotone" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-[var(--foreground)]">
                  CityOps Model Governance Card
                </Dialog.Title>
                <p id="governance-desc" className="text-xs text-[var(--muted)]">
                  Senior ML Governance: Publication Gate Enforcement & Target Reframing
                </p>
              </div>
            </div>
            <Dialog.Close className="drawer-close" aria-label="Close">✕</Dialog.Close>
          </div>

          <div className="flex border-b border-[var(--border)] mt-2">
            <button
              type="button"
              onClick={() => setTab('v2')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === 'v2'
                  ? 'border-emerald-400 text-emerald-400 font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <ShieldCheckIcon size={16} />
              <span>Model v2: Time-to-Close (Active Production)</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('v1')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === 'v1'
                  ? 'border-amber-400 text-amber-400 font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <ShieldWarningIcon size={16} />
              <span>Model v1: 7-Day Risk (Withheld at Gate)</span>
            </button>
          </div>

          <div className="py-4 space-y-4 text-sm text-[var(--foreground)]">
            {tab === 'v2' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                      Active Production Target
                    </div>
                    <div className="text-base font-bold text-[var(--foreground)]">
                      Expected Resolution Time in Hours (<code className="font-mono text-emerald-300">predicted_ttc_hours</code>)
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      Challenger: HistGradientBoostingRegressor ({v2.modelVersion}) · {v2.beatsBaseline ? 'beats' : 'does not beat'} grouped-median baseline on holdout MAE ({v2.holdoutMae} vs {v2.baselineMae}). Served: {v2.servingMethod}. Data: {v2.trainingDataSource}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {v2.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
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
                    <div className="text-xs text-[var(--muted)]">Grouped Baseline MAE</div>
                    <div className="text-xl font-mono font-bold text-[var(--foreground)]">{v2.baselineMae} hrs</div>
                    <div className="text-[10px] text-[var(--muted)]">Problem × Borough Median</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold tracking-wider uppercase text-[var(--muted)] mb-2">
                    Key Feature Importances (What Drives Resolution)
                  </h4>
                  <div className="space-y-2">
                    {v2.featureImportances.map((f) => (
                      <div key={f.feature} className="p-2 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono font-medium text-[var(--foreground)]">{f.feature}</span>
                          <span className="font-semibold text-emerald-400">{f.importancePct}%</span>
                        </div>
                        <div className="w-full bg-[var(--surface-raised)] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(f.importancePct, 100)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-1">{f.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold tracking-wider uppercase text-[var(--muted)] mb-2">
                    Resolution Time Benchmarks Served via API
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {v2.benchmarks.map((b) => (
                      <div key={b.problem} className="p-2.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-xs">
                        <div className="font-semibold text-[var(--foreground)]">{b.problem}</div>
                        <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">{b.medianHours} hrs</div>
                        <div className="text-[10px] text-[var(--muted)] mt-0.5">{b.comparison}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-amber-400">
                      Publication Gate Enforcement
                    </div>
                    <div className="text-base font-bold text-[var(--foreground)]">
                      Binary 7-Day Unresolved Risk ({v1.modelVersion})
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {v1.reason}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {v1.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
                    <div className="text-xs text-[var(--muted)]">Holdout Test Records</div>
                    <div className="text-xl font-mono font-bold text-[var(--foreground)]">{v1.testHoldoutRecords.toLocaleString()}</div>
                    <div className="text-[10px] text-[var(--muted)]">Jan 27–31 chronological cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
                    <div className="text-xs text-[var(--muted)]">Positive Test Outcomes</div>
                    <div className="text-xl font-mono font-bold text-rose-400">{v1.testPositiveCount}</div>
                    <div className="text-[10px] text-[var(--muted)]">Only {v1.testPositiveCount} tickets unresolved &gt; 7d</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
                    <div className="text-xs text-[var(--muted)]">Dataset Base Rate</div>
                    <div className="text-xl font-mono font-bold text-amber-400">{(v1.baseRate * 100).toFixed(2)}%</div>
                    <div className="text-[10px] text-[var(--muted)]">{((1 - v1.baseRate) * 100).toFixed(3)}% close within 7 days</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)] text-xs space-y-2">
                  <h4 className="font-semibold text-[var(--foreground)]">Why the Gate Blocked Public Ranking:</h4>
                  <ul className="list-disc pl-4 space-y-1 text-[var(--muted)]">
                    <li>The evaluation gate requires at least 50 positive test cases to prevent erratic ranking queues.</li>
                    <li>Logistic regression top-100 precision on the test set was 0.0%, failing to beat the grouped baseline.</li>
                    <li>
                      <strong>Staff Engineering Action:</strong> Instead of publishing an ungrounded priority queue, the system transparently documents the failure on the Risk page and reframed the ML problem to Time-to-Close regression (Model v2).
                    </li>
                  </ul>
                  <a
                    href="/methodology"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:underline pt-1 text-xs"
                  >
                    <span>Read full Model Card & Publication Gate criteria</span>
                    <ArrowSquareOutIcon size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-[var(--surface-sunken)] hover:bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)]"
            >
              Close Governance Card
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
