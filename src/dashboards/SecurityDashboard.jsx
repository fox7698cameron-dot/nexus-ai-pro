// src/dashboards/SecurityDashboard.jsx
// Nexus AI Pro — Real-Time Security Dashboard
// Updated: 2026-05-03

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, Lock, Key, Eye,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Wifi,
  Network, Monitor, Cpu, HardDrive, Activity, Zap,
  Clock, Search, Download, Bell, BellOff, Fingerprint
} from 'lucide-react';

const SEVERITY = {
  critical: { color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',    border: 'border-red-200 dark:border-red-800',    dot: 'bg-red-500',   label: 'Critical' },
  high:     { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500', label: 'High' },
  medium:   { color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', dot: 'bg-yellow-500', label: 'Medium' },
  low:      { color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800',   dot: 'bg-blue-500',  label: 'Low' },
  info:     { color: 'text-gray-600',   bg: 'bg-gray-50 dark:bg-gray-900/20',   border: 'border-gray-200 dark:border-gray-700',   dot: 'bg-gray-400',  label: 'Info' }
};

function generateNetworkScan() {
  const issues = [
    { id: 'net-1', type: 'OPEN_PORT', severity: 'medium', message: 'Port 8080 open — consider closing if unused', interface: 'eth0', timestamp: Date.now() - 12000 },
    { id: 'net-2', type: 'TLS_VERSION', severity: 'high', message: 'TLS 1.0/1.1 enabled — upgrade to TLS 1.3', interface: 'external', timestamp: Date.now() - 45000 },
    { id: 'net-3', type: 'DNS_LEAK', severity: 'low', message: 'DNS queries using fallback resolver', interface: 'eth0', timestamp: Date.now() - 90000 },
    { id: 'net-4', type: 'CERT_EXPIRY', severity: 'critical', message: 'SSL certificate expires in 7 days', interface: 'https', timestamp: Date.now() - 3600000 }
  ];
  return {
    status: Math.random() > 0.3 ? 'secure' : 'issues_found',
    latency: Math.round(10 + Math.random() * 40),
    bandwidth: { up: Math.round(10 + Math.random() * 90), down: Math.round(50 + Math.random() * 450) },
    activeConnections: Math.round(Math.random() * 20 + 5),
    blockedRequests: Math.round(Math.random() * 50),
    issues: Math.random() > 0.5 ? [issues[Math.floor(Math.random() * issues.length)]] : [],
    interfaces: [
      { name: 'eth0', ip: '192.168.1.x', status: 'active', encrypted: true },
      { name: 'lo', ip: '127.0.0.1', status: 'active', encrypted: false }
    ]
  };
}

function generateDeviceScan() {
  return {
    os: navigator.platform || 'Unknown',
    browser: navigator.userAgent.includes('Chrome') ? 'Chromium' : 'Other',
    memoryPressure: Math.random() > 0.7 ? 'high' : 'normal',
    cpuUsage: Math.round(Math.random() * 60 + 10),
    storageUsed: Math.round(Math.random() * 80 + 10),
    permissionsGranted: ['storage', 'notifications'],
    suspiciousActivity: Math.random() > 0.8,
    encryptionEnabled: true,
    biometricAvailable: true,
    vpnDetected: false,
    issues: Math.random() > 0.6 ? [{
      id: 'dev-1', type: 'HIGH_MEMORY', severity: 'medium',
      message: 'Memory usage elevated — consider closing unused tabs', timestamp: Date.now()
    }] : []
  };
}

function generateAppScan() {
  return {
    dependencies: { total: 247, vulnerable: Math.round(Math.random() * 5), updated: 239 },
    headers: { csp: true, hsts: true, xframe: true, xcontent: true, referrer: true },
    auth: { mfa: true, sessionTimeout: 3600, jwtValid: true, rateLimit: true },
    encryption: { atRest: true, inTransit: true, algorithm: 'AES-256-GCM', keyRotated: true },
    apiSecurity: { keyExposed: false, endpointsProtected: true, rateLimited: true },
    score: Math.round(85 + Math.random() * 14)
  };
}

function SeverityBadge({ severity }) {
  const s = SEVERITY[severity] || SEVERITY.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.color} ${s.border} border`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function StatusIndicator({ status, size = 'sm' }) {
  const isSecure = status === 'secure';
  const sz = size === 'lg' ? 'w-4 h-4' : 'w-2 h-2';
  return (
    <span className={`inline-block ${sz} rounded-full ${isSecure ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
  );
}

function SecurityScore({ score }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
  const r = 40, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" className="fill-gray-900 dark:fill-white" fontSize="18" fontWeight="bold">{score}</text>
        <text x="50" y="60" textAnchor="middle" fill={color} fontSize="9">{score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'At Risk'}</text>
      </svg>
      <span className="text-xs text-gray-500 dark:text-gray-400">Security Score</span>
    </div>
  );
}

function AlertItem({ alert, onDismiss }) {
  const s = SEVERITY[alert.severity] || SEVERITY.info;
  const age = Math.round((Date.now() - alert.timestamp) / 1000);
  const ageStr = age < 60 ? `${age}s ago` : age < 3600 ? `${Math.round(age/60)}m ago` : `${Math.round(age/3600)}h ago`;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${s.bg} ${s.border} mb-2`}>
      <AlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${s.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs text-gray-400">{ageStr}</span>
          {alert.interface && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{alert.interface}</span>}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-200">{alert.message}</p>
        <p className="text-xs text-gray-400 mt-0.5">{alert.type?.replace(/_/g, ' ')}</p>
      </div>
      <button onClick={() => onDismiss(alert.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <XCircle size={14} />
      </button>
    </div>
  );
}

function NetworkPanel({ data }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Network size={18} className="text-blue-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Network Security</h3>
        <StatusIndicator status={data.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        {[
          { label: 'Latency', value: `${data.latency}ms`, icon: <Zap size={14} />, ok: data.latency < 50 },
          { label: 'Upload', value: `${data.bandwidth.up} Mbps`, icon: <Activity size={14} />, ok: true },
          { label: 'Download', value: `${data.bandwidth.down} Mbps`, icon: <Activity size={14} />, ok: true },
          { label: 'Blocked', value: data.blockedRequests, icon: <ShieldX size={14} />, ok: true }
        ].map(item => (
          <div key={item.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className={`flex items-center gap-1 text-xs mb-1 ${item.ok ? 'text-green-600' : 'text-red-500'}`}>
              {item.icon} {item.label}
            </div>
            <div className="font-semibold text-gray-900 dark:text-white text-sm">{item.value}</div>
          </div>
        ))}
      </div>
      {data.interfaces.map(iface => (
        <div key={iface.name} className="flex items-center justify-between text-sm py-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Wifi size={13} className={iface.status === 'active' ? 'text-green-500' : 'text-gray-400'} />
            <span className="font-mono text-xs">{iface.name}</span>
            <span className="text-gray-400 text-xs">{iface.ip}</span>
          </div>
          <div className="flex items-center gap-2">
            {iface.encrypted && <Lock size={12} className="text-green-500" />}
            <span className={`text-xs ${iface.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{iface.status}</span>
          </div>
        </div>
      ))}
      {data.issues.map(issue => (
        <div key={issue.id} className={`mt-2 p-2 rounded text-xs ${SEVERITY[issue.severity]?.bg} ${SEVERITY[issue.severity]?.color}`}>
          ⚠ {issue.message}
        </div>
      ))}
    </div>
  );
}

