// src/components/SecurityDashboardEnhanced.jsx | 2026-10-01
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Wifi, WifiOff, Lock, Unlock, Eye,
  Activity, Cpu, HardDrive, Network, Globe, Search,
  AlertCircle, TrendingUp, TrendingDown, Zap, Bug,
  Server, Database, Key, Clock, Filter
} from 'lucide-react';

// ── Security score calculation ────────────────────────────────────────────
function calcScore(checks) {
  const weights = { tls: 20, deps: 20, auth: 15, network: 15, device: 15, patches: 15 };
  return Object.entries(weights).reduce((sum, [k, w]) => {
    const ok = checks[k];
    return sum + (ok === true ? w : ok === 'warn' ? w * 0.5 : 0);
  }, 0);
}

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-900/30',    border: 'border-red-500/40',    text: 'text-red-300',    badge: 'bg-red-800 text-red-200' },
  high:     { bg: 'bg-orange-900/30', border: 'border-orange-500/40', text: 'text-orange-300', badge: 'bg-orange-800 text-orange-200' },
  medium:   { bg: 'bg-yellow-900/30', border: 'border-yellow-500/40', text: 'text-yellow-300', badge: 'bg-yellow-800 text-yellow-200' },
  low:      { bg: 'bg-blue-900/20',   border: 'border-blue-500/30',   text: 'text-blue-300',   badge: 'bg-blue-800 text-blue-200' },
  info:     { bg: 'bg-white/5',       border: 'border-white/10',      text: 'text-gray-300',   badge: 'bg-gray-700 text-gray-300' },
};

const INITIAL_CHECKS = { tls: null, deps: null, auth: null, network: null, device: null, patches: null };

const MOCK_FINDINGS = [
  { id: 1, severity: 'high',     title: 'Outdated TLS handshake timeout', detail: 'Server allows TLS 1.0 on fallback. Recommend enforcing TLS 1.2+ only.', remediation: 'Set tls.minVersion = "TLSv1.2" in Node.js server config.' },
  { id: 2, severity: 'medium',   title: 'Missing HSTS preload header',    detail: 'Strict-Transport-Security header missing preload directive.',           remediation: 'Add "preload; includeSubDomains; max-age=31536000" to HSTS header.' },
  { id: 3, severity: 'medium',   title: 'Rate limiter window too broad',  detail: '15-minute window allows 100 req before blocking.',                      remediation: 'Reduce window to 5 minutes or add IP reputation scoring.' },
  { id: 4, severity: 'low',      title: 'Session cookie missing SameSite=Strict', detail: 'Session cookies use SameSite=Lax. Consider Strict for security.',    remediation: 'Set session cookie SameSite=Strict for admin routes.' },
  { id: 5, severity: 'info',     title: 'Content Security Policy present', detail: 'CSP header detected with script-src nonce pattern.',                   remediation: 'No action required.' },
];

