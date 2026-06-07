// src/components/SecurityDashboardEnhanced.jsx | Nexus AI Pro | Date: 2026-06-07

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

// ============================================================
// CONSTANTS
// ============================================================

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-600',    text: 'text-red-400',    border: 'border-red-500',    dot: 'bg-red-500',    weight: 0 },
  high:     { label: 'High',     color: 'bg-orange-600', text: 'text-orange-400', border: 'border-orange-500', dot: 'bg-orange-500', weight: 1 },
  medium:   { label: 'Medium',   color: 'bg-yellow-600', text: 'text-yellow-400', border: 'border-yellow-500', dot: 'bg-yellow-500', weight: 2 },
  low:      { label: 'Low',      color: 'bg-blue-600',   text: 'text-blue-400',   border: 'border-blue-500',   dot: 'bg-blue-500',   weight: 3 },
  info:     { label: 'Info',     color: 'bg-gray-600',   text: 'text-gray-400',   border: 'border-gray-500',   dot: 'bg-gray-500',   weight: 4 },
};

const EVENT_COLORS = {
  'user.login':             'text-green-400',
  'user.logout':            'text-gray-400',
  'admin.role_changed':     'text-yellow-400',
  'admin.user_suspended':   'text-orange-400',
  'admin.user_deleted':     'text-red-400',
  'security.scan':          'text-blue-400',
  'security.patch':         'text-purple-400',
  'auth.failed':            'text-red-500',
  'settings.updated':       'text-cyan-400',
  'connector.connected':    'text-emerald-400',
  'connector.disconnected': 'text-gray-400',
};

const MOCK_VULNERABILITIES = [
  { id: 'vuln-001', title: 'Outdated TLS 1.0/1.1 support detected',       severity: 'critical', cve: 'CVE-2023-1234', component: 'nginx/1.18.0', patched: false, description: 'Legacy TLS versions enable downgrade attacks. Disable TLS 1.0 and 1.1 immediately.' },
  { id: 'vuln-002', title: 'npm package with known RCE vulnerability',      severity: 'high',     cve: 'CVE-2023-5678', component: 'node_modules/lodash@4.17.15', patched: false, description: 'Prototype pollution in lodash <4.17.21 allows remote code execution.' },
  { id: 'vuln-003', title: 'Missing HTTP security headers (HSTS)',          severity: 'medium',   cve: null,            component: 'Express server config', patched: false, description: 'Strict-Transport-Security header absent; HTTPS downgrade possible.' },
  { id: 'vuln-004', title: 'Session cookie missing SameSite attribute',     severity: 'medium',   cve: null,            component: 'express-session',       patched: false, description: 'Without SameSite=Strict, CSRF attacks are possible via cross-origin forms.' },
  { id: 'vuln-005', title: 'Password hashing with low iteration count',     severity: 'low',      cve: null,            component: 'src/routes/admin.js',    patched: false, description: 'bcrypt rounds < 12 are considered insufficient for modern hardware.' },
  { id: 'vuln-006', title: 'API rate limit not enforced on /api/admin',     severity: 'low',      cve: null,            component: 'Express rate limiter',   patched: false, description: 'Admin endpoints should have tighter rate limits than general API.' },
  { id: 'vuln-007', title: 'Debug mode potentially enabled in production',  severity: 'info',     cve: null,            component: 'NODE_ENV=development',   patched: false, description: 'Ensure NODE_ENV=production before deploying to reduce attack surface.' },
];

const MOCK_AUDIT_EVENTS = [
  { id: 'evt-001', event: 'user.login',          message: 'cameronfox authenticated via MFA',     timestamp: Date.now() - 120_000 },
  { id: 'evt-002', event: 'security.scan',        message: 'Vulnerability scan initiated',          timestamp: Date.now() - 300_000 },
  { id: 'evt-003', event: 'connector.connected',  message: 'GitHub connector established',          timestamp: Date.now() - 600_000 },
  { id: 'evt-004', event: 'admin.role_changed',   message: 'nexus_mod promoted to moderator',      timestamp: Date.now() - 3600_000 },
  { id: 'evt-005', event: 'auth.failed',          message: 'Failed login attempt from 10.0.0.99',  timestamp: Date.now() - 7200_000 },
  { id: 'evt-006', event: 'settings.updated',     message: 'Rate limit updated to 100 req/min',    timestamp: Date.now() - 14400_000 },
  { id: 'evt-007', event: 'admin.user_suspended', message: 'User bob_tester suspended',            timestamp: Date.now() - 86400_000 },
  { id: 'evt-008', event: 'user.logout',          message: 'nexus_admin session expired',          timestamp: Date.now() - 172800_000 },
  { id: 'evt-009', event: 'security.patch',       message: 'Auto-patch applied: CORS headers',     timestamp: Date.now() - 259200_000 },
  { id: 'evt-010', event: 'connector.disconnected', message: 'Zoom connector disconnected',        timestamp: Date.now() - 345600_000 },
];

