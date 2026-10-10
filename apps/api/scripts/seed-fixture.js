const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { Pool } = require('pg');

if (process.env.CITYOPS_TEST_FIXTURE !== '1') {
  throw new Error('Refusing to seed fixture without CITYOPS_TEST_FIXTURE=1');
}
const file = resolve(__dirname, '../../../tests/fixtures/seed.sql');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(readFileSync(file, 'utf8'))
  .then(() => process.stdout.write('Loaded deterministic fixture\n'))
  .finally(() => pool.end());
