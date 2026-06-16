// File: security.js | Date: 2026-06-16

// Pattern libraries for threat detection
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE)\b)/i,
  /('|")\s*(OR|AND)\s*('|"|[0-9])/i,
  /--\s*$/,
  /\/\*[\s\S]*?\*\//,
  /;\s*(DROP|DELETE|UPDATE|INSERT|CREATE)/i,
  /'\s*OR\s*'1'\s*=\s*'1/i,
  /INFORMATION_SCHEMA/i,
  /xp_cmdshell/i,
];

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /document\s*\.\s*cookie/i,
  /eval\s*\(/i,
  /alert\s*\(/i,
  /<img[^>]+src\s*=\s*['"]?javascript:/i,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.%2f/i,
  /\.\.%5c/i,
  /%2e%2e/i,
  /\.\.\\/,
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\/proc\/self/i,
  /c:\\windows\\system32/i,
];

const SUSPICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /acunetix/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /burpsuite/i,
  /dirbuster/i,
  /w3af/i,
];

const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

// Connection rate tracking: IP → {count, windowStart}
const connectionRates = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CONNECTIONS_PER_WINDOW = 500;

/**
 * Analyze a string for known threat patterns.
 */
function scanString(str, patterns, label) {
  if (typeof str !== 'string') return [];
  return patterns
    .filter(p => p.test(str))
    .map(p => ({ type: label, pattern: p.toString().slice(1, 30) }));
}

function flattenObject(obj, prefix = '') {
  if (typeof obj !== 'object' || obj === null) return [String(obj)];
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flattenObject(v, `${prefix}${k}.`)
      : [String(v)]
  );
}

/**
 * Detect threats in the incoming request.
 * Returns {threats: [], severity: 'none'|'low'|'medium'|'high'|'critical'}
 */
export function threatDetector(req) {
  const threats = [];
  const url = req.originalUrl || req.url || '';
  const userAgent = req.headers['user-agent'] || '';
  const body = req.body;

  // Check User-Agent
  if (SUSPICIOUS_USER_AGENTS.some(p => p.test(userAgent))) {
    threats.push({ type: 'suspicious_agent', detail: userAgent.slice(0, 60), severity: 'high' });
  }

  // Check URL
  threats.push(...scanString(url, SQL_INJECTION_PATTERNS, 'sql_injection').map(t => ({ ...t, location: 'url', severity: 'critical' })));
  threats.push(...scanString(url, XSS_PATTERNS, 'xss').map(t => ({ ...t, location: 'url', severity: 'high' })));
  threats.push(...scanString(url, PATH_TRAVERSAL_PATTERNS, 'path_traversal').map(t => ({ ...t, location: 'url', severity: 'critical' })));

  // Check query parameters
  const queryStr = JSON.stringify(req.query || {});
  threats.push(...scanString(queryStr, SQL_INJECTION_PATTERNS, 'sql_injection').map(t => ({ ...t, location: 'query', severity: 'critical' })));
  threats.push(...scanString(queryStr, XSS_PATTERNS, 'xss').map(t => ({ ...t, location: 'query', severity: 'high' })));

  // Check body values
  if (body && typeof body === 'object') {
    const values = flattenObject(body);
    for (const val of values) {
      threats.push(...scanString(val, SQL_INJECTION_PATTERNS, 'sql_injection').map(t => ({ ...t, location: 'body', severity: 'critical' })));
      threats.push(...scanString(val, XSS_PATTERNS, 'xss').map(t => ({ ...t, location: 'body', severity: 'high' })));
      threats.push(...scanString(val, PATH_TRAVERSAL_PATTERNS, 'path_traversal').map(t => ({ ...t, location: 'body', severity: 'critical' })));
    }
  }

  // Payload size check
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_PAYLOAD_SIZE) {
    threats.push({ type: 'oversized_payload', detail: `${contentLength} bytes`, severity: 'medium' });
  }

  // Determine overall severity
  const levels = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
  let maxSeverity = 'none';
  for (const t of threats) {
    if ((levels[t.severity] || 0) > (levels[maxSeverity] || 0)) {
      maxSeverity = t.severity;
    }
  }

  return { threats, severity: maxSeverity };
}

/**
 * Security middleware. Blocks critical threats; logs warnings for others.
 */
export function securityMiddleware(req, res, next) {
  const { threats, severity } = threatDetector(req);

  if (severity === 'critical') {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    console.warn(`[Security] CRITICAL threat from ${ip}: ${req.method} ${req.originalUrl}`, threats.slice(0, 3));
    return res.status(403).json({
      error: 'Request blocked due to security policy violation',
      code: 'THREAT_DETECTED',
    });
  }

  if (threats.length > 0) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    console.warn(`[Security] ${severity.toUpperCase()} threat from ${ip}:`, threats.slice(0, 2));
  }

  next();
}

/**
 * Network connection rate monitor middleware.
 * Tracks connections per IP and logs anomalies.
 */
export function networkMonitor() {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = connectionRates.get(ip) || { count: 0, windowStart: now };

    // Reset window if expired
    if (now - entry.windowStart > RATE_WINDOW_MS) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count++;
    connectionRates.set(ip, entry);

    // Prune old entries every 1000 requests to prevent memory bloat
    if (connectionRates.size > 10000) {
      const cutoff = now - RATE_WINDOW_MS;
      for (const [k, v] of connectionRates) {
        if (v.windowStart < cutoff) connectionRates.delete(k);
      }
    }

    if (entry.count > MAX_CONNECTIONS_PER_WINDOW) {
      console.warn(`[Security] High connection rate from ${ip}: ${entry.count} req/min`);
    }

    next();
  };
}

export default securityMiddleware;
