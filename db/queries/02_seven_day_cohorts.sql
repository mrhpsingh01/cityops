-- Latest successful source cutoff, not the application server's current time.
WITH cutoff AS (
  SELECT analysis_cutoff_local AS at_local
  FROM ingestion_runs WHERE status = 'succeeded'
  ORDER BY ended_at DESC LIMIT 1
), eligible AS (
  SELECT r.created_at_local, r.closed_at_local
  FROM requests r CROSS JOIN cutoff c
  WHERE r.created_at_local >= TIMESTAMP '2025-01-01'
    AND r.created_at_local < TIMESTAMP '2025-02-01'
    AND r.created_at_local <= c.at_local - INTERVAL '7 days'
)
SELECT date_trunc('week', created_at_local)::date AS creation_week,
       count(*) AS eligible_requests,
       count(*) FILTER (WHERE closed_at_local >= created_at_local
                         AND closed_at_local <= created_at_local + INTERVAL '7 days') AS closed_within_seven_days,
       round(100.0 * count(*) FILTER (WHERE closed_at_local >= created_at_local
                                      AND closed_at_local <= created_at_local + INTERVAL '7 days')
             / nullif(count(*), 0), 3) AS seven_day_closure_percent
FROM eligible
GROUP BY 1 ORDER BY 1;
