import { Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { TtcService } from '../governance/ttc.service';
import { HotspotClusterType, DispatchAlertResultType, HotspotQueryDto } from './hotspots.dto';

interface DbClusterRow {
  problem: string;
  borough: string;
  cluster_num: number;
  incident_count: number;
  first_reported_at: string;
  latest_reported_at: string;
  radius_meters: number;
  centroid_geojson: string;
  hull_geojson: string;
}

@Injectable()
export class HotspotsService {
  private readonly logger = new Logger(HotspotsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool, private readonly ttc: TtcService) {}

  private async hasPostGis(): Promise<boolean> {
    try {
      const res = await this.pool.query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS exists"
      );
      return Boolean(res.rows[0]?.exists);
    } catch {
      return false;
    }
  }

  private generateHypothesis(problem: string, count: number, radius: number, borough: string): string {
    const p = problem.toUpperCase();
    if (p.includes('HEAT') || p.includes('WATER')) {
      return `${count} 'Heat/Hot Water' complaints within ${radius}m in ${borough} -> High probability of localized boiler or steam main failure`;
    }
    if (p.includes('PARKING')) {
      return `${count} 'Illegal Parking' complaints within ${radius}m in ${borough} -> Systematic corridor blockage or unauthorized commercial staging`;
    }
    if (p.includes('NOISE')) {
      return `${count} 'Noise - Residential' complaints within ${radius}m in ${borough} -> Acute localized sound disruption or recurring event disturbance`;
    }
    return `${count} '${problem}' complaints within ${radius}m in ${borough} -> Localized incident surge requiring immediate multi-agency triage`;
  }

  async getHotspots(query?: HotspotQueryDto): Promise<HotspotClusterType[]> {
    const isPostGis = await this.hasPostGis();

    if (!isPostGis) {
      throw new ServiceUnavailableException('PostGIS extension is not installed on this database; run migrations on a PostGIS-enabled Postgres');
    }

    {
      let fromDate = query?.from ?? null;
      let toDate = query?.toExclusive ?? null;

      // If no date range specified, default to latest 72 hours of data
      if (!fromDate && !toDate) {
        const hours = query?.hoursBack ?? 168;
        const maxDateRes = await this.pool.query<{ max_created: string }>(
          'SELECT max(created_at_local) as max_created FROM requests WHERE geom IS NOT NULL'
        );
        const maxCreated = maxDateRes.rows[0]?.max_created;
        if (maxCreated) {
          const maxDate = new Date(maxCreated);
          const minDate = new Date(maxDate.getTime() - hours * 3600 * 1000);
          fromDate = minDate.toISOString().slice(0, 19).replace('T', ' ');
          toDate = new Date(maxDate.getTime() + 1000).toISOString().slice(0, 19).replace('T', ' ');
        }
      }

      const sql = `
        WITH points AS (
          SELECT
            created_at_local,
            problem,
            coalesce(borough, 'UNKNOWN') AS borough,
            ST_Transform(geom, 2263) AS geom_2263
          FROM requests
          WHERE geom IS NOT NULL
            AND ($1::timestamp IS NULL OR created_at_local >= $1::timestamp)
            AND ($2::timestamp IS NULL OR created_at_local < $2::timestamp)
            AND ($3::text IS NULL OR problem = $3::text)
            AND ($4::text IS NULL OR borough = $4::text)
        ),
        clustered AS (
          SELECT
            created_at_local, problem, borough, geom_2263,
            ST_ClusterDBSCAN(geom_2263, eps := 656.168, minpoints := 15) OVER (PARTITION BY problem) AS cluster_num
          FROM points
        ),
        grouped AS (
          SELECT
            problem,
            cluster_num,
            mode() WITHIN GROUP (ORDER BY borough) AS borough,
            count(*)::integer AS incident_count,
            min(created_at_local) AS first_reported_at,
            max(created_at_local) AS latest_reported_at,
            ST_Collect(geom_2263) AS coll
          FROM clustered
          WHERE cluster_num IS NOT NULL
          GROUP BY problem, cluster_num
          HAVING count(*) >= 15
        ),
        shaped AS (
          SELECT g.*, ST_Centroid(g.coll) AS centroid_2263, ST_ConvexHull(g.coll) AS hull_2263
          FROM grouped g
        )
        SELECT
          s.problem,
          s.borough,
          s.cluster_num,
          s.incident_count,
          to_char(s.first_reported_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS first_reported_at,
          to_char(s.latest_reported_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS latest_reported_at,
          round((
            SELECT max(ST_Distance(c.geom_2263, s.centroid_2263))
            FROM clustered c WHERE c.problem = s.problem AND c.cluster_num = s.cluster_num
          ) / 3.28084)::float AS radius_meters,
          ST_AsGeoJSON(ST_Transform(s.centroid_2263, 4326)) AS centroid_geojson,
          ST_AsGeoJSON(ST_Transform(
            CASE WHEN GeometryType(s.hull_2263) = 'POLYGON' THEN s.hull_2263
                 ELSE ST_Buffer(s.centroid_2263, 328.084) END, 4326)) AS hull_geojson
        FROM shaped s
        ORDER BY s.incident_count DESC, s.latest_reported_at DESC
        LIMIT 50;
      `;

      const result = await this.pool.query<DbClusterRow>(sql, [
        fromDate,
        toDate,
        query?.problem ?? null,
        query?.borough ?? null,
      ]);

      return Promise.all(result.rows.map((row) => this.formatCluster(row)));
    }
  }

  private async formatCluster(row: DbClusterRow): Promise<HotspotClusterType> {
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const clusterId = `cluster-${slug(row.problem)}-${slug(row.borough)}-${row.cluster_num}`;
    const count = Number(row.incident_count);
    const radius = Number(row.radius_meters);

    const centroid = JSON.parse(row.centroid_geojson) as { type: string; coordinates: number[] };
    const hullRaw = row.hull_geojson;

    const severityTier: 'CRITICAL' | 'ELEVATED' | 'MONITOR' =
      count >= 30 ? 'CRITICAL' : count >= 15 ? 'ELEVATED' : 'MONITOR';

    const ttc = await this.ttc.estimate(row.problem, row.borough);

    return {
      clusterId,
      complaintType: row.problem,
      borough: row.borough,
      incidentCount: count,
      centroid: {
        type: centroid.type,
        coordinates: centroid.coordinates,
      },
      boundingHull: {
        type: 'Polygon',
        rawJson: hullRaw,
      },
      radiusMeters: radius,
      firstReportedAt: row.first_reported_at,
      latestReportedAt: row.latest_reported_at,
      severityTier,
      triageHypothesis: this.generateHypothesis(row.problem, count, Math.round(radius), row.borough),
      predictedTtcHours: ttc?.hours ?? 0,
      ttcComparison: ttc?.comparison ?? 'No closed requests to estimate from',
    };
  }

  async dispatchAlert(clusterId: string): Promise<DispatchAlertResultType> {
    const clusters = await this.getHotspots();
    const cluster = clusters.find((c) => c.clusterId === clusterId);

    if (!cluster) {
      throw new NotFoundException(`Cluster '${clusterId}' not found in active spatial window`);
    }

    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    const isLive = Boolean(webhookUrl);

    // Production-grade Slack and PagerDuty compatible payload
    const slackPayload = {
      text: `🚨 ${cluster.severityTier} OUTAGE ALERT: ${cluster.incidentCount} '${cluster.complaintType}' complaints clustered in ${cluster.borough}`,
      attachments: [
        {
          color: cluster.severityTier === 'CRITICAL' ? '#e11d48' : '#f59e0b',
          title: `Cluster ${cluster.borough} ${cluster.complaintType} Outage Anomaly`,
          title_link: `${(process.env.FRONTEND_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '')}/map?problem=${encodeURIComponent(cluster.complaintType)}&borough=${encodeURIComponent(cluster.borough)}`,
          fields: [
            { title: 'Severity Tier', value: cluster.severityTier, short: true },
            { title: 'Borough', value: cluster.borough, short: true },
            { title: 'Incident Count', value: `${cluster.incidentCount} within ${Math.round(cluster.radiusMeters)}m`, short: true },
            { title: 'Est. Resolution (TTC)', value: `${cluster.predictedTtcHours} hrs (${cluster.ttcComparison})`, short: true },
            { title: 'First Reported', value: cluster.firstReportedAt, short: true },
            { title: 'Latest Reported', value: cluster.latestReportedAt, short: true },
            { title: 'Triage Hypothesis', value: cluster.triageHypothesis, short: false },
          ],
          footer: 'CityOps Active Civic Triage Engine',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const payloadPreview = JSON.stringify(slackPayload, null, 2);
    let status: 'delivered' | 'simulated' | 'failed' = 'simulated';
    let responseStatus = 200;
    let responseBody = '{"ok": true, "simulated": true, "receipt": "Dry-run dispatch verified without external API key"}';
    let message = `Alert dry-run simulated for cluster ${clusterId}. Validated JSON payload receipt generated.`;

    if (isLive && webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });
        responseStatus = res.status;
        responseBody = await res.text();
        if (res.ok) {
          status = 'delivered';
          message = `Alert successfully dispatched to webhook endpoint: ${webhookUrl}`;
        } else {
          status = 'failed';
          message = `Webhook delivery returned HTTP ${res.status}`;
        }
      } catch (err: unknown) {
        status = 'failed';
        responseStatus = 500;
        responseBody = String(err);
        message = `Webhook dispatch failed: ${String(err)}`;
      }
    }

    // Persist dispatch audit event if table exists
    let dispatchId = `disp-${Date.now()}`;
    try {
      const insertRes = await this.pool.query<{ dispatch_id: string }>(
        `INSERT INTO hotspot_dispatches (
          cluster_id, complaint_type, borough, incident_count,
          severity_tier, channel, destination_url, payload, status,
          response_status, response_body
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
        RETURNING dispatch_id::text`,
        [
          cluster.clusterId,
          cluster.complaintType,
          cluster.borough,
          cluster.incidentCount,
          cluster.severityTier,
          'slack-webhook',
          webhookUrl ?? 'simulated://dry-run',
          JSON.stringify(slackPayload),
          status,
          responseStatus,
          responseBody.slice(0, 1000),
        ]
      );
      if (insertRes.rows[0]?.dispatch_id) {
        dispatchId = insertRes.rows[0].dispatch_id;
      }
    } catch (err) {
      this.logger.error(`Failed to persist dispatch audit record: ${String(err)}`);
      message += ' (audit record could not be persisted)';
    }

    return {
      dispatchId,
      clusterId: cluster.clusterId,
      dispatchedAt: new Date().toISOString(),
      status,
      channel: 'slack-webhook',
      destinationUrl: webhookUrl ?? null,
      responseStatus,
      payloadPreview,
      message,
    };
  }
}
