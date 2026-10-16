import type { PoolConfig } from 'pg';

/**
 * Builds pg pool options from DATABASE_URL. Managed Postgres (Neon, Supabase, Render)
 * needs TLS: enabled via `?sslmode=require` or DATABASE_SSL=true. Set
 * DATABASE_SSL_REJECT_UNAUTHORIZED=false for providers whose CA is not in the system store.
 */
export function buildPoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const raw = env.DATABASE_URL;
  let connectionString = raw;
  let useSsl = env.DATABASE_SSL === 'true';
  if (raw) {
    try {
      const url = new URL(raw);
      const mode = url.searchParams.get('sslmode');
      if (mode && mode !== 'disable') useSsl = true;
      url.searchParams.delete('sslmode');
      connectionString = url.toString();
    } catch {
      // leave malformed URLs for pg to report
    }
  }
  return {
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
    max: Number(env.DATABASE_POOL_MAX ?? 10),
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  };
}
