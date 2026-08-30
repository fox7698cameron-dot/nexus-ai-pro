/**
 * @fileoverview SecurityDashboardPro - Comprehensive Real-Time Security Dashboard
 * @author Cameron Fox <fox7698cameron@gmail.com>
 * @copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 * @date 2026-08-30
 *
 * Provides real-time vulnerability scanning, network monitoring, device health,
 * security metrics, audit logging, 2FA status, certificate tracking, and API
 * key rotation — all streamed via WebSocket and fetched from /api/security/*.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Unlock,
  Key,
  Search,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  ChevronLeft,
  ChevronRight,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Globe,
  Terminal,
  FileText,
  Users,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Theme tokens
// ---------------------------------------------------------------------------
const T = {
  bg: '#0a0a0c',
  surface: '#111116',
  surfaceElevated: '#18181f',
  border: '#26262f',
  accent: '#6366f1',
  accentHover: '#818cf8',
  textPrimary: '#f1f1f3',
  textSecondary: '#8b8b9a',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const severityColor = (s) =>
  ({ critical: T.critical, high: T.high, medium: T.medium, low: T.low }[s] ?? T.low);

const scoreColor = (n) => (n >= 80 ? T.success : n >= 60 ? T.warning : T.critical);

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const downloadBlob = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// API helpers — all calls use /api/security/*
// ---------------------------------------------------------------------------
async function apiFetch(path, opts = {}) {
  const res = await fetch(`/api/security${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Reusable card wrapper */
const Card = ({ title, icon: Icon, children, action, style = {} }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: '20px 24px',
      ...style,
    }}
  >
    {(title || action) && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={18} color={T.accent} />}
          <span style={{ color: T.textPrimary, fontWeight: 600, fontSize: 15 }}>
            {title}
          </span>
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

/** Pill badge */
const Badge = ({ label, color }) => (
  <span
    style={{
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}
  >
    {label}
  </span>
);

/** Circular score gauge */
const ScoreGauge = ({ score, size = 100, strokeWidth = 8 }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={T.border}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill={color}
        fontSize={size * 0.22}
        fontWeight="700"
      >
        {score}
      </text>
    </svg>
  );
};

/** Inline SVG bandwidth sparkline */
const BandwidthGraph = ({ data = [] }) => {
  if (!data.length) return null;
  const W = 320,
    H = 60,
    pad = 4;
  const max = Math.max(...data, 1);
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (W - pad * 2));
  const ys = data.map((v) => H - pad - ((v / max) * (H - pad * 2)));
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const fill = `${xs[0]},${H} ${pts} ${xs[xs.length - 1]},${H}`;
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block', borderRadius: 6, overflow: 'hidden' }}
    >
      <defs>
        <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={T.accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill="url(#bwGrad)" />
      <polyline
        points={pts}
        fill="none"
        stroke={T.accent}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Progress bar */
const ProgressBar = ({ value, max = 100, color = T.accent }) => (
  <div
    style={{
      background: T.border,
      borderRadius: 99,
      height: 6,
      overflow: 'hidden',
      width: '100%',
    }}
  >
    <div
      style={{
        width: `${Math.min(100, (value / max) * 100)}%`,
        height: '100%',
        background: color,
        borderRadius: 99,
        transition: 'width 0.4s ease',
      }}
    />
  </div>
);

/** Button */
const Btn = ({ children, onClick, disabled, variant = 'primary', icon: Icon, small }) => {
  const styles = {
    primary: { background: T.accent, color: '#fff', border: 'none' },
    danger: { background: T.critical + '22', color: T.critical, border: `1px solid ${T.critical}44` },
    ghost: { background: 'transparent', color: T.textSecondary, border: `1px solid ${T.border}` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: small ? '5px 12px' : '8px 16px',
        borderRadius: 8,
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...styles[variant],
      }}
    >
      {Icon && <Icon size={small ? 13 : 15} />}
      {children}
    </button>
  );
};

/** Input field */
const Input = ({ value, onChange, placeholder, style = {} }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      background: T.surfaceElevated,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      color: T.textPrimary,
      padding: '7px 12px',
      fontSize: 13,
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
      ...style,
    }}
  />
);

/** Select */
const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      background: T.surfaceElevated,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      color: T.textPrimary,
      padding: '7px 12px',
      fontSize: 13,
      outline: 'none',
      cursor: 'pointer',
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

