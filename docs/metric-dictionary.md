# CityOps metric dictionary

All date filters are NYC-local civil dates, inclusive at `from` and exclusive at `toExclusive`. The default dashboard compares January 18–31, 2025 with January 4–17, 2025. Every request count is scoped to the three supported source problems unless a narrower filter is selected.

| Metric | Calculation | Interpretation limit |
| --- | --- | --- |
| Requests created | Count distinct `request_id` with `created_at_local` in the selected range. The primary key enforces distinctness. | Reports received, not confirmed incidents. |
| Previous period | Count the same filter values over the immediately preceding equal-length date range. | A prior period outside loaded coverage will have an incomplete comparison. |
| Period change | `(current − previous) / previous`. Return null if previous is zero. | A count shift alone does not establish a cause. |
| Problem momentum | Current and preceding equal-length request counts grouped by problem; bar length shows the absolute count difference, while the label shows percentage change when the prior count is above zero. | A preceding window before imported coverage is withheld rather than treated as zero. |
| Currently open | Selected requests whose latest ingested normalized status is `open`. | This is as of the last successful refresh, not a historical backlog series. |
| Close duration | `closed_at_local − created_at_local` in hours, where both exist and the result is nonnegative. | A recorded closure is not proof of satisfactory resolution. |
| Median close duration | 50th percentile of valid close durations among selected created requests. Show the closed sample size and open count. | Recently created cohorts can have many requests still open. |
| Seven-day closure rate | Eligible selected requests with valid closure recorded no later than seven days after creation, divided by all eligible selected requests. Eligibility requires `created_at_local <= analysis_cutoff_local − 7 days`. | Current source rows do not reveal complete reopen history. Seven days is CityOps' analytical threshold, not an official NYC SLA. |
| No closure by day seven per 1,000 | `(eligible − closed within 7 days) / eligible × 1,000`, grouped by problem; hide a rate when fewer than 30 requests are eligible. | This is not the current open count. The chart uses a relative bar scale and prints the rate. |
| Weekly closure chart | Eligible selected requests grouped by Monday creation week. | The selected range can create a partial edge week; immature requests are excluded. |
| Open age bands | Latest open requests grouped by whole days since creation: 0–2, 3–7, 8–14, 15–30, 31+. | Historical backlog requires saved snapshots. |
| Problem share | Problem count divided by all selected requests. | Changes when filters change. |
| Borough volume | Selected requests grouped by source borough. | Raw counts reflect reporting access, population, and behavior. No per-capita claim is made. |
| Borough problem mix | Each problem's count divided by all selected requests within a mapped NYC borough. | Every bar is 100% of its borough; bar length does not compare borough volume. Unmapped and unspecified boroughs are excluded and counted in the chart note. |

The importer maps `Closed` to `closed`, `Open`/`In Progress`/`Pending`/`Assigned` to `open`, and other values to `unknown` with a quality flag. It does not infer open or closed from a missing or inconsistent timestamp. Invalid negative durations are excluded from closure statistics and counted in quality reporting. The source's floating timestamps can be ambiguous around daylight saving transitions; this initial version does not invent an offset.
