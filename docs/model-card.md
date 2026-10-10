# Model card: seven-day unresolved experiment

**Version:** `logreg-2025-jan-v1`

**Status:** evaluated offline; **not published as a request ranking**.
**Source:** NYC 311 dataset `erm2-nwe9`, selected three problems, January 1–31, 2025. Evaluation run on October 10, 2026 from the successfully ingested source slice. The exact metrics are in [report.json](../analytics/modeling/report.json).

## Intended question and target

At creation time, estimate whether the latest available source row has **no valid recorded closure within seven NYC-local civil days**. A valid closure timestamp must be at or after creation. This source does not provide a complete event history of reopenings, so the label is about recorded closure in available data, not a proven seven-day operational outcome. Seven days is CityOps' analytical threshold, not an official NYC target.

## Features and leakage control

The logistic regression uses problem, problem detail, borough, community board, weekday, hour, and month of creation. One-hot encoding handles categories absent from the training period. The feature contract rejects closure timestamp, final status, resolution description, ingested time, duration, quality flags, and target. Current agency is excluded because the dataset does not prove it was the intake assignment. The grouped historical-rate baseline uses problem and borough with smoothing; it is fitted on training rows only.

## Chronological evaluation

| Split | Created dates | Rows | Positive outcomes |
| --- | --- | ---: | ---: |
| Train | Jan 1–20 | 130,103 | 41 |
| Validation | Jan 21–26 | 33,813 | 20 |
| Held-out test | Jan 27–31 | 17,289 | 3 |

The model threshold was selected at the validation 90th percentile and not retuned on the test period. The held-out test has only **three positive examples** (0.017%), too few for a credible public priority queue.

| Test metric | Constant rate | Problem + borough rate | Logistic regression |
| --- | ---: | ---: | ---: |
| PR-AUC | 0.000174 | 0.000554 | 0.000513 |
| Precision, top 100 | 0% | 0% | 0% |
| Precision, top 10% | 0% | 0% | 0% |
| Brier score | 0.00017351 | 0.00017404 | 0.00017368 |

On validation, grouped historical rate had 2% precision among the top 100 while logistic regression had 0%. Neither method identified a test positive in the top 100. Calibration and subgroup results are in the machine-readable report, but with this few positives they are unstable. The publication gate requires at least 50 positive test cases and an improvement over the grouped baseline on validation and test queue precision, without worse test Brier score. It failed.

## Limits and next step

The three high-volume categories were selected for dashboard completeness, not because they yield a useful seven-day risk label. The available January slice has only 64 positives in total. A future experiment should expand the observation period and profile candidate categories with a meaningful unresolved rate before retraining, while preserving a later untouched test period and creation-time feature evidence. Until then the Risk page explains the withheld ranking; no agency action or CityOps priority is implied.
