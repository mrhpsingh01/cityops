const { existsSync } = require('node:fs');
const { resolve, dirname, join } = require('node:path');
const { loadEnvFile } = require('node:process');
const { spawnSync } = require('node:child_process');

const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) loadEnvFile(rootEnv);
const executable = join(dirname(require.resolve('node-pg-migrate/package.json')), 'bin/node-pg-migrate.js');
const result = spawnSync(process.execPath, [executable, '-m', 'migrations', ...process.argv.slice(2)], {
  stdio: 'inherit', env: process.env,
});
process.exit(result.status ?? 1);
