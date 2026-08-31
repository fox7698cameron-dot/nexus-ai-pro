// File: SecurityDashboard.jsx | Created: 2026-08-31 | Nexus AI Pro

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldOff,
  Activity, Wifi, WifiOff, Lock, Unlock, Key, RotateCcw,
  Server, Cpu, HardDrive, MemoryStick, Globe, Terminal,
  AlertTriangle, AlertCircle, Info, CheckCircle2,
  Ban, Plus, Trash2, Eye, EyeOff, Download, RefreshCw,
  Monitor, Smartphone, Laptop, User, Clock, MapPin,
  Network, Zap, Database, FileText, ToggleLeft, ToggleRight,
  ChevronRight, TrendingUp, TrendingDown, X, Search,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY = {
  critical: { label: 'Critical', color: 'bg-red-600 text-white',    border: 'border-red-500',   text: 'text-red-400' },
  high:     { label: 'High',     color: 'bg-orange-500 text-white', border: 'border-orange-500',text: 'text-orange-400' },
  medium:   { label: 'Medium',   color: 'bg-yellow-500 text-black', border: 'border-yellow-500',text: 'text-yellow-400' },
  low:      { label: 'Low',      color: 'bg-blue-500 text-white',   border: 'border-blue-500',  text: 'text-blue-400' },
};

const ATTACK_TYPES = [
  'SQL Injection',     'XSS Attempt',       'Brute Force',
  'DDoS Probe',        'CSRF Attack',        'Path Traversal',
  'Command Injection', 'Port Scan',          'Credential Stuffing',
  'Zero-day Exploit',  'Privilege Escalation','Man-in-the-Middle',
];

const COUNTRIES = ['US', 'CN', 'RU', 'DE', 'BR', 'IN', 'KR', 'FR', 'GB', 'AU'];

const randomIp  = () => `${Math.floor(Math.random()*220+10)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*254+1)}`;
const randomId  = () => Math.random().toString(36).slice(2, 10);
const randomMs  = () => Date.now() - Math.floor(Math.random() * 60_000);
const pickRand  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const severityRand = () => pickRand(['critical','high','medium','low']);

function makeThreat() {
  return {
    id:       randomId(),
    type:     pickRand(ATTACK_TYPES),
    ip:       randomIp(),
    country:  pickRand(COUNTRIES),
    severity: severityRand(),
    blocked:  Math.random() > 0.15,
    ts:       randomMs(),
  };
}

function makeSession() {
  const devices = [
    { icon: Laptop,     label: 'MacBook Pro' },
    { icon: Smartphone, label: 'iPhone 15'   },
    { icon: Monitor,    label: 'Windows PC'  },
    { icon: Laptop,     label: 'Linux Box'   },
  ];
  const d = pickRand(devices);
  return {
    id:       randomId(),
    device:   d.label,
    DevIcon:  d.icon,
    ip:       randomIp(),
    location: `${pickRand(['New York', 'London', 'Tokyo', 'Sydney', 'Berlin'])}, ${pickRand(COUNTRIES)}`,
    started:  randomMs(),
    active:   Math.random() > 0.3,
  };
}

function makeAuditLog() {
  const events = [
    'Login success', 'Login failure', 'Password changed', '2FA enabled',
    'API key rotated', 'Permission updated', 'File accessed', 'Config changed',
    'User created', 'User deleted', 'IP blocked', 'Session terminated',
  ];
  const users = ['admin', 'cameron.fox', 'system', 'api-service', 'moderator'];
  return {
    id:       randomId(),
    event:    pickRand(events),
    user:     pickRand(users),
    severity: severityRand(),
    ts:       randomMs(),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ level }) {
  const s = SEVERITY[level] ?? SEVERITY.low;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>
      {s.label}
    </span>
  );
}

