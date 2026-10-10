"""Train and evaluate a creation-time seven-day unresolved experiment.

This script writes a report and a local model artifact. It does not publish
predictions unless a later release has a validated, current scoring cohort.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if (ROOT / ".deps").exists():
    sys.path.insert(0, str(ROOT / ".deps"))

import joblib
import numpy as np
import pandas as pd
import psycopg
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, precision_score, recall_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from feature_contract import ALLOWED_FEATURES, assert_feature_contract

VERSION = "logreg-2025-jan-v1"
TRAIN_END = "2025-01-21"
VALIDATION_END = "2025-01-27"
TEST_END = "2025-02-01"
SQL = (ROOT / "training.sql").read_text(encoding="utf-8")


def load():
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        cutoff = conn.execute(
            """SELECT to_char(analysis_cutoff_local, 'YYYY-MM-DD HH24:MI:SS')
               FROM ingestion_runs WHERE status='succeeded' ORDER BY ended_at DESC LIMIT 1"""
        ).fetchone()
        if not cutoff:
            raise RuntimeError("No successful published ingestion run")
        with conn.cursor() as cur:
            cur.execute(SQL, {"from_date": "2025-01-01", "to_exclusive": TEST_END, "analysis_cutoff": cutoff[0]})
            rows = cur.fetchall()
            columns = [column.name for column in cur.description]
    frame = pd.DataFrame(rows, columns=columns)
    if frame.empty:
        raise RuntimeError("No mature training records")
    return frame, cutoff[0]


def features(frame):
    created = pd.to_datetime(frame["created_at_local"])
    result = frame[["problem", "problem_detail", "borough", "community_board"]].copy()
    result["created_weekday"] = created.dt.dayofweek.astype(str)
    result["created_hour"] = created.dt.hour.astype(str)
    result["created_month"] = created.dt.month.astype(str)
    assert_feature_contract(result.columns)
    return result[list(ALLOWED_FEATURES)]


def grouped_baseline(train, target, other, strength=50):
    global_rate = float(target.mean())
    grouped = train[["problem", "borough"]].copy()
    grouped["target"] = target.to_numpy()
    summary = grouped.groupby(["problem", "borough"], dropna=False)["target"].agg(["sum", "count"])
    rates = (summary["sum"] + strength * global_rate) / (summary["count"] + strength)
    return np.array([float(rates.get((problem, borough), global_rate)) for problem, borough
                     in zip(other["problem"], other["borough"])])


def evaluate(y, scores):
    y = np.asarray(y, dtype=int)
    scores = np.asarray(scores, dtype=float)
    order = np.argsort(-scores)
    top_100 = order[: min(100, len(order))]
    top_tenth = order[: max(1, int(np.ceil(len(order) * 0.1)))]
    return {
        "n": int(len(y)),
        "positive_count": int(y.sum()),
        "base_rate": float(y.mean()),
        "pr_auc": float(average_precision_score(y, scores)) if y.sum() else None,
        "brier": float(brier_score_loss(y, scores)),
        "precision_top_100": float(y[top_100].mean()),
        "precision_top_10pct": float(y[top_tenth].mean()),
        "recall_top_10pct": float(y[top_tenth].sum() / y.sum()) if y.sum() else None,
    }


def calibration(y, scores):
    df = pd.DataFrame({"actual": np.asarray(y, dtype=int), "score": scores})
    df["bin"] = pd.qcut(df["score"].rank(method="first"), 10, labels=False)
    return [
        {"n": int(len(group)), "mean_probability": float(group["score"].mean()),
         "observed_rate": float(group["actual"].mean())}
        for _, group in df.groupby("bin")
    ]


def group_metrics(frame, y, scores, column):
    result = []
    for value in sorted(frame[column].fillna("UNKNOWN").unique()):
        mask = frame[column].fillna("UNKNOWN").eq(value).to_numpy()
        if mask.sum() < 100:
            continue
        result.append({"group": value, **evaluate(np.asarray(y)[mask], np.asarray(scores)[mask])})
    return result


def main():
    frame, cutoff = load()
    created = frame["created_at_local"].str.slice(0, 10)
    train_mask = created < TRAIN_END
    validation_mask = (created >= TRAIN_END) & (created < VALIDATION_END)
    test_mask = (created >= VALIDATION_END) & (created < TEST_END)
    if not train_mask.any() or not validation_mask.any() or not test_mask.any():
        raise RuntimeError("Chronological split lacks one of train, validation, test")
    train, validation, test = frame[train_mask], frame[validation_mask], frame[test_mask]
    x_train, x_validation, x_test = features(train), features(validation), features(test)
    y_train = train["target"].astype(int)
    y_validation = validation["target"].astype(int)
    y_test = test["target"].astype(int)

    constant = float(y_train.mean())
    baseline_validation = np.full(len(validation), constant)
    baseline_test = np.full(len(test), constant)
    grouped_validation = grouped_baseline(train, y_train, validation)
    grouped_test = grouped_baseline(train, y_train, test)

    categorical = list(ALLOWED_FEATURES)
    model = Pipeline([
        ("features", ColumnTransformer([
            ("categories", Pipeline([
                ("fill", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=25)),
            ]), categorical),
        ])),
        ("classifier", LogisticRegression(max_iter=500)),
    ])
    model.fit(x_train, y_train)
    model_validation = model.predict_proba(x_validation)[:, 1]
    model_test = model.predict_proba(x_test)[:, 1]
    threshold = float(np.quantile(model_validation, 0.9))
    high = model_test >= threshold
    report = {
        "model_version": VERSION,
        "analysis_cutoff_local": cutoff,
        "source_range": ["2025-01-01", TEST_END],
        "splits": {
            "train": ["2025-01-01", TRAIN_END],
            "validation": [TRAIN_END, VALIDATION_END],
            "test": [VALIDATION_END, TEST_END],
        },
        "target": "No valid closure recorded within seven NYC-local civil days in latest available source row",
        "features": list(ALLOWED_FEATURES),
        "validation": {
            "constant": evaluate(y_validation, baseline_validation),
            "grouped_problem_borough": evaluate(y_validation, grouped_validation),
            "logistic": evaluate(y_validation, model_validation),
        },
        "test": {
            "constant": evaluate(y_test, baseline_test),
            "grouped_problem_borough": evaluate(y_test, grouped_test),
            "logistic": evaluate(y_test, model_test),
            "high_risk_threshold_from_validation": threshold,
            "high_risk_count": int(high.sum()),
            "high_risk_precision": float(precision_score(y_test, high, zero_division=0)),
            "high_risk_recall": float(recall_score(y_test, high, zero_division=0)),
            "calibration": calibration(y_test, model_test),
            "by_problem": group_metrics(test, y_test, model_test, "problem"),
            "by_borough": group_metrics(test, y_test, model_test, "borough"),
        },
    }
    grouped = report["test"]["grouped_problem_borough"]
    logistic = report["test"]["logistic"]
    report["publication_gate_passed"] = bool(
        report["test"]["logistic"]["positive_count"] >= 50
        and report["validation"]["logistic"]["precision_top_100"]
        > report["validation"]["grouped_problem_borough"]["precision_top_100"]
        and logistic["precision_top_100"] > grouped["precision_top_100"]
        and logistic["brier"] <= grouped["brier"]
    )
    (ROOT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    joblib.dump(model, ROOT / "model.joblib")
    print(json.dumps({
        "train": len(train), "validation": len(validation), "test": len(test),
        "test_base_rate": report["test"]["logistic"]["base_rate"],
        "model_top_100_precision": logistic["precision_top_100"],
        "grouped_top_100_precision": grouped["precision_top_100"],
        "publication_gate_passed": report["publication_gate_passed"],
    }, indent=2))


if __name__ == "__main__":
    main()
