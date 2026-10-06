// File: src/components/SecurityDashboardFull.jsx | Updated: 2026-10-06
/**
 * SecurityDashboardFull — Comprehensive, web-native security dashboard.
 *
 * Replaces src/SecurityDashboard.jsx which required window.electron.
 * Works in any browser context: regular web, Electron webview, Capacitor
 * WebView, and mobile browsers.
 *
 * Data sources:
 *   - REST  GET  /api/security/dashboard
 *   - REST  GET  /api/security/status
 *   - REST  GET  /api/security/alerts
 *   - REST  GET  /api/security/audit
 *   - REST  GET  /api/security/encryption-health
 *   - REST  GET  /api/health  (network latency probe)
 *   - REST  POST /api/security/scan
 *   - REST  POST /api/security/rotate-keys
 *   - REST  POST /api/security/patch
 *   - Socket.IO (same origin) — live push updates
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

// ─── constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLOR = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#3b82f6',
  info:     '#6b7280',
};

const POLL_INTERVAL_MS = 30_000;
const RING_RADIUS      = 54;
const RING_CIRCUMF     = 2 * Math.PI * RING_RADIUS;

// ─── tiny helpers ─────────────────────────────────────────────────────────────

/** Derive ring color from 0-100 score. */
function scoreColor(score) {
  if (score >= 80) return '#16b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

/** Safe JSON fetch — returns [data, null] or [null, errorString]. */
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return [null, `HTTP ${res.status}: ${text}`];
    }
    const data = await res.json();
    return [data, null];
  } catch (err) {
    return [null, err.message || 'Network error'];
  }
}

