import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ModelGovernanceType } from './governance.dto';
import { TtcService } from './ttc.service';

function readArtifact(name: string): any {
  const dirs = [process.env.MODEL_ARTIFACT_DIR, resolve(process.cwd(), 'artifacts'), resolve(process.cwd(), '../../analytics/modeling')];
  for (const dir of dirs) {
    if (!dir) continue;
    const file = resolve(dir, name);
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  }
  throw new ServiceUnavailableException(`Model artifact ${name} not found; run analytics/modeling training and copy outputs to apps/api/artifacts`);
}

@Injectable()
export class GovernanceService {
  constructor(private readonly ttc: TtcService) {}

  async getGovernanceMetadata(): Promise<ModelGovernanceType> {
    const v1 = readArtifact('report.json');
    const v2 = readArtifact('ttc_report.json');
    const test = v2.evaluation.test;
    const challenger = test.hist_gradient_boosting;
    const baseline = test.grouped_median_baseline;
    const beatsBaseline = challenger.mae < baseline.mae;
    const positives = Number(v1.test.logistic.positive_count);
    const holdout = Number(v1.test.logistic.n);
    const baseRate = Number(v1.test.logistic.base_rate);
    const gatePassed = Boolean(v1.publication_gate_passed);

    return {
      asOf: new Date().toISOString(),
      headline: `ML Publication Gate Enforced: v1 7-Day Risk ${gatePassed ? 'Active' : 'Withheld'} (${(baseRate * 100).toFixed(3)}% holdout base rate) | v2 Time-to-Close Active (served: grouped median; HistGBR challenger ${beatsBaseline ? 'beats' : 'does not beat'} baseline)`,
      modelV1: {
        name: '7d_unresolved_risk',
        modelVersion: v1.model_version,
        status: gatePassed ? 'ACTIVE_PRODUCTION' : 'WITHHELD_AT_GATE',
        baseRate,
        reason: `Failed temporal holdout baseline gate (only ${positives} positive instances in ${holdout.toLocaleString('en-US')} holdout records)`,
        gatePassed,
        testHoldoutRecords: holdout,
        testPositiveCount: positives,
        modelCardUrl: '/docs/model-card.md',
        modelCardSummary:
          `Temporal holdout of ${holdout.toLocaleString('en-US')} requests contained ${positives} unresolved-at-7-days positives (${(baseRate * 100).toFixed(3)}% base rate). The logistic model could not be distinguished from the constant baseline, so the publication gate failed and risk rankings are withheld.`,
      },
      modelV2: {
        name: 'time_to_close_hours',
        modelVersion: v2.model_version,
        status: v2.status,
        target: 'predicted_ttc_hours',
        holdoutMae: challenger.mae,
        holdoutRmse: challenger.rmse,
        holdoutMedAe: challenger.medae,
        baselineMae: baseline.mae,
        baselineRmse: baseline.rmse,
        baselineMedAe: baseline.medae,
        beatsBaseline,
        servingMethod: 'grouped median of observed closure hours per (complaint type, borough), computed live from requests',
        trainingDataSource: String(v2.training_data_source),
        holdoutRecords: Number(v2.sample_counts.test),
        featureImportances: (v2.feature_importances as any[]).map((f) => ({
          feature: f.feature,
          importancePct: Number(f.importance_pct),
          description: f.description ?? '',
        })),
        benchmarks: (await this.ttc.benchmarks()).map((b) => ({ problem: b.problem, medianHours: b.medianHours, comparison: b.comparison })),
      },
    };
  }
}
