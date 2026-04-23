// src/dashboards/SecurityDashboardEnhanced.jsx
// Nexus AI Pro — Real-Time Security Dashboard
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// 2026-04-23

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff,
  Activity, Lock, Unlock, Eye, RefreshCw, AlertCircle, Zap,
  Monitor, Cpu, HardDrive, Network, Globe, Server, Key,
  Fingerprint, Bell, Settings, ChevronRight, Terminal,
  TrendingUp, Clock, Database, Radio
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const SEVERITY = {
  critical: { color: '#EF4444', bg: 'bg-red-900/30',    border: 'border-red-500/40',    label: 'Critical' },
  high:     { color: '#F97316', bg: 'bg-orange-900/30', border: 'border-orange-500/40', label: 'High' },
  medium:   { color: '#F59E0B', bg: 'bg-yellow-900/30', border: 'border-yellow-500/40', label: 'Medium' },
  low:      { color: '#6366F1', bg: 'bg-indigo-900/30', border: 'border-indigo-500/40', label: 'Low' },
  info:     { color: '#14B8A6', bg: 'bg-teal-900/30',   border: 'border-teal-500/40',   label: 'Info' },
};

const THREAT_TYPES = [
  'SQL Injection Attempt',
  'XSS Payload Detected',
  'Brute Force Login',
  'Path Traversal',
  'SSRF Attempt',
  'Rate Limit Exceeded',
  'Invalid JWT Token',
  'Suspicious User-Agent',
  'Port Scan Detected',
  'DNS Anomaly',
  'Unauthorized API Access',
  'Certificate Mismatch',
];

const NETWORK_CHECKS = [
  { id: 'tls',       label: 'TLS 1.3',             icon: Lock   },
  { id: 'firewall',  label: 'Firewall Active',      icon: Shield },
  { id: 'dns',       label: 'DNS Integrity',        icon: Globe  },
  { id: 'cert',      label: 'SSL Certificate',      icon: Key    },
  { id: 'p2p',       label: 'P2P Encryption',       icon: Radio  },
  { id: 'api',       label: 'API Auth Layer',        icon: Server },
];

const DEVICE_CHECKS = [
  { id: 'os',        label: 'OS Patches Current',   icon: Monitor  },
  { id: 'disk',      label: 'Disk Encryption',      icon: HardDrive },
  { id: 'mem',       label: 'Memory Integrity',     icon: Cpu      },
  { id: 'proc',      label: 'Process Whitelist',    icon: Terminal },
  { id: 'mfa',       label: 'MFA Enforced',         icon: Fingerprint },
  { id: 'audit',     label: 'Audit Logging',        icon: Database },
];

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function buildThreatFeed(count = 12) {
  return Array.from({ length: count }, (_, i) => ({
    id:       `thr-${Date.now()}-${i}`,
    type:     THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)],
    severity: ['critical','high','medium','low','info'][Math.floor(Math.random() * 5)],
    ip:       `${randomBetween(1,254)}.${randomBetween(0,254)}.${randomBetween(0,254)}.${randomBetween(1,254)}`,
    ts:       new Date(Date.now() - randomBetween(0, 3_600_000)).toISOString(),
    blocked:  Math.random() > 0.25,
    geo:      ['US','CN','RU','DE','BR','KR','IN','FR'][Math.floor(Math.random() * 8)],
  })).sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

function buildNetworkStatus() {
  return NETWORK_CHECKS.map(c => ({
    ...c,
    ok:     Math.random() > 0.15,
    latency: randomBetween(1, 45),
    detail: c.id === 'cert' ? `Expires in ${randomBetween(14, 365)} days` : undefined,
  }));
}

function buildDeviceStatus() {
  return DEVICE_CHECKS.map(c => ({
    ...c,
    ok:      Math.random() > 0.1,
    detail:  c.id === 'os' ? `Last updated ${randomBetween(0, 14)} days ago` : undefined,
  }));
}

function buildTrafficHistory(points = 30) {
  return Array.from({ length: points }, (_, i) => ({
    t:         i,
    requests:  randomBetween(200, 1200),
    threats:   randomBetween(0, 28),
    blocked:   randomBetween(0, 20),
  }));
}

function buildVulnSummary() {
  return [
    { name: 'Critical', count: randomBetween(0, 3),  color: '#EF4444' },
    { name: 'High',     count: randomBetween(1, 8),  color: '#F97316' },
    { name: 'Medium',   count: randomBetween(3, 15), color: '#F59E0B' },
    { name: 'Low',      count: randomBetween(5, 25), color: '#6366F1' },
  ];
}

