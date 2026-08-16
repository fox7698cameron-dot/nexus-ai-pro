/**
 * nexus-ai-pro/src/components/SecurityDashboardFull.jsx
 * Real-time security dashboard: vulnerability scanning, network monitoring,
 * device health, threat detection
 * Date: 2026-08-16
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  Scan, Wifi, WifiOff, Cpu, HardDrive, Lock, Unlock,
  RefreshCw, CheckCircle2, XCircle, Info, Clock,
  Network, Globe, Activity, Eye, Zap, Bug, Wrench
} from 'lucide-react';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-500', icon: ShieldX },
  high:     { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-500', icon: ShieldAlert },
  medium:   { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', badge: 'bg-yellow-500', icon: AlertTriangle },
  low:      { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-400', icon: Info },
  info:     { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', badge: 'bg-gray-400', icon: Info },
};

function ScoreGauge({ score, label }) {
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-gray-800" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">/100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function VulnerabilityRow({ vuln, onPatch }) {
  const style = SEVERITY_STYLES[vuln.severity] || SEVERITY_STYLES.info;
  const SevIcon = style.icon;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${style.bg} border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors`}>
      <SevIcon size={16} className={`mt-0.5 flex-shrink-0 ${style.text}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{vuln.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full text-white font-medium ${style.badge}`}>{vuln.severity}</span>
          {vuln.cwe && <span className="text-xs text-gray-400 dark:text-gray-500">{vuln.cwe}</span>}
        </div>
        {vuln.remediation && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{vuln.remediation}</p>}
      </div>
      {vuln.patched ? (
        <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
      ) : (
        <button
          onClick={() => onPatch(vuln.id)}
          className="text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors flex-shrink-0"
        >
          Patch
        </button>
      )}
    </div>
  );
}

function NetworkCard({ network }) {
  if (!network) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
      <div className="flex items-center gap-2">
        <Network size={16} className="text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Network Status</h3>
        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${network.status === 'healthy' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
          {network.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: 'TLS', value: network.tlsVersion, ok: network.tlsEnabled },
          { label: 'HTTPS Only', value: network.httpsOnly ? 'Yes' : 'No', ok: network.httpsOnly },
          { label: 'CORS', value: network.corsProtected ? 'Protected' : 'Open', ok: network.corsProtected },
          { label: 'Rate Limit', value: network.rateLimitActive ? 'Active' : 'Off', ok: network.rateLimitActive },
          { label: 'Firewall', value: network.firewallActive ? 'Active' : 'Off', ok: network.firewallActive },
          { label: 'DDoS', value: network.ddosProtection ? 'Protected' : 'None', ok: network.ddosProtection },
        ].map(({ label, value, ok }) => (
          <div key={label} className={`flex items-center justify-between p-2 rounded-lg ${ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
            <div className="flex items-center gap-1">
              {ok ? <CheckCircle2 size={11} className="text-green-500" /> : <XCircle size={11} className="text-red-500" />}
              <span className={`font-medium ${ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{value}</span>
            </div>
          </div>
        ))}
      </div>
      {network.connections && (
        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-1"><Activity size={11} className="text-blue-500" /> {network.connections.active} active</span>
          <span className="flex items-center gap-1"><ShieldX size={11} className="text-red-500" /> {network.connections.blocked} blocked</span>
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device }) {
  if (!device) return null;
  const memPct = device.memory?.percent || 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
      <div className="flex items-center gap-2">
        <Cpu size={16} className="text-purple-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Device Health</h3>
      </div>
      <div className="space-y-2 text-xs">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-500 dark:text-gray-400">Memory Usage</span>
            <span className="font-medium">{memPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${memPct}%`, background: memPct > 90 ? '#ef4444' : memPct > 70 ? '#f59e0b' : '#22c55e' }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          {[
            { label: 'Platform', value: device.platform },
            { label: 'Arch', value: device.arch },
            { label: 'CPUs', value: device.cpu?.count },
            { label: 'Load Avg', value: device.cpu?.loadAvg?.[0]?.toFixed(2) },
            { label: 'OS Patches', value: device.osPatchLevel, ok: device.osPatchLevel === 'Up to date' },
            { label: 'Disk Enc.', value: 'Check OS', ok: false },
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-md">
              <span className="text-gray-500 dark:text-gray-400">{label}</span>
              <span className={`font-medium ${ok === undefined ? 'text-gray-700 dark:text-gray-300' : ok ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>{String(value || '—')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SecurityDashboardFull({ token }) {
  const [dashboard, setDashboard] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [scanResult, setScanResult] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/security/dashboard', { headers });
      if (!resp.ok) throw new Error('Failed to load security dashboard');
      setDashboard(await resp.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const resp = await fetch('/api/security/scan', { method: 'POST', headers });
      if (!resp.ok) throw new Error('Scan failed');
      const result = await resp.json();
      setScanResult(result);
      await fetchDashboard();
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const patchVuln = async (vulnId) => {
    const resp = await fetch('/api/security/patch', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vulnerabilityId: vulnId }),
    });
    if (resp.ok) fetchDashboard();
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Bug },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'device', label: 'Device', icon: Cpu },
  ];

  if (loading && !dashboard) return (
    <div className="flex items-center justify-center h-48">
      <RefreshCw className="animate-spin text-blue-500" size={28} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-blue-500" size={22} />
            Security Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {dashboard?.lastScan ? `Last scanned: ${new Date(dashboard.lastScan).toLocaleString()}` : 'No scan run yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDashboard} disabled={loading} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Scan size={15} className={scanning ? 'animate-pulse' : ''} />
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && dashboard && (
        <div className="space-y-4">
          {/* Score + summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={dashboard.overallScore} label={dashboard.scoreLabel} />
            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Critical', value: dashboard.summary?.critical, color: 'text-red-600 dark:text-red-400' },
                  { label: 'High', value: dashboard.summary?.high, color: 'text-orange-600 dark:text-orange-400' },
                  { label: 'Medium', value: dashboard.summary?.medium, color: 'text-yellow-600 dark:text-yellow-400' },
                  { label: 'Low', value: dashboard.summary?.low, color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Patched', value: dashboard.summary?.patched, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Total', value: dashboard.summary?.total, color: 'text-gray-600 dark:text-gray-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Encryption + MFA status */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Encryption', value: dashboard.encryptionStatus, icon: Lock, ok: true },
              { label: 'MFA', value: dashboard.mfaEnabled ? 'Enabled' : 'Disabled', icon: ShieldCheck, ok: dashboard.mfaEnabled },
              { label: 'TLS', value: dashboard.tlsVersion, icon: Globe, ok: true },
            ].map(({ label, value, icon: Icon, ok }) => (
              <div key={label} className={`flex items-center gap-3 p-3 rounded-xl ${ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} border ${ok ? 'border-green-100 dark:border-green-900' : 'border-red-100 dark:border-red-900'}`}>
                <Icon size={18} className={ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Scan result */}
          {scanResult && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle2 size={16} /> Scan Complete — Score: {scanResult.score}/100
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {scanResult.summary?.patched} of {scanResult.summary?.total} checks passing · Duration: {scanResult.duration}ms
              </p>
            </div>
          )}
        </div>
      )}

      {/* Vulnerabilities tab */}
      {activeTab === 'vulnerabilities' && dashboard && (
        <div className="space-y-2">
          {dashboard.vulnerabilities?.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
              <ShieldCheck size={40} />
              <p className="font-medium">No vulnerabilities found</p>
            </div>
          ) : (
            dashboard.vulnerabilities?.map(v => (
              <VulnerabilityRow key={v.id} vuln={v} onPatch={patchVuln} />
            ))
          )}
        </div>
      )}

      {/* Network tab */}
      {activeTab === 'network' && <NetworkCard network={dashboard?.network} />}

      {/* Device tab */}
      {activeTab === 'device' && <DeviceCard device={dashboard?.device} />}
    </div>
  );
}