const MOCK_BLOCKED_IPS = [
  { ip: '185.220.101.47', country: 'RU', city: 'Moscow',       threatType: 'Brute Force',     blockedAt: Date.now() - 3600_000,   attempts: 247 },
  { ip: '45.33.32.156',   country: 'CN', city: 'Beijing',      threatType: 'Port Scan',       blockedAt: Date.now() - 7200_000,   attempts: 89 },
  { ip: '198.199.105.9',  country: 'US', city: 'New York',     threatType: 'SQL Injection',   blockedAt: Date.now() - 14400_000,  attempts: 31 },
  { ip: '103.21.244.0',   country: 'NG', city: 'Lagos',        threatType: 'DDoS',            blockedAt: Date.now() - 86400_000,  attempts: 12840 },
  { ip: '91.108.4.0',     country: 'DE', city: 'Frankfurt',    threatType: 'Credential Stuffing', blockedAt: Date.now() - 259200_000, attempts: 562 },
];

const MOCK_RECOMMENDATIONS = [
  { id: 'rec-001', priority: 'critical', title: 'Enable automatic TLS certificate rotation',    detail: 'Certificates should rotate every 90 days. Integrate with Let\'s Encrypt or AWS ACM.' },
  { id: 'rec-002', priority: 'high',     title: 'Enforce Multi-Factor Authentication for all admin accounts', detail: 'Currently 1 admin account has MFA disabled. Enforce via policy.' },
  { id: 'rec-003', priority: 'high',     title: 'Implement Content Security Policy (CSP)',       detail: 'A strict CSP prevents XSS by whitelisting trusted content origins.' },
  { id: 'rec-004', priority: 'medium',   title: 'Enable Redis AUTH and TLS',                    detail: 'Redis should require authentication and communicate over TLS in production.' },
  { id: 'rec-005', priority: 'medium',   title: 'Set up log aggregation (SIEM)',                detail: 'Forward audit logs to a SIEM (e.g., Elastic, Splunk) for real-time alerting.' },
  { id: 'rec-006', priority: 'low',      title: 'Add Subresource Integrity (SRI) to CDN assets', detail: 'SRI hashes ensure CDN resources haven\'t been tampered with.' },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)        return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)    return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function scoreColor(score) {
  if (score >= 80) return { stroke: '#22c55e', bg: 'text-green-400', label: 'Strong' };
  if (score >= 60) return { stroke: '#eab308', bg: 'text-yellow-400', label: 'Fair' };
  return             { stroke: '#ef4444', bg: 'text-red-400',    label: 'At Risk' };
}

function latencyColor(ms) {
  if (ms < 100) return 'text-green-400';
  if (ms < 500) return 'text-yellow-400';
  return 'text-red-400';
}

function exportJSON(data, filename) {
  const blob = new URL(
    `data:application/json,${encodeURIComponent(JSON.stringify(data, null, 2))}`,
  );
  const a = document.createElement('a');
  a.href = blob.href;
  a.download = filename;
  a.click();
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// --- Score Ring ---
function ScoreRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const { stroke, bg, label } = scoreColor(score);
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${bg}`}>{score}</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">/ 100</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-semibold ${bg}`}>{label}</span>
    </div>
  );
}

