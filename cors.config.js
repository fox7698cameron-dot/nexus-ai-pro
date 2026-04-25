// ================================================
// NEXUS AI PRO - CORS Configuration
// Single source of truth for all CORS settings.
//
// Why origin reflection instead of '*':
//   Browsers reject Access-Control-Allow-Origin: * when a request is
//   credentialed (Authorization header, cookies). Setting origin to `true`
//   tells the cors library to echo back the requesting origin, which is
//   valid with credentials while still accepting any origin in development.
//   In production, set CORS_ORIGIN to your actual domain(s).
// ================================================

const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Request-ID'];

function buildOrigin() {
  const raw = (process.env.CORS_ORIGIN || '*').trim();
  if (raw === '*') return true;
  if (raw.includes(',')) return raw.split(',').map(o => o.trim());
  return raw;
}

export const corsOrigin = buildOrigin();

// Used by the Express cors() middleware
export const expressCorsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ALLOWED_HEADERS
};

// Used by the Socket.IO server constructor
export const socketCorsOptions = {
  origin: corsOrigin,
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ALLOWED_HEADERS
};