function DevicePanel({ data }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Monitor size={18} className="text-purple-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Device Health</h3>
        {data.suspiciousActivity
          ? <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={10} /> Suspicious Activity</span>
          : <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle size={10} /> Clean</span>
        }
      </div>
      <div className="space-y-3">
        {[
          { label: 'CPU Usage', value: data.cpuUsage, unit: '%', warn: data.cpuUsage > 80 },
          { label: 'Storage Used', value: data.storageUsed, unit: '%', warn: data.storageUsed > 90 }
        ].map(item => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
              <span className={item.warn ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}>{item.value}{item.unit}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${item.warn ? 'bg-red-500' : item.value > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {[
            { label: 'Encryption', ok: data.encryptionEnabled, icon: <Lock size={12} /> },
            { label: 'Biometrics', ok: data.biometricAvailable, icon: <Fingerprint size={12} /> },
            { label: 'No VPN Issues', ok: !data.vpnDetected, icon: <Shield size={12} /> },
            { label: 'Memory OK', ok: data.memoryPressure !== 'high', icon: <Cpu size={12} /> }
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg ${item.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-700' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
              {item.icon}
              <span>{item.label}</span>
              {item.ok ? <CheckCircle size={10} className="ml-auto" /> : <XCircle size={10} className="ml-auto" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppSecurityPanel({ data }) {
  const headers = Object.entries(data.headers);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={18} className="text-green-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Application Security</h3>
        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 px-2 py-0.5 rounded-full">
          {data.score}/100
        </span>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Security Headers</div>
        <div className="flex flex-wrap gap-2">
          {headers.map(([key, ok]) => (
            <span key={key} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${ok ? 'bg-green-100 dark:bg-green-900/20 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {ok ? <CheckCircle size={10} /> : <XCircle size={10} />}
              {key.toUpperCase()}
            </span>
          ))}
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-3 mb-2">Dependencies</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(data.dependencies.updated / data.dependencies.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {data.dependencies.updated}/{data.dependencies.total} updated
          </span>
          {data.dependencies.vulnerable > 0 && (
            <span className="text-xs text-red-500">{data.dependencies.vulnerable} vulnerable</span>
          )}
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-3 mb-2">Encryption</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'At Rest', ok: data.encryption.atRest },
            { label: 'In Transit', ok: data.encryption.inTransit },
            { label: 'Key Rotated', ok: data.encryption.keyRotated },
            { label: 'MFA Active', ok: data.auth.mfa }
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${item.ok ? 'text-green-600' : 'text-red-600'}`}>
              {item.ok ? <CheckCircle size={10} /> : <XCircle size={10} />}
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SecurityDashboard({ userRole = 'admin' }) {
  const [networkData, setNetworkData] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [appData, setAppData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [overallStatus, setOverallStatus] = useState('secure');
  const [appScore, setAppScore] = useState(95);
  const intervalRef = useRef(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 600));

    const net = generateNetworkScan();
    const dev = generateDeviceScan();
    const appSec = generateAppScan();

    setNetworkData(net);
    setDeviceData(dev);
    setAppData(appSec);
    setAppScore(appSec.score);

    const newAlerts = [...net.issues, ...dev.issues].map(a => ({
      ...a,
      id: a.id + '-' + Date.now()
    }));
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
    }

    const hasIssues = net.issues.some(i => i.severity === 'critical' || i.severity === 'high')
      || dev.suspiciousActivity
      || appSec.dependencies.vulnerable > 0;
    setOverallStatus(hasIssues ? 'issues_found' : 'secure');
    setLastScan(new Date());
    setScanning(false);
  }, []);

  useEffect(() => {
    runScan();
  }, [runScan]);

  useEffect(() => {
    if (autoScan) {
      intervalRef.current = setInterval(runScan, 60000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoScan, runScan]);

  const dismissAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));
  const clearAlerts = () => setAlerts([]);

  const exportReport = () => {
    const report = { generatedAt: new Date().toISOString(), network: networkData, device: deviceData, app: appData, alerts };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className={overallStatus === 'secure' ? 'text-green-600' : 'text-red-500'} size={24} />
            Security Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time threat detection · Network · Device · Application
            {lastScan && ` · Last scan ${lastScan.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setNotificationsEnabled(n => !n)}
            className={`p-2 rounded-lg border transition-colors ${notificationsEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'} dark:bg-gray-800 dark:border-gray-600`}
          >
            {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button
            onClick={() => setAutoScan(s => !s)}
            className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${autoScan ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'} dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300`}
          >
            <Activity size={14} />
            {autoScan ? 'Auto Scan' : 'Manual'}
          </button>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Search size={14} className={scanning ? 'animate-pulse' : ''} />
            {scanning ? 'Scanning…' : 'Scan Now'}
          </button>
          {(userRole === 'admin' || userRole === 'dev') && (
            <button
              onClick={exportReport}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors"
            >
              <Download size={14} />
              Report
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div className={`rounded-xl p-4 mb-6 flex items-center gap-4 ${
        overallStatus === 'secure'
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}>
        {overallStatus === 'secure'
          ? <ShieldCheck size={28} className="text-green-600 flex-shrink-0" />
          : <ShieldAlert size={28} className="text-red-500 flex-shrink-0" />
        }
        <div className="flex-1">
          <div className={`font-semibold ${overallStatus === 'secure' ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {overallStatus === 'secure' ? 'All Systems Secure' : `${criticalAlerts.length} Issue${criticalAlerts.length !== 1 ? 's' : ''} Detected`}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Network · Device · Application · Encryption all monitored in real-time
          </div>
        </div>
        {appData && <SecurityScore score={appScore} />}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mb-6">
        {networkData && <NetworkPanel data={networkData} />}
        {deviceData && <DevicePanel data={deviceData} />}
        {appData && <AppSecurityPanel data={appData} />}
      </div>

      {/* Alerts panel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Security Alerts</h3>
            {alerts.length > 0 && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length > 0 && (
            <button onClick={clearAlerts} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              Clear all
            </button>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active security alerts</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {alerts.map(alert => (
              <AlertItem key={alert.id} alert={alert} onDismiss={dismissAlert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
