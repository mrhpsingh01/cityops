# GraphQL dashboard contract

Endpoint: `POST /graphql`. The browser-facing Next.js server uses GraphQL for composed dashboard views. REST remains available for health, metadata, request pages, detail, CSV, and simple analytical clients. Both transports call the same `MetricsService`.

```graphql
query Dashboard($filters: AnalysisFilterInput!) {
  overview(filters: $filters) {
    requestCount
    previousCount
    periodChange
    openCount
    eligibleCount
    sevenDayClosureRate
    medianCloseHours
    closedSample
    invalidDurationCount
    asOf
  }
  intakeTrend(filters: $filters, grouping: "day") {
    period
    requestCount
  }
  problemBreakdown(filters: $filters) {
    problem
    requestCount
  }
  areaComparison(filters: $filters) {
    borough
    requestCount
  }
}
```

```json
{
  "filters": {
    "from": "2025-01-18",
    "toExclusive": "2025-02-01",
    "problem": "HEAT/HOT WATER",
    "borough": "BRONX"
  }
}
```

`AnalysisFilterInput` accepts `from`, `toExclusive`, `problem`, `borough`, `agency`, `communityBoard`, and `incidentZip`. Dates are YYYY-MM-DD; the end is exclusive; the maximum span is 366 days. Inputs longer than 120 characters and invalid ranges are rejected. Grouping is `day` or `week`. List queries are server-limited to 30 problems and 10 boroughs. GraphQL requests have a 32 KiB JSON body cap and a validation budget of 50 fields and depth 6. Public production mode disables GraphiQL and introspection. The generated code-first schema is available from the running development API; Swagger documents REST only.

The Resolution page requests `resolution(filters)` with `cohorts`, `durations`, `backlog`, and `asOf`. GraphQL is read-only; there are no mutations.
