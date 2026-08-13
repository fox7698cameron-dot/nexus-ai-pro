// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File: src/components/SecurityDashboardEnhanced.jsx
// Created: 2026-08-13
// Enhanced Security Dashboard - Real-time scanning, network monitoring, device health

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff,
  Activity, Wifi, WifiOff, Lock, Unlock,
  AlertTriangle, CheckCircle, XCircle, Info,
  RefreshCw, Play, Pause, Download,
  Network, Server, Cpu, HardDrive,
  Eye, EyeOff, Key, RotateCcw,
  Globe, Zap, Clock, FileText,
  ChevronDown, ChevronRight, Filter,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================
const SEVERITY_COLORS = {
  critical: 'text-red-500 bg-red-50 border-red-200',
  high:     'text-orange-500 bg-orange-50 border-orange-200',
  warning:  'text-yellow-500 bg-yellow-50 border-yellow-200',
  medium:   'text-yellow-500 bg-yellow-50 border-yellow-200',
  info:     'text-blue-500 bg-blue-50 border-blue-200',
  none:     'text-green-500 bg-green-50 border-green-200',
  low:      'text-green-500 bg-green-50 border-green-200',
};

const SCAN_CATEGORIES = [
  { id: 'full',    label: 'Full Scan',      icon: '🔍' },
  { id: 'network', label: 'Network Only',   icon: '🌐' },
  { id: 'code',    label: 'Code Analysis',  icon: '💻' },
  { id: 'auth',    label: 'Auth Security',  icon: '🔐' },
];

// ============================================================
// HELPER COMPONENTS
// ============================================================
function ScoreRing({ score }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="8"
          className="text-gray-200 dark:text-gray-700" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pass:    { icon: <CheckCircle size={14} />, text: 'Pass',    cls: 'text-green-600 bg-green-100' },
    warning: { icon: <AlertTriangle size={14} />, text: 'Warn',  cls: 'text-yellow-600 bg-yellow-100' },
    fail:    { icon: <XCircle size={14} />, text: 'Fail',        cls: 'text-red-600 bg-red-100' },
  };
  const s = map[status] || map.warning;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon} {s.text}
    </span>
  );
}

function MetricCard({ label, value, unit, icon: Icon, trend, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-200 text-blue-600',
    green:  'bg-green-50 border-green-200 text-green-600',
    red:    'bg-red-50 border-red-200 text-red-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={18} className="opacity-70" />}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm opacity-70 mb-0.5">{unit}</span>}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
          {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          {Math.abs(trend)}% vs last scan
        </div>
      )}
    </div>
  );
}

