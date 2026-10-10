# Five-minute CityOps walkthrough

Run the January import from the README, then open `http://localhost:3000/dashboard`. The coverage strip should show **181,205 records** and the default January 18–31 window should show **63,477 requests**, compared with **96,655** in the preceding 14 days. The refresh badge shows the time of your own successful import.

1. Select **Noise - Residential** and apply the filter. The current period has **14,158** requests, down from **44,150**. Open the trend and follow a date into **Explore** to inspect the matching request records.
2. In **Explore**, select an ID. The detail drawer shows its latest reported status, recorded closure, quality flags, source link, and ingestion time. The CSV export uses the same filters and refuses a result over 5,000 rows.
3. Open the [HEAT/HOT WATER borough map](http://localhost:3000/map?from=2025-01-18&toExclusive=2025-02-01&problem=HEAT%2FHOT+WATER). The Bronx accounts for **11,422 of 30,624** selected heat reports. Open **Resolution** with the same filters to distinguish report volume from closure behavior.
4. Open **Insights** for the two source-checked findings, then **Methodology** for metric definitions and exclusions. **Risk** explains why no prediction queue was published: the held-out January test period contains only three unresolved-after-seven-day examples and the trained model did not beat the grouped baseline.

The screenshots [desktop](dashboard-preview.png) and [mobile](mobile-preview.png) show the layout. The runnable SQL in [`db/queries`](../db/queries) reproduces the period comparison, seven-day cohorts, and quality reconciliation:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/queries/01_period_comparison.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/queries/02_seven_day_cohorts.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/queries/03_quality_reconciliation.sql
```

These counts describe reports in the explicitly supported slice. They do not measure confirmed incidents or an official service target.
