import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(new URL('../../../analytics/modeling/report.json', import.meta.url), 'utf8'));
const summary = JSON.parse(readFileSync(new URL('../data/model-summary.json', import.meta.url), 'utf8'));
assert.deepEqual(summary, {
  modelVersion: report.model_version,
  testFrom: report.splits.test[0],
  testToExclusive: report.splits.test[1],
  testCount: report.test.logistic.n,
  positiveCount: report.test.logistic.positive_count,
  groupedBaselinePrAuc: report.test.grouped_problem_borough.pr_auc,
  logisticPrAuc: report.test.logistic.pr_auc,
  groupedBaselineTop100Precision: report.test.grouped_problem_borough.precision_top_100,
  logisticTop100Precision: report.test.logistic.precision_top_100,
  highRiskCount: report.test.high_risk_count,
  highRiskPrecision: report.test.high_risk_precision,
  publicationGatePassed: report.publication_gate_passed,
});
console.log('Model UI summary matches the evaluation report.');
