-- Current published slice: row identity and flags remain inspectable.
SELECT count(*) AS request_rows,
       count(DISTINCT request_id) AS distinct_request_ids,
       count(*) FILTER (WHERE closed_at_local < created_at_local) AS negative_durations,
       count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS missing_valid_coordinates,
       count(*) FILTER (WHERE status_normalized = 'unknown') AS unknown_statuses,
       count(*) FILTER (WHERE problem IS NULL OR agency_code IS NULL) AS missing_problem_or_agency
FROM requests
WHERE created_at_local >= TIMESTAMP '2025-01-01'
  AND created_at_local < TIMESTAMP '2025-02-01';

SELECT intake_date, sum(request_count) AS aggregate_count,
       (SELECT count(*) FROM requests r WHERE r.created_at_local::date = m.intake_date) AS request_count
FROM daily_intake_metrics m
WHERE intake_date >= DATE '2025-01-01' AND intake_date < DATE '2025-02-01'
GROUP BY intake_date
HAVING sum(request_count) <> (SELECT count(*) FROM requests r WHERE r.created_at_local::date = m.intake_date)
ORDER BY intake_date;
