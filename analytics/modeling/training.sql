-- Frozen initial experiment: 2025-01-01 through 2025-01-31, three supported problems.
-- A closure is recorded if the latest source row has a valid closed_at_local
-- no more than seven NYC-local civil days after creation. Reopen history is unavailable.
SELECT request_id,
       to_char(created_at_local, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at_local,
       problem, problem_detail, borough, community_board,
       CASE WHEN closed_at_local >= created_at_local
             AND closed_at_local <= created_at_local + interval '7 days'
            THEN 0 ELSE 1 END AS target
FROM requests
WHERE created_at_local >= %(from_date)s::timestamp
  AND created_at_local < %(to_exclusive)s::timestamp
  AND created_at_local <= %(analysis_cutoff)s::timestamp - interval '7 days'
  AND NOT ('negative_duration' = ANY(quality_flags))
  AND NOT ('invalid_closed_date' = ANY(quality_flags))
ORDER BY created_at_local, request_id;
