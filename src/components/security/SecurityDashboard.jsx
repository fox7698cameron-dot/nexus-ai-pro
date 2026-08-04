// SecurityDashboard.jsx
// Date: 2026-08-04
// Comprehensive security dashboard for Nexus AI Pro

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Key,
  Activity,
  Network,
  Cpu,
  Eye,
  RefreshCw,
  Download,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants / mock data
// ---------------------------------------------------------------------------

const TABS = ['Overview', 'Network', 'Device', 'Threats', 'Encryption', 'Audit Log'];

const THREAT_CATEGORIES = [
  { id: 'malware',    label: 'Malware',       blocked: 47,  severity: 'critical' },
  { id: 'injection',  label: 'SQL Injection',  blocked: 193, severity: 'high'     },
  { id: 'xss',        label: 'XSS Attacks',    blocked: 312, severity: 'high'     },
  { id: 'csrf',       label: 'CSRF Attempts',  blocked: 88,  severity: 'medium'   },
  { id: 'brute',      label: 'Brute Force',    blocked: 521, severity: 'medium'   },
  { id: 'ddos',       label: 'DDoS Signals',   blocked: 14,  severity: 'critical' },
];

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-900',    text: 'text-red-300',    dot: 'bg-red-400'    },
  high:     { bg: 'bg-orange-900', text: 'text-orange-300', dot: 'bg-orange-400' },
  medium:   { bg: 'bg-yellow-900', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  low:      { bg: 'bg-green-900',  text: 'text-green-300',  dot: 'bg-green-400'  },
};

const DEFAULT_AUDIT = [
  { ts: '2026-08-04 09:42:11', event: 'Login',         user: 'admin@nexus.ai',  ip: '192.168.1.10',  severity: 'low'      },
  { ts: '2026-08-04 09:38:55', event: 'Key Rotation',  user: 'system',          ip: '127.0.0.1',     severity: 'medium'   },
  { ts: '2026-08-04 09:15:02', event: 'Brute Force',   user: 'unknown',         ip: '45.33.32.156',  severity: 'high'     },
  { ts: '2026-08-04 08:59:44', event: 'Scan Complete', user: 'system',          ip: '127.0.0.1',     severity: 'low'      },
  { ts: '2026-08-04 08:44:20', event: 'XSS Blocked',   user: 'unknown',         ip: '103.21.244.0',  severity: 'high'     },
  { ts: '2026-08-04 07:30:01', event: 'Login',         user: 'dev@nexus.ai',    ip: '10.0.0.4',      severity: 'low'      },
  { ts: '2026-08-04 06:12:33', event: 'Cert Renewed',  user: 'system',          ip: '127.0.0.1',     severity: 'medium'   },
];

const ACTIVE_CONNECTIONS = [
  { host: 'api.nexus.ai',       port: 443,  protocol: 'HTTPS', status: 'trusted'    },
  { host: '192.168.1.1',        port: 80,   protocol: 'HTTP',  status: 'trusted'    },
  { host: '45.33.32.156',       port: 22,   protocol: 'SSH',   status: 'suspicious' },
  { host: 'cdn.cloudflare.com', port: 443,  protocol: 'HTTPS', status: 'trusted'    },
  { host: '103.21.244.0',       port: 8080, protocol: 'HTTP',  status: 'suspicious' },
];

