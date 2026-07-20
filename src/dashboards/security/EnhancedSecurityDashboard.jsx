// 2026-07-20
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, AlertTriangle, Wifi, Cpu, HardDrive, MemoryStick,
  Activity, Search, Zap, Globe, X, ChevronRight, RefreshCw,
  Lock, Eye, Terminal, Bell, CheckCircle, Clock, XCircle,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────
const API_BASE = '/api/security';

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-900/40',    border: 'border-red-500',    text: 'text-red-400',    badge: 'bg-red-500' },
  high:     { bg: 'bg-orange-900/40', border: 'border-orange-500', text: 'text-orange-400', badge: 'bg-orange-500' },
  medium:   { bg: 'bg-yellow-900/40', border: 'border-yellow-600', text: 'text-yellow-400', badge: 'bg-yellow-500' },
  low:      { bg: 'bg-blue-900/40',   border: 'border-blue-500',   text: 'text-blue-400',   badge: 'bg-blue-500' },
};

const MOCK_LOG_LINES = [
  '[INFO]  Security scan initiated — full system',
  '[OK]    Firewall rules loaded (47 active rules)',
  '[WARN]  Unusual CPU spike on PID 9812 (88%)',
  '[INFO]  Checking CVE database — 2026-07 feed',
  '[OK]    AES-256-GCM encryption layer active',
  '[ALERT] Outbound connection to 198.51.100.42:8080 flagged',
  '[INFO]  Memory integrity check passed',
  '[OK]    Auth tokens validated — all sessions secure',
  '[WARN]  TLS 1.1 negotiation attempt rejected from 203.0.113.7',
  '[INFO]  Process list scanned — 214 processes audited',
  '[ALERT] Brute-force attempt detected on SSH (23 tries)',
  '[OK]    Rate-limiter blocked 198.51.100.42 after threshold',
  '[INFO]  Disk hashes verified — no tampering detected',
  '[OK]    Audit log integrity hash: verified',
];

const MOCK_CVE = [
  { id: 'CVE-2026-1001', cvss: 9.8, summary: 'RCE in popular HTTP parser', published: '2026-07-19' },
  { id: 'CVE-2026-1042', cvss: 7.5, summary: 'Privilege escalation via systemd symlink race', published: '2026-07-18' },
  { id: 'CVE-2026-0987', cvss: 6.5, summary: 'Info disclosure in OpenSSL cert parsing', published: '2026-07-17' },
  { id: 'CVE-2025-9812', cvss: 8.1, summary: 'SQL injection in popular ORM library', published: '2026-07-16' },
  { id: 'CVE-2025-8741', cvss: 5.3, summary: 'XSS in widely-used UI toolkit', published: '2026-07-15' },
];

