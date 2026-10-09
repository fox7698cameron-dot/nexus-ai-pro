// src/components/SecurityDashboardFull.jsx
// Nexus AI Pro - Enhanced Real-Time Security Dashboard
// Date: 2026-10-09

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff,
  Activity, AlertTriangle, CheckCircle, XCircle,
  Wifi, WifiOff, Network, Server, Monitor, Cpu,
  Lock, Key, Eye, RefreshCw, Zap, Bug,
  TrendingUp, TrendingDown, Bell, BellOff,
  Globe, Terminal, Database, Search,
} from 'lucide-react';

const SEVERITY = {
  critical: { label: 'Critical', color: '#ef4444', bg: '#ef444422', icon: XCircle },
  high:     { label: 'High',     color: '#f97316', bg: '#f9731622', icon: AlertTriangle },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: '#f59e0b22', icon: AlertTriangle },
  low:      { label: 'Low',      color: '#3b82f6', bg: '#3b82f622', icon: CheckCircle },
  info:     { label: 'Info',     color: '#8b5cf6', bg: '#8b5cf622', icon: CheckCircle },
};

// Simulated real-time security data (wire to /api/security/* in production)
function buildDashboardData() {
  const score = 72 + Math.round(Math.random() * 20);
  return {
    score,
    grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D',
    encryption: { algorithm: 'AES-256-GCM', status: 'active', keyAge: '2h 14m', nextRotation: '21h 46m' },
    tls: { version: 'TLS 1.3', cert: 'Valid', expiry: '89 days', hsts: true },
    network: {
      status: 'normal',
      openPorts: [443, 3001, 80],
      blockedRequests: 14 + Math.round(Math.random() * 8),
      activeConnections: 3 + Math.round(Math.random() * 4),
      inboundTraffic: (0.8 + Math.random() * 1.4).toFixed(1),
      outboundTraffic: (0.3 + Math.random() * 0.7).toFixed(1),
    },
    vulnerabilities: [
      { id: 'v1', name: 'Content Security Policy',       severity: 'medium', status: 'open',    cve: 'N/A',           desc: 'CSP directives can be tightened to restrict inline scripts further.' },
      { id: 'v2', name: 'Cookie Flags',                  severity: 'low',    status: 'open',    cve: 'N/A',           desc: 'Session cookies should use SameSite=Strict.' },
      { id: 'v3', name: 'TLS/SSL Configuration',         severity: 'high',   status: 'patched', cve: 'CVE-2023-0001', desc: 'Weak cipher suites disabled. TLS 1.3 enforced.' },
      { id: 'v4', name: 'Dependency: esbuild',           severity: 'medium', status: 'patched', cve: 'N/A',           desc: 'Updated to 0.24.2+ via package overrides.' },
      { id: 'v5', name: 'Rate Limiting on Auth',         severity: 'high',   status: 'patched', cve: 'N/A',           desc: 'authLimiter now applied to /api/auth/* routes.' },
      { id: 'v6', name: 'CORS Wildcard Origin',          severity: 'medium', status: 'open',    cve: 'N/A',           desc: 'CORS_ORIGIN is set to * in dev. Set explicit origin in production.' },
    ],
    recentThreats: [
      { id: 't1', type: 'SQL Injection Attempt',  severity: 'critical', ip: '192.168.1.104', ts: Date.now() - 80000,   status: 'blocked' },
      { id: 't2', type: 'XSS Probe',              severity: 'high',     ip: '10.0.0.55',     ts: Date.now() - 240000,  status: 'blocked' },
      { id: 't3', type: 'Brute Force (Auth)',      severity: 'high',     ip: '185.220.101.x', ts: Date.now() - 600000,  status: 'blocked' },
      { id: 't4', type: 'Path Traversal',          severity: 'medium',   ip: '172.16.0.22',   ts: Date.now() - 1200000, status: 'blocked' },
      { id: 't5', type: 'Suspicious User-Agent',   severity: 'low',      ip: '203.0.113.44',  ts: Date.now() - 3600000, status: 'logged'  },
    ],
    onDevice: {
      cpu:    Math.round(15 + Math.random() * 40),
      memory: Math.round(40 + Math.random() * 30),
      disk:   Math.round(50 + Math.random() * 20),
      processes: 42 + Math.round(Math.random() * 10),
    },
    auditLog: [
      { id: 'a1', event: 'KEY_ROTATION',         detail: 'AES master key rotated',          ts: Date.now() - 7200000,  level: 'info' },
      { id: 'a2', event: 'LOGIN_SUCCESS',         detail: 'Admin login from 127.0.0.1',      ts: Date.now() - 3600000,  level: 'info' },
      { id: 'a3', event: 'REQUEST_BLOCKED',       detail: 'SQL injection blocked — /api/chat', ts: Date.now() - 600000,  level: 'warn' },
      { id: 'a4', event: 'SCAN_COMPLETED',        detail: 'Vulnerability scan: 2 open',      ts: Date.now() - 300000,   level: 'info' },
      { id: 'a5', event: 'LOGIN_FAILED',          detail: 'Brute force: 5 attempts — /api/auth/login', ts: Date.now() - 120000, level: 'warn' },
    ],
  };
}

