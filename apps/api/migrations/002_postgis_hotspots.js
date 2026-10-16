/* eslint-disable */
exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      CREATE EXTENSION IF NOT EXISTS postgis;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'PostGIS extension not available in this Postgres instance: %', SQLERRM;
    END $$;

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        ALTER TABLE requests ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
        UPDATE requests SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
          WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;
        CREATE INDEX IF NOT EXISTS requests_geom_idx ON requests USING GIST (geom);
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS hotspot_dispatches (
      dispatch_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      cluster_id text NOT NULL,
      dispatched_at timestamptz NOT NULL DEFAULT now(),
      complaint_type text NOT NULL,
      borough text NOT NULL,
      incident_count integer NOT NULL,
      severity_tier text NOT NULL,
      channel text NOT NULL,
      destination_url text,
      payload jsonb NOT NULL,
      status text NOT NULL CHECK (status IN ('delivered', 'simulated', 'failed')),
      response_status integer,
      response_body text
    );
    CREATE INDEX IF NOT EXISTS hotspot_dispatches_cluster_idx ON hotspot_dispatches (cluster_id, dispatched_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS hotspot_dispatches;
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        DROP INDEX IF EXISTS requests_geom_idx;
        ALTER TABLE requests DROP COLUMN IF EXISTS geom;
      END IF;
    END $$;
  `);
};