// ---------------------------------------------------------------------------
// Panel: Vulnerability Scanner
// ---------------------------------------------------------------------------
const VulnerabilityScanner = ({ socket }) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [vulns, setVulns] = useState([]);
  const [patchingId, setPatchingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/vulnerabilities')
      .then((d) => setVulns(d.vulnerabilities ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data ?? event);
        if (msg.type === 'scan:progress') {
          setProgress(msg.progress ?? 0);
          setProgressMsg(msg.message ?? '');
        }
        if (msg.type === 'scan:complete') {
          setScanning(false);
          setProgress(100);
          setProgressMsg('Scan complete');
          setVulns(msg.vulnerabilities ?? []);
        }
      } catch {}
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, [socket]);

  const startScan = async () => {
    setScanning(true);
    setProgress(0);
    setProgressMsg('Initialising scan…');
    setError(null);
    try {
      await apiFetch('/scan', { method: 'POST' });
    } catch (e) {
      setError(e.message);
      setScanning(false);
    }
  };

  const patch = async (id) => {
    setPatchingId(id);
    try {
      await apiFetch(`/patch/${id}`, { method: 'POST' });
      setVulns((v) =>
        v.map((x) => (x.id === id ? { ...x, status: 'patched' } : x))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setPatchingId(null);
    }
  };

  const bySeverity = ['critical', 'high', 'medium', 'low'];
  const sorted = [...vulns].sort(
    (a, b) => bySeverity.indexOf(a.severity) - bySeverity.indexOf(b.severity)
  );

  return (
    <Card
      title="Vulnerability Scanner"
      icon={ShieldAlert}
      action={
        <Btn onClick={startScan} disabled={scanning} icon={scanning ? RefreshCw : Search} small>
          {scanning ? 'Scanning…' : 'Run Scan'}
        </Btn>
      }
    >
      {error && (
        <div style={{ color: T.critical, fontSize: 12, marginBottom: 10 }}>{error}</div>
      )}
      {scanning && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: T.textSecondary }}>{progressMsg}</span>
            <span style={{ fontSize: 12, color: T.accent }}>{progress}%</span>
          </div>
          <ProgressBar value={progress} color={T.accent} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
        {sorted.length === 0 && (
          <p style={{ color: T.textSecondary, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No vulnerabilities found — run a scan to check.
          </p>
        )}
        {sorted.map((v) => (
          <div
            key={v.id}
            style={{
              background: T.surfaceElevated,
              border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${severityColor(v.severity)}`,
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Badge label={v.severity} color={severityColor(v.severity)} />
                {v.cve && (
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${v.cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: T.accent, fontSize: 11, textDecoration: 'none' }}
                  >
                    {v.cve} ↗
                  </a>
                )}
                {v.status === 'patched' && <Badge label="patched" color={T.success} />}
              </div>
              <div style={{ color: T.textPrimary, fontSize: 13, fontWeight: 500 }}>{v.title}</div>
              <div style={{ color: T.textSecondary, fontSize: 12, marginTop: 2 }}>{v.description}</div>
            </div>
            {v.status !== 'patched' && (
              <Btn
                onClick={() => patch(v.id)}
                disabled={patchingId === v.id}
                variant="ghost"
                icon={ShieldCheck}
                small
              >
                {patchingId === v.id ? 'Patching…' : 'Patch'}
              </Btn>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Panel: Network Monitoring
// ---------------------------------------------------------------------------
const NetworkMonitor = ({ socket }) => {
  const [netData, setNetData] = useState(null);
  const [bwHistory, setBwHistory] = useState(Array(30).fill(0));
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    apiFetch('/network')
      .then((d) => {
        setNetData(d);
        if (d.bandwidthHistory) setBwHistory(d.bandwidthHistory);
        if (d.alerts) setAlerts(d.alerts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data ?? event);
        if (msg.type === 'network:update') {
          setNetData((prev) => ({ ...prev, ...msg.data }));
          if (msg.data?.bandwidth != null) {
            setBwHistory((h) => [...h.slice(1), msg.data.bandwidth]);
          }
        }
        if (msg.type === 'network:alert') {
          setAlerts((a) => [msg.alert, ...a].slice(0, 20));
        }
      } catch {}
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, [socket]);

  const score = netData?.healthScore ?? 0;
  const connections = netData?.connections ?? [];
  const suspicious = connections.filter((c) => c.suspicious);

  return (
    <Card title="Network Monitoring" icon={Wifi}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Health Score', value: score, color: scoreColor(score) },
          { label: 'Active Connections', value: connections.length, color: T.textPrimary },
          { label: 'Suspicious', value: suspicious.length, color: suspicious.length ? T.critical : T.success },
          { label: 'Port Scans', value: netData?.portScanCount ?? 0, color: netData?.portScanCount ? T.warning : T.success },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: T.surfaceElevated, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ color: T.textSecondary, fontSize: 11, marginBottom: 4 }}>{label}</div>
            <div style={{ color, fontWeight: 700, fontSize: 20 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textSecondary, fontSize: 12, marginBottom: 6 }}>Bandwidth (Mbps)</div>
        <BandwidthGraph data={bwHistory} />
      </div>

      {/* Active connections */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textSecondary, fontSize: 12, marginBottom: 8 }}>Active Connections</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['IP', 'Port', 'Protocol', 'Status', 'Flag'].map((h) => (
                  <th key={h} style={{ color: T.textSecondary, textAlign: 'left', padding: '4px 8px', borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {connections.slice(0, 10).map((c, i) => (
                <tr key={i} style={{ background: c.suspicious ? T.critical + '10' : 'transparent' }}>
                  <td style={{ padding: '5px 8px', color: T.textPrimary, fontFamily: 'monospace' }}>{c.ip}</td>
                  <td style={{ padding: '5px 8px', color: T.textPrimary }}>{c.port}</td>
                  <td style={{ padding: '5px 8px', color: T.textSecondary }}>{c.protocol}</td>
                  <td style={{ padding: '5px 8px' }}>
                    <Badge label={c.status} color={c.status === 'established' ? T.success : T.textSecondary} />
                  </td>
                  <td style={{ padding: '5px 8px' }}>
                    {c.suspicious && <AlertTriangle size={13} color={T.critical} />}
                  </td>
                </tr>
              ))}
              {connections.length === 0 && (
                <tr><td colSpan={5} style={{ color: T.textSecondary, textAlign: 'center', padding: 12 }}>No active connections</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DNS anomalies */}
      {netData?.dnsAnomalies?.length > 0 && (
        <div>
          <div style={{ color: T.textSecondary, fontSize: 12, marginBottom: 8 }}>DNS Anomalies</div>
          {netData.dnsAnomalies.map((a, i) => (
            <div key={i} style={{ background: T.warning + '15', border: `1px solid ${T.warning}33`, borderRadius: 6, padding: '7px 10px', marginBottom: 4, fontSize: 12, color: T.warning }}>
              <AlertTriangle size={12} style={{ display: 'inline', marginRight: 6 }} />
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: T.textSecondary, fontSize: 12, marginBottom: 8 }}>Recent Network Alerts</div>
          {alerts.slice(0, 5).map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: T.critical, marginBottom: 4 }}>
              <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
              {a.message}
              <span style={{ color: T.textSecondary, marginLeft: 6 }}>{fmtDate(a.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Panel: On-Device Issue Detection
// ---------------------------------------------------------------------------
const DeviceHealth = ({ socket }) => {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    apiFetch('/device-health')
      .then(setHealth)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data ?? event);
        if (msg.type === 'device:update') setHealth((h) => ({ ...h, ...msg.data }));
      } catch {}
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, [socket]);

  const metrics = health
    ? [
        { label: 'CPU Usage', value: health.cpuPercent ?? 0, max: 100, unit: '%', icon: Cpu, threshold: 80 },
        { label: 'Memory', value: health.memPercent ?? 0, max: 100, unit: '%', icon: MemoryStick, threshold: 85 },
        { label: 'Disk', value: health.diskPercent ?? 0, max: 100, unit: '%', icon: HardDrive, threshold: 90 },
      ]
    : [];

  const processes = health?.unauthorizedProcesses ?? [];
  const fileIntegrity = health?.fileIntegrity ?? {};

  return (
    <Card title="Device Health" icon={Server}>
      {metrics.map(({ label, value, max, unit, icon: Icon, threshold }) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={14} color={value >= threshold ? T.critical : T.textSecondary} />
              <span style={{ fontSize: 13, color: T.textPrimary }}>{label}</span>
            </div>
            <span style={{ fontSize: 13, color: value >= threshold ? T.critical : T.textPrimary, fontWeight: 600 }}>
              {value}{unit}
            </span>
          </div>
          <ProgressBar value={value} max={max} color={value >= threshold ? T.critical : value >= threshold * 0.75 ? T.warning : T.success} />
        </div>
      ))}

      {/* Unauthorized processes */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Terminal size={14} color={T.textSecondary} />
          <span style={{ fontSize: 13, color: T.textSecondary }}>Unauthorized Processes</span>
          <Badge label={String(processes.length)} color={processes.length ? T.critical : T.success} />
        </div>
        {processes.length === 0 ? (
          <div style={{ fontSize: 12, color: T.success, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={13} /> No unauthorized processes detected
          </div>
        ) : (
          processes.map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: T.critical, marginBottom: 3 }}>
              <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
              {p.name} (PID {p.pid})
            </div>
          ))
        )}
      </div>

      {/* File integrity */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <FileText size={14} color={T.textSecondary} />
          <span style={{ fontSize: 13, color: T.textSecondary }}>File Integrity</span>
        </div>
        <div style={{ fontSize: 12 }}>
          {fileIntegrity.status === 'ok' && (
            <span style={{ color: T.success, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={13} /> All monitored files intact
            </span>
          )}
          {fileIntegrity.status === 'compromised' && (
            <span style={{ color: T.critical, display: 'flex', alignItems: 'center', gap: 4 }}>
              <XCircle size={13} /> {fileIntegrity.count} file(s) modified — {fmtDate(fileIntegrity.lastCheck)}
            </span>
          )}
          {!fileIntegrity.status && (
            <span style={{ color: T.textSecondary }}>Not yet checked</span>
          )}
        </div>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Panel: Security Metrics
// ---------------------------------------------------------------------------
const SecurityMetrics = ({ socket }) => {
  const [metrics, setMetrics] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch('/metrics');
      setMetrics(d);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data ?? event);
        if (msg.type === 'metrics:update') setMetrics((m) => ({ ...m, ...msg.data }));
      } catch {}
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, [socket]);

  const score = metrics?.overallScore ?? 0;
  const breakdown = metrics?.scoreBreakdown ?? {};

  return (
    <Card title="Security Metrics" icon={Activity} action={<Btn onClick={load} icon={RefreshCw} variant="ghost" small>Refresh</Btn>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
        <ScoreGauge score={score} />
        <div style={{ flex: 1 }}>
          <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 18, marginBottom: 2 }}>
            Overall Score: {score}/100
          </div>
          <div style={{ color: T.textSecondary, fontSize: 12, marginBottom: 10 }}>
            Last scan: {fmtDate(metrics?.lastScanAt)}
          </div>
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: T.textSecondary, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ color: scoreColor(v) }}>{v}</span>
              </div>
              <ProgressBar value={v} color={scoreColor(v)} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {[
          { label: 'Threats Blocked 24h', value: metrics?.threatsBlocked24h ?? 0, color: T.success },
          { label: 'Threats Blocked 7d', value: metrics?.threatsBlocked7d ?? 0, color: T.success },
          { label: 'Threats Blocked 30d', value: metrics?.threatsBlocked30d ?? 0, color: T.success },
          { label: 'Failed Auth (24h)', value: metrics?.failedAuth24h ?? 0, color: metrics?.failedAuth24h > 10 ? T.critical : T.textPrimary },
          { label: 'Active Sessions', value: metrics?.activeSessions ?? 0, color: T.textPrimary },
          { label: 'Encrypted Data', value: `${metrics?.encryptedPct ?? 0}%`, color: metrics?.encryptedPct >= 95 ? T.success : T.warning },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: T.surfaceElevated, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ color: T.textSecondary, fontSize: 10, marginBottom: 4 }}>{label}</div>
            <div style={{ color, fontWeight: 700, fontSize: 18 }}>{fmt(value)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Panel: Audit Log Viewer
// ---------------------------------------------------------------------------
const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [type, setType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: PAGE_SIZE,
        ...(search && { search }),
        ...(severity !== 'all' && { severity }),
        ...(type !== 'all' && { type }),
        ...(dateFrom && { from: dateFrom }),
      });
      const d = await apiFetch(`/audit?${params}`);
      setLogs(d.logs ?? []);
      setTotal(d.total ?? 0);
    } catch {}
    setLoading(false);
  }, [page, search, severity, type, dateFrom]);

  useEffect(() => { load(); }, [load]);

  const exportLogs = (format) => {
    if (format === 'csv') {
      const header = 'timestamp,severity,type,user,message\n';
      const rows = logs.map((l) =>
        `"${l.timestamp}","${l.severity}","${l.type}","${l.user}","${l.message.replace(/"/g, '""')}"`
      ).join('\n');
      downloadBlob(header + rows, 'audit-log.csv', 'text/csv');
    } else {
      downloadBlob(JSON.stringify(logs, null, 2), 'audit-log.json', 'application/json');
    }
  };

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <Card
      title="Audit Log"
      icon={FileText}
      style={{ gridColumn: '1 / -1' }}
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => exportLogs('csv')} variant="ghost" icon={Download} small>CSV</Btn>
          <Btn onClick={() => exportLogs('json')} variant="ghost" icon={Download} small>JSON</Btn>
        </div>
      }
    >
      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search logs…"
          style={{ maxWidth: 220 }}
        />
        <Select
          value={severity}
          onChange={(v) => { setSeverity(v); setPage(1); }}
          options={[
            { value: 'all', label: 'All Severities' },
            { value: 'critical', label: 'Critical' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
            { value: 'info', label: 'Info' },
          ]}
        />
        <Select
          value={type}
          onChange={(v) => { setType(v); setPage(1); }}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'auth', label: 'Auth' },
            { value: 'network', label: 'Network' },
            { value: 'file', label: 'File' },
            { value: 'system', label: 'System' },
            { value: 'api', label: 'API' },
          ]}
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          style={{
            background: T.surfaceElevated,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.textPrimary,
            padding: '7px 12px',
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Time', 'Severity', 'Type', 'User', 'Message'].map((h) => (
                <th key={h} style={{ color: T.textSecondary, textAlign: 'left', padding: '6px 10px', borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: T.textSecondary }}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: T.textSecondary }}>No log entries match the current filters.</td></tr>
            ) : (
              logs.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: '7px 10px', color: T.textSecondary, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{fmtDate(l.timestamp)}</td>
                  <td style={{ padding: '7px 10px' }}><Badge label={l.severity} color={severityColor(l.severity)} /></td>
                  <td style={{ padding: '7px 10px', color: T.textSecondary, textTransform: 'capitalize' }}>{l.type}</td>
                  <td style={{ padding: '7px 10px', color: T.textPrimary, fontFamily: 'monospace' }}>{l.user ?? '—'}</td>
                  <td style={{ padding: '7px 10px', color: T.textPrimary }}>{l.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 12, color: T.textSecondary }}>
            Page {page} of {pages} ({total} entries)
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} variant="ghost" icon={ChevronLeft} small>Prev</Btn>
            <Btn onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} variant="ghost" icon={ChevronRight} small>Next</Btn>
          </div>
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Panel: 2FA / MFA Status
// ---------------------------------------------------------------------------
const MFAPanel = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    apiFetch('/mfa-status')
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});
  }, []);

  return (
    <Card title="2FA / MFA Status" icon={Lock}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
        {users.length === 0 && (
          <p style={{ color: T.textSecondary, fontSize: 13, textAlign: 'center' }}>No user MFA data available.</p>
        )}
        {users.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.accent + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: T.accent, fontWeight: 700 }}>
                {(u.name ?? u.email ?? '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, color: T.textPrimary }}>{u.name ?? u.email}</div>
                <div style={{ fontSize: 11, color: T.textSecondary }}>{u.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge label={u.mfaEnabled ? '2FA ON' : '2FA OFF'} color={u.mfaEnabled ? T.success : T.critical} />
              {u.mfaMethod && <Badge label={u.mfaMethod} color={T.textSecondary} />}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Panel: Certificate Status
// ---------------------------------------------------------------------------
const CertificatePanel = () => {
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    apiFetch('/certificates')
      .then((d) => setCerts(d.certificates ?? []))
      .catch(() => {});
  }, []);

  const daysUntil = (iso) => {
    if (!iso) return Infinity;
    return Math.floor((new Date(iso) - Date.now()) / 86400000);
  };

  const certColor = (days) => (days < 14 ? T.critical : days < 30 ? T.warning : T.success);

  return (
    <Card title="SSL/TLS Certificates" icon={Globe}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {certs.length === 0 && (
          <p style={{ color: T.textSecondary, fontSize: 13, textAlign: 'center' }}>No certificates tracked.</p>
        )}
        {certs.map((c, i) => {
          const days = daysUntil(c.expiresAt);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}22` }}>
              <div>
                <div style={{ fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>{c.domain}</div>
                <div style={{ fontSize: 11, color: T.textSecondary }}>Expires {fmtDate(c.expiresAt)}</div>
              </div>
              <Badge
                label={days === Infinity ? 'Unknown' : `${days}d left`}
                color={certColor(days)}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Panel: API Key Rotation
// ---------------------------------------------------------------------------
const APIKeyRotation = () => {
  const [keys, setKeys] = useState([]);
  const [rotating, setRotating] = useState(null);

  useEffect(() => {
    apiFetch('/api-keys')
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => {});
  }, []);

  const rotate = async (id) => {
    setRotating(id);
    try {
      await apiFetch(`/api-keys/${id}/rotate`, { method: 'POST' });
      setKeys((k) =>
        k.map((x) => (x.id === id ? { ...x, lastRotated: new Date().toISOString(), status: 'rotated' } : x))
      );
    } catch {}
    setRotating(null);
  };

  const daysSince = (iso) => {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso)) / 86400000);
  };

  return (
    <Card title="API Key Rotation" icon={Key}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
        {keys.length === 0 && (
          <p style={{ color: T.textSecondary, fontSize: 13, textAlign: 'center' }}>No API keys tracked.</p>
        )}
        {keys.map((k) => {
          const age = daysSince(k.lastRotated);
          const stale = age != null && age > 90;
          return (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}22` }}>
              <div>
                <div style={{ fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>{k.name}</div>
                <div style={{ fontSize: 11, color: stale ? T.warning : T.textSecondary }}>
                  {age != null ? `Rotated ${age}d ago` : 'Never rotated'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {stale && <Badge label="Stale" color={T.warning} />}
                <Btn
                  onClick={() => rotate(k.id)}
                  disabled={rotating === k.id}
                  variant={stale ? 'danger' : 'ghost'}
                  icon={RefreshCw}
                  small
                >
                  {rotating === k.id ? 'Rotating…' : 'Rotate'}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

/**
 * SecurityDashboardPro
 *
 * Comprehensive real-time security dashboard. Connects to window.nexusSocket
 * for live updates and fetches all data from /api/security/* endpoints.
 *
 * @component
 * @returns {JSX.Element}
 */
const SecurityDashboardPro = () => {
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState('disconnected');

  // Connect / reuse the global socket provided by the app shell
  useEffect(() => {
    const ws = window.nexusSocket ?? null;
    if (ws) {
      setSocket(ws);
      setSocketStatus(ws.readyState === WebSocket.OPEN ? 'connected' : 'connecting');
      const onOpen = () => setSocketStatus('connected');
      const onClose = () => setSocketStatus('disconnected');
      ws.addEventListener('open', onOpen);
      ws.addEventListener('close', onClose);
      return () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('close', onClose);
      };
    }
  }, []);

  return (
    <div
      style={{
        background: T.bg,
        minHeight: '100vh',
        padding: '24px 20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: T.textPrimary,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={28} color={T.accent} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.textPrimary }}>
              Security Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: T.textSecondary }}>
              Real-time threat monitoring & vulnerability management
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {socketStatus === 'connected'
            ? <><Wifi size={14} color={T.success} /><span style={{ fontSize: 12, color: T.success }}>Live</span></>
            : <><WifiOff size={14} color={T.critical} /><span style={{ fontSize: 12, color: T.critical }}>Offline</span></>
          }
        </div>
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 20,
        }}
      >
        <SecurityMetrics socket={socket} />
        <VulnerabilityScanner socket={socket} />
        <NetworkMonitor socket={socket} />
        <DeviceHealth socket={socket} />
        <MFAPanel />
        <CertificatePanel />
        <APIKeyRotation />
        <AuditLogViewer />
      </div>
    </div>
  );
};

export default SecurityDashboardPro;
