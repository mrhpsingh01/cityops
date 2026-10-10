-- Deterministic CityOps fixture for CI only. Times are NYC-local civil values.
INSERT INTO ingestion_runs (status, ended_at, source_from, source_to_exclusive, analysis_cutoff_local, rows_seen)
VALUES ('succeeded', '2025-02-15T05:00:00Z', '2025-01-01', '2025-02-15', '2025-02-15 00:00:00', 8);

INSERT INTO requests (request_id, created_at_local, closed_at_local, problem, problem_detail, agency_code,
  status_raw, status_normalized, borough, community_board, incident_zip)
VALUES
  ('fixture-n1','2025-01-04 12:00:00','2025-01-05 13:00:00','Noise - Residential','Loud Music/Party','NYPD','Closed','closed','BRONX','01 BRONX','10451'),
  ('fixture-h1','2025-01-05 09:00:00','2025-01-13 09:00:01','HEAT/HOT WATER','No Heat','HPD','Closed','closed','BRONX','01 BRONX','10451'),
  ('fixture-n2','2025-01-18 10:00:00','2025-01-18 13:00:00','Noise - Residential','=1+1','NYPD','Closed','closed','QUEENS','01 QUEENS','11101'),
  ('fixture-h2','2025-01-18 11:00:00',NULL,'HEAT/HOT WATER','No Heat','HPD','Open','open','BRONX','02 BRONX','10452'),
  ('fixture-p1','2025-01-19 09:00:00','2025-01-20 09:00:00','Illegal Parking','Blocked Sidewalk','NYPD','Closed','closed','BROOKLYN','01 BROOKLYN','11211'),
  ('fixture-h3','2025-01-20 08:00:00','2025-01-22 08:00:00','HEAT/HOT WATER','No Hot Water','HPD','Closed','closed','BRONX','03 BRONX','10453'),
  ('fixture-n3','2025-01-24 08:00:00',NULL,'Noise - Residential','Loud Music/Party','NYPD','Unspecified','unknown','MANHATTAN','01 MANHATTAN','10001'),
  ('fixture-p2','2025-02-10 12:00:00',NULL,'Illegal Parking','Blocked Driveway','NYPD','Open','open','QUEENS','01 QUEENS','11101');
