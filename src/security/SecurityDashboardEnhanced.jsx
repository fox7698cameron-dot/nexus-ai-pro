// Created: 2026-07-28
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Lock, Wifi, Server,
  AlertTriangle, CheckCircle, XCircle, Activity, Download,
  RefreshCw, Clock, Cpu, HardDrive, Key, Globe,
  FileText, Search, Database, Zap, Eye,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCORE_RADIUS = 54;
const SCORE_CIRCUMFERENCE = 2 * Math.PI * SCORE_RADIUS;
const AUDIT_PAGE_SIZE = 20;

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_VULNS = [
  { id: 1, severity: 'critical', name: 'CVE-2024-1234', description: 'Remote code execution via buffer overflow in libssl', status: 'active' },
  { id: 2, severity: 'high',     name: 'CVE-2024-5678', description: 'Privilege escalation in kernel loadable module', status: 'warning' },
  { id: 3, severity: 'medium',   name: 'CVE-2024-9012', description: 'Information disclosure through verbose error messages', status: 'resolved' },
  { id: 4, severity: 'low',      name: 'CVE-2024-3456', description: 'Weak cipher in legacy TLS 1.0 fallback path', status: 'resolved' },
];

const MOCK_THREATS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  timestamp: new Date(Date.now() - i * 195_000).toISOString(),
  type: ['Port Scan', 'Brute Force', 'SQL Injection', 'XSS Attempt', 'DDoS Probe'][i % 5],
  severity: ['critical', 'high', 'medium', 'low'][i % 4],
  ip: `${192 + (i % 4)}.168.${(i * 17) % 255}.${(i * 43) % 255}`,
  status: i % 3 === 0 ? 'monitored' : 'blocked',
}));

const MOCK_AUDIT = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  event: ['Login Success', 'Login Failed', 'Key Rotation', 'Scan Complete', 'Alert Triggered', 'Patch Applied'][i % 6],
  timestamp: new Date(Date.now() - i * 600_000).toISOString(),
  details: [
    'User admin authenticated from 10.0.0.1',
    'Invalid credentials — 3 consecutive failures',
    'AES-256-GCM master key rotated successfully',
    'Full system scan complete: 0 critical findings',
    'Intrusion attempt blocked from external host',
    'Security patch v4.2.1 applied to kernel module',
  ][i % 6],
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function maskIP(ip) {
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.***` : ip;
}

function formatCountdown(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function jitter(value, spread) {
  return value + (Math.random() - 0.5) * spread;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const offset = SCORE_CIRCUMFERENCE * (1 - score / 100);
  const color  = score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444';
  const label  = score >= 90 ? 'Secure'  : score >= 70 ? 'Warning'  : 'Critical';

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="148" height="148" viewBox="0 0 148 148">
        {/* Track */}
        <circle cx="74" cy="74" r={SCORE_RADIUS} fill="none" stroke="#1f2937" strokeWidth="11" />
        {/* Arc */}
        <circle
          cx="74" cy="74" r={SCORE_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={SCORE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 74 74)"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.8s ease' }}
        />
        <text x="74" y="69" textAnchor="middle" fill="white"     fontSize="28" fontWeight="bold"   fontFamily="monospace">{score}</text>
        <text x="74" y="88" textAnchor="middle" fill={color}     fontSize="12" fontWeight="600"    fontFamily="monospace">{label}</text>
      </svg>
      <p className="text-gray-500 text-xs mt-0.5 uppercase tracking-widest">Security Score</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  const styles = {
    green:  'text-green-400  bg-green-400/10  border-green-400/25',
    orange: 'text-orange-400 bg-orange-400/10 border-orange-400/25',
    blue:   'text-blue-400   bg-blue-400/10   border-blue-400/25',
    gray:   'text-gray-400   bg-gray-400/10   border-gray-400/20',
  };
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${styles[accent] ?? styles.gray}`}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-75">
        <Icon size={14} /> {label}
      </div>
      <div className="text-lg font-bold leading-tight font-mono">{value}</div>
      {sub && <div className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = 'green' }) {
  const pct = clamp((value / max) * 100, 0, 100);
  const colors = { green: 'bg-green-500', orange: 'bg-orange-500', red: 'bg-red-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500' };
  return (
    <div className="w-full bg-gray-700/60 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${colors[color] ?? colors.green}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    critical: 'bg-red-500/20    text-red-400    border border-red-500/30',
    high:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    medium:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    low:      'bg-blue-500/20   text-blue-400   border border-blue-500/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase shrink-0 ${styles[severity] ?? styles.low}`}>
      {severity}
    </span>
  );
}

