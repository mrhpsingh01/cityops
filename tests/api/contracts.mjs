import assert from 'node:assert/strict';

const base = process.env.CITYOPS_API_URL ?? 'http://localhost:4000';
async function get(path) {
  const response = await fetch(base + path);
  return { status: response.status, body: await response.json() };
}
const scope = '?from=2025-01-18&toExclusive=2025-02-01';
const health = await get('/api/v1/health');
assert.equal(health.status, 200);
assert.equal(health.body.database, 'ready');

const overview = await get('/api/v1/overview' + scope);
assert.equal(overview.status, 200);
assert.equal(overview.body.requestCount, 5);
assert.equal(overview.body.previousCount, 2);
assert.equal(overview.body.eligibleCount, 5);
assert.equal(overview.body.sevenDayClosureRate, 0.6);

const immature = await get('/api/v1/overview?from=2025-02-09&toExclusive=2025-02-15');
assert.equal(immature.body.requestCount, 1);
assert.equal(immature.body.eligibleCount, 0);
assert.equal(immature.body.sevenDayClosureRate, null);
const dayEight = await get('/api/v1/overview?from=2025-01-04&toExclusive=2025-01-06');
assert.equal(dayEight.body.eligibleCount, 2);
assert.equal(dayEight.body.sevenDayClosureRate, 0.5);

const trend = await get('/api/v1/trends' + scope + '&grouping=day');
const problems = await get('/api/v1/problems' + scope);
const signals = await get('/api/v1/problem-signals' + scope);
const mix = await get('/api/v1/area-problem-mix' + scope);
const requests = await get('/api/v1/requests' + scope + '&pageSize=100');
assert.equal(trend.body.reduce((sum, row) => sum + row.requestCount, 0), 5);
assert.equal(problems.body.reduce((sum, row) => sum + row.requestCount, 0), 5);
assert.equal(signals.body.reduce((sum, row) => sum + row.currentCount, 0), overview.body.requestCount);
assert.equal(signals.body.reduce((sum, row) => sum + row.priorCount, 0), overview.body.previousCount);
assert.equal(signals.body.reduce((sum, row) => sum + row.eligibleCount, 0), overview.body.eligibleCount);
assert.equal(signals.body.reduce((sum, row) => sum + row.closedWithin7Count, 0), 3);
assert.equal(mix.body.reduce((sum, row) => sum + row.requestCount, 0), overview.body.requestCount);
assert.equal(mix.body.find((row) => row.borough === 'BRONX' && row.problem === 'HEAT/HOT WATER').requestCount, 2);
assert.equal(requests.body.items.length, 5);
const detail = await get('/api/v1/requests/fixture-h2');
assert.equal(detail.body.status_normalized, 'open');
assert.ok(detail.body.source_url.includes('fixture-h2'));

const csv = await fetch(base + '/api/v1/exports/requests.csv' + scope);
assert.equal(csv.status, 200);
const csvText = await csv.text();
assert.equal(csvText.trim().split('\r\n').length, 6);
assert.ok(csvText.includes("\"'=1+1\""), 'formula-like source values must be inert in CSV');

assert.equal((await get('/api/v1/overview?from=2025-02-31&toExclusive=2025-03-02')).status, 400);
assert.equal((await get('/api/v1/requests' + scope + '&pageSize=1000')).status, 400);
assert.equal((await get('/api/v1/requests' + scope + '&sort=unbounded')).status, 400);

const gqlResponse = await fetch(base + '/graphql', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    operationName: 'Dashboard',
    query: 'query Dashboard($filters: AnalysisFilterInput!) { overview(filters: $filters) { requestCount } problemSignals(filters: $filters) { currentCount priorCount } areaProblemMix(filters: $filters) { requestCount } }',
    variables: { filters: { from: '2025-01-18', toExclusive: '2025-02-01' } },
  }),
});
const graphql = await gqlResponse.json();
assert.equal(graphql.data.overview.requestCount, overview.body.requestCount);
assert.equal(graphql.data.problemSignals.reduce((sum, row) => sum + row.currentCount, 0), overview.body.requestCount);
assert.equal(graphql.data.areaProblemMix.reduce((sum, row) => sum + row.requestCount, 0), overview.body.requestCount);
const excessiveQuery = `query Dashboard { ${Array.from({ length: 51 }, (_, i) =>
  `card${i}: overview(filters: {from: "2025-01-18", toExclusive: "2025-02-01"}) { requestCount }`).join(' ')} }`;
const rejected = await fetch(base + '/graphql', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ operationName: 'Dashboard', query: excessiveQuery }),
});
const rejectedBody = await rejected.json();
assert.ok(rejectedBody.errors?.some((error) => error.message.includes('field or depth budget')));

// Hotspots REST contract (/api/v1 and /api prefix rewrite)
const hotspotsV1 = await get('/api/v1/hotspots');
assert.equal(hotspotsV1.status, 200);
assert.ok(Array.isArray(hotspotsV1.body));
assert.ok(hotspotsV1.body.length > 0);
assert.ok(hotspotsV1.body[0].clusterId);
assert.ok(hotspotsV1.body[0].triageHypothesis);

const hotspotsAlias = await get('/api/hotspots');
assert.equal(hotspotsAlias.status, 200);
assert.equal(hotspotsAlias.body.length, hotspotsV1.body.length);

// Dispatch alert endpoint
const firstClusterId = hotspotsV1.body[0].clusterId;
const dispatchRes = await fetch(base + `/api/v1/hotspots/${firstClusterId}/dispatch-alert`, { method: 'POST' });
assert.ok([200, 201].includes(dispatchRes.status));
const dispatchBody = await dispatchRes.json();
assert.equal(dispatchBody.clusterId, firstClusterId);
assert.ok(['delivered', 'simulated'].includes(dispatchBody.status));

// Model Governance REST endpoint
const gov = await get('/api/v1/models/governance');
assert.equal(gov.status, 200);
assert.equal(gov.body.modelV1.status, 'WITHHELD_AT_GATE');
assert.equal(gov.body.modelV2.status, 'ACTIVE_PRODUCTION');

// GraphQL hotspots & governance contract
const gqlHotspots = await fetch(base + '/graphql', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    query: 'query { hotspots { clusterId complaintType severityTier } modelGovernance { modelV1 { status } modelV2 { status } } }',
  }),
});
const gqlHotspotsBody = await gqlHotspots.json();
assert.ok(gqlHotspotsBody.data.hotspots.length > 0);
assert.equal(gqlHotspotsBody.data.modelGovernance.modelV1.status, 'WITHHELD_AT_GATE');
assert.equal(gqlHotspotsBody.data.modelGovernance.modelV2.status, 'ACTIVE_PRODUCTION');

console.log('CityOps API contract checks passed');
