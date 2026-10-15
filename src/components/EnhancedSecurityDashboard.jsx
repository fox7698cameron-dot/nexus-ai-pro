// EnhancedSecurityDashboard.jsx | Nexus AI Pro | Created: 2026-10-15 | Security Dashboard

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle,
  Activity, Lock, Cpu, HardDrive, Wifi, Network,
  Eye, RefreshCw, CheckCircle, XCircle, Clock,
  Server, Globe, Database, Key, Zap, Bug
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

const severityConfig = {
  [SEVERITY.CRITICAL]: { label: 'Critical', color: 'bg-red-500', textColor: 'text-red-500', border: 'border-red-500' },
  [SEVERITY.HIGH]: { label: 'High', color: 'bg-orange-500', textColor: 'text-orange-500', border: 'border-orange-400' },
  [SEVERITY.MEDIUM]: { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-500', border: 'border-yellow-400' },
  [SEVERITY.LOW]: { label: 'Low', color: 'bg-blue-400', textColor: 'text-blue-400', border: 'border-blue-400' }
};

const MOCK_CVEs = [
  { id: 'CVE-2026-1234', severity: SEVERITY.HIGH, title: 'Prototype Pollution in dependency', patched: true },
  { id: 'CVE-2026-5678', severity: SEVERITY.MEDIUM, title: 'Path traversal in upload handler', patched: true },
  { id: 'CVE-2025-9012', severity: SEVERITY.LOW, title: 'Outdated TLS cert negotiation', patched: false }
];

// ============================================
// HELPERS
// ============================================

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDeviceMetrics() {
  return {
    cpu: randomInRange(10, 85),
    memory: randomInRange(30, 90),
    disk: randomInRange(20, 75),
    openPorts: randomInRange(3, 12)
  };
}

function generateNetworkMetrics() {
  return {
    packetLoss: (Math.random() * 2).toFixed(2),
    latency: randomInRange(8, 120),
    dnsResolution: randomInRange(5, 80),
    activeSessions: randomInRange(1, 30)
  };
}

function generateThreatFeed() {
  const templates = [
    { msg: 'Brute-force attempt blocked from 185.220.x.x', severity: SEVERITY.HIGH },
    { msg: 'Port scan detected — 192.168.1.x', severity: SEVERITY.MEDIUM },
    { msg: 'SQL injection pattern in request body', severity: SEVERITY.CRITICAL },
    { msg: 'Suspicious file upload: payload.php', severity: SEVERITY.HIGH },
    { msg: 'Rate limit triggered for /api/auth (127 req/s)', severity: SEVERITY.MEDIUM },
    { msg: 'Invalid JWT token detected', severity: SEVERITY.LOW },
    { msg: 'Cross-site scripting attempt neutralized', severity: SEVERITY.HIGH },
    { msg: 'Geofenced IP blocked: TOR exit node', severity: SEVERITY.MEDIUM }
  ];
  return templates.slice(0, randomInRange(3, 8)).map((t, i) => ({
    id: `t-${Date.now()}-${i}`,
    ...t,
    ts: new Date(Date.now() - i * 45000).toISOString()
  }));
}

function generateAuditLog(count = 50) {
  const events = [
    'USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_CHANGE', 'SETTINGS_UPDATE',
    'FILE_UPLOAD', 'API_KEY_CREATED', 'PERMISSION_CHANGE',
    'VULNERABILITY_SCAN', 'ENCRYPTION_TEST', 'SESSION_REVOKED'
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `audit-${i}`,
    event: events[i % events.length],
    user: i % 3 === 0 ? 'system' : `user_${randomInRange(1, 5)}`,
    ts: new Date(Date.now() - i * 120000).toISOString(),
    ok: Math.random() > 0.15
  }));
}