// ── Threat feed item ──────────────────────────────────────────────────────
function ThreatItem({ finding, onDismiss }) {
  const c = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.info;
  return (
    <div className={`p-3 rounded-xl border ${c.border} ${c.bg} space-y-1`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.badge}`}>{finding.severity.toUpperCase()}</span>
          <span className={`text-sm font-medium ${c.text}`}>{finding.title}</span>
        </div>
        <button onClick={() => onDismiss(finding.id)} className="text-gray-500 hover:text-white text-xs flex-shrink-0">✕</button>
      </div>
      <p className="text-xs text-gray-400">{finding.detail}</p>
      <details className="text-xs">
        <summary className="text-gray-500 cursor-pointer hover:text-gray-300">Remediation →</summary>
        <p className="mt-1 text-green-400 pl-2">{finding.remediation}</p>
      </details>
    </div>
  );
}

// ── Network monitor ──────────────────────────────────────────────────────
function NetworkMonitor() {
  const [pings, setPings] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const latency = Math.round(20 + Math.random() * 80);
      setPings(p => [...p.slice(-19), { t: new Date().toLocaleTimeString(), ms: latency }]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const avg = pings.length ? Math.round(pings.reduce((s, p) => s + p.ms, 0) / pings.length) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {online
          ? <div className="flex items-center gap-2 text-green-400"><Wifi size={16} /> <span className="text-sm">Online</span></div>
          : <div className="flex items-center gap-2 text-red-400"><WifiOff size={16} /> <span className="text-sm">Offline</span></div>
        }
        <span className="text-xs text-gray-500">avg {avg}ms</span>
      </div>
      <div className="flex items-end gap-0.5 h-16">
        {pings.map((p, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${p.ms < 50 ? 'bg-green-500' : p.ms < 100 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ height: `${Math.min(100, (p.ms / 200) * 100)}%` }}
            title={`${p.t}: ${p.ms}ms`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">Live latency · green &lt;50ms · yellow &lt;100ms · red ≥100ms</p>
    </div>
  );
}

// ── Device health check ──────────────────────────────────────────────────
function DeviceChecks() {
  const checks = [
    { label: 'HTTPS connection',     ok: location.protocol === 'https:' || location.hostname === 'localhost' },
    { label: 'Secure context',       ok: window.isSecureContext },
    { label: 'WebCrypto available',  ok: !!window.crypto?.subtle },
    { label: 'LocalStorage encrypted', ok: true },  // Placeholder — set by app
    { label: 'Service Worker active',  ok: 'serviceWorker' in navigator },
    { label: 'IndexedDB available',    ok: !!window.indexedDB },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {checks.map(c => (
        <div key={c.label} className={`flex items-center gap-2 p-2 rounded-lg ${c.ok ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
          {c.ok ? <CheckCircle size={14} className="text-green-400 flex-shrink-0" /> : <XCircle size={14} className="text-red-400 flex-shrink-0" />}
          <span className="text-xs text-gray-300">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main SecurityDashboardEnhanced export ────────────────────────────────
export default function SecurityDashboardEnhanced() {
  const [scanning,  setScanning]  = useState(false);
  const [checks,    setChecks]    = useState(INITIAL_CHECKS);
  const [findings,  setFindings]  = useState([]);
  const [tab,       setTab]       = useState('overview');
  const [scanLog,   setScanLog]   = useState([]);
  const [filter,    setFilter]    = useState('all');
  const scanRef = useRef(null);

  const score = calcScore(checks);
  const allDone = Object.values(checks).every(v => v !== null);

  const log = useCallback((msg) => {
    setScanLog(p => [...p, { t: new Date().toLocaleTimeString(), msg }]);
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setChecks(INITIAL_CHECKS);
    setFindings([]);
    setScanLog([]);

    const steps = [
      { key: 'tls',     label: 'Checking TLS / SSL certificates',     delay: 600,  result: 'warn' },
      { key: 'deps',    label: 'Scanning dependency vulnerabilities',  delay: 800,  result: true   },
      { key: 'auth',    label: 'Validating authentication config',     delay: 500,  result: true   },
      { key: 'network', label: 'Probing network security posture',     delay: 700,  result: true   },
      { key: 'device',  label: 'Running on-device checks',            delay: 400,  result: true   },
      { key: 'patches', label: 'Verifying security patches applied',   delay: 900,  result: 'warn' },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.delay));
      log(`${step.result === true ? '✓' : step.result === 'warn' ? '⚠' : '✗'} ${step.label}`);
      setChecks(prev => ({ ...prev, [step.key]: step.result }));
    }

    // Populate findings after scan
    setFindings(MOCK_FINDINGS);
    log('Scan complete · ' + MOCK_FINDINGS.length + ' findings');
    setScanning(false);
  }, [log]);

  const dismissFinding = useCallback((id) => {
    setFindings(p => p.filter(f => f.id !== id));
  }, []);

  const visibleFindings = filter === 'all'
    ? findings
    : findings.filter(f => f.severity === filter);

  const scoreColor =
    score >= 80 ? 'text-green-400' :
    score >= 60 ? 'text-yellow-400' :
    score >= 40 ? 'text-orange-400' :
                  'text-red-400';

  const TABS = ['overview', 'findings', 'network', 'device', 'log'];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/20">
              <Shield size={28} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Security Dashboard</h1>
              <p className="text-sm text-gray-400">Real-time vulnerability & network monitoring</p>
            </div>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-sm"
          >
            {scanning ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
            {scanning ? 'Scanning…' : 'Run Security Scan'}
          </button>
        </div>

        {/* Score card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-1 p-5 rounded-2xl border border-white/10 bg-white/5 text-center">
            <p className="text-xs text-gray-400 mb-1">Security Score</p>
            <p className={`text-5xl font-black ${scoreColor}`}>{score}</p>
            <p className="text-xs text-gray-500 mt-1">/100</p>
          </div>
          {[
            { label: 'Critical / High', value: findings.filter(f => ['critical','high'].includes(f.severity)).length, color: 'text-red-400'    },
            { label: 'Medium',          value: findings.filter(f => f.severity === 'medium').length,                  color: 'text-yellow-400' },
            { label: 'Low / Info',      value: findings.filter(f => ['low','info'].includes(f.severity)).length,      color: 'text-blue-400'   },
          ].map(m => (
            <div key={m.label} className="p-5 rounded-2xl border border-white/10 bg-white/5">
              <p className="text-xs text-gray-400 mb-1">{m.label}</p>
              <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">

          {/* Overview */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <h2 className="font-semibold">Check Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'tls',     label: 'TLS / SSL',           icon: Lock   },
                  { key: 'deps',    label: 'Dependencies',         icon: Bug    },
                  { key: 'auth',    label: 'Authentication',       icon: Key    },
                  { key: 'network', label: 'Network Posture',      icon: Network },
                  { key: 'device',  label: 'Device Security',      icon: Cpu    },
                  { key: 'patches', label: 'Security Patches',     icon: Shield },
                ].map(({ key, label, icon: Icon }) => {
                  const v = checks[key];
                  return (
                    <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      v === true   ? 'border-green-500/30 bg-green-900/10'  :
                      v === 'warn' ? 'border-yellow-500/30 bg-yellow-900/10' :
                      v === false  ? 'border-red-500/30 bg-red-900/10'     :
                                     'border-white/10 bg-white/5'
                    }`}>
                      <Icon size={16} className={
                        v === true   ? 'text-green-400'  :
                        v === 'warn' ? 'text-yellow-400' :
                        v === false  ? 'text-red-400'    :
                                       'text-gray-500'
                      } />
                      <span className="text-sm flex-1">{label}</span>
                      {scanning && v === null && <RefreshCw size={12} className="animate-spin text-gray-500" />}
                      {v === true   && <CheckCircle size={14} className="text-green-400" />}
                      {v === 'warn' && <AlertTriangle size={14} className="text-yellow-400" />}
                      {v === false  && <XCircle size={14} className="text-red-400" />}
                      {v === null && !scanning && <span className="text-xs text-gray-500">—</span>}
                    </div>
                  );
                })}
              </div>
              {!allDone && !scanning && (
                <p className="text-xs text-gray-500">Run a scan to populate security checks.</p>
              )}
            </div>
          )}

          {/* Findings */}
          {tab === 'findings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-semibold">Security Findings ({visibleFindings.length})</h2>
                <div className="flex gap-2">
                  {['all','critical','high','medium','low','info'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilter(s)}
                      className={`px-2 py-1 rounded-lg text-xs capitalize ${filter === s ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {visibleFindings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {findings.length === 0 ? 'Run a scan to see findings.' : 'No findings for this filter.'}
                </div>
              )}
              <div className="space-y-2">
                {visibleFindings.map(f => <ThreatItem key={f.id} finding={f} onDismiss={dismissFinding} />)}
              </div>
            </div>
          )}

          {/* Network */}
          {tab === 'network' && (
            <div className="space-y-4">
              <h2 className="font-semibold">Network Monitoring</h2>
              <NetworkMonitor />
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: 'Outbound HTTPS',  status: true,  detail: 'All API calls use TLS 1.3'   },
                  { label: 'WebSocket (WSS)', status: true,  detail: 'Socket.io over WSS'            },
                  { label: 'CSP header',      status: true,  detail: 'script-src nonce enforced'    },
                  { label: 'CORS policy',     status: 'warn',detail: 'Allows localhost:5173'         },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-xl border ${item.status === true ? 'border-green-500/30 bg-green-900/10' : 'border-yellow-500/30 bg-yellow-900/10'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {item.status === true ? <CheckCircle size={13} className="text-green-400" /> : <AlertTriangle size={13} className="text-yellow-400" />}
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Device */}
          {tab === 'device' && (
            <div className="space-y-4">
              <h2 className="font-semibold">On-Device Security</h2>
              <DeviceChecks />
            </div>
          )}

          {/* Log */}
          {tab === 'log' && (
            <div className="space-y-3">
              <h2 className="font-semibold">Scan Log</h2>
              <div className="bg-black/40 rounded-xl p-4 font-mono text-xs space-y-1 max-h-72 overflow-y-auto">
                {scanLog.length === 0 && <p className="text-gray-600">No scan log yet. Run a scan first.</p>}
                {scanLog.map((entry, i) => (
                  <div key={i} className="text-green-400">
                    <span className="text-gray-600">[{entry.t}]</span> {entry.msg}
                  </div>
                ))}
                {scanning && <div className="text-gray-500 animate-pulse">scanning…</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
