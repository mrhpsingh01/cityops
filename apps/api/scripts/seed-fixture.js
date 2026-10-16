const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { Pool } = require('pg');
const { buildPoolConfig } = require('./pg-config');

const isCiTest = process.env.CITYOPS_TEST_FIXTURE === '1';
const file = isCiTest
  ? resolve(__dirname, '../../../tests/fixtures/seed.sql')
  : resolve(__dirname, '../fixtures/seed_postgis.sql');

async function seed() {
  if (!existsSync(file)) throw new Error(`Fixture file not found: ${file}`);
  const pool = new Pool(buildPoolConfig());
  try {
    await pool.query(readFileSync(file, 'utf8'));
    process.stdout.write(`Loaded deterministic fixture from ${isCiTest ? 'seed.sql (CI)' : 'seed_postgis.sql (5,000 synthetic rows)'}\n`);
  } finally {
    await pool.end();
  }
}

module.exports = { seed };
if (require.main === module) {
  seed().catch((err) => {
    process.stderr.write(`Failed to seed fixture: ${err.message}\n`);
    process.exit(1);
  });
}
