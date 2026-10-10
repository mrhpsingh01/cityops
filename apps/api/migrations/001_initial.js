/* eslint-disable */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE raw_requests (
      request_id text PRIMARY KEY,
      payload jsonb NOT NULL,
      fetched_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE quarantined_requests (
      request_id text PRIMARY KEY,
      payload jsonb NOT NULL,
      reason text NOT NULL,
      fetched_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE requests (
      request_id text PRIMARY KEY,
      created_at_local timestamp NOT NULL,
      closed_at_local timestamp,
      problem text NOT NULL,
      problem_detail text,
      agency_code text,
      agency_name text,
      status_raw text,
      status_normalized text NOT NULL CHECK (status_normalized IN ('open','closed','unknown')),
      borough text,
      community_board text,
      incident_zip text,
      latitude double precision,
      longitude double precision,
      quality_flags text[] NOT NULL DEFAULT '{}',
      ingested_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE ingestion_runs (
      run_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      started_at timestamptz NOT NULL DEFAULT now(),
      ended_at timestamptz,
      status text NOT NULL CHECK (status IN ('running','succeeded','failed')),
      source_from date,
      source_to_exclusive date,
      analysis_cutoff_local timestamp,
      rows_seen bigint NOT NULL DEFAULT 0,
      rows_inserted bigint NOT NULL DEFAULT 0,
      rows_updated bigint NOT NULL DEFAULT 0,
      error_message text
    );
    CREATE TABLE ingestion_stage (
      run_id bigint NOT NULL REFERENCES ingestion_runs(run_id) ON DELETE CASCADE,
      request_id text NOT NULL,
      source_date date NOT NULL,
      payload jsonb NOT NULL,
      normalized jsonb NOT NULL,
      PRIMARY KEY (run_id, request_id)
    );
    CREATE INDEX ingestion_stage_date_idx ON ingestion_stage (run_id, source_date);
    CREATE TABLE request_daily_snapshots (
      snapshot_date date NOT NULL,
      request_id text NOT NULL REFERENCES requests(request_id),
      status_normalized text NOT NULL,
      age_days integer NOT NULL,
      PRIMARY KEY (snapshot_date, request_id)
    );
    CREATE TABLE daily_intake_metrics (
      intake_date date NOT NULL,
      borough text NOT NULL,
      problem text NOT NULL,
      agency_code text NOT NULL,
      request_count integer NOT NULL,
      PRIMARY KEY (intake_date, borough, problem, agency_code)
    );
    CREATE TABLE model_predictions (
      request_id text NOT NULL REFERENCES requests(request_id),
      model_version text NOT NULL,
      scored_at timestamptz NOT NULL,
      unresolved_day_7_probability double precision NOT NULL
        CHECK (unresolved_day_7_probability BETWEEN 0 AND 1),
      PRIMARY KEY (request_id, model_version)
    );
    CREATE INDEX requests_created_problem_borough_idx ON requests (created_at_local, problem, borough);
    CREATE INDEX requests_status_created_idx ON requests (status_normalized, created_at_local);
    CREATE INDEX requests_area_idx ON requests (community_board, created_at_local);
    CREATE INDEX requests_agency_created_idx ON requests (agency_code, created_at_local);
  `);
};
exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE model_predictions;
    DROP TABLE daily_intake_metrics;
    DROP TABLE request_daily_snapshots;
    DROP TABLE ingestion_stage;
    DROP TABLE ingestion_runs;
    DROP TABLE requests;
    DROP TABLE quarantined_requests;
    DROP TABLE raw_requests;
  `);
};
