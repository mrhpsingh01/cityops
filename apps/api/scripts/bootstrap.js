// Container/PaaS entrypoint: migrate, seed the fixture when the DB is empty, then start the API.
// Set SEED_FIXTURE=0 to skip seeding (e.g. when pointing at a real ingested database).
const { spawnSync } = require('node:child_process');
const { Pool } = require('pg');
const { buildPoolConfig } = require('./pg-config');
const { seed } = require('./seed-fixture');

async function main() {
  const migrate = spawnSync(process.execPath, [require.resolve('./migrate.js'), 'up'], { stdio: 'inherit', env: process.env });
  if (migrate.status !== 0) throw new Error('migrations failed');
  if (process.env.SEED_FIXTURE !== '0') {
    const pool = new Pool(buildPoolConfig());
    let count;
    try { count = Number((await pool.query('SELECT count(*) FROM requests')).rows[0].count); } finally { await pool.end(); }
    if (count === 0) { console.log('Empty DB detected: loading PostGIS fixture...'); await seed(); }
  }
  require('../dist/main.js');
}
main().catch((e) => { console.error(e); process.exit(1); });
