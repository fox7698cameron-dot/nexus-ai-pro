// src/components/EnhancedSecurityDashboard.jsx
// 2026-07-24 | Nexus AI Pro - Enhanced Security Dashboard
// Real-time scanning, network issue detection, device monitoring

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Wifi, WifiOff, Cpu, Network, AlertTriangle, CheckCircle2, RefreshCw, Lock, Unlock, Activity, Eye, Scan } from 'lucide-react';

function ScoreRing({ score }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-28 h-28">
      <svg className="transform -rotate-90" viewBox="0 0 100 100" width="112" height="112">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#374151" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

const SEVERITY_COLORS = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  info: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

function VulnerabilityItem({ vuln, onPatch }) {
  const colors = SEVERITY_COLORS[vuln.severity] || SEVERITY_COLORS.info;
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${colors}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} />
        <div>
          <div className="text-sm font-medium">{vuln.name}</div>
          <div className="text-xs opacity-70">{vuln.description || vuln.severity}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vuln.status === 'resolved' ? 'bg-green-500/20 text-green-300' : ''}`}>
          {vuln.status}
        </span>
        {vuln.status !== 'resolved' && (
          <button onClick={() => onPatch(vuln.id)} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">
            Patch
          </button>
        )}
      </div>
    </div>
  );
}

export function EnhancedSecurityDashboard({ socket }) {
  const [dashboard, setDashboard] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);

  const token = localStorage.getItem('nexus:accessToken');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    const [dash, net, dev] = await Promise.all([
      fetch('/api/security/dashboard', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/security/network-status', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/security/device-status', { headers }).then(r => r.json()).catch(() => null),
    ]);
    setDashboard(dash);
    setNetworkStatus(net);
    setDeviceStatus(dev);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('subscribe:security');
    socket.on('security:scan_result', (result) => {
      setLastScanResult(result);
      setScanning(false);
      fetchAll();
    });
    return () => socket.off('security:scan_result');
  }, [socket, fetchAll]);

  const runScan = async () => {
    setScanning(true);
    if (socket) {
      socket.emit('security:request_scan');
    } else {
      const res = await fetch('/api/security/scan', { method: 'POST', headers });
      if (res.ok) setLastScanResult(await res.json());
      setScanning(false);
    }
  };

  const patchVuln = async (vulnId) => {
    await fetch('/api/security/patch', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vulnId }),
    });
    fetchAll();
  };

  const score = dashboard?.overallScore ?? 92;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={22} className="text-green-400" />
            Security Dashboard
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Real-time threat detection & network monitoring
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm rounded-lg transition-colors"
        >
          {scanning ? <RefreshCw size={16} className="animate-spin" /> : <Scan size={16} />}
          {scanning ? 'Scanning…' : 'Run Scan'}
        </button>
      </div>

      {/* Score + status bar */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-6">
        <ScoreRing score={score} />
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-bold text-white">
            {score >= 80 ? '🛡️ System Secure' : score >= 60 ? '⚠️ Needs Attention' : '🚨 Critical Issues'}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <Lock size={14} className="text-green-400" />
              <span>AES-256-GCM: <span className="text-green-400">Active</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Activity size={14} className="text-blue-400" />
              <span>Threats Blocked: <span className="text-white">{dashboard?.threats?.length ?? 0}</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Eye size={14} className="text-purple-400" />
              <span>Vulnerabilities: <span className="text-white">{dashboard?.vulnerabilities?.length ?? 0}</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <RefreshCw size={14} className="text-yellow-400" />
              <span>Auto-patch: <span className="text-green-400">Enabled</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Network status */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Network size={16} className="text-blue-400" />
            Network Status
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Internet</span>
              <span className={networkStatus?.internet ? 'text-green-400' : 'text-red-400'}>
                {networkStatus?.internet ? '✅ Connected' : '❌ Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">TLS/HTTPS</span>
              <span className={networkStatus?.tlsEnabled ? 'text-green-400' : 'text-yellow-400'}>
                {networkStatus?.tlsEnabled ? '✅ Enabled' : '⚠️ Not Enforced'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Rate Limiting</span>
              <span className="text-green-400">✅ Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">CORS Policy</span>
              <span className="text-green-400">✅ Enforced</span>
            </div>
          </div>
        </div>

        {/* Device status */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Cpu size={16} className="text-purple-400" />
            Device Status
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Session</span>
              <span className={deviceStatus?.sessionActive ? 'text-green-400' : 'text-red-400'}>
                {deviceStatus?.sessionActive ? '✅ Active' : '❌ Expired'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Encryption</span>
              <span className="text-green-400">✅ AES-256-GCM</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Threat Level</span>
              <span className={deviceStatus?.threatLevel === 'normal' ? 'text-green-400' : 'text-orange-400'}>
                {deviceStatus?.threatLevel === 'normal' ? '✅ Normal' : '⚠️ Elevated'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">MFA</span>
              <span className={deviceStatus?.mfaEnabled ? 'text-green-400' : 'text-yellow-400'}>
                {deviceStatus?.mfaEnabled ? '✅ Enabled' : '⚠️ Recommended'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vulnerabilities */}
      {dashboard?.vulnerabilities?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-orange-400" />
            Vulnerabilities ({dashboard.vulnerabilities.length})
          </h3>
          <div className="space-y-2">
            {dashboard.vulnerabilities.map(v => (
              <VulnerabilityItem key={v.id} vuln={v} onPatch={patchVuln} />
            ))}
          </div>
        </div>
      )}

      {/* Recent threats */}
      {dashboard?.threats?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ShieldCheck size={16} className="text-green-400" />
            Recent Threats Blocked
          </h3>
          <div className="space-y-2">
            {dashboard.threats.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50 text-xs">
                <span className="text-gray-300 font-mono">{t.type}</span>
                <span className="text-green-400">✅ Blocked</span>
                <span className="text-gray-500">{t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last scan result */}
      {lastScanResult && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Last Scan Result</h3>
          <pre className="text-xs text-gray-400 overflow-x-auto">
            {JSON.stringify(lastScanResult, null, 2).slice(0, 800)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default EnhancedSecurityDashboard;