/** Format ISO timestamp to locale string, fallback gracefully. */
function fmt(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

/** Download any JS value as a .json file. */
function downloadJSON(filename, value) {
  try {
    const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed:', err);
  }
}

// ─── device-level security checks (no server required) ────────────────────────

function runDeviceChecks() {
  const checks = {};

  // HTTPS
  checks.https = {
    label:  'HTTPS / Secure Transport',
    ok:     location.protocol === 'https:' || location.hostname === 'localhost',
    detail: location.protocol === 'https:'
      ? 'Connection is encrypted (TLS)'
      : location.hostname === 'localhost'
        ? 'Localhost — no TLS required'
        : 'Warning: page served over plain HTTP',
  };

  // localStorage availability (may be blocked in private mode)
  let lsOk = false;
  let lsDetail = 'Not accessible';
  try {
    const key = '__nexus_check__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    lsOk     = true;
    lsDetail = 'Accessible and writable';
  } catch {
    lsDetail = 'Blocked (private mode or policy)';
  }
  checks.localStorage = { label: 'localStorage Access', ok: lsOk, detail: lsDetail };

  // CSP — heuristic: check if a meta CSP tag exists OR if the header was set
  //       (headers are not readable from JS so we only check meta tags)
  const cspMeta  = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  checks.csp = {
    label:  'Content Security Policy',
    ok:     !!cspMeta,
    detail: cspMeta
      ? `CSP meta tag present: ${cspMeta.content.slice(0, 60)}…`
      : 'No CSP meta tag detected (server header may still be set)',
  };

  // Cookie security — check if document.cookie contains any insecure cookies
  // We can only inspect cookies visible to JS (HttpOnly cookies are invisible)
  const cookieStr = document.cookie;
  const hasCookies = cookieStr.trim().length > 0;
  checks.cookies = {
    label:  'Cookie Security (JS-visible)',
    ok:     !hasCookies,
    detail: hasCookies
      ? `${cookieStr.split(';').length} JS-accessible cookie(s) detected — prefer HttpOnly`
      : 'No JS-accessible cookies (HttpOnly cookies may be in use)',
  };

  return checks;
}

// ─── sub-components ──────────────────────────────────────────────────────────

/** Animated SVG ring gauge showing the security score 0–100. */
function ScoreRing({ score, size = 140 }) {
  const color  = scoreColor(score);
  const offset = RING_CIRCUMF - (score / 100) * RING_CIRCUMF;
  const cx = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Security score: ${score} out of 100`}
    >
      {/* track */}
      <circle
        cx={cx}
        cy={cx}
        r={RING_RADIUS}
        fill="none"
        stroke="#222"
        strokeWidth="10"
      />
      {/* fill */}
      <circle
        cx={cx}
        cy={cx}
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMF}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
      />
      <text
        x={cx}
        y={cx - 6}
        textAnchor="middle"
        fill={color}
        fontSize="24"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {score}
      </text>
      <text
        x={cx}
        y={cx + 14}
        textAnchor="middle"
        fill="#999"
        fontSize="10"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        / 100
      </text>
    </svg>
  );
}

/** Small dot used for status indicators. */
function StatusDot({ ok }) {
  return (
    <span
      style={{
        display:       'inline-block',
        width:         '8px',
        height:        '8px',
        borderRadius:  '50%',
        background:    ok ? '#16b981' : '#ef4444',
        flexShrink:    0,
        marginTop:     '1px',
      }}
    />
  );
}

/** Reusable card wrapper. */
function Card({ title, children, action }) {
  return (
    <div
      style={{
        background:   '#111',
        border:       '1px solid #222',
        borderRadius: '12px',
        padding:      '20px',
        marginBottom: '20px',
      }}
    >
      {(title || action) && (
        <div
          style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   '16px',
          }}
        >
          {title && (
            <h3
              style={{
                margin:     0,
                fontSize:   '14px',
                fontWeight: '600',
                color:      '#e5e7eb',
                letterSpacing: '0.02em',
              }}
            >
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Inline error banner. */
function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      style={{
        padding:      '10px 14px',
        marginBottom: '16px',
        background:   'rgba(239,68,68,0.12)',
        border:       '1px solid rgba(239,68,68,0.4)',
        borderRadius: '8px',
        color:        '#fca5a5',
        fontSize:     '12px',
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
        gap:          '12px',
      }}
      role="alert"
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border:     'none',
            color:      '#fca5a5',
            cursor:     'pointer',
            fontSize:   '16px',
            lineHeight: 1,
            padding:    0,
          }}
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}

/** Action button with loading / disabled states. */
function ActionButton({ onClick, loading, disabled, children, variant = 'primary', small }) {
  const bg = variant === 'danger'
    ? (disabled || loading ? 'rgba(239,68,68,0.4)'  : '#ef4444')
    : variant === 'success'
      ? (disabled || loading ? 'rgba(22,185,129,0.4)' : '#16b981')
      : (disabled || loading ? 'rgba(102,126,234,0.4)' : '#667eea');

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding:       small ? '6px 12px' : '10px 18px',
        background:    bg,
        color:         '#fff',
        border:        'none',
        borderRadius:  '8px',
        cursor:        disabled || loading ? 'not-allowed' : 'pointer',
        fontSize:      small ? '11px' : '13px',
        fontWeight:    '600',
        transition:    'background 0.2s',
        whiteSpace:    'nowrap',
      }}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

/**
 * SecurityDashboardFull — enterprise security dashboard for Nexus AI Pro.
 * Self-contained default export; requires no props.
 */
const SecurityDashboardFull = () => {
  // ── state ──────────────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [dashboardData,    setDashboardData]    = useState(null);
  const [statusData,       setStatusData]       = useState(null);
  const [alerts,           setAlerts]           = useState([]);
  const [auditLog,         setAuditLog]         = useState([]);
  const [encryptionHealth, setEncryptionHealth] = useState(null);
  const [deviceChecks,     setDeviceChecks]     = useState({});
  const [networkStats,     setNetworkStats]     = useState({
    status: 'checking', latencyMs: null, packetLoss: null,
  });
  const [isScanning,       setIsScanning]       = useState(false);
  const [isRotating,       setIsRotating]       = useState(false);
  const [patchingIds,      setPatchingIds]       = useState(new Set());
  const [socketConnected,  setSocketConnected]  = useState(false);
  const [lastRefresh,      setLastRefresh]      = useState(null);

  // ── refs ───────────────────────────────────────────────────────────────────
  const socketRef   = useRef(null);
  const pollTimerRef = useRef(null);

  // ── data fetchers ──────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    const [data, err] = await apiFetch('/api/security/dashboard');
    if (err) { setError(err); return; }
    setDashboardData(data);
  }, []);

  const fetchStatus = useCallback(async () => {
    const [data, err] = await apiFetch('/api/security/status');
    if (!err) setStatusData(data);
  }, []);

  const fetchAlerts = useCallback(async () => {
    const [data, err] = await apiFetch('/api/security/alerts');
    if (!err && Array.isArray(data)) setAlerts(data);
    else if (!err && data?.alerts) setAlerts(data.alerts);
  }, []);

  const fetchAuditLog = useCallback(async () => {
    const [data, err] = await apiFetch('/api/security/audit');
    if (!err) {
      const entries = Array.isArray(data) ? data : (data?.entries ?? []);
      setAuditLog(entries.slice(-20).reverse());
    }
  }, []);

  const fetchEncryptionHealth = useCallback(async () => {
    const [data, err] = await apiFetch('/api/security/encryption-health');
    if (!err) setEncryptionHealth(data);
  }, []);

  /** Probe /api/health to measure latency. */
  const measureNetwork = useCallback(async () => {
    const t0 = performance.now();
    const [data, err] = await apiFetch('/api/health');
    const latencyMs = Math.round(performance.now() - t0);

    if (err) {
      setNetworkStats({ status: 'error', latencyMs: null, packetLoss: null });
      return;
    }

    // packet loss is not measurable from a single HTTP call;
    // use server-reported value if present, otherwise mark as N/A.
    const packetLoss = data?.packetLoss ?? data?.network?.packetLoss ?? 'N/A';
    setNetworkStats({
      status:    'connected',
      latencyMs,
      packetLoss,
    });
  }, []);

  /** Refresh all remote data in parallel. */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchDashboard(),
      fetchStatus(),
      fetchAlerts(),
      fetchAuditLog(),
      fetchEncryptionHealth(),
      measureNetwork(),
    ]);
    setLastRefresh(new Date());
  }, [
    fetchDashboard, fetchStatus, fetchAlerts,
    fetchAuditLog, fetchEncryptionHealth, measureNetwork,
  ]);

  // ── socket.io setup ────────────────────────────────────────────────────────

  const setupSocket = useCallback(() => {
    // Dynamically import socket.io-client so the component degrades gracefully
    // in environments where it is not bundled.
    import('socket.io-client')
      .then(({ io }) => {
        if (socketRef.current) socketRef.current.disconnect();

        const socket = io('/', {
          transports:       ['websocket', 'polling'],
          reconnectionDelay: 2000,
          timeout:           10_000,
        });

        socket.on('connect', () => setSocketConnected(true));
        socket.on('disconnect', () => setSocketConnected(false));

        // Security events the server may emit
        socket.on('security:alert',      () => { fetchAlerts();    fetchDashboard(); });
        socket.on('security:scan',       () => { fetchDashboard(); fetchAuditLog();  });
        socket.on('security:threat',     () => { fetchAlerts();    fetchDashboard(); });
        socket.on('security:update',     () => refreshAll());
        socket.on('security:audit',      () => fetchAuditLog());
        socket.on('security:encryption', () => fetchEncryptionHealth());

        socketRef.current = socket;
      })
      .catch(() => {
        // socket.io-client not available — polling only, already set up below
        console.info('[SecurityDashboardFull] socket.io-client unavailable; using polling only');
      });
  }, [fetchAlerts, fetchDashboard, fetchAuditLog, fetchEncryptionHealth, refreshAll]);

  // ── lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;

    const init = async () => {
      setLoading(true);
      setDeviceChecks(runDeviceChecks());

      await refreshAll();

      if (active) {
        setLoading(false);
        setupSocket();

        pollTimerRef.current = setInterval(() => {
          if (document.visibilityState !== 'hidden') refreshAll();
        }, POLL_INTERVAL_MS);
      }
    };

    init();

    return () => {
      active = false;
      clearInterval(pollTimerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── actions ────────────────────────────────────────────────────────────────

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    const [, err] = await apiFetch('/api/security/scan', { method: 'POST', body: '{}' });
    setIsScanning(false);
    if (err) { setError(`Scan failed: ${err}`); return; }
    await refreshAll();
  }, [refreshAll]);

  const handleRotateKeys = useCallback(async () => {
    setIsRotating(true);
    setError(null);
    const [, err] = await apiFetch('/api/security/rotate-keys', { method: 'POST', body: '{}' });
    setIsRotating(false);
    if (err) { setError(`Key rotation failed: ${err}`); return; }
    await Promise.all([fetchEncryptionHealth(), fetchAuditLog()]);
  }, [fetchEncryptionHealth, fetchAuditLog]);

  const handlePatch = useCallback(async (vulnId) => {
    setPatchingIds(prev => new Set([...prev, vulnId]));
    setError(null);
    const [res, err] = await apiFetch('/api/security/patch', {
      method: 'POST',
      body:   JSON.stringify({ vulnId }),
    });
    setPatchingIds(prev => {
      const next = new Set(prev);
      next.delete(vulnId);
      return next;
    });
    if (err) { setError(`Patch failed: ${err}`); return; }
    if (res?.success) {
      setDashboardData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          vulnerabilities: (prev.vulnerabilities || []).map(v =>
            v.id === vulnId ? { ...v, status: 'patched' } : v
          ),
          overallScore: Math.min(100, (prev.overallScore ?? 0) + 5),
        };
      });
      await fetchAuditLog();
    }
  }, [fetchAuditLog]);

  const handleExportAudit = useCallback(() => {
    downloadJSON(`audit-log-${Date.now()}.json`, auditLog);
  }, [auditLog]);

  // ── derived values ─────────────────────────────────────────────────────────

  const score         = dashboardData?.overallScore ?? statusData?.score ?? 0;
  const vulnerabilities = dashboardData?.vulnerabilities ?? [];
  const threats       = dashboardData?.threats ?? [];
  const threatsBlocked = threats.filter(t =>
    t.status === 'blocked' || t.status === 'prevented'
  ).length;
  const patchesApplied = vulnerabilities.filter(v => v.status === 'patched').length;
  const allThreats    = [...threats, ...alerts].filter(Boolean);

  // ── loading screen ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          minHeight:      '100vh',
          background:     '#0a0a0a',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color:          '#999',
          fontFamily:     'system-ui, -apple-system, sans-serif',
          flexDirection:  'column',
          gap:            '16px',
        }}
      >
        {/* spinner */}
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <circle
            cx="20" cy="20" r="16"
            fill="none" stroke="#222" strokeWidth="4"
          />
          <circle
            cx="20" cy="20" r="16"
            fill="none" stroke="#667eea" strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="25 75"
            style={{ animation: 'spin 1s linear infinite', transformOrigin: '50% 50%' }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </svg>
        <p style={{ margin: 0, fontSize: '14px' }}>Loading Security Dashboard…</p>
      </div>
    );
  }

  // ── layout ─────────────────────────────────────────────────────────────────

  const col = {
    minWidth:    '280px',
    flex:        '1 1 320px',
  };

  return (
    <div
      style={{
        minHeight:   '100vh',
        background:  '#0a0a0a',
        color:       '#e5e7eb',
        fontFamily:  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize:    '13px',
        lineHeight:  '1.5',
        padding:     '24px 16px',
        boxSizing:   'border-box',
      }}
    >
      {/* ── header ── */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          flexWrap:       'wrap',
          gap:            '12px',
          marginBottom:   '24px',
        }}
      >
        <div>
          <h1
            style={{
              margin:      0,
              fontSize:    '20px',
              fontWeight:  '700',
              color:       '#f9fafb',
              letterSpacing: '-0.01em',
            }}
          >
            {/* shield icon */}
            <svg
              width="18" height="18"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              style={{ marginRight: '8px', verticalAlign: 'text-bottom', color: '#667eea' }}
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Security Dashboard
          </h1>
          {lastRefresh && (
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '11px' }}>
              Last updated {fmt(lastRefresh)}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* socket indicator */}
          <span
            title={socketConnected ? 'Live updates active' : 'Polling only'}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '5px',
              fontSize:     '11px',
              color:        socketConnected ? '#16b981' : '#6b7280',
              padding:      '4px 8px',
              background:   '#111',
              border:       '1px solid #222',
              borderRadius: '6px',
            }}
          >
            <StatusDot ok={socketConnected} />
            {socketConnected ? 'Live' : 'Polling'}
          </span>

          <ActionButton onClick={refreshAll} small>
            ↻ Refresh
          </ActionButton>
          <ActionButton onClick={handleScan} loading={isScanning} small>
            ⬡ Scan
          </ActionButton>
          <ActionButton onClick={handleRotateKeys} loading={isRotating} variant="danger" small>
            ⟳ Rotate Keys
          </ActionButton>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* ── top metrics row ── */}
      <div
        style={{
          display:   'flex',
          gap:       '16px',
          flexWrap:  'wrap',
          marginBottom: '20px',
        }}
      >
        {[
          { label: 'Security Score',    value: score,                    unit: '/ 100', color: scoreColor(score) },
          { label: 'Threats Blocked',   value: threatsBlocked,           unit: 'events', color: '#16b981' },
          { label: 'Patches Applied',   value: patchesApplied,           unit: 'fixes',  color: '#3b82f6' },
          { label: 'Audit Entries',     value: auditLog.length,          unit: 'recent', color: '#a78bfa' },
          { label: 'Open Vulns',        value: vulnerabilities.filter(v => v.status !== 'patched').length,
            unit: 'open', color: '#f97316' },
        ].map(m => (
          <div
            key={m.label}
            style={{
              flex:         '1 1 120px',
              background:   '#111',
              border:       '1px solid #222',
              borderRadius: '10px',
              padding:      '14px 16px',
            }}
          >
            <p style={{ margin: '0 0 4px 0', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {m.label}
            </p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: m.color }}>
              {m.value}
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '400', marginLeft: '4px' }}>
                {m.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* ── two-column area ── */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* ── left column ── */}
        <div style={col}>

          {/* security score ring */}
          <Card title="Security Score">
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '24px',
                flexWrap:       'wrap',
              }}
            >
              <ScoreRing score={score} />
              <div style={{ flex: 1, minWidth: '140px' }}>
                <p style={{ margin: '0 0 6px 0', color: '#9ca3af' }}>
                  {score >= 80
                    ? 'Security posture is strong.'
                    : score >= 60
                      ? 'Moderate risk — address open findings.'
                      : 'Critical attention required.'}
                </p>
                {statusData?.status && (
                  <p style={{ margin: '0 0 4px 0' }}>
                    <span style={{ color: '#6b7280' }}>Status: </span>
                    <span style={{ color: '#e5e7eb', textTransform: 'capitalize' }}>{statusData.status}</span>
                  </p>
                )}
                {statusData?.lastScan && (
                  <p style={{ margin: 0 }}>
                    <span style={{ color: '#6b7280' }}>Last scan: </span>
                    <span style={{ color: '#e5e7eb' }}>{fmt(statusData.lastScan)}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* network monitoring */}
          <Card title="Network Monitoring">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  label:  'Connection',
                  value:  networkStats.status === 'connected' ? 'Online' : networkStats.status,
                  ok:     networkStats.status === 'connected',
                  badge:  true,
                },
                {
                  label: 'Latency',
                  value: networkStats.latencyMs != null
                    ? `${networkStats.latencyMs} ms`
                    : '—',
                  ok:    networkStats.latencyMs != null && networkStats.latencyMs < 200,
                },
                {
                  label: 'Packet Loss',
                  value: networkStats.packetLoss != null && networkStats.packetLoss !== 'N/A'
                    ? `${networkStats.packetLoss}%`
                    : 'N/A',
                  ok:    networkStats.packetLoss === 0 || networkStats.packetLoss === 'N/A',
                },
                {
                  label: 'Protocol',
                  value: location.protocol.replace(':', '').toUpperCase(),
                  ok:    location.protocol === 'https:' || location.hostname === 'localhost',
                },
              ].map(row => (
                <div
                  key={row.label}
                  style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    padding:        '8px 10px',
                    background:     '#0d0d0d',
                    borderRadius:   '6px',
                    border:         '1px solid #1a1a1a',
                  }}
                >
                  <span style={{ color: '#9ca3af' }}>{row.label}</span>
                  <span
                    style={{
                      color:          row.ok ? '#16b981' : '#f97316',
                      fontWeight:     '600',
                      fontSize:       '12px',
                      textTransform:  'capitalize',
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* on-device security checks */}
          <Card title="On-Device Checks">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.values(deviceChecks).map(c => (
                <div key={c.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <StatusDot ok={c.ok} />
                  <div>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '12px', color: c.ok ? '#e5e7eb' : '#f97316' }}>
                      {c.label}
                    </p>
                    <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '11px' }}>
                      {c.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* encryption health */}
          <Card title="Encryption Health">
            {encryptionHealth ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Algorithm',       value: encryptionHealth.algorithm ?? 'AES-256-GCM' },
                  { label: 'Key Rotation',    value: encryptionHealth.rotationSchedule ?? encryptionHealth.keyRotation ?? '30 days' },
                  { label: 'Last Rotation',   value: fmt(encryptionHealth.lastRotation ?? encryptionHealth.lastKeyRotation) },
                  { label: 'Status',          value: encryptionHealth.status ?? 'Active', ok: encryptionHealth.status !== 'degraded' },
                  { label: 'Keys Managed',    value: String(encryptionHealth.keyCount ?? encryptionHealth.keysManaged ?? '—') },
                ].map(r => (
                  <div
                    key={r.label}
                    style={{
                      display:        'flex',
                      justifyContent: 'space-between',
                      padding:        '7px 10px',
                      background:     '#0d0d0d',
                      borderRadius:   '6px',
                      border:         '1px solid #1a1a1a',
                    }}
                  >
                    <span style={{ color: '#9ca3af' }}>{r.label}</span>
                    <span style={{ color: r.ok === false ? '#f97316' : '#e5e7eb', fontWeight: '500', fontSize: '12px' }}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>
                Encryption health data unavailable.
              </p>
            )}
          </Card>
        </div>

        {/* ── right column ── */}
        <div style={col}>

          {/* live threat feed */}
          <Card
            title={`Live Threat Feed (${allThreats.length})`}
            action={
              <ActionButton onClick={fetchAlerts} small>
                ↻
              </ActionButton>
            }
          >
            {allThreats.length === 0 ? (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>No active threats detected.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {allThreats.slice(0, 25).map((t, i) => {
                  const statusColor = t.status === 'blocked' || t.status === 'prevented'
                    ? '#16b981'
                    : t.status === 'active'
                      ? '#ef4444'
                      : '#f59e0b';
                  return (
                    <div
                      key={t.id ?? i}
                      style={{
                        padding:      '10px 12px',
                        background:   '#0d0d0d',
                        border:       '1px solid #1a1a1a',
                        borderLeft:   `3px solid ${statusColor}`,
                        borderRadius: '6px',
                        display:      'flex',
                        justifyContent: 'space-between',
                        gap:          '8px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '12px', color: '#e5e7eb' }}>
                          {t.type ?? t.name ?? 'Unknown threat'}
                        </p>
                        {t.source && (
                          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.source}
                          </p>
                        )}
                        <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#4b5563' }}>
                          {fmt(t.timestamp ?? t.time)}
                        </p>
                      </div>
                      <span
                        style={{
                          padding:    '3px 7px',
                          background: `${statusColor}18`,
                          color:      statusColor,
                          borderRadius: '4px',
                          fontSize:   '10px',
                          fontWeight: '700',
                          alignSelf:  'flex-start',
                          flexShrink: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {t.status ?? 'unknown'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* vulnerabilities */}
          <Card title={`Vulnerabilities (${vulnerabilities.length})`}>
            {vulnerabilities.length === 0 ? (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>No vulnerabilities on record.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                {vulnerabilities.map(v => {
                  const sev   = (v.severity ?? 'info').toLowerCase();
                  const color = SEVERITY_COLOR[sev] ?? SEVERITY_COLOR.info;
                  const patched = v.status === 'patched';
                  return (
                    <div
                      key={v.id}
                      style={{
                        padding:      '12px',
                        background:   '#0d0d0d',
                        border:       `1px solid ${color}30`,
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '12px', color: '#e5e7eb', flex: 1 }}>
                          {v.name ?? v.title ?? v.id}
                        </p>
                        <span
                          style={{
                            padding:    '2px 7px',
                            background: `${color}20`,
                            color,
                            borderRadius: '4px',
                            fontSize:   '10px',
                            fontWeight: '700',
                            flexShrink: 0,
                            textTransform: 'uppercase',
                          }}
                        >
                          {sev}
                        </span>
                      </div>
                      {v.description && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#6b7280' }}>
                          {v.description}
                        </p>
                      )}
                      {patched ? (
                        <div
                          style={{
                            padding:      '6px',
                            background:   '#16b98118',
                            color:        '#16b981',
                            borderRadius: '6px',
                            textAlign:    'center',
                            fontSize:     '11px',
                            fontWeight:   '600',
                          }}
                        >
                          ✓ Patched
                        </div>
                      ) : (
                        <ActionButton
                          onClick={() => handlePatch(v.id)}
                          loading={patchingIds.has(v.id)}
                          variant="success"
                          small
                        >
                          Apply Patch
                        </ActionButton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* audit log */}
          <Card
            title={`Audit Log (last ${auditLog.length})`}
            action={
              <div style={{ display: 'flex', gap: '8px' }}>
                <ActionButton onClick={fetchAuditLog} small>↻</ActionButton>
                <ActionButton onClick={handleExportAudit} small variant="success">
                  ↓ Export
                </ActionButton>
              </div>
            }
          >
            {auditLog.length === 0 ? (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>No audit entries found.</p>
            ) : (
              <div
                style={{
                  maxHeight:  '340px',
                  overflowY:  'auto',
                  display:    'flex',
                  flexDirection: 'column',
                  gap:        '6px',
                }}
              >
                {auditLog.map((entry, i) => (
                  <div
                    key={entry.id ?? entry.timestamp ?? i}
                    style={{
                      padding:      '8px 10px',
                      background:   '#0d0d0d',
                      border:       '1px solid #1a1a1a',
                      borderRadius: '6px',
                      display:      'flex',
                      gap:          '10px',
                      alignItems:   'flex-start',
                    }}
                  >
                    <span style={{ color: '#4b5563', fontSize: '10px', flexShrink: 0, paddingTop: '1px' }}>
                      {fmt(entry.timestamp ?? entry.time)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {entry.action ?? entry.event ?? entry.type ?? 'EVENT'}
                      </p>
                      {(entry.details || entry.message || entry.data) && (
                        <p
                          style={{
                            margin:       '2px 0 0 0',
                            fontSize:     '11px',
                            color:        '#6b7280',
                            overflow:     'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace:   'nowrap',
                          }}
                        >
                          {typeof (entry.details ?? entry.message ?? entry.data) === 'string'
                            ? (entry.details ?? entry.message ?? entry.data)
                            : JSON.stringify(entry.details ?? entry.message ?? entry.data)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
        {/* end right column */}
      </div>
      {/* end two-column area */}

      {/* ── footer ── */}
      <p
        style={{
          marginTop: '24px',
          textAlign: 'center',
          color:     '#374151',
          fontSize:  '11px',
        }}
      >
        Nexus AI Pro — Security Dashboard · auto-refreshes every 30s
        {socketConnected && ' · live socket active'}
      </p>
    </div>
  );
};

export default SecurityDashboardFull;
