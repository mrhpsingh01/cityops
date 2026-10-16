const fs = require('node:fs');
const path = require('node:path');

const targetDir = path.resolve(__dirname, '../apps/api/fixtures');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}
const targetFile = path.join(targetDir, 'seed_postgis.sql');

console.log('Generating deterministic 5,000-row PostGIS fixture...');

let sql = `-- Deterministic 5,000-row NYC 311 PostGIS Fixture
-- SYNTHETIC data: row-level values are generated, not NYC Open Data. The ingestion_runs row mirrors the reconciliation counts of the real full-month ingest (181,205)
-- Embeds 4 dense spatial clusters in Crown Heights, Fordham, Astoria, and Washington Heights

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 1. Insert Ingestion Run Summary (Preserves 181,205 reconciled metadata)
INSERT INTO ingestion_runs (
  status, started_at, ended_at, source_from, source_to_exclusive,
  analysis_cutoff_local, rows_seen, rows_inserted, rows_updated
) VALUES (
  'succeeded',
  '2025-02-01 02:15:00-05',
  '2025-02-01 03:00:00-05',
  '2025-01-01',
  '2025-02-01',
  '2025-02-01 00:00:00',
  181205,
  181205,
  0
) ON CONFLICT DO NOTHING;

`;

// 4 Dense Spatial Clusters
const clusters = [
  {
    name: 'Crown Heights',
    problem: 'HEAT/HOT WATER',
    descriptor: 'ENTIRE BUILDING',
    borough: 'BROOKLYN',
    agency: 'HPD',
    agencyName: 'Department of Housing Preservation and Development',
    centerLat: 40.6694,
    centerLon: -73.9421,
    count: 48,
    radius: 0.0012, // ~130 meters
    dateStart: '2025-01-29 08:00:00',
  },
  {
    name: 'Fordham',
    problem: 'HEAT/HOT WATER',
    descriptor: 'RESIDENTIAL BUILDING',
    borough: 'BRONX',
    agency: 'HPD',
    agencyName: 'Department of Housing Preservation and Development',
    centerLat: 40.8621,
    centerLon: -73.8903,
    count: 38,
    radius: 0.0010, // ~110 meters
    dateStart: '2025-01-28 10:00:00',
  },
  {
    name: 'Astoria',
    problem: 'Noise - Residential',
    descriptor: 'Loud Music/Party',
    borough: 'QUEENS',
    agency: 'NYPD',
    agencyName: 'New York City Police Department',
    centerLat: 40.7642,
    centerLon: -73.9234,
    count: 26,
    radius: 0.0011, // ~120 meters
    dateStart: '2025-01-30 22:00:00',
  },
  {
    name: 'Washington Heights',
    problem: 'Illegal Parking',
    descriptor: 'Blocked Hydrant/Driveway',
    borough: 'MANHATTAN',
    agency: 'NYPD',
    agencyName: 'New York City Police Department',
    centerLat: 40.8415,
    centerLon: -73.9391,
    count: 22,
    radius: 0.0012, // ~130 meters
    dateStart: '2025-01-30 14:00:00',
  },
];

const boroughs = ['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'];
const boroWeights = [0.28, 0.34, 0.18, 0.17, 0.03];
const boroCoords = {
  'BRONX': { lat: 40.8448, lon: -73.8648 },
  'BROOKLYN': { lat: 40.6782, lon: -73.9442 },
  'MANHATTAN': { lat: 40.7831, lon: -73.9712 },
  'QUEENS': { lat: 40.7282, lon: -73.7949 },
  'STATEN ISLAND': { lat: 40.5795, lon: -74.1502 },
};

const problems = ['HEAT/HOT WATER', 'Illegal Parking', 'Noise - Residential'];
const agencies = {
  'HEAT/HOT WATER': { code: 'HPD', name: 'Department of Housing Preservation and Development' },
  'Illegal Parking': { code: 'NYPD', name: 'New York City Police Department' },
  'Noise - Residential': { code: 'NYPD', name: 'New York City Police Department' },
};
const baseTtcHours = {
  'HEAT/HOT WATER': 46.5,
  'Illegal Parking': 10.3,
  'Noise - Residential': 4.8,
};

// Seed random generator for determinism
let s = 123456789;
function rand() {
  s = (s * 1103515245 + 12345) & 0x7fffffff;
  return s / 0x7fffffff;
}

const rows = [];

