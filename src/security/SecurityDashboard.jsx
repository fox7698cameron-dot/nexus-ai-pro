/* src/security/SecurityDashboard.jsx
   Created: 2026-10-11
   Security Dashboard - Real-Time Threat Monitoring & Network Analysis
   Features: Live scans, intrusion detection, encryption status, audit logs
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Key,
  Eye,
  Network,
  Wifi,
  AlertTriangle,
  Activity,
  Server,
  Globe,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Users,
  Terminal,
  Database,
  Cpu,
  Radio,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  Filter,
  Download,
  Info,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const WS_RECONNECT_DELAY_MS = 3000;
const POLL_INTERVAL_MS = 30000;

const THREAT_LEVELS = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700', dot: 'bg-red-500' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-700', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-700', dot: 'bg-amber-500' },
  low:      { label: 'Low',      color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-700', dot: 'bg-yellow-500' },
  info:     { label: 'Info',     color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700', dot: 'bg-blue-500' },
  safe:     { label: 'Safe',     color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700', dot: 'bg-green-500' },
};

const CVSS_COLOR = (score) => {
  if (score >= 9.0) return 'text-red-400';
  if (score >= 7.0) return 'text-orange-400';
  if (score >= 4.0) return 'text-amber-400';
  return 'text-green-400';
};

const CVSS_LABEL = (score) => {
  if (score >= 9.0) return 'Critical';
  if (score >= 7.0) return 'High';
  if (score >= 4.0) return 'Medium';
  return 'Low';
};

// ─── Utility helpers ─────────────────────────────────────────────────────────

const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
};

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
};

const scoreGradient = (score) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated pulsing dot indicator */
const StatusDot = ({ level = 'safe', animate = false }) => {
  const cfg = THREAT_LEVELS[level] ?? THREAT_LEVELS.info;
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg.dot} ${animate ? 'animate-pulse' : ''}`} />
  );
};

/** Pill badge */
const Badge = ({ level = 'info', children }) => {
  const cfg = THREAT_LEVELS[level] ?? THREAT_LEVELS.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {children}
    </span>
  );
};

/** Card wrapper */
const Card = ({ title, icon: Icon, children, className = '', action }) => (
  <div className={`rounded-xl border border-gray-700 bg-gray-800/60 backdrop-blur-sm overflow-hidden ${className}`}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-gray-400" />}
        <span className="text-sm font-semibold text-gray-200 tracking-wide uppercase">{title}</span>
      </div>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/** Security score gauge */
const ScoreGauge = ({ score = 0 }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const dashOffset = circumference * (1 - pct);
  const color = scoreGradient(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="80" viewBox="0 0 140 80" className="overflow-visible">
        {/* Background arc (half circle) */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke="#374151"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.5}`}
          strokeDashoffset={`${circumference * 0.5 * (1 - pct)}`}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
        />
        {/* Score text */}
        <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="700" fill={color}>
          {score}
        </text>
        <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#9ca3af">
          / 100
        </text>
      </svg>
      <span className="text-xs text-gray-400 uppercase tracking-widest">
        {score >= 80 ? 'Secure' : score >= 60 ? 'Moderate Risk' : score >= 40 ? 'High Risk' : 'Critical'}
      </span>
    </div>
  );
};