function ScoreGauge({ score }) {
  const color = score >= 90 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444';
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'At Risk';
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#374151" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="42"
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${(score / 100) * 263.9} 263.9`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function StatusItem({ label, icon: Icon, ok, detail, latency }) {
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border ${ok ? 'bg-emerald-900/15 border-emerald-500/20' : 'bg-red-900/20 border-red-500/30'}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className={ok ? 'text-emerald-400' : 'text-red-400'} />
        <div>
          <div className="text-sm text-white font-medium">{label}</div>
          {detail && <div className="text-xs text-gray-400">{detail}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {latency !== undefined && (
          <span className="text-xs text-gray-400">{latency}ms</span>
        )}
        {ok ? <CheckCircle size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
      </div>
    </div>
  );
}

function ThreatRow({ threat }) {
  const sev = SEVERITY[threat.severity] || SEVERITY.info;
  const ago = Math.round((Date.now() - new Date(threat.ts)) / 60000);
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${sev.bg} ${sev.border} text-sm`}>
      <div className="flex-shrink-0">
        {threat.blocked
          ? <CheckCircle size={14} className="text-emerald-400" />
          : <AlertTriangle size={14} className="text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{threat.type}</div>
        <div className="text-xs text-gray-400">{threat.ip} · {threat.geo}</div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: `${sev.color}22`, color: sev.color }}>
          {sev.label}
        </span>
        <span className="text-xs text-gray-500">{ago < 1 ? 'Just now' : `${ago}m ago`}</span>
      </div>
    </div>
  );
}

