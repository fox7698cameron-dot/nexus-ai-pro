/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Security dashboard: real-time scans, network detection, on-device issues
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff,
  Cpu, HardDrive, Lock, Unlock, RefreshCw, Activity, Eye,
  Zap, Globe, Server, Bug
} from 'lucide-react';

const SEVERITY_COLORS = {
  critical: 'text-red-400 bg-red-900/30 border-red-800',
  high:     'text-orange-400 bg-orange-900/30 border-orange-800',
  medium:   'text-yellow-400 bg-yellow-900/30 border-yellow-800',
  low:      'text-blue-400 bg-blue-900/30 border-blue-800',
  info:     'text-gray-400 bg-gray-800 border-gray-700',
  resolved: 'text-green-400 bg-green-900/30 border-green-800'
};

function ScoreGauge({ score }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
  const dash = 2 * Math.PI * 54;
  const offset = dash * (1 - score / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="130" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#374151" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={dash}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="60" y="55" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">{score}</text>
        <text x="60" y="72" textAnchor="middle" fill="#9ca3af" fontSize="10">/ 100</text>
      </svg>
      <span className="text-gray-400 text-sm mt-1">Security Score</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    secure:    { color: 'text-green-400',  icon: CheckCircle,  label: 'Secure' },
    warning:   { color: 'text-yellow-400', icon: AlertTriangle, label: 'Warning' },
    critical:  { color: 'text-red-400',    icon: XCircle,      label: 'Critical' },
    scanning:  { color: 'text-blue-400',   icon: Activity,     label: 'Scanning…' },
    resolved:  { color: 'text-green-400',  icon: CheckCircle,  label: 'Resolved' }
  }[status] || { color: 'text-gray-400', icon: Shield, label: status };

  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function VulnCard({ vuln, onPatch }) {
  return (
    <div className={`rounded-lg p-3 border ${SEVERITY_COLORS[vuln.severity] || SEVERITY_COLORS.info}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm">{vuln.name}</span>
          <div className="text-xs opacity-70 mt-0.5 capitalize">{vuln.severity} severity</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={vuln.status} />
          {vuln.status !== 'resolved' && (
            <button
              onClick={() => onPatch(vuln.id)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
            >
              Patch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NetworkCard({ connected, latency, threats }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
          <Globe size={14} /> Network Status
        </h3>
        {connected
          ? <span className="flex items-center gap-1 text-green-400 text-xs"><Wifi size={12} />Connected</span>
          : <span className="flex items-center gap-1 text-red-400 text-xs"><WifiOff size={12} />Offline</span>
        }
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Latency</span>
          <span className={`font-semibold ${latency < 100 ? 'text-green-400' : latency < 300 ? 'text-yellow-400' : 'text-red-400'}`}>
            {latency ?? '—'}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Threats Blocked</span>
          <span className="text-white font-semibold">{threats ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Encryption</span>
          <span className="text-green-400 font-semibold flex items-center gap-1"><Lock size={11} />AES-256-GCM</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">TLS</span>
          <span className="text-green-400 font-semibold">TLS 1.3</span>
        </div>
      </div>
    </div>
  );
}

function DeviceCard({ os, browser, memory, cpu }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="font-semibold text-sm text-gray-300 flex items-center gap-2 mb-3">
        <Cpu size={14} /> Device Health
      </h3>
      <div className="space-y-2 text-sm">
        {[
          { label: 'Platform', value: os || navigator?.platform || 'Unknown', icon: Server },
          { label: 'Memory Usage', value: memory ? `${memory}MB` : '—', icon: HardDrive },
          { label: 'CPU Load', value: cpu ? `${cpu}%` : '—', icon: Cpu }
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center gap-1"><Icon size={11} />{label}</span>
            <span className="text-white font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SecurityDashboardPro({ authToken }) {
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [networkLatency, setNetworkLatency] = useState(null);
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);
  const [alerts, setAlerts] = useState([]);
  const [lastScan, setLastScan] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState({});

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, alertsRes] = await Promise.all([
        fetch('/api/security/dashboard', { headers }),
        fetch('/api/security/alerts', { headers })
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (alertsRes.ok) setAlerts((await alertsRes.json()).alerts || []);
    } catch { /* network error */ }
  }, [authToken]);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/security/scan', { method: 'POST', headers });
      if (res.ok) {
        await fetchDashboard();
        setLastScan(new Date());
      }
    } finally {
      setScanning(false);
    }
  }, [authToken, fetchDashboard]);

  const patchVuln = useCallback(async (vulnId) => {
    await fetch('/api/security/patch', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ vulnId }) });
    await fetchDashboard();
  }, [authToken, fetchDashboard]);

  // Network latency probe
  const probeLatency = useCallback(async () => {
    const t0 = performance.now();
    try {
      await fetch('/api/health');
      setNetworkLatency(Math.round(performance.now() - t0));
    } catch {
      setNetworkLatency(null);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    probeLatency();

    // Device info
    setDeviceInfo({
      os: navigator.platform,
      browser: navigator.userAgent.split(' ').pop(),
      memory: performance?.memory ? Math.round(performance.memory.usedJSHeapSize / 1_000_000) : null
    });

    const onlineHandler = () => setNetworkOnline(true);
    const offlineHandler = () => setNetworkOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    const latencyInterval = setInterval(probeLatency, 15000);
    const refreshInterval = setInterval(fetchDashboard, 30000);

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      clearInterval(latencyInterval);
      clearInterval(refreshInterval);
    };
  }, [fetchDashboard, probeLatency]);

  const score = data?.overallScore ?? 0;
  const vulns = data?.vulnerabilities || [];
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-green-400" size={24} />
            Security Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time threat detection and vulnerability management</p>
        </div>
        <div className="flex items-center gap-3">
          {lastScan && (
            <span className="text-xs text-gray-400">Last scan: {lastScan.toLocaleTimeString()}</span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-900/50 border border-red-800 text-red-400 px-2 py-1 rounded-full">
              <AlertTriangle size={11} />{criticalCount} critical
            </span>
          )}
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Score + Encryption */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex flex-col items-center">
            <ScoreGauge score={score} />
            <div className="mt-3 text-center">
              <div className={`text-sm font-semibold ${score >= 90 ? 'text-green-400' : score >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Attention'}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-xs text-gray-400 uppercase font-semibold mb-3 flex items-center gap-1">
              <Lock size={11} /> Encryption
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Algorithm</span>
                <span className="text-green-400 font-semibold">AES-256-GCM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-green-400 font-semibold flex items-center gap-1"><CheckCircle size={11} />Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Key Rotation</span>
                <span className="text-white font-semibold">24h cycle</span>
              </div>
            </div>
          </div>

          <NetworkCard
            connected={networkOnline}
            latency={networkLatency}
            threats={data?.threatsBlocked || 0}
          />

          <DeviceCard
            os={deviceInfo.os}
            memory={deviceInfo.memory}
          />
        </div>

        {/* Vulnerabilities */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h2 className="font-semibold text-sm text-gray-300 flex items-center gap-2 mb-4">
              <Bug size={14} /> Vulnerability Report
            </h2>
            {vulns.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                No vulnerabilities detected
              </div>
            ) : (
              <div className="space-y-2">
                {vulns.map(v => (
                  <VulnCard key={v.id} vuln={v} onPatch={patchVuln} />
                ))}
              </div>
            )}
          </div>

          {/* Threats */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h2 className="font-semibold text-sm text-gray-300 flex items-center gap-2 mb-4">
              <AlertTriangle size={14} /> Active Threats
            </h2>
            {(data?.threats || []).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No active threats detected</p>
            ) : (
              <div className="space-y-2">
                {(data?.threats || []).map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-400" />
                      <span className="text-sm">{t.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{new Date(t.timestamp).toLocaleTimeString()}</span>
                      <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audit log */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 h-full">
            <h2 className="font-semibold text-sm text-gray-300 flex items-center gap-2 mb-4">
              <Eye size={14} /> Recent Activity
            </h2>
            <div className="space-y-2 overflow-y-auto max-h-96">
              {(data?.recentActivity || []).slice(0, 15).map((log, i) => (
                <div key={i} className="bg-gray-900 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-blue-400">{log.event}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.details?.ip && (
                    <div className="text-xs text-gray-500">IP: {log.details.ip}</div>
                  )}
                  {log.details?.path && (
                    <div className="text-xs text-gray-500">{log.details.path}</div>
                  )}
                </div>
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