/** Network topology CSS diagram */
const NetworkTopology = ({ nodes = [] }) => {
  const defaultNodes = [
    { id: 'internet', label: 'Internet', icon: Globe, x: 50, y: 10, status: 'safe' },
    { id: 'firewall', label: 'Firewall', icon: Shield, x: 50, y: 35, status: 'safe' },
    { id: 'lb',       label: 'Load Balancer', icon: Server, x: 50, y: 58, status: 'safe' },
    { id: 'app1',     label: 'App-1', icon: Cpu, x: 20, y: 80, status: 'safe' },
    { id: 'app2',     label: 'App-2', icon: Cpu, x: 50, y: 80, status: 'safe' },
    { id: 'db',       label: 'DB', icon: Database, x: 80, y: 80, status: 'safe' },
  ];

  const displayNodes = nodes.length > 0 ? nodes : defaultNodes;

  const links = [
    ['internet', 'firewall'],
    ['firewall', 'lb'],
    ['lb', 'app1'],
    ['lb', 'app2'],
    ['lb', 'db'],
  ];

  const nodeMap = Object.fromEntries(displayNodes.map((n) => [n.id, n]));

  return (
    <div className="relative w-full" style={{ paddingBottom: '55%' }}>
      <svg
        viewBox="0 0 100 90"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Links */}
        {links.map(([a, b]) => {
          const na = nodeMap[a];
          const nb = nodeMap[b];
          if (!na || !nb) return null;
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x}
              y1={na.y + 3}
              x2={nb.x}
              y2={nb.y - 3}
              stroke="#374151"
              strokeWidth="0.8"
              strokeDasharray="2 1"
            />
          );
        })}

        {/* Nodes */}
        {displayNodes.map((node) => {
          const cfg = THREAT_LEVELS[node.status] ?? THREAT_LEVELS.safe;
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <circle r="5.5" fill="#1f2937" stroke={cfg.dot.replace('bg-', '#').replace('-500', '')} strokeWidth="0.8" />
              <text y="10" textAnchor="middle" fontSize="3.5" fill="#9ca3af">
                {node.label}
              </text>
              {/* Small status dot */}
              <circle cx="4" cy="-4" r="1.5" fill={
                node.status === 'critical' ? '#ef4444' :
                node.status === 'high' ? '#f97316' :
                node.status === 'medium' ? '#f59e0b' :
                '#22c55e'
              } />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/** Single audit log row */
const AuditRow = ({ entry }) => (
  <div className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0">
    <span className="text-xs text-gray-500 whitespace-nowrap font-mono pt-0.5">{fmtTime(entry.timestamp)}</span>
    <StatusDot level={entry.level ?? 'info'} />
    <span className="text-xs text-gray-300 flex-1 leading-relaxed">{entry.message}</span>
    {entry.user && (
      <span className="text-xs text-gray-500 whitespace-nowrap">{entry.user}</span>
    )}
  </div>
);

/** Vulnerability row */
const VulnRow = ({ vuln }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-gray-700/40 last:border-0">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs font-mono text-gray-400">{vuln.cveId}</span>
        <Badge level={
          vuln.cvssScore >= 9.0 ? 'critical' :
          vuln.cvssScore >= 7.0 ? 'high' :
          vuln.cvssScore >= 4.0 ? 'medium' : 'low'
        }>
          {CVSS_LABEL(vuln.cvssScore)}
        </Badge>
      </div>
      <p className="text-xs text-gray-300 truncate">{vuln.description}</p>
    </div>
    <div className="text-right shrink-0">
      <span className={`text-sm font-bold ${CVSS_COLOR(vuln.cvssScore)}`}>{vuln.cvssScore.toFixed(1)}</span>
      <p className="text-xs text-gray-500">CVSS</p>
    </div>
  </div>
);

/** Active session row */
const SessionRow = ({ session }) => (
  <div className="flex items-center gap-3 py-2 border-b border-gray-700/40 last:border-0">
    <User size={14} className="text-gray-500 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-200 truncate font-medium">{session.user}</p>
      <p className="text-xs text-gray-500 truncate">{session.ip} · {session.location}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-xs text-gray-400">{fmtTime(session.lastActive)}</p>
      <StatusDot level={session.suspicious ? 'high' : 'safe'} animate={session.suspicious} />
    </div>
  </div>
);

/** Firewall rule row */
const FirewallRow = ({ rule }) => (
  <div className="flex items-center gap-2 py-2 border-b border-gray-700/40 last:border-0">
    <span className={`w-2 h-2 rounded-full shrink-0 ${rule.action === 'allow' ? 'bg-green-500' : 'bg-red-500'}`} />
    <span className="text-xs font-mono text-gray-400 w-16 shrink-0">{rule.protocol?.toUpperCase()}</span>
    <span className="text-xs text-gray-300 flex-1 truncate">{rule.source} → {rule.destination}:{rule.port}</span>
    <span className={`text-xs font-semibold uppercase ${rule.action === 'allow' ? 'text-green-400' : 'text-red-400'}`}>
      {rule.action}
    </span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SecurityDashboard = () => {
  // ── State ──
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [alertFilter, setAlertFilter] = useState('all');
  const [mutedAlerts, setMutedAlerts] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  // ── API helpers ──

  const apiFetch = useCallback(async (path, options = {}) => {
    const resp = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${path}`);
    return resp.json();
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [statusData, alertsData, dashboardData] = await Promise.all([
        apiFetch('/api/security/status'),
        apiFetch('/api/security/alerts'),
        apiFetch('/api/security/dashboard'),
      ]);
      setStatus(statusData);
      setAlerts(alertsData?.alerts ?? []);
      setDashboard(dashboardData);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [apiFetch]);

  const triggerScan = useCallback(async () => {
    setScanning(true);
    try {
      await apiFetch('/api/security/scan', { method: 'POST' });
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }, [apiFetch, fetchAll]);

  const rotateApiKey = useCallback(async () => {
    setRotatingKey(true);
    try {
      await apiFetch('/api/security/rotate-key', { method: 'POST' });
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setRotatingKey(false);
    }
  }, [apiFetch, fetchAll]);

  // ── WebSocket ──

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/security`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'security:alert':
              setAlerts((prev) => [msg.payload, ...prev].slice(0, 200));
              break;
            case 'security:scan':
              setScanning(msg.payload?.running ?? false);
              if (msg.payload?.results) fetchAll();
              break;
            case 'security:update':
              if (msg.payload?.status) setStatus(msg.payload.status);
              if (msg.payload?.dashboard) setDashboard(msg.payload.dashboard);
              setLastUpdated(new Date().toISOString());
              break;
            default:
              break;
          }
        } catch {
          /* ignore malformed WS frames */
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        reconnectTimerRef.current = setTimeout(connectWebSocket, WS_RECONNECT_DELAY_MS);
      };
    } catch {
      reconnectTimerRef.current = setTimeout(connectWebSocket, WS_RECONNECT_DELAY_MS);
    }
  }, [fetchAll]);

  // ── Lifecycle ──

  useEffect(() => {
    fetchAll();
    connectWebSocket();

    pollTimerRef.current = setInterval(fetchAll, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollTimerRef.current);
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [fetchAll, connectWebSocket]);

  // ── Derived data ──

  const securityScore = dashboard?.securityScore ?? status?.securityScore ?? 0;
  const vulnerabilities = dashboard?.vulnerabilities ?? [];
  const firewallRules = dashboard?.firewallRules ?? [];
  const activeSessions = dashboard?.activeSessions ?? [];
  const auditLog = dashboard?.auditLog ?? [];
  const networkNodes = dashboard?.networkTopology ?? [];
  const encryptionStatus = status?.encryption ?? {};
  const certStatus = status?.certificates ?? [];
  const rateLimits = status?.rateLimits ?? {};
  const ddosStatus = status?.ddosProtection ?? {};
  const idsStatus = status?.intrusionDetection ?? {};

  const filteredAlerts = alertFilter === 'all'
    ? alerts
    : alerts.filter((a) => a.level === alertFilter);

  const criticalAlertCount = alerts.filter((a) => a.level === 'critical').length;
  const highAlertCount = alerts.filter((a) => a.level === 'high').length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6 font-sans">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800 border border-gray-700">
            <Shield size={24} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Security Dashboard</h1>
            <p className="text-xs text-gray-500">
              Real-Time Threat Monitoring &amp; Network Analysis
              {lastUpdated && (
                <span className="ml-2 text-gray-600">· Updated {fmtTime(lastUpdated)}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* WS connection badge */}
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            wsConnected
              ? 'bg-green-900/30 border-green-700 text-green-400'
              : 'bg-red-900/30 border-red-700 text-red-400'
          }`}>
            <Radio size={10} className={wsConnected ? 'animate-pulse' : ''} />
            {wsConnected ? 'Live' : 'Disconnected'}
          </span>

          {/* Mute alerts */}
          <button
            onClick={() => setMutedAlerts((m) => !m)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 transition-colors text-xs text-gray-300"
            title={mutedAlerts ? 'Unmute alerts' : 'Mute alerts'}
          >
            {mutedAlerts ? <BellOff size={13} /> : <Bell size={13} />}
          </button>

          {/* Trigger scan */}
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-700 bg-indigo-900/40 hover:bg-indigo-800/60 transition-colors text-xs text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Activity size={13} className={scanning ? 'animate-pulse' : ''} />
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>

          {/* Rotate API key */}
          <button
            onClick={rotateApiKey}
            disabled={rotatingKey}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-700 bg-amber-900/30 hover:bg-amber-800/50 transition-colors text-xs text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Key size={13} className={rotatingKey ? 'animate-spin' : ''} />
            {rotatingKey ? 'Rotating…' : 'Rotate API Key'}
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          <AlertTriangle size={15} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* ── Top KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          {
            label: 'Security Score',
            value: securityScore,
            icon: ShieldCheck,
            color: securityScore >= 80 ? 'text-green-400' : securityScore >= 60 ? 'text-amber-400' : 'text-red-400',
            suffix: '/100',
          },
          {
            label: 'Critical Alerts',
            value: criticalAlertCount,
            icon: ShieldAlert,
            color: criticalAlertCount > 0 ? 'text-red-400' : 'text-green-400',
          },
          {
            label: 'High Alerts',
            value: highAlertCount,
            icon: AlertTriangle,
            color: highAlertCount > 0 ? 'text-orange-400' : 'text-green-400',
          },
          {
            label: 'Active Sessions',
            value: activeSessions.length,
            icon: Users,
            color: 'text-blue-400',
          },
          {
            label: 'Vulnerabilities',
            value: vulnerabilities.length,
            icon: Eye,
            color: vulnerabilities.length > 0 ? 'text-amber-400' : 'text-green-400',
          },
          {
            label: 'Firewall Rules',
            value: firewallRules.length,
            icon: Network,
            color: 'text-indigo-400',
          },
        ].map(({ label, value, icon: Icon, color, suffix = '' }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
              <Icon size={14} className="text-gray-600" />
            </div>
            <span className={`text-2xl font-bold ${color}`}>
              {value ?? '—'}{suffix}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-4">

          {/* Security Score Gauge */}
          <Card title="Security Score" icon={ShieldCheck}>
            <ScoreGauge score={securityScore} />
          </Card>

          {/* Encryption Status */}
          <Card title="Encryption" icon={Lock}>
            <div className="space-y-2">
              {Object.entries(encryptionStatus).length === 0 ? (
                <p className="text-xs text-gray-500 italic">No encryption data</p>
              ) : (
                Object.entries(encryptionStatus).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-700/40 last:border-0">
                    <span className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-1.5">
                      {val?.enabled ? (
                        <CheckCircle size={13} className="text-green-400" />
                      ) : (
                        <XCircle size={13} className="text-red-400" />
                      )}
                      <span className={`text-xs font-medium ${val?.enabled ? 'text-green-400' : 'text-red-400'}`}>
                        {val?.label ?? (val?.enabled ? 'Enabled' : 'Disabled')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* SSL/TLS Certificates */}
          <Card title="SSL / TLS Certificates" icon={Lock}>
            {certStatus.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No certificate data</p>
            ) : (
              <div className="space-y-2">
                {certStatus.map((cert, i) => {
                  const daysLeft = cert.daysUntilExpiry ?? 0;
                  const level = daysLeft < 7 ? 'critical' : daysLeft < 30 ? 'high' : daysLeft < 90 ? 'medium' : 'safe';
                  return (
                    <div key={i} className="py-2 border-b border-gray-700/40 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-200 truncate max-w-[60%]">{cert.domain}</span>
                        <Badge level={level}>{daysLeft}d left</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{cert.issuer}</span>
                        <span>{fmtDate(cert.expiresAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Network Topology */}
          <Card title="Network Topology" icon={Network}>
            <NetworkTopology nodes={networkNodes} />
            <p className="text-xs text-gray-600 text-center mt-2">CSS diagram — live node status</p>
          </Card>
        </div>

        {/* ── Centre column ── */}
        <div className="flex flex-col gap-4">

          {/* Live Alerts */}
          <Card
            title="Intrusion Detection Alerts"
            icon={ShieldAlert}
            action={
              <div className="flex items-center gap-2">
                <select
                  value={alertFilter}
                  onChange={(e) => setAlertFilter(e.target.value)}
                  className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none"
                >
                  {['all', 'critical', 'high', 'medium', 'low', 'info'].map((l) => (
                    <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="space-y-0 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-gray-600">
                  <ShieldCheck size={28} />
                  <p className="text-xs">No alerts</p>
                </div>
              ) : (
                filteredAlerts.slice(0, 50).map((alert, i) => {
                  const cfg = THREAT_LEVELS[alert.level] ?? THREAT_LEVELS.info;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-2.5 rounded-lg mb-1.5 ${cfg.bg} border ${cfg.border}`}
                    >
                      <StatusDot level={alert.level} animate={alert.level === 'critical'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200 leading-snug">{alert.message}</p>
                        {alert.source && (
                          <p className="text-xs text-gray-500 mt-0.5">{alert.source}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{fmtTime(alert.timestamp)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Vulnerability Tracker */}
          <Card title="Vulnerability Tracker" icon={Eye}>
            <div className="max-h-64 overflow-y-auto pr-1">
              {vulnerabilities.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-gray-600">
                  <ShieldCheck size={28} />
                  <p className="text-xs">No vulnerabilities found</p>
                </div>
              ) : (
                vulnerabilities.map((v, i) => <VulnRow key={i} vuln={v} />)
              )}
            </div>
          </Card>

          {/* DDoS Protection */}
          <Card title="DDoS Protection" icon={Zap}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Status', value: ddosStatus.enabled ? 'Active' : 'Inactive', color: ddosStatus.enabled ? 'text-green-400' : 'text-red-400' },
                { label: 'Mode', value: ddosStatus.mode ?? 'Unknown', color: 'text-blue-400' },
                { label: 'Blocked Today', value: ddosStatus.blockedToday ?? 0, color: 'text-amber-400' },
                { label: 'Threshold', value: ddosStatus.threshold ? `${ddosStatus.threshold} req/s` : 'N/A', color: 'text-gray-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-gray-700/40 p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-sm font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Rate Limits */}
          <Card title="Rate Limit Status" icon={Activity}>
            <div className="space-y-2">
              {Object.keys(rateLimits).length === 0 ? (
                <p className="text-xs text-gray-500 italic">No rate limit data</p>
              ) : (
                Object.entries(rateLimits).map(([endpoint, data]) => {
                  const pct = data.limit > 0 ? Math.round((data.current / data.limit) * 100) : 0;
                  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
                  return (
                    <div key={endpoint}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 truncate max-w-[60%] font-mono">{endpoint}</span>
                        <span className="text-xs text-gray-400">{data.current}/{data.limit}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">

          {/* IDS Status */}
          <Card title="Intrusion Detection" icon={Radio}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Engine Status</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot level={idsStatus.active ? 'safe' : 'critical'} animate={idsStatus.active} />
                  <span className={`text-xs font-medium ${idsStatus.active ? 'text-green-400' : 'text-red-400'}`}>
                    {idsStatus.active ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Rules Loaded</span>
                <span className="text-xs text-gray-200 font-medium">{idsStatus.rulesCount ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Events (24h)</span>
                <span className="text-xs text-amber-300 font-medium">{idsStatus.events24h ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Last Signature Update</span>
                <span className="text-xs text-gray-400">{idsStatus.signaturesUpdated ? fmtDate(idsStatus.signaturesUpdated) : '—'}</span>
              </div>
            </div>
          </Card>

          {/* Active Sessions */}
          <Card title="Active Sessions" icon={Users}>
            <div className="max-h-56 overflow-y-auto pr-1">
              {activeSessions.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-4 text-center">No active sessions</p>
              ) : (
                activeSessions.map((s, i) => <SessionRow key={i} session={s} />)
              )}
            </div>
          </Card>

          {/* Firewall Rules */}
          <Card title="Active Firewall Rules" icon={Shield}>
            <div className="max-h-56 overflow-y-auto pr-1">
              {firewallRules.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-4 text-center">No firewall rules loaded</p>
              ) : (
                firewallRules.map((r, i) => <FirewallRow key={i} rule={r} />)
              )}
            </div>
          </Card>

          {/* Network Issues */}
          <Card title="Network Issues" icon={Wifi}>
            <div className="space-y-2">
              {(status?.networkIssues ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-gray-600">
                  <CheckCircle size={24} className="text-green-600" />
                  <p className="text-xs text-green-500">No network issues detected</p>
                </div>
              ) : (
                (status?.networkIssues ?? []).map((issue, i) => {
                  const cfg = THREAT_LEVELS[issue.severity ?? 'info'];
                  return (
                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                      <StatusDot level={issue.severity ?? 'info'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200">{issue.message}</p>
                        {issue.interface && (
                          <p className="text-xs text-gray-500 mt-0.5">Interface: {issue.interface}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Audit Log */}
          <Card
            title="Audit Log"
            icon={Terminal}
            action={
              <button
                onClick={() => setAuditExpanded((v) => !v)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                {auditExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            }
          >
            <div className={`overflow-y-auto pr-1 transition-all duration-300 ${auditExpanded ? 'max-h-96' : 'max-h-48'}`}>
              {auditLog.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">No audit entries</p>
              ) : (
                auditLog.slice(0, auditExpanded ? 100 : 20).map((entry, i) => (
                  <AuditRow key={i} entry={entry} />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Scanning overlay indicator ── */}
      {scanning && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-900/90 border border-indigo-600 text-indigo-300 text-sm shadow-lg backdrop-blur-sm animate-pulse z-50">
          <Activity size={14} />
          <span>Security scan in progress…</span>
        </div>
      )}

      {/* ── Rotating key indicator ── */}
      {rotatingKey && (
        <div className="fixed bottom-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-900/90 border border-amber-600 text-amber-300 text-sm shadow-lg backdrop-blur-sm animate-pulse z-50">
          <Key size={14} className="animate-spin" />
          <span>Rotating API key…</span>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      `}</style>
    </div>
  );
};

export default SecurityDashboard;
