// CJS twin of src/database/pool-config.ts for scripts that run before the TS build is used.
function buildPoolConfig(env = process.env) {
  let connectionString = env.DATABASE_URL;
  let useSsl = env.DATABASE_SSL === 'true';
  try {
    const url = new URL(connectionString);
    const mode = url.searchParams.get('sslmode');
    if (mode && mode !== 'disable') useSsl = true;
    url.searchParams.delete('sslmode');
    connectionString = url.toString();
  } catch { /* let pg report malformed URLs */ }
  return {
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  };
}
module.exports = { buildPoolConfig };
