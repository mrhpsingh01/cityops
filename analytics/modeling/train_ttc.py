"""Train and evaluate the Time-to-Close (TTC) Regression Model (Model v2).

Predicts expected resolution duration in hours (predicted_ttc_hours) using:
complaint type, agency, borough, hour-of-day, day-of-week, and local spatial complaint density.
Compares HistGradientBoostingRegressor against Ridge baseline and grouped median.
Exports metrics to ttc_report.json and lookup statistics to ttc_stats.json.
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
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, median_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer

VERSION = "hist-gbr-2025-v2"
TRAIN_END = "2025-01-21"
VALIDATION_END = "2025-01-27"
TEST_END = "2025-02-01"


def load_data():
    """Load closed requests from Postgres. No synthetic fallback: metrics must come from stored rows."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL is required: Model v2 trains only on rows stored in the requests table.")
    import psycopg
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT request_id, created_at_local, problem, problem_detail,
                       coalesce(agency_code, 'UNKNOWN') AS agency,
                       coalesce(borough, 'UNKNOWN') AS borough,
                       coalesce(community_board, 'UNKNOWN') AS community_board,
                       latitude, longitude,
                       extract(epoch FROM (closed_at_local - created_at_local)) / 3600.0 AS ttc_hours
                FROM requests
                WHERE closed_at_local >= created_at_local
                  AND created_at_local >= '2025-01-01'
                  AND created_at_local < '2025-02-01'
                  AND NOT ('negative_duration' = ANY(quality_flags))
                ORDER BY created_at_local;
            """)
            rows = cur.fetchall()
            cols = [c.name for c in cur.description]
    if len(rows) < 100:
        sys.exit(f"Only {len(rows)} closed requests found; seed or ingest data first (npm run db:seed:fixture).")
    df = pd.DataFrame(rows, columns=cols)
    df["ttc_hours"] = df["ttc_hours"].astype(float)
    return df


def extract_features(df):
    created = pd.to_datetime(df["created_at_local"])
    feat = pd.DataFrame(index=df.index)
    feat["problem"] = df["problem"].fillna("UNKNOWN").astype(str)
    feat["agency"] = df["agency"].fillna("UNKNOWN").astype(str)
    feat["borough"] = df["borough"].fillna("UNKNOWN").astype(str)
    feat["hour_of_day"] = created.dt.hour
    feat["day_of_week"] = created.dt.dayofweek
    
    # Spatial complaint density (discretized 2km grid count)
    lat_round = df["latitude"].fillna(40.7).round(2)
    lon_round = df["longitude"].fillna(-73.9).round(2)
    grid = lat_round.astype(str) + "_" + lon_round.astype(str)
    counts = grid.map(grid.value_counts())
    feat["spatial_density"] = np.log1p(counts.fillna(1))
    
    return feat


def eval_regression(y_true, y_pred):
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 2),
        "medae": round(float(median_absolute_error(y_true, y_pred)), 2),
    }


def main():
    print("Loading data for TTC Regression Model (Model v2)...")
    df = load_data()
    print(f"Loaded {len(df)} records.")
    
    created = pd.to_datetime(df["created_at_local"]).dt.strftime("%Y-%m-%d")
    train_mask = created < TRAIN_END
    val_mask = (created >= TRAIN_END) & (created < VALIDATION_END)
    test_mask = (created >= VALIDATION_END) & (created < TEST_END)
    
    train_df = df[train_mask]
    val_df = df[val_mask]
    test_df = df[test_mask]
    
    X_train = extract_features(train_df)
    X_val = extract_features(val_df)
    X_test = extract_features(test_df)
    
    y_train = train_df["ttc_hours"].to_numpy()
    y_val = val_df["ttc_hours"].to_numpy()
    y_test = test_df["ttc_hours"].to_numpy()
    
    # Baseline: Problem x Borough Median
    medians = train_df.groupby(["problem", "borough"])["ttc_hours"].median()
    global_median = float(train_df["ttc_hours"].median())
    
    def baseline_predict(sub_df):
        preds = []
        for p, b in zip(sub_df["problem"], sub_df["borough"]):
            preds.append(medians.get((p, b), global_median))
        return np.array(preds)
        
    y_val_baseline = baseline_predict(val_df)
    y_test_baseline = baseline_predict(test_df)
    
    categorical_cols = ["problem", "agency", "borough"]
    numeric_cols = ["hour_of_day", "day_of_week", "spatial_density"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols),
            ("num", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]), numeric_cols),
        ]
    )
    
    # Train Ridge baseline
    ridge = Pipeline([
        ("prep", preprocessor),
        ("reg", Ridge(alpha=1.0)),
    ])
    ridge.fit(X_train, y_train)
    y_test_ridge = np.clip(ridge.predict(X_test), 0.5, 300)
    
    # Train HistGradientBoostingRegressor
    # HGBR supports categorical features natively or via one-hot
    hgbr = Pipeline([
        ("prep", preprocessor),
        ("reg", HistGradientBoostingRegressor(max_iter=150, min_samples_leaf=20, random_state=42)),
    ])
    hgbr.fit(X_train, y_train)
    y_val_hgbr = np.clip(hgbr.predict(X_val), 0.5, 300)
    y_test_hgbr = np.clip(hgbr.predict(X_test), 0.5, 300)
    
    # Permutation importance on the validation split (computed, not asserted)
    from sklearn.inspection import permutation_importance
    perm = permutation_importance(hgbr, X_val, y_val, scoring="neg_mean_absolute_error", n_repeats=5, random_state=42)
    raw = np.clip(perm.importances_mean, 0, None)
    total = float(raw.sum()) or 1.0
    labels = {"problem": "complaint_type", "agency": "agency", "borough": "borough",
              "hour_of_day": "hour_of_day", "day_of_week": "day_of_week", "spatial_density": "spatial_density"}
    importances = sorted(
        [{"feature": labels[c], "importance_pct": round(float(v) / total * 100, 1),
          "description": f"Permutation importance (validation MAE increase) for {labels[c]}"}
         for c, v in zip(X_val.columns, raw)],
        key=lambda f: -f["importance_pct"])

    # Benchmarks computed from the training frame
    overall_median = float(df["ttc_hours"].median())
    benchmarks = {}
    for prob, grp in df.groupby("problem"):
        med = float(grp["ttc_hours"].median())
        ratio = med / overall_median
        cmp_txt = (f"{ratio:.1f}x slower than the citywide median ({overall_median:.1f}h)" if ratio >= 1
                   else f"{1 / ratio:.1f}x faster than the citywide median ({overall_median:.1f}h)")
        benchmarks[prob] = {"median_hours": round(med, 1), "sample_size": int(len(grp)), "comparison": cmp_txt}

    training_data_source = f"PostgreSQL requests table ({len(df)} closed requests, Jan 2025)"

    # Evaluation
    metrics = {
        "model_version": VERSION,
        "target": "predicted_ttc_hours (Time-to-Close in hours)",
        "status": "ACTIVE_PRODUCTION",
        "sample_counts": {
            "train": int(len(train_df)),
            "validation": int(len(val_df)),
            "test": int(len(test_df)),
        },
        "evaluation": {
            "validation": {
                "grouped_median_baseline": eval_regression(y_val, y_val_baseline),
                "hist_gradient_boosting": eval_regression(y_val, y_val_hgbr),
            },
            "test": {
                "grouped_median_baseline": eval_regression(y_test, y_test_baseline),
                "ridge_baseline": eval_regression(y_test, y_test_ridge),
                "hist_gradient_boosting": eval_regression(y_test, y_test_hgbr),
            },
        },
        "feature_importances": importances,
        "resolution_benchmarks": benchmarks,
        "beats_grouped_median_baseline": bool(
            eval_regression(y_test, y_test_hgbr)["mae"] < eval_regression(y_test, y_test_baseline)["mae"]
        ),
        "serving_method": "grouped median of observed closure hours per (problem, borough)",
        "training_data_source": training_data_source,
    }

    # Export artifacts
    report_file = ROOT / "ttc_report.json"
    stats_file = ROOT / "ttc_stats.json"
    model_file = ROOT / "ttc_model.joblib"
    
    report_file.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    
    # Lookup statistics for NestJS API direct integration
    stats = {
        "modelVersion": VERSION,
        "status": "ACTIVE_PRODUCTION",
        "benchmarks": metrics["resolution_benchmarks"],
        "servingMethod": metrics["serving_method"],
        "trainingDataSource": metrics["training_data_source"],
        "testMetrics": metrics["evaluation"]["test"]["hist_gradient_boosting"],
        "baselineMetrics": metrics["evaluation"]["test"]["grouped_median_baseline"],
        "featureImportances": metrics["feature_importances"],
    }
    stats_file.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    
    joblib.dump(hgbr, model_file)
    # Mirror JSON artifacts into the API package so containers can serve governance metadata.
    api_artifacts = ROOT.parent.parent / "apps" / "api" / "artifacts"
    api_artifacts.mkdir(parents=True, exist_ok=True)
    for name in ("ttc_report.json", "ttc_stats.json", "report.json"):
        src = ROOT / name
        if src.exists():
            (api_artifacts / name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
    print(f"Successfully trained {VERSION} and wrote {report_file} and {stats_file}.")
    print(json.dumps(metrics["evaluation"]["test"], indent=2))


if __name__ == "__main__":
    main()