function generateEncryptionStatuses() {
  return [
    { direction: 'Inbound HTTPS', cipher: 'TLS 1.3 / AES-256-GCM', active: true },
    { direction: 'Outbound API', cipher: 'TLS 1.3 / ECDHE-RSA', active: true },
    { direction: 'Database Tunnel', cipher: 'AES-256-GCM', active: true },
    { direction: 'WebSocket', cipher: 'TLS 1.3', active: Math.random() > 0.2 },
    { direction: 'File Storage', cipher: 'AES-256-CBC', active: true }
  ];
}

function scoreColor(score) {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function scoreBg(score) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * @param {{ label: string, value: number, unit?: string, warn?: number, danger?: number }} props
 */
function MetricBar({ label, value, unit = '%', warn = 70, danger = 90 }) {
  const color = value >= danger ? 'bg-red-500' : value >= warn ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">{value}{unit}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * @param {{ entry: object }} props
 */
function AuditRow({ entry }) {
  return (
    <div className={`flex items-center gap-3 py-1.5 text-xs border-b border-gray-100 dark:border-gray-700/50 ${
      !entry.ok ? 'bg-red-50/50 dark:bg-red-900/10' : ''
    }`}>
      {entry.ok
        ? <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
        : <XCircle size={12} className="text-red-500 flex-shrink-0" />}
      <span className="w-36 font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">
        {new Date(entry.ts).toLocaleTimeString()}
      </span>
      <span className="font-medium text-gray-800 dark:text-gray-200">{entry.event}</span>
      <span className="ml-auto text-gray-500 dark:text-gray-400">{entry.user}</span>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * EnhancedSecurityDashboard — real-time vulnerability, network, and device security
 * @param {{ className?: string }} props
 */
export default function EnhancedSecurityDashboard({ className = '' }) {
  const [securityScore, setSecurityScore] = useState(84);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [deviceMetrics, setDeviceMetrics] = useState(generateDeviceMetrics());
  const [networkMetrics, setNetworkMetrics] = useState(generateNetworkMetrics());
  const [threatFeed, setThreatFeed] = useState(generateThreatFeed());
  const [auditLog] = useState(generateAuditLog(50));
  const [encryptionStatuses, setEncryptionStatuses] = useState(generateEncryptionStatuses());
  const [lastPoll, setLastPoll] = useState(new Date());
  const [auditFilter, setAuditFilter] = useState('all');
  const scanRef = useRef(null);

  // 30-second polling for "live" updates
  const refreshLiveData = useCallback(() => {
    setDeviceMetrics(generateDeviceMetrics());
    setNetworkMetrics(generateNetworkMetrics());
    setThreatFeed(generateThreatFeed());
    setEncryptionStatuses(generateEncryptionStatuses());
    setLastPoll(new Date());
    setSecurityScore(prev => Math.max(50, Math.min(99, prev + randomInRange(-3, 3))));
  }, []);

  useEffect(() => {
    const id = setInterval(refreshLiveData, 30000);
    return () => clearInterval(id);
  }, [refreshLiveData]);

  // Active scan simulation
  function startScan() {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);

    let progress = 0;
    scanRef.current = setInterval(() => {
      progress += randomInRange(3, 10);
      if (progress >= 100) {
        progress = 100;
        clearInterval(scanRef.current);
        setIsScanning(false);
        setSecurityScore(randomInRange(78, 97));
        refreshLiveData();
      }
      setScanProgress(progress);
    }, 250);
  }

  useEffect(() => {
    return () => { if (scanRef.current) clearInterval(scanRef.current); };
  }, []);

  const filteredAudit = auditFilter === 'failures'
    ? auditLog.filter(e => !e.ok)
    : auditLog;

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-green-500" size={24} />
            Security Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time threat detection &amp; system health · Last poll {lastPoll.toLocaleTimeString()}
          </p>
        </div>

        <button
          onClick={startScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          {isScanning ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          {isScanning ? `Scanning ${scanProgress}%` : 'Run Full Scan'}
        </button>
      </div>

      {/* Scan progress bar */}
      {(isScanning || scanProgress === 100) && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {isScanning ? 'Active scan in progress…' : 'Scan complete'}
            </span>
            <span className={isScanning ? 'text-blue-500' : 'text-green-500'}>{scanProgress}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isScanning ? 'bg-blue-500' : 'bg-green-500'}`}
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          {!isScanning && scanProgress === 100 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle size={12} /> No new vulnerabilities detected
            </p>
          )}
        </div>
      )}

      {/* Top metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Security score */}
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center justify-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Security Score</span>
          <span className={`text-5xl font-bold ${scoreColor(securityScore)}`}>{securityScore}</span>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${scoreBg(securityScore)} rounded-full transition-all`} style={{ width: `${securityScore}%` }} />
          </div>
          <span className="text-xs text-gray-400">{securityScore >= 80 ? 'Secure' : securityScore >= 60 ? 'Moderate Risk' : 'High Risk'}</span>
        </div>

        {/* Device metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
            <Cpu size={12} /> On-Device
          </h3>
          <div className="space-y-3">
            <MetricBar label="CPU" value={deviceMetrics.cpu} />
            <MetricBar label="Memory" value={deviceMetrics.memory} />
            <MetricBar label="Disk" value={deviceMetrics.disk} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Open ports: <span className="font-medium text-gray-800 dark:text-gray-200">{deviceMetrics.openPorts}</span>
          </p>
        </div>

        {/* Network metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
            <Network size={12} /> Network
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Packet Loss</span>
              <span className={`font-medium ${parseFloat(networkMetrics.packetLoss) > 1 ? 'text-red-400' : 'text-green-400'}`}>
                {networkMetrics.packetLoss}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Latency</span>
              <span className={`font-medium ${networkMetrics.latency > 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                {networkMetrics.latency}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">DNS Resolve</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{networkMetrics.dnsResolution}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Active Sessions</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{networkMetrics.activeSessions}</span>
            </div>
          </div>
        </div>

        {/* Encryption status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
            <Lock size={12} /> Encryption
          </h3>
          <ul className="space-y-2">
            {encryptionStatuses.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                {e.active
                  ? <CheckCircle size={10} className="text-green-500 flex-shrink-0" />
                  : <XCircle size={10} className="text-red-500 flex-shrink-0" />}
                <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{e.direction}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom row: Threat feed + CVEs + Audit log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Threat feed */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-orange-500" />
            Live Threat Feed
          </h2>
          <ul className="space-y-2">
            {threatFeed.map(t => {
              const cfg = severityConfig[t.severity];
              return (
                <li key={t.id} className="flex items-start gap-2 text-xs">
                  <span className={`flex-shrink-0 mt-0.5 w-2 h-2 rounded-full ${cfg.color}`} />
                  <div>
                    <p className="text-gray-800 dark:text-gray-200">{t.msg}</p>
                    <p className="text-gray-400 mt-0.5">{new Date(t.ts).toLocaleTimeString()}</p>
                  </div>
                  <span className={`ml-auto flex-shrink-0 text-xs font-medium ${cfg.textColor}`}>
                    {cfg.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* CVE database check */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Database size={16} className="text-blue-500" />
            CVE Database
          </h2>
          <ul className="space-y-3">
            {MOCK_CVEs.map(cve => (
              <li key={cve.id} className={`p-3 rounded-lg border ${severityConfig[cve.severity].border} bg-gray-50 dark:bg-gray-700/30`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{cve.id}</span>
                  {cve.patched
                    ? <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle size={10} /> Patched</span>
                    : <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10} /> Unpatched</span>}
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300">{cve.title}</p>
                <span className={`text-xs font-medium ${severityConfig[cve.severity].textColor}`}>
                  {severityConfig[cve.severity].label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Audit log */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-purple-500" />
              Audit Log
            </h2>
            <select
              value={auditFilter}
              onChange={e => setAuditFilter(e.target.value)}
              className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-300"
            >
              <option value="all">All Events</option>
              <option value="failures">Failures Only</option>
            </select>
          </div>
          <div className="overflow-y-auto max-h-72 pr-1">
            {filteredAudit.slice(0, 50).map(entry => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