const DNS_QUERIES = [
  'api.nexus.ai', 'fonts.googleapis.com', 'cdn.cloudflare.com',
  'malicious-domain.ru', 'tracker.ad-net.io',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusDot({ ok, size = 2 }) {
  return (
    <span
      className={`inline-block w-${size} h-${size} rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`}
    />
  );
}

function ProgressBar({ value, max = 100, color = 'bg-blue-500' }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScoreRing({ score }) {
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="absolute" width="128" height="128" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-bold text-white">{score}</div>
        <div className="text-gray-400 text-xs">/ 100</div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const c = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.low;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function TrafficBar({ label, value, max, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-sm w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
      <span className="text-white text-sm w-16 text-right">{value} MB/s</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function OverviewTab({ securityData, onScan, scanning }) {
  const score    = securityData?.score ?? 82;
  const blocked  = securityData?.threatsBlocked ?? 1175;
  const scans    = securityData?.scansRun ?? 44;
  const lastScan = securityData?.lastScan ?? '2026-08-04 09:58';
  const vulns    = securityData?.vulnerabilities ?? 2;

  const statusCards = [
    { label: 'AES-256-GCM',  icon: Lock,        ok: true,  note: 'Active'         },
    { label: 'Firewall',      icon: Shield,      ok: true,  note: 'Enabled'        },
    { label: '2FA / MFA',     icon: ShieldCheck, ok: true,  note: 'Enforced'       },
    { label: 'Certificates',  icon: Key,         ok: vulns === 0, note: vulns === 0 ? 'Valid' : `${vulns} expiring` },
  ];

  const threatFeed = [
    { time: '09:42', msg: 'Brute force from 45.33.32.156 blocked', sev: 'high'   },
    { time: '09:15', msg: 'XSS payload in form input neutralised',  sev: 'high'   },
    { time: '08:59', msg: 'Full system scan completed — 0 threats',  sev: 'low'   },
    { time: '07:30', msg: 'New device login: dev@nexus.ai',          sev: 'medium' },
  ];

  return (
    <div className="space-y-6">
      {/* Score + stats */}
      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center gap-2">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Security Score</span>
          <ScoreRing score={score} />
          <span className={`text-sm font-medium ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'At Risk'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1 w-full">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Threats Blocked</div>
            <div className="text-2xl font-bold text-red-400">{blocked.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Scans Run</div>
            <div className="text-2xl font-bold text-blue-400">{scans}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Last Scan</div>
            <div className="text-sm font-semibold text-white">{lastScan}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Vulnerabilities</div>
            <div className={`text-2xl font-bold ${vulns > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{vulns}</div>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map(({ label, icon: Icon, ok, note }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${ok ? 'bg-green-900' : 'bg-red-900'}`}>
              <Icon size={16} className={ok ? 'text-green-400' : 'text-red-400'} />
            </div>
            <div>
              <div className="text-white text-sm font-medium">{label}</div>
              <div className={`text-xs ${ok ? 'text-green-400' : 'text-red-400'}`}>{note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Threat feed */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-white font-semibold text-sm">Real-Time Threat Feed</span>
          <button
            onClick={onScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-60 transition-colors"
          >
            <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning…' : 'Scan Now'}
          </button>
        </div>
        <div className="divide-y divide-gray-700">
          {threatFeed.map((t, i) => {
            const c = SEVERITY_COLORS[t.sev];
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                <span className="text-gray-500 text-xs w-12 shrink-0">{t.time}</span>
                <span className="text-gray-300 text-sm flex-1">{t.msg}</span>
                <SeverityBadge severity={t.sev} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NetworkTab({ traffic }) {
  const inbound  = traffic?.inbound  ?? 42;
  const outbound = traffic?.outbound ?? 18;
  const peak     = 100;

  return (
    <div className="space-y-6">
      {/* Traffic graphs */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Network size={16} className="text-blue-400" /> Network Traffic</h3>
        <TrafficBar label="Inbound"  value={inbound}  max={peak} color="bg-green-500"  />
        <TrafficBar label="Outbound" value={outbound} max={peak} color="bg-blue-500"   />
      </div>

      {/* Active connections */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <span className="text-white font-semibold text-sm">Active Connections</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="px-4 py-2 text-left">Host</th>
                <th className="px-4 py-2 text-left">Port</th>
                <th className="px-4 py-2 text-left">Protocol</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVE_CONNECTIONS.map((c, i) => (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-2 text-gray-300 font-mono">{c.host}</td>
                  <td className="px-4 py-2 text-gray-400">{c.port}</td>
                  <td className="px-4 py-2 text-gray-400">{c.protocol}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'trusted' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DNS monitoring */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 className="text-white font-semibold mb-3 text-sm">DNS Query Monitor</h3>
        <div className="space-y-2">
          {DNS_QUERIES.map((q, i) => {
            const suspicious = q.includes('.ru') || q.includes('ad-net');
            return (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className={`font-mono ${suspicious ? 'text-red-400' : 'text-gray-300'}`}>{q}</span>
                {suspicious && (
                  <span className="flex items-center gap-1 text-red-400 text-xs">
                    <AlertTriangle size={12} /> Suspicious
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeviceTab() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || 'Unknown') : 'Unknown';
  const memory = typeof navigator !== 'undefined' ? ((navigator.deviceMemory ?? 8) * 1024) : 8192;
  const diskUsed  = 234;
  const diskTotal = 512;
  const memUsed   = Math.floor(memory * 0.55);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Cpu size={16} className="text-purple-400" /> Device Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Platform: </span><span className="text-gray-200">{platform}</span></div>
          <div><span className="text-gray-500">User Agent: </span><span className="text-gray-200 break-all">{ua.slice(0, 60)}…</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Disk Usage</span>
            <span className="text-white">{diskUsed} / {diskTotal} GB</span>
          </div>
          <ProgressBar value={diskUsed} max={diskTotal} color="bg-blue-500" />
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Memory Usage</span>
            <span className="text-white">{memUsed} / {memory} MB</span>
          </div>
          <ProgressBar value={memUsed} max={memory} color="bg-purple-500" />
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 space-y-3">
        <h3 className="text-white font-semibold text-sm">Integrity Checks</h3>
        {[
          { label: 'File System Integrity',  ok: true  },
          { label: 'Certificate Validity',   ok: true  },
          { label: 'OS Patch Status',        ok: false },
          { label: 'Suspicious Processes',   ok: true  },
        ].map(({ label, ok }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{label}</span>
            <span className={`flex items-center gap-1 ${ok ? 'text-green-400' : 'text-red-400'}`}>
              <StatusDot ok={ok} size={2} />
              {ok ? 'OK' : 'Action Required'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThreatsTab() {
  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">All threat categories detected and neutralized by the Nexus security engine.</p>
      {THREAT_CATEGORIES.map((cat) => {
        const c = SEVERITY_COLORS[cat.severity];
        return (
          <div key={cat.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-4">
            <div className={`p-2 rounded-lg ${c.bg}`}>
              <ShieldAlert size={18} className={c.text} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{cat.label}</span>
                <SeverityBadge severity={cat.severity} />
              </div>
              <div className="mt-1">
                <ProgressBar value={cat.blocked} max={600} color={cat.severity === 'critical' ? 'bg-red-500' : cat.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-white font-bold">{cat.blocked.toLocaleString()}</div>
              <div className="text-gray-500 text-xs">blocked</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EncryptionTab({ onRotateKeys }) {
  const certExpiry = '2027-01-15';
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Lock size={16} className="text-green-400" /> Active Encryption</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Algorithm',   value: 'AES-256-GCM',  ok: true  },
            { label: 'TLS Version', value: 'TLS 1.3',      ok: true  },
            { label: 'HTTPS',       value: 'Enforced',     ok: true  },
            { label: 'HSTS',        value: 'Enabled',      ok: true  },
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
              <span className="text-gray-400">{label}</span>
              <span className={`font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-3"><Key size={16} className="text-yellow-400" /> Key Management</h3>
        <div className="text-sm space-y-2 text-gray-300">
          <div className="flex justify-between"><span>Last rotation:</span><span className="text-white">2026-07-01</span></div>
          <div className="flex justify-between"><span>Next scheduled:</span><span className="text-white">2026-10-01</span></div>
          <div className="flex justify-between"><span>Cert expiry:</span><span className="text-green-400">{certExpiry}</span></div>
        </div>
        <button
          onClick={onRotateKeys}
          className="mt-4 w-full py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Rotate Keys Now
        </button>
      </div>
    </div>
  );
}

function AuditLogTab({ auditLog, autoRefresh, setAutoRefresh }) {
  const [filter, setFilter] = useState('All');
  const events = ['All', 'Login', 'Key Rotation', 'Brute Force', 'Scan Complete', 'XSS Blocked', 'Cert Renewed'];
  const logs = (auditLog?.length ? auditLog : DEFAULT_AUDIT).filter(
    (l) => filter === 'All' || l.event === filter
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {events.map((e) => (
            <button
              key={e}
              onClick={() => setFilter(e)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === e
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh ? 'bg-green-900 border-green-700 text-green-300' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
          >
            <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} />
            Auto-refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700 text-left">
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-2 text-gray-500 font-mono text-xs">{l.ts}</td>
                  <td className="px-4 py-2 text-gray-200">{l.event}</td>
                  <td className="px-4 py-2 text-gray-400">{l.user}</td>
                  <td className="px-4 py-2 text-gray-400 font-mono text-xs">{l.ip}</td>
                  <td className="px-4 py-2"><SeverityBadge severity={l.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SecurityDashboard({
  securityData,
  onScan,
  onRotateKeys,
  auditLog,
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [traffic, setTraffic]       = useState({ inbound: 42, outbound: 18 });
  const wsRef = useRef(null);

  // Auto-refresh timer (30 s)
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      setTraffic({
        inbound:  Math.floor(30 + Math.random() * 60),
        outbound: Math.floor(10 + Math.random() * 40),
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  // Simulate traffic drift every 4 s regardless
  useEffect(() => {
    const id = setInterval(() => {
      setTraffic({
        inbound:  Math.floor(30 + Math.random() * 60),
        outbound: Math.floor(10 + Math.random() * 40),
      });
    }, 4_000);
    return () => clearInterval(id);
  }, []);

  // Stub WebSocket connection
  useEffect(() => {
    // In production: wsRef.current = new WebSocket('wss://nexus.ai/ws/security');
    return () => wsRef.current?.close?.();
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      await fetch('/api/security/scan', { method: 'POST' }).catch(() => {});
      onScan?.();
    } finally {
      setTimeout(() => setScanning(false), 2000);
    }
  }, [onScan]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-green-400" size={24} />
            Security Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Real-time security monitoring & threat management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Monitoring Active
          </span>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              autoRefresh ? 'bg-blue-900 border-blue-700 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-gray-800 p-1 rounded-xl border border-gray-700 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-green-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview'    && <OverviewTab securityData={securityData} onScan={handleScan} scanning={scanning} />}
      {activeTab === 'Network'     && <NetworkTab traffic={traffic} />}
      {activeTab === 'Device'      && <DeviceTab />}
      {activeTab === 'Threats'     && <ThreatsTab />}
      {activeTab === 'Encryption'  && <EncryptionTab onRotateKeys={onRotateKeys} />}
      {activeTab === 'Audit Log'   && <AuditLogTab auditLog={auditLog} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />}
    </div>
  );
}