function MiniChart({ data = [], height = 40 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={data.map((v, i) => `${i * w + w / 2},${height - (v / max) * height}`).join(' ')}
      />
    </svg>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SecurityDashboardEnhanced({ token }) {
  const [dashboard, setDashboard] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanType, setScanType] = useState('full');
  const [activeTab, setActiveTab] = useState('overview');
  const [alertFilter, setAlertFilter] = useState('all');
  const [expandedCheck, setExpandedCheck] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, networkRes, deviceRes, alertsRes] = await Promise.all([
        fetch('/api/security/dashboard', { headers }),
        fetch('/api/security/network',   { headers }),
        fetch('/api/security/device',    { headers }),
        fetch('/api/security/alerts',    { headers }),
      ]);

      if (dashRes.ok)    setDashboard(await dashRes.json());
      if (networkRes.ok) setNetworkData((await networkRes.json()).network);
      if (deviceRes.ok)  setDeviceData((await deviceRes.json()).device);
      if (alertsRes.ok)  setAlerts((await alertsRes.json()).alerts || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[SecurityDashboard] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    try {
      const [histRes, auditRes] = await Promise.all([
        fetch('/api/security/scan-history', { headers }),
        fetch('/api/security/audit?limit=50', { headers }),
      ]);
      if (histRes.ok)  setScanHistory((await histRes.json()).scans || []);
      if (auditRes.ok) setAuditLogs((await auditRes.json()).logs || []);
    } catch (err) {
      console.error('[SecurityDashboard] history error:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
    fetchHistory();
  }, [fetchDashboard, fetchHistory]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchDashboard();
      }, 30000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchDashboard]);

  const runScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setScanResults(null);

    try {
      const res = await fetch('/api/security/scan', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: scanType }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResults(data);
        await fetchDashboard();
        await fetchHistory();
      }
    } catch (err) {
      console.error('[SecurityDashboard] scan error:', err);
    } finally {
      setScanning(false);
    }
  }, [scanning, scanType, headers, fetchDashboard, fetchHistory]);

  const rotateKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/security/rotate-keys', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchDashboard();
        alert('Encryption keys rotated successfully');
      }
    } catch (err) {
      console.error('[SecurityDashboard] rotate error:', err);
    }
  }, [headers, fetchDashboard]);

  const downloadReport = useCallback(async () => {
    try {
      const res = await fetch('/api/security/report', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[SecurityDashboard] report error:', err);
    }
  }, [headers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw size={20} className="animate-spin" />
          <span>Loading security dashboard...</span>
        </div>
      </div>
    );
  }

  const score = dashboard?.score ?? 0;
  const grade = dashboard?.grade ?? 'N/A';

  const filteredAlerts = alertFilter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === alertFilter);

  const TABS = [
    { id: 'overview',  label: 'Overview',    icon: Shield },
    { id: 'scan',      label: 'Scan',         icon: Activity },
    { id: 'network',   label: 'Network',      icon: Network },
    { id: 'device',    label: 'Device',       icon: Cpu },
    { id: 'alerts',    label: 'Alerts',       icon: AlertTriangle },
    { id: 'audit',     label: 'Audit Log',    icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Shield size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Security Dashboard</h1>
              <p className="text-sm text-gray-500">
                Real-time monitoring · {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                autoRefresh
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-gray-50 border-gray-300 text-gray-600'
              }`}
            >
              {autoRefresh ? <Activity size={14} className="animate-pulse" /> : <Pause size={14} />}
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <button onClick={fetchDashboard}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={downloadReport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download size={14} /> Report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-100 text-red-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score Ring */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center">
                <p className="text-sm font-medium text-gray-500 mb-4">Security Score</p>
                <ScoreRing score={score} />
                <div className="mt-4 text-center">
                  <span className={`text-4xl font-bold ${
                    score >= 90 ? 'text-green-500' : score >= 75 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    Grade {grade}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {score >= 90 ? 'Excellent security posture' : score >= 75 ? 'Good — minor improvements recommended' : 'Needs attention'}
                  </p>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard label="Encryption"   value="AES-256" unit="GCM" icon={Lock}     color="green" />
                <MetricCard label="Firewall"      value={dashboard?.firewall?.status === 'active' ? 'Active' : 'Off'} icon={Shield} color="blue" />
                <MetricCard label="Blocked IPs"   value={dashboard?.firewall?.blockedIPs ?? 0} icon={ShieldAlert} color="red" />
                <MetricCard label="Active Scans"  value={dashboard?.activeScan ? 'Running' : 'Idle'}  icon={Activity} color="purple" />
                <MetricCard label="Last Scan"     value={dashboard?.lastScan ? 'Done' : 'Never'}     icon={Clock} color="yellow" />
                <MetricCard label="Key Rotation"  value={dashboard?.encryption?.lastRotation ? 'Done' : 'Pending'} icon={Key} color="blue" />
              </div>
            </div>

            {/* Network & Device Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Network */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Network size={16} className="text-blue-500" /> Network Status
                </h3>
                {networkData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Hostname</span>
                      <span className="font-mono text-xs">{networkData.hostname}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Latency</span>
                      <span className={networkData.latency < 50 ? 'text-green-600' : 'text-yellow-600'}>
                        {networkData.latency}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Active Connections</span>
                      <span>{networkData.activeConnections}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Threat Level</span>
                      <span className={`font-medium ${
                        networkData.threatLevel === 'low' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {networkData.threatLevel?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Bandwidth In / Out</span>
                      <span>{networkData.bandwidth?.in} / {networkData.bandwidth?.out} Mbps</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No network data</p>
                )}
              </div>

              {/* Device */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Cpu size={16} className="text-purple-500" /> Device Health
                </h3>
                {deviceData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Platform</span>
                      <span className="font-medium">{deviceData.platform} / {deviceData.arch}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Memory Usage</span>
                        <span className={deviceData.memory?.usedPercent > 85 ? 'text-red-600' : 'text-gray-700'}>
                          {deviceData.memory?.usedPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            deviceData.memory?.usedPercent > 85 ? 'bg-red-500' :
                            deviceData.memory?.usedPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${deviceData.memory?.usedPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">CPU Cores</span>
                      <span>{deviceData.cpu?.count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">CPU Usage</span>
                      <span className={deviceData.cpu?.usagePercent > 80 ? 'text-red-600' : 'text-gray-700'}>
                        {deviceData.cpu?.usagePercent}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Uptime</span>
                      <span>{Math.floor((deviceData.uptime || 0) / 3600)}h {Math.floor(((deviceData.uptime || 0) % 3600) / 60)}m</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No device data</p>
                )}
              </div>
            </div>

            {/* Encryption Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Lock size={16} className="text-green-500" /> Encryption & Key Management
                </h3>
                <button
                  onClick={rotateKeys}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-50 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <RotateCcw size={14} /> Rotate Keys
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Algorithm</p>
                  <p className="font-mono font-semibold text-green-600">{dashboard?.encryption?.algorithm || 'AES-256-GCM'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Key Length</p>
                  <p className="font-semibold">{dashboard?.encryption?.keyLength || 256} bits</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Status</p>
                  <p className="font-semibold text-green-600 flex items-center gap-1">
                    <CheckCircle size={14} /> {dashboard?.encryption?.status || 'Active'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Last Rotation</p>
                  <p className="font-semibold">
                    {dashboard?.encryption?.lastRotation
                      ? new Date(dashboard.encryption.lastRotation).toLocaleDateString()
                      : 'Not rotated'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* SCAN TAB */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {/* Scan Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4">Run Security Scan</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {SCAN_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setScanType(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                      scanType === cat.id
                        ? 'bg-red-100 border-red-300 text-red-700 font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
              <button
                onClick={runScan}
                disabled={scanning}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                {scanning ? (
                  <><RefreshCw size={16} className="animate-spin" /> Scanning...</>
                ) : (
                  <><Play size={16} /> Start {SCAN_CATEGORIES.find(c => c.id === scanType)?.label}</>
                )}
              </button>
            </div>

            {/* Scan Results */}
            {scanResults && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Scan Results</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600 font-medium">✓ {scanResults.summary?.pass} Pass</span>
                    <span className="text-yellow-600 font-medium">⚠ {scanResults.summary?.warning} Warn</span>
                    <span className="text-red-600 font-medium">✗ {scanResults.summary?.fail} Fail</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {(scanResults.results || []).map(result => (
                    <div key={result.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedCheck(expandedCheck === result.id ? null : result.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <StatusBadge status={result.status} />
                          <span className="text-sm font-medium">{result.name}</span>
                          <span className="text-xs text-gray-400 hidden sm:inline">{result.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{result.value}</span>
                          {expandedCheck === result.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </button>
                      {expandedCheck === result.id && (
                        <div className="px-4 pb-3 pt-0 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                          {result.detail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scan History */}
            {scanHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold mb-4">Scan History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Score</th>
                        <th className="pb-2">Pass</th>
                        <th className="pb-2">Warn</th>
                        <th className="pb-2">Fail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {scanHistory.slice(0, 10).map(s => (
                        <tr key={s.scanId} className="py-2">
                          <td className="py-2 text-xs text-gray-500">
                            {new Date(s.completedAt).toLocaleString()}
                          </td>
                          <td className="py-2 capitalize">{s.type}</td>
                          <td className="py-2">
                            <span className={`font-bold ${
                              s.score >= 90 ? 'text-green-600' : s.score >= 75 ? 'text-yellow-600' : 'text-red-600'
                            }`}>{s.score}</span>
                          </td>
                          <td className="py-2 text-green-600">{s.passCount}</td>
                          <td className="py-2 text-yellow-600">{s.warnCount}</td>
                          <td className="py-2 text-red-600">{s.failCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NETWORK TAB */}
        {activeTab === 'network' && networkData && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Globe size={16} className="text-blue-500" /> Network Interfaces
              </h3>
              <div className="space-y-2">
                {(networkData.interfaces || []).map((iface, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Wifi size={14} className="text-green-500" />
                      <span className="font-mono font-medium">{iface.name}</span>
                      <span className="text-xs text-gray-500">{iface.family}</span>
                    </div>
                    <span className="font-mono text-xs">{iface.address}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="Latency"         value={networkData.latency}      unit="ms"   icon={Zap}     color={networkData.latency < 50 ? 'green' : 'yellow'} />
              <MetricCard label="Active Conns"    value={networkData.activeConnections}         icon={Network} color="blue" />
              <MetricCard label="Bandwidth In"    value={networkData.bandwidth?.in}  unit="Mbps" icon={TrendingUp}   color="green" />
              <MetricCard label="Bandwidth Out"   value={networkData.bandwidth?.out} unit="Mbps" icon={TrendingDown}  color="blue" />
            </div>
          </div>
        )}

        {/* DEVICE TAB */}
        {activeTab === 'device' && deviceData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard label="CPU Usage"     value={deviceData.cpu?.usagePercent}  unit="%"   icon={Cpu}      color={deviceData.cpu?.usagePercent > 80 ? 'red' : 'blue'} />
              <MetricCard label="Memory Usage"  value={deviceData.memory?.usedPercent} unit="%"  icon={HardDrive} color={deviceData.memory?.usedPercent > 85 ? 'red' : 'green'} />
              <MetricCard label="CPU Cores"     value={deviceData.cpu?.count}                      icon={Server}   color="purple" />
              <MetricCard label="Uptime"        value={`${Math.floor((deviceData.uptime || 0) / 3600)}h`} icon={Clock} color="blue" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-3">System Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Platform</p>
                  <p className="font-medium">{deviceData.platform}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Architecture</p>
                  <p className="font-medium">{deviceData.arch}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CPU Model</p>
                  <p className="font-medium text-xs">{deviceData.cpu?.model}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Hostname</p>
                  <p className="font-mono text-xs">{deviceData.hostname}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {['all', 'critical', 'high', 'warning', 'info'].map(f => (
                <button
                  key={f}
                  onClick={() => setAlertFilter(f)}
                  className={`px-3 py-1.5 text-sm rounded-lg border capitalize transition-colors ${
                    alertFilter === f
                      ? 'bg-red-100 border-red-300 text-red-700 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f} {f !== 'all' && alerts.filter(a => a.severity === f).length > 0 && (
                    <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1">
                      {alerts.filter(a => a.severity === f).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredAlerts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No alerts in this category</p>
                </div>
              ) : filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`border rounded-xl p-4 ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{alert.event}</p>
                      {alert.data && Object.keys(alert.data).length > 0 && (
                        <p className="text-xs mt-1 opacity-80">
                          {JSON.stringify(alert.data).slice(0, 100)}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs opacity-70 ml-4 flex-shrink-0">
                      <span className="capitalize font-medium">{alert.severity}</span>
                      <p>{new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText size={16} className="text-gray-500" /> Audit Log
              </h3>
              <span className="text-xs text-gray-500">{auditLogs.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-4">Timestamp</th>
                    <th className="pb-2 pr-4">Event</th>
                    <th className="pb-2 pr-4">Severity</th>
                    <th className="pb-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2 pr-4 font-mono text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toISOString().slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2 pr-4 font-medium">{log.event}</td>
                      <td className="py-2 pr-4">
                        <span className={`capitalize ${
                          log.severity === 'critical' ? 'text-red-600' :
                          log.severity === 'high' ? 'text-orange-600' :
                          log.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        }`}>{log.severity}</span>
                      </td>
                      <td className="py-2 text-gray-500 max-w-xs truncate">
                        {JSON.stringify(log.data).slice(0, 80)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
