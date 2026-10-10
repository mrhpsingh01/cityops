-- Reproduce the two equal-length January windows used by the overview and finding.
WITH labeled AS (
  SELECT problem,
         CASE WHEN created_at_local >= TIMESTAMP '2025-01-18'
                    AND created_at_local < TIMESTAMP '2025-02-01' THEN 'current'
              WHEN created_at_local >= TIMESTAMP '2025-01-04'
                    AND created_at_local < TIMESTAMP '2025-01-18' THEN 'previous'
         END AS period
  FROM requests
  WHERE created_at_local >= TIMESTAMP '2025-01-04'
    AND created_at_local < TIMESTAMP '2025-02-01'
)
SELECT problem,
       count(*) FILTER (WHERE period = 'previous') AS previous_requests,
       count(*) FILTER (WHERE period = 'current') AS current_requests,
       round(100.0 * (count(*) FILTER (WHERE period = 'current')
                    - count(*) FILTER (WHERE period = 'previous'))
             / nullif(count(*) FILTER (WHERE period = 'previous'), 0), 1) AS percent_change
FROM labeled
GROUP BY problem
ORDER BY previous_requests DESC;