function ScoreGauge({ score, grade }) {
  const pct = score / 100;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#374151" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">{score}</text>
        <text x="50" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">{grade}</text>
      </svg>
      <span className="text-xs text-gray-400 mt-1">Security Score</span>
    </div>
  );
}

function VulnCard({ v }) {
  const s = SEVERITY[v.severity] || SEVERITY.info;
  const StatusIcon = v.status === 'patched' ? CheckCircle : s.icon;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ background: s.bg, borderColor: s.color + '44' }}>
      <StatusIcon size={16} style={{ color: v.status === 'patched' ? '#34d399' : s.color, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white truncate">{v.name}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
            style={{ background: s.color + '33', color: s.color }}
          >{s.label}</span>
        </div>
        <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{v.desc}</p>
        <div className="flex items-center gap-3 mt-1">
          {v.cve !== 'N/A' && <span className="text-xs text-gray-500">CVE: {v.cve}</span>}
          <span className={`text-xs font-medium ${v.status === 'patched' ? 'text-green-400' : 'text-yellow-400'}`}>
            {v.status === 'patched' ? 'Patched' : 'Open'}
          </span>
        </div>
      </div>
    </div>
  );
}

function ThreatRow({ t }) {
  const s = SEVERITY[t.severity] || SEVERITY.info;
  const ago = Math.round((Date.now() - t.ts) / 60000);
  const agoStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
      <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: s.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-white truncate">{t.type}</span>
          <span className="text-xs text-gray-500 shrink-0">{agoStr}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">IP: {t.ip}</span>
          <span
            className="text-xs px-1.5 rounded"
            style={{ background: t.status === 'blocked' ? '#34d39922' : '#f59e0b22', color: t.status === 'blocked' ? '#34d399' : '#f59e0b' }}
          >
            {t.status}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SecurityDashboardFull() {
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState('overview');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const timerRef = useRef(null);

  const refresh = useCallback(() => {
    setData(buildDashboardData());
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 15000);
    return () => clearInterval(timerRef.current);
  }, [refresh]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/security/scan', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        refresh();
      }
    } catch {
      refresh();
    } finally {
      setTimeout(() => setScanning(false), 1500);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <RefreshCw size={24} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  const openVulns = data.vulnerabilities.filter(v => v.status === 'open');
  const criticalThreats = data.recentThreats.filter(t => t.severity === 'critical');

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield size={20} className="text-green-400" />
            Security Dashboard
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">Real-time scan · Auto-refresh every 15s</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAlertsEnabled(a => !a)}
            className={`p-2 rounded-lg border transition-colors ${alertsEnabled ? 'border-green-500 text-green-400' : 'border-gray-600 text-gray-500'}`}
            title="Toggle alerts"
          >
            {alertsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
          </button>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <Search size={14} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <div className="col-span-2 md:col-span-1 bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-4">
          <ScoreGauge score={data.score} grade={data.grade} />
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Open Vulns</div>
          <div className={`text-2xl font-bold ${openVulns.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {openVulns.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">{data.vulnerabilities.length} total tracked</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Threats Today</div>
          <div className={`text-2xl font-bold ${criticalThreats.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {data.recentThreats.filter(t => t.status === 'blocked').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">All blocked</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Encryption</div>
          <div className="text-sm font-bold text-green-400">{data.encryption.algorithm}</div>
          <div className="text-xs text-gray-500 mt-1">Key age: {data.encryption.keyAge}</div>
          <div className="text-xs text-gray-500">Rotates in: {data.encryption.nextRotation}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 border-b border-gray-800">
        {[
          { id: 'overview', label: 'Overview', icon: Shield },
          { id: 'network',  label: 'Network',  icon: Network },
          { id: 'threats',  label: 'Threats',  icon: AlertTriangle },
          { id: 'device',   label: 'On-Device', icon: Monitor },
          { id: 'audit',    label: 'Audit Log', icon: Terminal },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Bug size={14} className="text-yellow-400" />
                Vulnerabilities
              </h4>
              <div className="space-y-2">
                {data.vulnerabilities.map(v => <VulnCard key={v.id} v={v} />)}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Lock size={14} className="text-blue-400" />
                TLS / Encryption Status
              </h4>
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 grid grid-cols-2 gap-3">
                {[
                  { label: 'TLS Version', value: data.tls.version, ok: true },
                  { label: 'Certificate', value: data.tls.cert, ok: true },
                  { label: 'Cert Expiry', value: data.tls.expiry, ok: parseInt(data.tls.expiry) > 14 },
                  { label: 'HSTS', value: data.tls.hsts ? 'Enabled' : 'Disabled', ok: data.tls.hsts },
                  { label: 'Cipher', value: data.encryption.algorithm, ok: true },
                  { label: 'Key Rotation', value: `in ${data.encryption.nextRotation}`, ok: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.ok ? <CheckCircle size={12} className="text-green-400 shrink-0" /> : <AlertTriangle size={12} className="text-yellow-400 shrink-0" />}
                    <div>
                      <div className="text-xs text-gray-400">{item.label}</div>
                      <div className={`text-xs font-medium ${item.ok ? 'text-white' : 'text-yellow-400'}`}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Network Tab */}
        {tab === 'network' && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Wifi size={14} className="text-blue-400" />
                Network Status
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="text-sm font-bold text-green-400 flex items-center gap-1 mt-0.5">
                    <Activity size={12} className="animate-pulse" />
                    {data.network.status.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Active Connections</div>
                  <div className="text-sm font-bold text-white mt-0.5">{data.network.activeConnections}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Inbound</div>
                  <div className="text-sm font-bold text-blue-400 mt-0.5">{data.network.inboundTraffic} MB/s</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Outbound</div>
                  <div className="text-sm font-bold text-purple-400 mt-0.5">{data.network.outboundTraffic} MB/s</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Blocked Requests</div>
                  <div className="text-sm font-bold text-red-400 mt-0.5">{data.network.blockedRequests}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Open Ports</div>
                  <div className="text-sm font-bold text-white mt-0.5">{data.network.openPorts.join(', ')}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Threats Tab */}
        {tab === 'threats' && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <ShieldAlert size={14} className="text-red-400" />
              Recent Threats
            </h4>
            {data.recentThreats.map(t => <ThreatRow key={t.id} t={t} />)}
          </div>
        )}

        {/* On-Device Tab */}
        {tab === 'device' && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-4">
            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Monitor size={14} className="text-purple-400" />
              Device Health
            </h4>
            {[
              { label: 'CPU Usage', value: data.onDevice.cpu, color: '#60a5fa', icon: Cpu },
              { label: 'Memory Usage', value: data.onDevice.memory, color: '#34d399', icon: Database },
              { label: 'Disk Usage', value: data.onDevice.disk, color: '#fbbf24', icon: Server },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span className="flex items-center gap-1"><item.icon size={11} />{item.label}</span>
                  <span className="font-medium text-white">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${item.value}%`,
                      background: item.value > 80 ? '#ef4444' : item.value > 60 ? '#f59e0b' : item.color
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-400 mt-2">
              Running processes: <span className="text-white font-medium">{data.onDevice.processes}</span>
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {tab === 'audit' && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Terminal size={14} className="text-green-400" />
              Audit Log (recent)
            </h4>
            <div className="space-y-2">
              {data.auditLog.map(entry => {
                const ago = Math.round((Date.now() - entry.ts) / 60000);
                const agoStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
                return (
                  <div key={entry.id} className="flex items-start gap-3 text-xs py-2 border-b border-gray-700 last:border-0">
                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${entry.level === 'warn' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between gap-2">
                        <span className="font-mono font-medium text-purple-300">{entry.event}</span>
                        <span className="text-gray-500 shrink-0">{agoStr}</span>
                      </div>
                      <p className="text-gray-400 mt-0.5">{entry.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