// ── Animated Security Score Gauge ─────────────────────────────────────────
function ScoreGauge({ score }) {
  const radius    = 70;
  const stroke    = 10;
  const normalised = score / 100;
  const circ      = 2 * Math.PI * radius;
  const dash      = normalised * circ * 0.75; // 270° arc
  const color     = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="180" height="130" viewBox="0 0 180 130">
        {/* Track */}
        <circle
          cx="90" cy="95" r={radius} fill="none"
          stroke="#1f2937" strokeWidth={stroke}
          strokeDasharray={`${circ * 0.75} ${circ}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-225 90 95)"
        />
        {/* Value */}
        <circle
          cx="90" cy="95" r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-225 90 95)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="90" y="88" textAnchor="middle" fontSize="32" fontWeight="bold" fill={color}>{score}</text>
        <text x="90" y="108" textAnchor="middle" fontSize="11" fill="#9ca3af">SECURITY SCORE</text>
      </svg>
      <span className="text-xs font-medium" style={{ color }}>
        {score >= 80 ? 'Secure' : score >= 60 ? 'At Risk' : 'Critical'}
      </span>
    </div>
  );
}

// ── Network Topology (SVG) ────────────────────────────────────────────────
function NetworkTopology({ threats }) {
  const nodes = [
    { id: 'server', x: 180, y: 100, label: 'Server', icon: '🖥️', safe: true },
    { id: 'fw',     x: 180, y: 220, label: 'Firewall', icon: '🛡️', safe: true },
    { id: 'us',     x: 60,  y: 220, label: 'US Cloud', icon: '☁️', safe: true },
    { id: 'ru',     x: 310, y: 260, label: 'RU:8080', icon: '⚠️', safe: false },
    { id: 'cn',     x: 310, y: 190, label: 'CN:22',   icon: '🚨', safe: false },
    { id: 'cdn',    x: 60,  y: 100, label: 'CDN',      icon: '🌐', safe: true },
  ];
  const edges = [
    ['cdn', 'server'], ['server', 'fw'], ['fw', 'us'], ['fw', 'ru'], ['fw', 'cn'],
  ];

  return (
    <svg viewBox="0 0 380 340" className="w-full h-48 md:h-64">
      {edges.map(([a, b], i) => {
        const na = nodes.find(n => n.id === a);
        const nb = nodes.find(n => n.id === b);
        const unsafe = !na.safe || !nb.safe;
        return (
          <line key={i}
            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={unsafe ? '#ef4444' : '#4f46e5'} strokeWidth={unsafe ? 2 : 1.5}
            strokeDasharray={unsafe ? '6 3' : 'none'} opacity={0.7}
          />
        );
      })}
      {nodes.map(n => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
          <circle r="22" fill={n.safe ? '#1e1b4b' : '#450a0a'} stroke={n.safe ? '#4f46e5' : '#ef4444'} strokeWidth="2" />
          <text y="5"  textAnchor="middle" fontSize="14">{n.icon}</text>
          <text y="36" textAnchor="middle" fontSize="9" fill={n.safe ? '#a5b4fc' : '#fca5a5'}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Scrolling Log Console ─────────────────────────────────────────────────
function LogConsole({ lines }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div ref={ref} className="bg-black rounded-lg p-3 h-36 overflow-y-auto font-mono text-xs leading-5 border border-gray-700">
      {lines.map((line, i) => {
        const color = line.includes('[ALERT]') ? 'text-red-400'
          : line.includes('[WARN]') ? 'text-yellow-400'
          : line.includes('[OK]') ? 'text-green-400'
          : 'text-gray-400';
        return <div key={i} className={color}>{line}</div>;
      })}
    </div>
  );
}

// ── Device Metric Bar ─────────────────────────────────────────────────────
function MetricBar({ label, pct, icon: Icon }) {
  const color = pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-yellow-500' : 'bg-indigo-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-400 flex items-center gap-1"><Icon size={12} />{label}</span>
        <span className={pct > 85 ? 'text-red-400' : 'text-gray-300'}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function EnhancedSecurityDashboard() {
  const [score,       setScore]       = useState(85);
  const [threats,     setThreats]     = useState([]);
  const [devices,     setDevices]     = useState(null);
  const [scanning,    setScanning]    = useState(false);
  const [scanType,    setScanType]    = useState(null);
  const [scanPct,     setScanPct]     = useState(0);
  const [logLines,    setLogLines]    = useState([MOCK_LOG_LINES[0]]);
  const [alerts,      setAlerts]      = useState([]);
  const [tab,         setTab]         = useState('overview'); // overview | cve | network | devices

  // ── Data fetching ────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/dashboard`);
      const d = await r.json();
      setScore(d.securityScore ?? 85);
      setThreats(d.activeThreats ?? []);
    } catch { /* use mock data */ }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/devices`);
      const d = await r.json();
      setDevices(d);
    } catch {
      setDevices({ cpu: { usagePct: 34 }, memory: { usagePct: 58 }, disk: { usagePct: 42 } });
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/alerts`);
      const d = await r.json();
      setAlerts(d.alerts ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchDevices();
    fetchAlerts();
    const t = setInterval(() => { fetchDashboard(); fetchDevices(); }, 10000);
    return () => clearInterval(t);
  }, [fetchDashboard, fetchDevices]);

  // ── Log stream simulation ─────────────────────────────────────────────
  useEffect(() => {
    let idx = 1;
    const t = setInterval(() => {
      setLogLines(prev => {
        const next = [...prev, MOCK_LOG_LINES[idx % MOCK_LOG_LINES.length]];
        return next.slice(-80);
      });
      idx++;
    }, 2200);
    return () => clearInterval(t);
  }, []);

  // ── Scan polling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!scanning) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/scan/status`);
        const d = await r.json();
        setScanPct(d.progress ?? 0);
        if (d.status === 'completed') { setScanning(false); setScanPct(0); fetchDashboard(); fetchAlerts(); }
      } catch { /* silent */ }
    }, 800);
    return () => clearInterval(t);
  }, [scanning, fetchDashboard, fetchAlerts]);

  const startScan = async (type) => {
    setScanning(true);
    setScanType(type);
    setScanPct(0);
    try {
      await fetch(`${API_BASE}/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
    } catch { setScanning(false); }
  };

  const dismissThreat = async (id) => {
    try {
      await fetch(`${API_BASE}/threats/${id}/dismiss`, { method: 'POST' });
      setThreats(prev => prev.filter(t => t.id !== id));
    } catch { setThreats(prev => prev.filter(t => t.id !== id)); }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-xl border border-indigo-500/30">
            <Shield size={24} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
            <p className="text-xs text-gray-500">Real-time threat monitoring · AES-256-GCM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-900/40 border border-red-500/50 rounded-full text-xs text-red-400">
              <Bell size={12} />{alerts.length} alert{alerts.length !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={fetchDashboard} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800/60 p-1 rounded-xl w-fit">
        {[['overview','Overview'],['cve','CVE Feed'],['network','Network'],['devices','Devices']].map(([k,v]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {v}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Score + Scan controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5 flex flex-col items-center gap-3">
              <ScoreGauge score={score} />
              {scanning ? (
                <div className="w-full space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span className="capitalize">{scanType} scan running…</span>
                    <span>{scanPct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${scanPct}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap justify-center">
                  {[['quick','Quick'],['deep','Deep'],['network','Network']].map(([t, l]) => (
                    <button key={t} onClick={() => startScan(t)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 transition">
                      <Search size={11} />{l} Scan
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Threats',    val: threats.length, icon: AlertTriangle, color: 'text-red-400' },
                { label: 'Encrypted',  val: 'AES-256',      icon: Lock,          color: 'text-green-400' },
                { label: 'Firewall',   val: 'Active',        icon: Shield,        color: 'text-indigo-400' },
                { label: 'Monitoring', val: 'Live',          icon: Eye,           color: 'text-purple-400' },
              ].map(({ label, val, icon: Icon, color }) => (
                <div key={label} className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 flex flex-col gap-1">
                  <Icon size={16} className={color} />
                  <div className="text-lg font-bold text-white">{val}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Threats + Network Topology */}
          <div className="lg:col-span-2 space-y-4">
            {/* Active Threats */}
            <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
              <h2 className="font-semibold text-sm text-gray-300 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" /> Active Threats
              </h2>
              {threats.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle size={16} /> No active threats detected
                </div>
              ) : (
                <div className="space-y-2">
                  {threats.map(t => {
                    const c = SEVERITY_COLORS[t.severity] || SEVERITY_COLORS.low;
                    return (
                      <div key={t.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${c.bg} ${c.border}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${c.badge}`}>{t.severity}</span>
                            <span className="text-sm text-gray-200 truncate">{t.type}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">src: {t.source}</div>
                        </div>
                        <button onClick={() => dismissThreat(t.id)}
                          className="shrink-0 p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition">
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Network Topology */}
            <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
              <h2 className="font-semibold text-sm text-gray-300 mb-3 flex items-center gap-2">
                <Globe size={14} className="text-indigo-400" /> Network Topology
              </h2>
              <NetworkTopology threats={threats} />
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" /> Safe connection</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block border-dashed" style={{borderTop:'1px dashed #ef4444'}} /> Flagged connection</span>
              </div>
            </div>
          </div>

          {/* Log Console (full width) */}
          <div className="lg:col-span-3 bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
            <h2 className="font-semibold text-sm text-gray-300 mb-3 flex items-center gap-2">
              <Terminal size={14} className="text-green-400" /> Live Security Log
            </h2>
            <LogConsole lines={logLines} />
          </div>
        </div>
      )}

      {/* ── CVE Feed Tab ── */}
      {tab === 'cve' && (
        <div className="space-y-3">
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
            <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" /> Recent CVE Feed
            </h2>
            <div className="space-y-3">
              {MOCK_CVE.map(cve => {
                const sev = cve.cvss >= 9 ? 'critical' : cve.cvss >= 7 ? 'high' : cve.cvss >= 4 ? 'medium' : 'low';
                const c   = SEVERITY_COLORS[sev];
                return (
                  <div key={cve.id} className={`flex items-start gap-4 p-4 rounded-xl border ${c.bg} ${c.border}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <code className="text-xs font-mono text-indigo-300">{cve.id}</code>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${c.badge}`}>{sev}</span>
                        <span className={`text-xs font-bold ${c.text}`}>CVSS {cve.cvss}</span>
                      </div>
                      <p className="text-sm text-gray-200">{cve.summary}</p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock size={10} /> Published {cve.published}</p>
                    </div>
                    <button className="shrink-0 px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1">
                      <ChevronRight size={11} /> Review
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Network Tab ── */}
      {tab === 'network' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
          <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
            <Wifi size={14} className="text-indigo-400" /> Network Overview
          </h2>
          <NetworkTopology threats={threats} />
        </div>
      )}

      {/* ── Devices Tab ── */}
      {tab === 'devices' && devices && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
              <Activity size={14} className="text-green-400" /> On-Device Metrics
            </h2>
            <MetricBar label="CPU Usage"    pct={devices.cpu?.usagePct    ?? 34} icon={Cpu}        />
            <MetricBar label="Memory Usage" pct={devices.memory?.usagePct ?? 58} icon={MemoryStick}/>
            <MetricBar label="Disk Usage"   pct={devices.disk?.usagePct   ?? 42} icon={HardDrive}  />
          </div>
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
            <h2 className="font-semibold text-sm text-gray-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" /> Suspicious Processes
            </h2>
            {(devices.suspiciousProcesses ?? []).length === 0 ? (
              <p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle size={14} /> No suspicious processes</p>
            ) : (
              <div className="space-y-2">
                {(devices.suspiciousProcesses ?? []).map((p, i) => (
                  <div key={i} className="p-3 rounded-xl bg-red-900/30 border border-red-500/40">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-mono">{p.name}</span>
                      <span className="text-red-400">{p.cpuPct}% CPU</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">PID {p.pid} · {p.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
