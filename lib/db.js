// lib/db.js - 2026-07-20
// PostgreSQL connection pool — lazy connect so server starts without DB
import pg from 'pg';
const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    pool.on('error', (err) => {
      console.error('[db] Pool error:', err.message);
    });
  }
  return pool;
}

export async function query(sql, params) {
  const p = getPool();
  if (!p) return null;
  return p.query(sql, params);
}