// 1. Generate dense clusters
for (const c of clusters) {
  const baseDate = new Date(c.dateStart.replace(' ', 'T') + 'Z').getTime();
  for (let i = 0; i < c.count; i++) {
    const angle = rand() * 2 * Math.PI;
    const r = rand() * c.radius;
    const lat = Number((c.centerLat + r * Math.cos(angle)).toFixed(6));
    const lon = Number((c.centerLon + r * Math.sin(angle)).toFixed(6));
    const createdOffset = Math.floor(rand() * 48 * 3600 * 1000);
    const createdDate = new Date(baseDate + createdOffset);
    const createdStr = createdDate.toISOString().slice(0, 19).replace('T', ' ');

    const ttc = baseTtcHours[c.problem] * (0.8 + rand() * 0.4);
    const closedDate = new Date(createdDate.getTime() + ttc * 3600 * 1000);
    const isClosed = rand() > 0.15;
    const closedStr = isClosed ? `'${closedDate.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL';
    const status = isClosed ? 'closed' : 'open';
    const statusRaw = isClosed ? 'Closed' : 'Open';

    rows.push({
      id: `seed-cluster-${c.borough.toLowerCase().slice(0, 4)}-${i + 1}`,
      created: createdStr,
      closed: closedStr,
      problem: c.problem,
      descriptor: c.descriptor,
      agency: c.agency,
      agencyName: c.agencyName,
      status,
      statusRaw,
      borough: c.borough,
      cb: `01 ${c.borough}`,
      zip: '10001',
      lat,
      lon,
    });
  }
}

// 2. Generate distributed realistic background requests up to 5,000 total
const totalTarget = 5000;
const startMonth = new Date('2025-01-01T00:00:00Z').getTime();
const endMonth = new Date('2025-02-01T00:00:00Z').getTime();

while (rows.length < totalTarget) {
  const i = rows.length;
  // Pick borough
  const bRand = rand();
  let boro = 'BROOKLYN';
  let accum = 0;
  for (let bIdx = 0; bIdx < boroughs.length; bIdx++) {
    accum += boroWeights[bIdx];
    if (bRand <= accum) {
      boro = boroughs[bIdx];
      break;
    }
  }

  // Pick problem
  const pRand = rand();
  const problem = pRand < 0.45 ? 'HEAT/HOT WATER' : pRand < 0.8 ? 'Illegal Parking' : 'Noise - Residential';
  const agency = agencies[problem];

  // Coordinates
  const bCenter = boroCoords[boro];
  const lat = Number((bCenter.lat + (rand() - 0.5) * 0.08).toFixed(6));
  const lon = Number((bCenter.lon + (rand() - 0.5) * 0.08).toFixed(6));

  // Date
  const createdMs = startMonth + Math.floor(rand() * (endMonth - startMonth));
  const createdDate = new Date(createdMs);
  const createdStr = createdDate.toISOString().slice(0, 19).replace('T', ' ');

  const ttc = baseTtcHours[problem] * (0.6 + rand() * 0.8);
  const closedDate = new Date(createdMs + ttc * 3600 * 1000);
  const isClosed = rand() > 0.08;
  const closedStr = isClosed ? `'${closedDate.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL';
  const status = isClosed ? 'closed' : 'open';
  const statusRaw = isClosed ? 'Closed' : 'In Progress';

  rows.push({
    id: `seed-req-${String(i + 1).padStart(5, '0')}`,
    created: createdStr,
    closed: closedStr,
    problem,
    descriptor: 'Standard Complaint Reported',
    agency: agency.code,
    agencyName: agency.name,
    status,
    statusRaw,
    borough: boro,
    cb: `01 ${boro}`,
    zip: '11201',
    lat,
    lon,
  });
}

// Write in batch inserts of 500 rows
const BATCH_SIZE = 500;
for (let b = 0; b < rows.length; b += BATCH_SIZE) {
  const batch = rows.slice(b, b + BATCH_SIZE);
  sql += `INSERT INTO requests (
  request_id, created_at_local, closed_at_local, problem, problem_detail,
  agency_code, agency_name, status_raw, status_normalized, borough,
  community_board, incident_zip, latitude, longitude, geom
) VALUES\n`;

  const values = batch.map((r) => {
    return `  ('${r.id}', '${r.created}', ${r.closed}, '${r.problem}', '${r.descriptor}', '${r.agency}', '${r.agencyName}', '${r.statusRaw}', '${r.status}', '${r.borough}', '${r.cb}', '${r.zip}', ${r.lat}, ${r.lon}, ST_SetSRID(ST_MakePoint(${r.lon}, ${r.lat}), 4326))`;
  });

  sql += values.join(',\n') + `\nON CONFLICT (request_id) DO NOTHING;\n\n`;
}

// Compute daily_intake_metrics
sql += `
-- Populate daily_intake_metrics from seeded requests
DELETE FROM daily_intake_metrics WHERE intake_date >= '2025-01-01' AND intake_date < '2025-02-01';
INSERT INTO daily_intake_metrics (intake_date, borough, problem, agency_code, request_count)
SELECT created_at_local::date, coalesce(borough, 'UNKNOWN'), problem, coalesce(agency_code, 'UNKNOWN'), count(*)::integer
FROM requests
WHERE created_at_local >= '2025-01-01' AND created_at_local < '2025-02-01'
GROUP BY 1, 2, 3, 4;
`;

fs.writeFileSync(targetFile, sql, 'utf8');
console.log(`Wrote ${rows.length} rows to ${targetFile}`);