function Card({ title, icon: Icon, children, className = '', action }) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 font-semibold text-sm text-gray-800 dark:text-gray-100">
          {Icon && <Icon size={16} className="text-indigo-500" />}
          {title}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatTile({ label, value, sub, color = 'text-indigo-500', Icon }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        {Icon && <Icon size={13} />}{label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

// Vulnerability score arc gauge
function VulnGauge({ score }) {
  const r = 54, cx = 70, cy = 70;
  const circ = Math.PI * r;
  const pct  = Math.max(0, Math.min(100, score));
  const dash  = (pct / 100) * circ;
  const color = pct < 30 ? '#22c55e' : pct < 60 ? '#eab308' : pct < 80 ? '#f97316' : '#ef4444';
  const label = pct < 30 ? 'Excellent' : pct < 60 ? 'Moderate' : pct < 80 ? 'High Risk' : 'Critical';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={140} height={90} viewBox="0 0 140 90">
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#e5e7eb" strokeWidth={12} strokeLinecap="round"
          className="dark:[stroke:#374151]"
        />
        {/* Fill */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={26} fontWeight="700" fill={color}>{pct}</text>
        <text x={cx} y={cy + 8}  textAnchor="middle" fontSize={11} fill="#6b7280">{label}</text>
      </svg>
      <div className="text-xs text-gray-500 dark:text-gray-400">Vulnerability Score</div>
    </div>
  );
}

// Network topology SVG
function NetworkTopology({ threats }) {
  const nodes = [
    { id: 'fw',  label: 'Firewall', x: 200, y: 100, color: '#6366f1' },
    { id: 'srv', label: 'Server',   x: 200, y: 200, color: '#22c55e' },
    { id: 'db',  label: 'Database', x: 320, y: 200, color: '#3b82f6' },
    { id: 'cdn', label: 'CDN',      x: 80,  y: 200, color: '#f59e0b' },
    { id: 'api', label: 'API GW',   x: 200, y: 300, color: '#8b5cf6' },
  ];
  const links = [
    ['fw','srv'],['srv','db'],['srv','cdn'],['srv','api'],
  ];
  const hasAttack = threats.some(t => !t.blocked && t.severity === 'critical');

  return (
    <svg viewBox="0 0 400 380" className="w-full max-w-xs mx-auto" aria-label="Network topology">
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#9ca3af" />
        </marker>
      </defs>

      {/* External threat nodes */}
      {threats.slice(0, 4).map((t, i) => {
        const angle = (i / 4) * Math.PI + Math.PI / 8;
        const tx = 200 + Math.cos(angle) * 160;
        const ty = 100 + Math.sin(angle) * 80 - 60;
        return (
          <g key={t.id}>
            <line x1={tx} y1={ty} x2={200} y2={100} stroke={t.blocked ? '#9ca3af' : '#ef4444'} strokeWidth={1.5} strokeDasharray="4 2" markerEnd="url(#arr)" />
            <circle cx={tx} cy={ty} r={14} fill={t.blocked ? '#374151' : '#ef444430'} stroke={t.blocked ? '#6b7280' : '#ef4444'} strokeWidth={1.5} />
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={8} fill={t.blocked ? '#9ca3af' : '#ef4444'}>ATK</text>
          </g>
        );
      })}

      {/* Links */}
      {links.map(([a, b]) => {
        const na = nodes.find(n => n.id === a);
        const nb = nodes.find(n => n.id === b);
        return <line key={a+b} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="#4b5563" strokeWidth={1.5} />;
      })}

      {/* Nodes */}
      {nodes.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={22} fill={n.color + '22'} stroke={n.color} strokeWidth={2}
            className={hasAttack && n.id === 'fw' ? 'animate-pulse' : ''} />
          <text x={n.x} y={n.y + 4}  textAnchor="middle" fontSize={9} fontWeight="600" fill={n.color}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

// Progress bar
function ProgressBar({ value, max = 100, color = 'bg-indigo-500' }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecurityDashboard({ userRole = 'admin', onAlert }) {
  const [threats,       setThreats]       = useState(() => Array.from({ length: 8 }, makeThreat));
  const [sessions,      setSessions]      = useState(() => Array.from({ length: 5 }, makeSession));
  const [auditLogs,     setAuditLogs]     = useState(() => Array.from({ length: 8 }, makeAuditLog));
  const [vulnScore,     setVulnScore]     = useState(38);
  const [healthScore,   setHealthScore]   = useState(87);
  const [scanning,      setScanning]      = useState(false);
  const [scanProgress,  setScanProgress]  = useState(0);
  const [twoFAEnabled,  setTwoFAEnabled]  = useState(true);
  const [encryptAlgo]                     = useState('AES-256-GCM');
  const [keyRotation]                     = useState('2026-09-15');
  const [blocklist,     setBlocklist]     = useState(['203.0.113.42', '198.51.100.7', '192.0.2.88']);
  const [newBlockIp,    setNewBlockIp]    = useState('');
  const [portInput,     setPortInput]     = useState('22,80,443,3306,5432');
  const [portResults,   setPortResults]   = useState([]);
  const [pingTarget,    setPingTarget]    = useState('example.com');
  const [pingResult,    setPingResult]    = useState(null);
  const [sslDomain,     setSslDomain]     = useState('example.com');
  const [sslResult,     setSslResult]     = useState(null);
  const [cpuUsage,      setCpuUsage]      = useState(42);
  const [memUsage,      setMemUsage]      = useState(61);
  const [diskUsage,     setDiskUsage]     = useState(73);
  const [alerts,        setAlerts]        = useState([]);
  const tickRef = useRef(null);

  // Simulate live threat feed
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const t = makeThreat();
      setThreats(prev => [t, ...prev].slice(0, 20));
      if (t.severity === 'critical' && !t.blocked) {
        const alert = { id: t.id, msg: `Critical threat from ${t.ip}: ${t.type}`, severity: 'critical' };
        setAlerts(prev => [alert, ...prev].slice(0, 5));
        onAlert?.(alert);
      }
      // Drift system metrics
      setCpuUsage(v  => Math.min(95, Math.max(10, v + (Math.random() - 0.48) * 6)));
      setMemUsage(v  => Math.min(95, Math.max(20, v + (Math.random() - 0.48) * 4)));
      setDiskUsage(v => Math.min(99, Math.max(30, v + (Math.random() - 0.45) * 1)));
    }, 3500);
    return () => clearInterval(tickRef.current);
  }, [onAlert]);

  // Audit log refresh
  useEffect(() => {
    const id = setInterval(() => {
      setAuditLogs(prev => [makeAuditLog(), ...prev].slice(0, 20));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const handleScan = useCallback(() => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);
    const timer = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setScanning(false);
          setVulnScore(Math.floor(Math.random() * 60 + 10));
          setHealthScore(Math.floor(Math.random() * 30 + 65));
          return 100;
        }
        return p + Math.random() * 8;
      });
    }, 200);
  }, [scanning]);

  const handlePortScan = useCallback(() => {
    const ports = portInput.split(',').map(p => parseInt(p.trim(), 10)).filter(Boolean);
    const results = ports.map(port => ({
      port,
      status: Math.random() > 0.55 ? 'open' : 'closed',
      service: { 22:'SSH',80:'HTTP',443:'HTTPS',3306:'MySQL',5432:'PostgreSQL',6379:'Redis',27017:'MongoDB' }[port] ?? 'unknown',
    }));
    setPortResults(results);
  }, [portInput]);

  const handlePing = useCallback(() => {
    const ms = Math.floor(Math.random() * 120 + 8);
    setPingResult({ target: pingTarget, ms, status: ms < 100 ? 'ok' : 'slow' });
  }, [pingTarget]);

  const handleSslCheck = useCallback(() => {
    setSslResult({
      domain: sslDomain,
      valid:  true,
      issuer: 'Let\'s Encrypt Authority X3',
      expires: '2027-01-14',
      grade: pickRand(['A+','A','A','B']),
    });
  }, [sslDomain]);

  const addToBlocklist = () => {
    const ip = newBlockIp.trim();
    if (!ip || blocklist.includes(ip)) return;
    setBlocklist(prev => [ip, ...prev]);
    setNewBlockIp('');
  };

  const removeFromBlocklist = (ip) => setBlocklist(prev => prev.filter(b => b !== ip));

  const fmtTime = (ms) => {
    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  };

  const blockedCount  = threats.filter(t => t.blocked).length;
  const criticalCount = threats.filter(t => t.severity === 'critical').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Security Dashboard</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Real-time threat monitoring &amp; system security</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />Live
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Role: {userRole}</span>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning…' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Scan Progress */}
      {scanning && (
        <div className="rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 p-3">
          <div className="flex justify-between text-xs mb-2 font-medium text-indigo-700 dark:text-indigo-300">
            <span>Security scan in progress…</span>
            <span>{Math.floor(scanProgress)}%</span>
          </div>
          <ProgressBar value={scanProgress} color="bg-indigo-500" />
        </div>
      )}

      {/* Floating Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-red-400 bg-red-50 dark:bg-red-950/40">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <span className="text-xs text-red-700 dark:text-red-300 flex-1">{a.msg}</span>
              <button onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}>
                <X size={13} className="text-red-400 hover:text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Health Score',    value: `${healthScore}%`, sub: 'Overall',   color: healthScore > 70 ? 'text-green-500' : 'text-orange-400', Icon: ShieldCheck },
          { label: 'Threats Blocked', value: blockedCount,      sub: 'Last hour', color: 'text-indigo-500', Icon: ShieldAlert },
          { label: 'Active Sessions', value: sessions.filter(s => s.active).length, sub: 'Live', color: 'text-cyan-500', Icon: Activity },
          { label: 'Critical Threats',value: criticalCount,     sub: 'Detected',  color: criticalCount > 0 ? 'text-red-500' : 'text-green-500', Icon: AlertCircle },
        ].map(t => (
          <div key={t.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
            <StatTile {...t} />
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Threat Feed */}
        <Card
          title="Live Threat Feed"
          icon={Activity}
          className="lg:col-span-2"
          action={<span className="text-xs text-gray-400">{threats.length} events</span>}
        >
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">IP</th>
                  <th className="pb-2 font-medium">Country</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Severity</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {threats.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-1.5 font-mono pr-2">{t.type}</td>
                    <td className="py-1.5 font-mono text-gray-600 dark:text-gray-400">{t.ip}</td>
                    <td className="py-1.5">{t.country}</td>
                    <td className="py-1.5">
                      {t.blocked
                        ? <span className="text-green-500 flex items-center gap-1"><ShieldCheck size={11}/>Blocked</span>
                        : <span className="text-red-500 flex items-center gap-1"><ShieldOff size={11}/>Active</span>}
                    </td>
                    <td className="py-1.5"><SeverityBadge level={t.severity} /></td>
                    <td className="py-1.5 text-gray-400">{fmtTime(t.ts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Vulnerability Gauge + 2FA */}
        <div className="space-y-4">
          <Card title="Vulnerability Score" icon={Shield}>
            <VulnGauge score={vulnScore} />
          </Card>

          {/* 2FA Toggle */}
          <Card title="Two-Factor Auth" icon={Lock}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{twoFAEnabled ? 'Enforced' : 'Disabled'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Require for all users</p>
              </div>
              <button
                onClick={() => setTwoFAEnabled(v => !v)}
                className={`p-1 rounded-full transition-colors ${twoFAEnabled ? 'text-green-500' : 'text-gray-400'}`}
              >
                {twoFAEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Network Topology + Encryption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Network Topology" icon={Network}>
          <NetworkTopology threats={threats} />
        </Card>

        <div className="space-y-4">
          {/* Encryption Status */}
          <Card title="Encryption Status" icon={Key}>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Algorithm',       value: encryptAlgo,       icon: Lock },
                { label: 'Key Rotation',    value: keyRotation,       icon: RotateCcw },
                { label: 'TLS Version',     value: 'TLS 1.3',         icon: ShieldCheck },
                { label: 'Cert Status',     value: 'Valid (87 days)', icon: CheckCircle2 },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <r.icon size={13} />
                    <span className="text-xs">{r.label}</span>
                  </div>
                  <span className="text-xs font-mono font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* On-Device Anomalies */}
          <Card title="System Anomalies" icon={Cpu}>
            <div className="space-y-3">
              {[
                { label: 'CPU',    value: cpuUsage,  color: cpuUsage  > 80 ? 'bg-red-500' : 'bg-indigo-500', Icon: Cpu },
                { label: 'Memory', value: memUsage,  color: memUsage  > 80 ? 'bg-red-500' : 'bg-purple-500', Icon: MemoryStick },
                { label: 'Disk',   value: diskUsage, color: diskUsage > 85 ? 'bg-red-500' : 'bg-cyan-500',   Icon: HardDrive },
              ].map(m => (
                <div key={m.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><m.Icon size={12}/>{m.label}</span>
                    <span className={`font-semibold ${m.value > 80 ? 'text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {Math.floor(m.value)}%
                    </span>
                  </div>
                  <ProgressBar value={m.value} color={m.color} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Network Scan Panel */}
      <Card title="Network Scan Tools" icon={Globe}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Port Scanner */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Port Scanner</p>
            <input
              value={portInput}
              onChange={e => setPortInput(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono"
              placeholder="22,80,443,3306"
            />
            <button onClick={handlePortScan} className="w-full py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold transition-colors">
              Scan Ports
            </button>
            {portResults.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-auto">
                {portResults.map(r => (
                  <div key={r.port} className="flex items-center justify-between text-xs py-0.5">
                    <span className="font-mono">{r.port}/{r.service}</span>
                    <span className={r.status === 'open' ? 'text-green-500' : 'text-gray-400'}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ping Test */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Ping Test</p>
            <input
              value={pingTarget}
              onChange={e => setPingTarget(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono"
              placeholder="hostname or IP"
            />
            <button onClick={handlePing} className="w-full py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded font-semibold transition-colors">
              Ping
            </button>
            {pingResult && (
              <div className="text-xs space-y-1 bg-gray-50 dark:bg-gray-700/50 rounded p-2 font-mono">
                <div>Target: {pingResult.target}</div>
                <div className={pingResult.status === 'ok' ? 'text-green-500' : 'text-yellow-400'}>
                  {pingResult.ms}ms — {pingResult.status === 'ok' ? 'Reachable' : 'Slow'}
                </div>
              </div>
            )}
          </div>

          {/* SSL Checker */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">SSL Cert Checker</p>
            <input
              value={sslDomain}
              onChange={e => setSslDomain(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono"
              placeholder="domain.com"
            />
            <button onClick={handleSslCheck} className="w-full py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors">
              Check SSL
            </button>
            {sslResult && (
              <div className="text-xs space-y-1 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <div className="flex justify-between"><span className="text-gray-400">Grade</span><span className="font-bold text-green-500">{sslResult.grade}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Expires</span><span>{sslResult.expires}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Issuer</span><span className="truncate ml-2 text-right max-w-[120px]">{sslResult.issuer}</span></div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      <Card title="Active Sessions" icon={Monitor} action={
        <span className="text-xs text-gray-400">{sessions.filter(s => s.active).length} live</span>
      }>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700 text-left">
                <th className="pb-2 font-medium">Device</th>
                <th className="pb-2 font-medium">IP Address</th>
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2 font-medium">Started</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <s.DevIcon size={13} className="text-indigo-400 shrink-0" />
                      {s.device}
                    </div>
                  </td>
                  <td className="py-2 font-mono text-gray-600 dark:text-gray-400">{s.ip}</td>
                  <td className="py-2 flex items-center gap-1"><MapPin size={11} className="text-gray-400" />{s.location}</td>
                  <td className="py-2 text-gray-400">{fmtTime(s.started)}</td>
                  <td className="py-2">
                    {s.active
                      ? <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Active</span>
                      : <span className="text-gray-400">Idle</span>}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Terminate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Logs + IP Blocklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Audit Logs" icon={FileText}>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700 text-left">
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Severity</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-1.5">{l.event}</td>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400">{l.user}</td>
                    <td className="py-1.5"><SeverityBadge level={l.severity} /></td>
                    <td className="py-1.5 text-gray-400">{fmtTime(l.ts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="IP Blocklist" icon={Ban}>
          <div className="flex gap-2 mb-3">
            <input
              value={newBlockIp}
              onChange={e => setNewBlockIp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addToBlocklist()}
              placeholder="Enter IP to block"
              className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono"
            />
            <button
              onClick={addToBlocklist}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-semibold"
            >
              <Plus size={12} />Block
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-auto">
            {blocklist.map(ip => (
              <div key={ip} className="flex items-center justify-between text-xs py-1 px-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded">
                <span className="font-mono text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <Ban size={11} />{ip}
                </span>
                <button onClick={() => removeFromBlocklist(ip)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