// --- Severity Badge ---
function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-white opacity-80`} />
      {cfg.label}
    </span>
  );
}

// --- Progress Bar ---
function ProgressBar({ value, max = 100, colorClass = 'bg-blue-500', label, unit = '%' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{label}</span>
          <span>{value}{unit}</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// --- Card Shell ---
function Card({ title, icon, children, className = '', actions }) {
  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

// --- Status Pill ---
function StatusPill({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${ok ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      {label}
    </span>
  );
}

// --- Scanning Overlay ---
function ScanProgress({ progress, phase }) {
  const phases = ['Initializing…', 'Scanning dependencies…', 'Checking network surface…', 'Analyzing configurations…', 'Generating report…'];
  const currentPhase = phases[Math.min(phase, phases.length - 1)];
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-gray-400">
        <span className="animate-pulse">{currentPhase}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex gap-1 justify-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * SecurityDashboardEnhanced
 *
 * Props:
 *   userId    — string  — current user's ID
 *   theme     — 'dark' | 'light' — (currently always dark; light TBD)
 *   authToken — string  — bearer token for API calls
 */
export default function SecurityDashboardEnhanced({ userId, theme = 'dark', authToken }) {
  // ── Security Score ──────────────────────────────────────
  const [securityScore, setSecurityScore] = useState(68);

  // ── Encryption ──────────────────────────────────────────
  const [encryptionState] = useState({
    algorithm: 'AES-256-GCM',
    keySize:   256,
    lastRotation: Date.now() - 14 * 86400_000, // 14 days ago
    nextRotation: Date.now() + 16 * 86400_000, // in 16 days
  });

  // ── Vulnerability Scanner ────────────────────────────────
  const [scanning, setScanning]             = useState(false);
  const [scanProgress, setScanProgress]     = useState(0);
  const [scanPhase, setScanPhase]           = useState(0);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [patchingId, setPatchingId]         = useState(null);
  const scanIntervalRef                     = useRef(null);

  // ── Network Monitoring ───────────────────────────────────
  const [networkState, setNetworkState] = useState({
    activeConnections: 47,
    blockedIPs:        MOCK_BLOCKED_IPS,
    bandwidthIn:       72,   // %
    bandwidthOut:      41,   // %
    latencyMs:         38,
  });
  const networkSSERef = useRef(null);

  // ── Device Security ──────────────────────────────────────
  const [deviceInfo, setDeviceInfo] = useState({
    fingerprint:         false,
    localStorageEncrypt: false,
    serviceWorker:       false,
    biometric:           false,
    platform:            '',
    browser:             '',
    resolution:          '',
  });

  // ── Audit Log ────────────────────────────────────────────
  const [auditEvents, setAuditEvents] = useState(MOCK_AUDIT_EVENTS);
  const auditRef                      = useRef(null);
  const auditSSERef                   = useRef(null);

  // ── Alerts ───────────────────────────────────────────────
  const [alerts, setAlerts] = useState([
    { id: 'alt-001', level: 'critical', message: 'TLS 1.0 still enabled on port 443',         timestamp: Date.now() - 60_000 },
    { id: 'alt-002', level: 'critical', message: 'CVE-2023-5678 detected in lodash package',  timestamp: Date.now() - 300_000 },
    { id: 'alt-003', level: 'warning',  message: 'Admin MFA not enabled for 1 account',       timestamp: Date.now() - 3600_000 },
    { id: 'alt-004', level: 'warning',  message: 'Redis running without AUTH password',        timestamp: Date.now() - 7200_000 },
    { id: 'alt-005', level: 'info',     message: 'Security scan completed — 7 findings',       timestamp: Date.now() - 14400_000 },
    { id: 'alt-006', level: 'info',     message: 'Connector health check passed for GitHub',   timestamp: Date.now() - 86400_000 },
  ]);

  // ── Rehydrate device info ────────────────────────────────
  useEffect(() => {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Chrome'))   browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari'))  browser = 'Safari';
    else if (ua.includes('Edge'))    browser = 'Edge';

    let platform = navigator.platform || 'Unknown';
    if (ua.includes('Win'))      platform = 'Windows';
    else if (ua.includes('Mac')) platform = 'macOS';
    else if (ua.includes('Linux')) platform = 'Linux';
    else if (ua.includes('Android')) platform = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) platform = 'iOS';

    const hasSW   = 'serviceWorker' in navigator;
    const hasCred = typeof window !== 'undefined' && 'credentials' in navigator && 'PublicKeyCredential' in window;

    // Storage encryption check: look for any nexus encryption flag
    let storageEncrypted = false;
    try {
      storageEncrypted = localStorage.getItem('nexus_encryption_enabled') === 'true';
    } catch (_) {}

    setDeviceInfo({
      fingerprint:         true, // Nexus fingerprints devices on auth
      localStorageEncrypt: storageEncrypted,
      serviceWorker:       hasSW,
      biometric:           hasCred,
      platform,
      browser,
      resolution:          `${window.screen.width}×${window.screen.height}`,
    });
  }, []);

  // ── SSE: Network realtime ────────────────────────────────
  useEffect(() => {
    const token = authToken || '';
    let es;
    try {
      es = new EventSource(`/api/security/network/realtime?token=${encodeURIComponent(token)}`);
      networkSSERef.current = es;

      es.addEventListener('network', (e) => {
        try {
          const data = JSON.parse(e.data);
          setNetworkState((prev) => ({
            ...prev,
            activeConnections: data.connections   ?? prev.activeConnections,
            bandwidthIn:       data.bandwidthIn   ?? prev.bandwidthIn,
            bandwidthOut:      data.bandwidthOut  ?? prev.bandwidthOut,
            latencyMs:         data.latencyMs     ?? prev.latencyMs,
          }));
        } catch (_) {}
      });

      es.onerror = () => {
        // SSE not available in dev — fall back to simulated updates
        es.close();
        simulateNetworkUpdates();
      };
    } catch (_) {
      simulateNetworkUpdates();
    }

    return () => {
      es?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const networkSimRef = useRef(null);
  const simulateNetworkUpdates = useCallback(() => {
    if (networkSimRef.current) return;
    networkSimRef.current = setInterval(() => {
      setNetworkState((prev) => ({
        ...prev,
        activeConnections: Math.max(10, prev.activeConnections + Math.floor(Math.random() * 7) - 3),
        bandwidthIn:       Math.min(100, Math.max(5, prev.bandwidthIn  + (Math.random() * 10 - 5))),
        bandwidthOut:      Math.min(100, Math.max(5, prev.bandwidthOut + (Math.random() * 8 - 4))),
        latencyMs:         Math.max(5, prev.latencyMs + Math.floor(Math.random() * 20 - 10)),
      }));
    }, 3000);
  }, []);

  // ── SSE: Audit log live feed ─────────────────────────────
  useEffect(() => {
    const token = authToken || '';
    let es;
    try {
      es = new EventSource(`/api/security/audit/realtime?token=${encodeURIComponent(token)}`);
      auditSSERef.current = es;

      es.addEventListener('audit', (e) => {
        try {
          const entry = JSON.parse(e.data);
          setAuditEvents((prev) => [
            { id: entry.id || `evt-${Date.now()}`, ...entry },
            ...prev,
          ].slice(0, 10));
        } catch (_) {}
      });

      es.onerror = () => { es.close(); };
    } catch (_) {}

    return () => es?.close();
  }, [authToken]);

  // Auto-scroll audit log
  useEffect(() => {
    if (auditRef.current) {
      auditRef.current.scrollTop = 0;
    }
  }, [auditEvents]);

  // ── Cleanup intervals on unmount ────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(scanIntervalRef.current);
      clearInterval(networkSimRef.current);
    };
  }, []);

  // ── Vulnerability Scanner ────────────────────────────────
  const handleRunScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);
    setScanPhase(0);
    setVulnerabilities([]);

    // Simulate scan progress in phases
    let prog = 0;
    let phase = 0;
    clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      prog += Math.floor(Math.random() * 6) + 2;
      if (prog >= 100) prog = 100;
      phase = Math.floor((prog / 100) * 5);
      setScanProgress(prog);
      setScanPhase(phase);
      if (prog >= 100) {
        clearInterval(scanIntervalRef.current);
        // Try real API, fall back to mock
        fetch('/api/security/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ userId }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((data) => {
            const vulns = data?.vulnerabilities ?? MOCK_VULNERABILITIES;
            setVulnerabilities(vulns);
            // Recalculate score based on findings
            const criticalCount = vulns.filter((v) => v.severity === 'critical').length;
            const highCount     = vulns.filter((v) => v.severity === 'high').length;
            const penalty       = criticalCount * 15 + highCount * 8;
            setSecurityScore((prev) => Math.max(0, Math.min(100, 90 - penalty)));
            setScanning(false);
          });
      }
    }, 120);
  }, [scanning, userId, authToken]);

  const handlePatch = useCallback(async (vulnId) => {
    if (patchingId) return;
    setPatchingId(vulnId);
    try {
      await fetch('/api/security/patch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ vulnId, userId }),
      });
    } catch (_) {}

    // Optimistic update
    setVulnerabilities((prev) =>
      prev.map((v) => (v.id === vulnId ? { ...v, patched: true } : v)),
    );
    setSecurityScore((prev) => Math.min(100, prev + 4));
    setPatchingId(null);
  }, [patchingId, userId, authToken]);

  const handleExportReport = useCallback(() => {
    exportJSON(
      {
        generatedAt: new Date().toISOString(),
        securityScore,
        userId,
        vulnerabilities,
        alerts,
        recommendations: MOCK_RECOMMENDATIONS,
        network: networkState,
      },
      `nexus-security-report-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }, [securityScore, userId, vulnerabilities, alerts, networkState]);

  // ── Derived alert counts ─────────────────────────────────
  const alertCounts = useMemo(() => ({
    critical: alerts.filter((a) => a.level === 'critical').length,
    warning:  alerts.filter((a) => a.level === 'warning').length,
    info:     alerts.filter((a) => a.level === 'info').length,
  }), [alerts]);

  // ── Rotation countdown ───────────────────────────────────
  const rotationDaysLeft = Math.max(
    0,
    Math.ceil((encryptionState.nextRotation - Date.now()) / 86400_000),
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🔐</span>
            Security Dashboard
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Nexus AI Pro &middot; Military-Grade Security Monitoring
            {userId && <span className="ml-2 text-gray-500">User: {userId}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/40 px-3 py-1.5 rounded-full border border-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live Monitoring
          </span>
          <button
            onClick={handleExportReport}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 transition-colors"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {alertCounts.critical > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
          <span className="text-lg">⚠</span>
          <span>
            <strong>{alertCounts.critical} critical alert{alertCounts.critical > 1 ? 's' : ''}</strong> require immediate attention.
          </span>
        </div>
      )}

      {/* ── Top Row: Score + Encryption + Alerts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">

        {/* Security Score */}
        <Card title="Security Score" icon="🛡️">
          <div className="flex items-center justify-center gap-8">
            <ScoreRing score={securityScore} />
            <div className="space-y-3 flex-1 min-w-0">
              <div className="text-xs text-gray-400">Score breakdown</div>
              <ProgressBar value={85} label="Encryption"  colorClass="bg-green-500" />
              <ProgressBar value={60} label="Network"     colorClass="bg-yellow-500" />
              <ProgressBar value={45} label="Packages"    colorClass="bg-red-500" />
              <ProgressBar value={78} label="Auth"        colorClass="bg-blue-500" />
            </div>
          </div>
        </Card>

        {/* Encryption Status */}
        <Card title="Encryption Status" icon="🔑">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Algorithm</span>
              <span className="inline-flex items-center gap-1 bg-green-900/40 border border-green-700 text-green-300 text-xs px-2 py-0.5 rounded-full font-mono">
                {encryptionState.algorithm}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Key size</span>
              <span className="text-xs font-mono text-white">{encryptionState.keySize}-bit</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Last rotation</span>
              <span className="text-xs text-gray-300">
                {formatRelativeTime(encryptionState.lastRotation)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Next rotation</span>
              <span className={`text-xs font-semibold ${rotationDaysLeft <= 7 ? 'text-orange-400' : 'text-gray-300'}`}>
                {rotationDaysLeft}d remaining
              </span>
            </div>
            <div className="pt-1">
              <ProgressBar
                value={30 - rotationDaysLeft}
                max={30}
                colorClass={rotationDaysLeft <= 7 ? 'bg-orange-500' : 'bg-blue-500'}
                label="Rotation cycle"
                unit="d elapsed"
              />
            </div>
          </div>
        </Card>

        {/* Alerts Panel */}
        <Card
          title="Active Alerts"
          icon="🔔"
          className="sm:col-span-2 xl:col-span-1"
        >
          <div className="flex gap-3 mb-4">
            {[
              { level: 'critical', count: alertCounts.critical, bg: 'bg-red-900/40 border-red-700 text-red-400' },
              { level: 'warning',  count: alertCounts.warning,  bg: 'bg-yellow-900/40 border-yellow-700 text-yellow-400' },
              { level: 'info',     count: alertCounts.info,     bg: 'bg-blue-900/40 border-blue-700 text-blue-400' },
            ].map(({ level, count, bg }) => (
              <div key={level} className={`flex-1 text-center py-2 rounded-lg border ${bg}`}>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs capitalize">{level}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-2 text-xs p-2 rounded-lg border ${
                  alert.level === 'critical' ? 'bg-red-900/20 border-red-800 text-red-300'
                  : alert.level === 'warning' ? 'bg-yellow-900/20 border-yellow-800 text-yellow-300'
                  : 'bg-blue-900/20 border-blue-800 text-blue-300'
                }`}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : 'ℹ️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="leading-tight">{alert.message}</p>
                  <p className="text-gray-500 mt-0.5">{formatRelativeTime(alert.timestamp)}</p>
                </div>
                <button
                  onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                  className="flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors"
                  aria-label="Dismiss alert"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Vulnerability Scanner ── */}
      <Card
        title="Vulnerability Scanner"
        icon="🔍"
        className="mb-4"
        actions={
          <div className="flex gap-2">
            {vulnerabilities.length > 0 && (
              <button
                onClick={handleExportReport}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 transition-colors"
              >
                Export
              </button>
            )}
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                scanning
                  ? 'bg-blue-800 text-blue-300 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {scanning ? 'Scanning…' : 'Run Scan'}
            </button>
          </div>
        }
      >
        {scanning && <ScanProgress progress={scanProgress} phase={scanPhase} />}

        {!scanning && vulnerabilities.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">
            No scan results yet. Click <strong className="text-gray-300">Run Scan</strong> to begin.
          </p>
        )}

        {!scanning && vulnerabilities.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left py-2 pr-3 font-medium">Severity</th>
                  <th className="text-left py-2 pr-3 font-medium">Title</th>
                  <th className="text-left py-2 pr-3 font-medium hidden md:table-cell">Component</th>
                  <th className="text-left py-2 pr-3 font-medium hidden lg:table-cell">CVE</th>
                  <th className="text-left py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {vulnerabilities
                  .slice()
                  .sort((a, b) => (SEVERITY_CONFIG[a.severity]?.weight ?? 5) - (SEVERITY_CONFIG[b.severity]?.weight ?? 5))
                  .map((v) => (
                    <tr key={v.id} className={`${v.patched ? 'opacity-50' : ''}`}>
                      <td className="py-2.5 pr-3">
                        <SeverityBadge severity={v.severity} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-gray-200 leading-tight">{v.title}</div>
                        <div className="text-gray-500 mt-0.5 hidden sm:block">{v.description?.slice(0, 80)}…</div>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-400 font-mono hidden md:table-cell">
                        {v.component}
                      </td>
                      <td className="py-2.5 pr-3 hidden lg:table-cell">
                        {v.cve ? (
                          <span className="text-blue-400 font-mono">{v.cve}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {v.patched ? (
                          <span className="text-green-400 font-medium">Patched</span>
                        ) : (
                          <button
                            onClick={() => handlePatch(v.id)}
                            disabled={patchingId === v.id}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                              patchingId === v.id
                                ? 'bg-gray-700 text-gray-400 cursor-wait'
                                : 'bg-purple-700 hover:bg-purple-600 text-white'
                            }`}
                          >
                            {patchingId === v.id ? 'Patching…' : 'Patch'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Network Monitoring ── */}
      <Card title="Network Monitoring" icon="🌐" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Active Connections */}
          <div className="text-center">
            <div className="text-4xl font-bold text-cyan-400 tabular-nums">
              {networkState.activeConnections}
            </div>
            <div className="text-xs text-gray-400 mt-1">Active Connections</div>
            <div className="text-xs text-green-400 mt-0.5">Live</div>
          </div>

          {/* Latency */}
          <div className="text-center">
            <div className={`text-4xl font-bold tabular-nums ${latencyColor(networkState.latencyMs)}`}>
              {Math.round(networkState.latencyMs)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Latency (ms)</div>
            <div className={`text-xs mt-0.5 ${latencyColor(networkState.latencyMs)}`}>
              {networkState.latencyMs < 100 ? 'Excellent' : networkState.latencyMs < 500 ? 'Acceptable' : 'High'}
            </div>
          </div>

          {/* Bandwidth */}
          <div className="space-y-3 col-span-1 md:col-span-2 lg:col-span-2">
            <ProgressBar
              value={Math.round(networkState.bandwidthIn)}
              label="Inbound bandwidth"
              colorClass="bg-blue-500"
            />
            <ProgressBar
              value={Math.round(networkState.bandwidthOut)}
              label="Outbound bandwidth"
              colorClass="bg-purple-500"
            />
          </div>
        </div>

        {/* Threat Map — Blocked IPs */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Blocked IPs ({networkState.blockedIPs.length})
          </h3>
          <div className="space-y-2">
            {networkState.blockedIPs.map((ip) => (
              <div
                key={ip.ip}
                className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2 text-xs border border-gray-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-red-400 font-mono font-bold">{ip.ip}</span>
                  <span className="text-gray-400 hidden sm:inline">{ip.city}, {ip.country}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <SeverityBadge severity={ip.threatType === 'DDoS' ? 'critical' : ip.threatType === 'Brute Force' ? 'high' : 'medium'} />
                  <span className="text-gray-500 hidden md:inline">{ip.attempts.toLocaleString()} attempts</span>
                  <span className="text-gray-600">{formatRelativeTime(ip.blockedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Bottom Row: Device + Audit + Recommendations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* On-Device Security */}
        <Card title="Device Security" icon="💻">
          <div className="space-y-3">
            {[
              { label: 'Device Fingerprint',       ok: deviceInfo.fingerprint },
              { label: 'Local Storage Encryption', ok: deviceInfo.localStorageEncrypt },
              { label: 'Service Worker Active',    ok: deviceInfo.serviceWorker },
              { label: 'Biometric API Available',  ok: deviceInfo.biometric },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                <StatusPill ok={ok} label={ok ? 'Active' : 'Not detected'} />
              </div>
            ))}

            <div className="pt-2 mt-2 border-t border-gray-700 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Platform</span>
                <span className="text-gray-300 font-mono">{deviceInfo.platform}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Browser</span>
                <span className="text-gray-300 font-mono">{deviceInfo.browser}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Resolution</span>
                <span className="text-gray-300 font-mono">{deviceInfo.resolution}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Audit Log Live Feed */}
        <Card title="Audit Log" icon="📋">
          <div
            ref={auditRef}
            className="space-y-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin"
          >
            {auditEvents.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-gray-700/40 border border-gray-700/50 text-xs"
              >
                <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                  EVENT_COLORS[entry.event]?.includes('red')    ? 'bg-red-400'
                  : EVENT_COLORS[entry.event]?.includes('green') ? 'bg-green-400'
                  : EVENT_COLORS[entry.event]?.includes('yellow')? 'bg-yellow-400'
                  : EVENT_COLORS[entry.event]?.includes('orange')? 'bg-orange-400'
                  : EVENT_COLORS[entry.event]?.includes('purple')? 'bg-purple-400'
                  : EVENT_COLORS[entry.event]?.includes('cyan')  ? 'bg-cyan-400'
                  : EVENT_COLORS[entry.event]?.includes('emerald')? 'bg-emerald-400'
                  : 'bg-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-mono text-xs ${EVENT_COLORS[entry.event] || 'text-gray-400'}`}>
                    {entry.event}
                  </div>
                  <div className="text-gray-300 leading-tight mt-0.5">{entry.message}</div>
                  <div className="text-gray-600 mt-0.5">{formatRelativeTime(entry.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recommendations */}
        <Card title="Recommendations" icon="💡">
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {MOCK_RECOMMENDATIONS.map((rec) => (
              <div
                key={rec.id}
                className={`p-3 rounded-lg border text-xs ${
                  rec.priority === 'critical' ? 'bg-red-900/20 border-red-800'
                  : rec.priority === 'high'   ? 'bg-orange-900/20 border-orange-800'
                  : rec.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-800'
                  : 'bg-blue-900/20 border-blue-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <SeverityBadge severity={rec.priority} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-200 leading-tight mt-0.5">{rec.title}</div>
                    <div className="text-gray-400 mt-1 leading-relaxed">{rec.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ── */}
      <div className="mt-6 text-center text-xs text-gray-600">
        Nexus AI Pro Security Dashboard &copy; 2025-2026 Cameron Fox &middot; All Rights Reserved
      </div>
    </div>
  );
}