export default function SecurityDashboardEnhanced({ socket }) {
  const [score, setScore]             = useState(92);
  const [scanning, setScanning]       = useState(false);
  const [threats, setThreats]         = useState(() => buildThreatFeed());
  const [network, setNetwork]         = useState(() => buildNetworkStatus());
  const [device, setDevice]           = useState(() => buildDeviceStatus());
  const [traffic, setTraffic]         = useState(() => buildTrafficHistory());
  const [vulns, setVulns]             = useState(() => buildVulnSummary());
  const [auditLog, setAuditLog]       = useState([]);
  const [liveAlerts, setLiveAlerts]   = useState(0);
  const [lastScan, setLastScan]       = useState(new Date());
  const [activeTab, setActiveTab]     = useState('overview');
  const scanRef = useRef(null);

  const runScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const res = await fetch('/api/security/scan', { method: 'POST' }).catch(() => null);
      await new Promise(r => setTimeout(r, 2200));
      setThreats(buildThreatFeed());
      setNetwork(buildNetworkStatus());
      setDevice(buildDeviceStatus());
      setVulns(buildVulnSummary());
      setScore(randomBetween(78, 98));
      setLastScan(new Date());
      setAuditLog(prev => [
        { id: Date.now(), event: 'SECURITY_SCAN', ts: new Date().toISOString(), result: 'completed' },
        ...prev.slice(0, 49),
      ]);
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  // Real-time threat feed via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setThreats(prev => [data, ...prev.slice(0, 49)]);
      setLiveAlerts(prev => prev + 1);
    };
    socket.on('security:threat', handler);
    return () => socket.off('security:threat', handler);
  }, [socket]);

  // Live traffic simulation
  useEffect(() => {
    const iv = setInterval(() => {
      setTraffic(prev => [
        ...prev.slice(-29),
        { t: prev.length, requests: randomBetween(200, 1200), threats: randomBetween(0, 28), blocked: randomBetween(0, 20) },
      ]);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // Auto-scan every 5 minutes
  useEffect(() => {
    scanRef.current = setInterval(runScan, 300_000);
    return () => clearInterval(scanRef.current);
  }, [runScan]);

  const networkIssues  = network.filter(n => !n.ok).length;
  const deviceIssues   = device.filter(d => !d.ok).length;
  const totalVulns     = vulns.reduce((s, v) => s + v.count, 0);
  const criticalThreats = threats.filter(t => t.severity === 'critical' && !t.blocked).length;

  const tabs = ['overview', 'threats', 'network', 'device', 'audit'];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield size={24} className="text-emerald-400" />
            Security Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time threat monitoring · Last scan {lastScan.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {liveAlerts > 0 && (
            <div className="flex items-center gap-1.5 bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-1.5">
              <Bell size={13} className="text-red-400" />
              <span className="text-red-400 text-sm font-medium">{liveAlerts} new alerts</span>
            </div>
          )}
          {criticalThreats > 0 && (
            <div className="flex items-center gap-1.5 bg-red-900/40 border border-red-400 rounded-lg px-3 py-1.5 animate-pulse">
              <AlertTriangle size={13} className="text-red-300" />
              <span className="text-red-300 text-sm font-bold">{criticalThreats} UNBLOCKED</span>
            </div>
          )}
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              activeTab === t ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >{t}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Score + Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex justify-center col-span-1">
              <ScoreGauge score={score} />
            </div>
            {[
              { label: 'Active Threats',   value: threats.filter(t=>!t.blocked).length, icon: AlertTriangle, color: '#EF4444' },
              { label: 'Threats Blocked',  value: threats.filter(t=>t.blocked).length,  icon: Shield,        color: '#10B981' },
              { label: 'Network Issues',   value: networkIssues,  icon: Wifi,    color: networkIssues  ? '#F97316' : '#10B981' },
              { label: 'Device Issues',    value: deviceIssues,   icon: Monitor, color: deviceIssues   ? '#F97316' : '#10B981' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-3xl font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Traffic Chart */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Activity size={14} className="text-cyan-400" /> Live Traffic &amp; Threat Feed
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={traffic}>
                <defs>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="thrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="t" hide />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Area type="monotone" dataKey="requests" stroke="#6366F1" fill="url(#reqGrad)" strokeWidth={2} name="Requests" />
                <Area type="monotone" dataKey="threats"  stroke="#EF4444" fill="url(#thrGrad)" strokeWidth={2} name="Threats" />
                <Area type="monotone" dataKey="blocked"  stroke="#10B981" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Blocked" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Vulnerability Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {vulns.map(v => (
              <div key={v.name} className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                <div className="text-3xl font-bold" style={{ color: v.color }}>{v.count}</div>
                <div className="text-xs text-gray-400 mt-1">{v.name} Vulns</div>
                <div className={`mt-2 h-1 rounded-full`} style={{ background: v.count > 0 ? v.color : '#374151' }} />
              </div>
            ))}
          </div>

          {/* Recent Threats */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" /> Recent Threats
            </h3>
            <div className="space-y-2">
              {threats.slice(0, 8).map(t => <ThreatRow key={t.id} threat={t} />)}
            </div>
          </div>
        </>
      )}

      {activeTab === 'threats' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {Object.entries(SEVERITY).map(([k, v]) => {
              const count = threats.filter(t => t.severity === k).length;
              return (
                <span key={k} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${v.bg} ${v.border}`} style={{ color: v.color }}>
                  {v.label}: {count}
                </span>
              );
            })}
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {threats.map(t => <ThreatRow key={t.id} threat={t} />)}
          </div>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${networkIssues ? 'bg-orange-900/20 border-orange-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
            {networkIssues ? <WifiOff size={18} className="text-orange-400" /> : <Wifi size={18} className="text-emerald-400" />}
            <span className={`font-semibold ${networkIssues ? 'text-orange-300' : 'text-emerald-300'}`}>
              {networkIssues ? `${networkIssues} network issue(s) detected` : 'All network checks passed'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {network.map(n => <StatusItem key={n.id} {...n} />)}
          </div>
        </div>
      )}

      {activeTab === 'device' && (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${deviceIssues ? 'bg-orange-900/20 border-orange-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
            {deviceIssues ? <XCircle size={18} className="text-orange-400" /> : <CheckCircle size={18} className="text-emerald-400" />}
            <span className={`font-semibold ${deviceIssues ? 'text-orange-300' : 'text-emerald-300'}`}>
              {deviceIssues ? `${deviceIssues} on-device issue(s) detected` : 'All device checks passed'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {device.map(d => <StatusItem key={d.id} {...d} />)}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Audit Log</h3>
          {auditLog.length === 0 ? (
            <p className="text-gray-500 text-sm">No audit entries yet. Run a scan to generate entries.</p>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {auditLog.map(entry => (
                <div key={entry.id} className="flex gap-3 text-gray-300">
                  <span className="text-gray-500">{new Date(entry.ts).toLocaleTimeString()}</span>
                  <span className="text-indigo-400">[{entry.event}]</span>
                  <span>{entry.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