function StatusDot({ active = true }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
  );
}

function PanelHeader({ icon: Icon, iconColor, title, children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className={iconColor} />
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SecurityDashboardEnhanced({ socket }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState({
    score: 87,
    threatsBlocked: 142,
    patchesApplied: 23,
    lastScan: new Date(Date.now() - 900_000).toISOString(),
  });

  const [network, setNetwork] = useState({
    latency: 28,
    inbound: 42,
    outbound: 18,
    connections: 74,
    suspiciousBlocked: 31,
  });

  const [device, setDevice] = useState({
    storageEncrypted: true,
    memoryProtected: true,
    cpuUsage: 34,
    diskIO: 12,
    processIntegrity: 'clean',
  });

  const [encHealth, setEncHealth] = useState({
    algorithm: 'AES-256-GCM',
    keyRotationIn: 86400 * 3 - 3600, // seconds
    certExpiry: 90,
    lastRotation: new Date(Date.now() - 86400_000 * 4).toISOString(),
  });

  const [vulns,    setVulns]    = useState(MOCK_VULNS);
  const [threats,  setThreats]  = useState(MOCK_THREATS);
  const [auditLog, setAuditLog] = useState(MOCK_AUDIT);
  const [auditPage, setAuditPage] = useState(0);

  const [scanning,     setScanning]     = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [autoRefresh,  setAutoRefresh]  = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const autoRefreshRef = useRef(null);
  const networkRef     = useRef(null);
  const encCountRef    = useRef(null);
  const scanRef        = useRef(null);

  // ── API helpers ────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/security/status');
      if (res.ok) { const d = await res.json(); setStatus(p => ({ ...p, ...d })); }
    } catch {}
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/security/dashboard');
      if (res.ok) {
        const d = await res.json();
        if (d.network) setNetwork(p => ({ ...p, ...d.network }));
        if (d.device)  setDevice(p => ({ ...p, ...d.device }));
      }
    } catch {}
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/security/alerts');
      if (res.ok) { const d = await res.json(); if (Array.isArray(d)) setThreats(d); }
    } catch {}
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/security/audit');
      if (res.ok) { const d = await res.json(); if (Array.isArray(d)) setAuditLog(d); }
    } catch {}
  }, []);

  const fetchEncHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/security/encryption-health');
      if (res.ok) { const d = await res.json(); setEncHealth(p => ({ ...p, ...d })); }
    } catch {}
  }, []);

  const refreshAll = useCallback(() => {
    fetchStatus(); fetchDashboard(); fetchAlerts(); fetchAudit(); fetchEncHealth();
  }, [fetchStatus, fetchDashboard, fetchAlerts, fetchAudit, fetchEncHealth]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Initial load
  useEffect(() => { refreshAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh toggle (30 s)
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(refreshAll, 30_000);
    } else {
      clearInterval(autoRefreshRef.current);
    }
    return () => clearInterval(autoRefreshRef.current);
  }, [autoRefresh, refreshAll]);

  // Network + device simulation (every 5 s)
  useEffect(() => {
    networkRef.current = setInterval(() => {
      setNetwork(p => ({
        ...p,
        latency:     clamp(jitter(p.latency, 6),     10,  120),
        inbound:     clamp(jitter(p.inbound, 10),     2,   98),
        outbound:    clamp(jitter(p.outbound, 8),     1,   95),
        connections: clamp(Math.round(jitter(p.connections, 10)), 40, 250),
      }));
      setDevice(p => ({
        ...p,
        cpuUsage: clamp(jitter(p.cpuUsage, 8), 3,  98),
        diskIO:   clamp(jitter(p.diskIO,   6), 1,  85),
      }));
    }, 5_000);
    return () => clearInterval(networkRef.current);
  }, []);

  // Key rotation countdown (every 1 s)
  useEffect(() => {
    encCountRef.current = setInterval(() => {
      setEncHealth(p => ({ ...p, keyRotationIn: Math.max(0, p.keyRotationIn - 1) }));
    }, 1_000);
    return () => clearInterval(encCountRef.current);
  }, []);

  // Socket subscriptions
  useEffect(() => {
    if (!socket) return;
    socket.emit('security:subscribe');
    socket.on('security:update', (data) => {
      if (data.status)  setStatus(p => ({ ...p, ...data.status }));
      if (data.threats) setThreats(data.threats);
    });
    socket.on('security:scan', (data) => {
      if (data.progress !== undefined) setScanProgress(data.progress);
      if (data.vulns) setVulns(data.vulns);
    });
    return () => {
      socket.off('security:update');
      socket.off('security:scan');
    };
  }, [socket]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const runScan = async () => {
    setScanning(true);
    setScanProgress(0);

    scanRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 92) { clearInterval(scanRef.current); return p; }
        return p + Math.random() * 11;
      });
    }, 280);

    try {
      const res = await fetch('/api/security/scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.vulns) setVulns(data.vulns);
      }
    } catch {}

    clearInterval(scanRef.current);
    setScanProgress(100);
    setStatus(p => ({ ...p, lastScan: new Date().toISOString() }));
    setTimeout(() => { setScanning(false); setScanProgress(0); }, 1_000);
  };

  const patchAll = () => {
    const unresolved = vulns.filter(v => v.status !== 'resolved').length;
    setVulns(p => p.map(v => ({ ...v, status: 'resolved' })));
    setStatus(p => ({ ...p, patchesApplied: p.patchesApplied + unresolved }));
  };

  const rotateKeys = async () => {
    try {
      const res = await fetch('/api/security/rotate-keys', { method: 'POST' });
      if (res.ok) {
        setEncHealth(p => ({
          ...p,
          keyRotationIn: 86400 * 7,
          lastRotation: new Date().toISOString(),
        }));
      }
    } catch {}
  };

  const downloadAuditLog = () => {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalAuditPages = Math.ceil(auditLog.length / AUDIT_PAGE_SIZE);
  const auditPageData   = auditLog.slice(auditPage * AUDIT_PAGE_SIZE, (auditPage + 1) * AUDIT_PAGE_SIZE);
  const latencyColor    = network.latency < 50 ? 'text-green-400' : network.latency < 100 ? 'text-orange-400' : 'text-red-400';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 font-mono text-sm">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-400" size={26} />
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Security Dashboard</h1>
            <p className="text-xs text-gray-600">NexusAI Pro — Enhanced Security Monitor</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh(p => !p)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
              ${autoRefresh
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
          >
            <RefreshCw size={11} className={autoRefresh ? 'animate-spin' : ''} />
            Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={rotateKeys}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
          >
            <Key size={11} /> Rotate Keys
          </button>
          <button
            onClick={downloadAuditLog}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-gray-800 border-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <Download size={11} /> Audit Log
          </button>
        </div>
      </div>

      {/* ── Row 1: Score ring + Stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-center">
          <ScoreRing score={status.score} />
        </div>

        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Lock}       label="Encryption"      value="AES-256-GCM" sub="ACTIVE"            accent="green"  />
          <StatCard icon={ShieldAlert} label="Threats Blocked" value={status.threatsBlocked} sub="total intercepted" accent={status.threatsBlocked > 0 ? 'orange' : 'green'} />
          <StatCard icon={Clock}      label="Last Scan"       value={timeAgo(status.lastScan)} sub="system scan"   accent="gray"   />
          <StatCard icon={ShieldCheck} label="Patches Applied" value={status.patchesApplied} sub="security patches" accent="blue" />
        </div>
      </div>

      {/* ── Row 2: Network Monitor + On-Device Security ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Network Monitor */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <PanelHeader icon={Wifi} iconColor="text-blue-400" title="Network Monitor">
            <span className={`text-xs font-bold font-mono ${latencyColor}`}>
              {Math.round(network.latency)} ms
            </span>
          </PanelHeader>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Inbound Traffic</span><span>{Math.round(network.inbound)}%</span>
              </div>
              <ProgressBar value={network.inbound} color="blue" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Outbound Traffic</span><span>{Math.round(network.outbound)}%</span>
              </div>
              <ProgressBar value={network.outbound} color="green" />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-gray-800 mt-1">
              {[
                { label: 'Active Connections',    value: network.connections,       cls: 'text-white' },
                { label: 'Suspicious IPs Blocked', value: network.suspiciousBlocked, cls: 'text-orange-400' },
                { label: 'Firewall',              value: 'ACTIVE',                  cls: 'text-green-400' },
                { label: 'DNS',                   value: 'SECURE',                  cls: 'text-green-400' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="text-xs">
                  <div className="text-gray-500 mb-0.5">{label}</div>
                  <div className={`font-bold ${cls}`}>{value}</div>
                </div>
              ))}
              <div className="text-xs col-span-2">
                <div className="text-gray-500 mb-0.5">TLS/SSL Certificate</div>
                <div className="text-green-400 font-bold">
                  VALID — {encHealth.certExpiry} days remaining
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* On-Device Security */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <PanelHeader icon={Server} iconColor="text-purple-400" title="On-Device Security" />
          <div className="space-y-3">
            {[
              { icon: HardDrive, label: 'Storage Encryption', active: device.storageEncrypted, onText: 'Enabled',  offText: 'Disabled'  },
              { icon: Shield,    label: 'Memory Protection',  active: device.memoryProtected,  onText: 'Active',   offText: 'Inactive'  },
            ].map(({ icon: Ic, label, active, onText, offText }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-400">
                  <Ic size={12} /> {label}
                </span>
                {active
                  ? <span className="text-green-400 flex items-center gap-1"><CheckCircle size={11} /> {onText}</span>
                  : <span className="text-red-400   flex items-center gap-1"><XCircle     size={11} /> {offText}</span>}
              </div>
            ))}

            {/* Process Integrity */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-400"><Eye size={12} /> Process Integrity</span>
              <div className="flex items-center gap-2">
                <span className={device.processIntegrity === 'clean' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {device.processIntegrity === 'clean' ? 'CLEAN' : 'ALERT'}
                </span>
                <button
                  onClick={() => setDevice(p => ({ ...p, processIntegrity: 'clean' }))}
                  className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 hover:bg-gray-700 transition-colors"
                >
                  Scan
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800 space-y-2.5">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1.5"><Cpu size={11} /> CPU Usage</span>
                  <span>{Math.round(device.cpuUsage)}%</span>
                </div>
                <ProgressBar value={device.cpuUsage} color={device.cpuUsage > 80 ? 'red' : device.cpuUsage > 60 ? 'orange' : 'green'} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1.5"><Database size={11} /> Disk I/O</span>
                  <span>{Math.round(device.diskIO)}%</span>
                </div>
                <ProgressBar value={device.diskIO} color={device.diskIO > 65 ? 'orange' : 'blue'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Vulnerability Scanner + Threat Feed ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Vulnerability Scanner */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <PanelHeader icon={Search} iconColor="text-orange-400" title="Vulnerability Scanner">
            <button
              onClick={runScan}
              disabled={scanning}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 disabled:opacity-40 transition-colors"
            >
              <Zap size={11} /> {scanning ? 'Scanning…' : 'Run Scan'}
            </button>
            <button
              onClick={patchAll}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
            >
              <ShieldCheck size={11} /> Patch All
            </button>
          </PanelHeader>

          {scanning && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Scanning system…</span>
                <span>{Math.round(Math.min(scanProgress, 100))}%</span>
              </div>
              <ProgressBar value={Math.min(scanProgress, 100)} color="orange" />
            </div>
          )}

          <div className="space-y-2">
            {vulns.map(v => (
              <div key={v.id} className="flex items-start gap-3 p-3 bg-gray-800/40 rounded-xl border border-gray-700/40">
                <SeverityBadge severity={v.severity} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-200">{v.name}</div>
                  <div className="text-xs text-gray-500 truncate">{v.description}</div>
                </div>
                <span className={`text-xs shrink-0 font-semibold
                  ${v.status === 'resolved' ? 'text-green-400'
                  : v.status === 'warning'  ? 'text-yellow-400'
                  : 'text-red-400'}`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Threat Feed */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <PanelHeader icon={Activity} iconColor="text-red-400" title="Threat Feed">
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <StatusDot /> Live
            </span>
          </PanelHeader>

          <div className="space-y-2 overflow-y-auto max-h-80 pr-0.5">
            {threats.map(t => (
              <div key={t.id} className="flex items-center gap-2 p-2.5 bg-gray-800/40 rounded-xl border border-gray-700/40 text-xs">
                <SeverityBadge severity={t.severity} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-200">{t.type}</div>
                  <div className="text-gray-500 font-mono">{maskIP(t.ip)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-semibold ${t.status === 'blocked' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {t.status}
                  </div>
                  <div className="text-gray-600">{timeAgo(t.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Audit Log + Encryption Health ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Audit Log */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <PanelHeader icon={FileText} iconColor="text-gray-400" title="Audit Log">
            <span className="text-xs text-gray-600">{auditLog.length} events</span>
          </PanelHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800 text-left">
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Event</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Time</th>
                  <th className="py-2 font-semibold uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditPageData.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/25 transition-colors">
                    <td className="py-2 pr-4 text-gray-300 font-semibold whitespace-nowrap">{entry.event}</td>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap font-mono">{timeAgo(entry.timestamp)}</td>
                    <td className="py-2 text-gray-500 truncate max-w-xs">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
            <span className="text-xs text-gray-600">
              Page {auditPage + 1} of {totalAuditPages} — {auditLog.length} total events
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                disabled={auditPage === 0}
                className="text-xs px-3 py-1 rounded-lg border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >Prev</button>
              <button
                onClick={() => setAuditPage(p => Math.min(totalAuditPages - 1, p + 1))}
                disabled={auditPage >= totalAuditPages - 1}
                className="text-xs px-3 py-1 rounded-lg border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >Next</button>
            </div>
          </div>
        </div>

        {/* Encryption Health */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <PanelHeader icon={Key} iconColor="text-yellow-400" title="Encryption Health" />
          <div className="space-y-5">
            <div>
              <div className="text-xs text-gray-500 mb-1">Algorithm</div>
              <div className="text-sm font-bold text-green-400 font-mono">{encHealth.algorithm}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Next Key Rotation</div>
              <div className={`text-sm font-bold font-mono tabular-nums
                ${encHealth.keyRotationIn < 3600 ? 'text-red-400' : encHealth.keyRotationIn < 86400 ? 'text-orange-400' : 'text-yellow-400'}`}>
                {formatCountdown(encHealth.keyRotationIn)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Certificate Expiry</div>
              <div className={`text-sm font-bold font-mono
                ${encHealth.certExpiry > 30 ? 'text-green-400' : 'text-orange-400'}`}>
                {encHealth.certExpiry} days
              </div>
              <ProgressBar value={encHealth.certExpiry} max={365} color={encHealth.certExpiry > 30 ? 'green' : 'orange'} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Last Key Rotation</div>
              <div className="text-sm text-gray-300 font-mono">{timeAgo(encHealth.lastRotation)}</div>
            </div>
            <div className="pt-3 border-t border-gray-800 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <StatusDot active /> <span className="text-green-400">Encryption Active</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <StatusDot active /> <span className="text-green-400">Key Material Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
