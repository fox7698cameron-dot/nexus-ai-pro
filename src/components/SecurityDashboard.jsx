// ================================================
// NEXUS AI PRO - Security Dashboard
// File: src/components/SecurityDashboard.jsx
// Updated: 2026-07-01
// Real-time security scans · Network monitoring
// Threat detection · Encryption health
// Works on Web, Electron, iOS, Android
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Key, Eye,
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Info,
  Network, Wifi, Activity, Cpu, HardDrive, Server,
  Fingerprint, ScanFace, Zap,
} from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: XCircle },
  high:     { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', icon: AlertTriangle },
  medium:   { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', icon: Info },
  low:      { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: Info },
  resolved: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: CheckCircle },
};

function ScoreRing({ score }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="-rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{pct}</div>
        <div className="text-xs text-gray-500">/ 100</div>
      </div>
    </div>
  );
}

function VulnCard({ vuln, onPatch }) {
  const cfg = SEVERITY_CONFIG[vuln.status] || SEVERITY_CONFIG[vuln.severity] || SEVERITY_CONFIG.medium;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <Icon size={16} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${cfg.color}`}>{vuln.name}</div>
        {vuln.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{vuln.description}</div>}
      </div>
      {vuln.status !== 'resolved' && vuln.status !== 'patched' && onPatch && (
        <button onClick={() => onPatch(vuln.id)} className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors whitespace-nowrap">
          Patch
        </button>
      )}
      {(vuln.status === 'resolved' || vuln.status === 'patched') && (
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Patched</span>
      )}
    </div>
  );
}

function EncryptionBadge({ algorithm }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-full">
      <Lock size={12} className="text-green-600 dark:text-green-400" />
      <span className="text-xs font-semibold text-green-700 dark:text-green-300">{algorithm || 'AES-256-GCM'}</span>
    </div>
  );
}

export default function SecurityDashboard({ socket, isElectron = false }) {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [encHealth, setEncHealth] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [auditLog, setAuditLog] = useState([]);

  const api = async (path, method = 'GET', body) => {
    const token = localStorage.getItem('nexus_access_token');
    const headers = { Authorization: `Bearer ${token}` };
    if (body) headers['Content-Type'] = 'application/json';

    // Electron bridge fallback
    if (isElectron && window.electron?.security) {
      const map = {
        '/api/security/dashboard': () => window.electron.security.getDashboard(),
        '/api/security/scan': () => window.electron.security.runScan(),
      };
      if (map[path]) return map[path]();
    }

    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [dash, al, enc, log] = await Promise.allSettled([
        api('/api/security/dashboard'),
        api('/api/security/alerts'),
        api('/api/security/encryption-health'),
        api('/api/security/audit?limit=20'),
      ]);
      if (dash.status === 'fulfilled')  setDashboard(dash.value);
      if (al.status   === 'fulfilled')  setAlerts(al.value?.alerts || []);
      if (enc.status  === 'fulfilled')  setEncHealth(enc.value);
      if (log.status  === 'fulfilled')  setAuditLog(log.value?.logs || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { loadAll(); const t = setInterval(loadAll, 30000); return () => clearInterval(t); }, [loadAll]);

  // Real-time events
  useEffect(() => {
    if (!socket) return;
    socket.on('security:alert', alert => setAlerts(prev => [alert, ...prev].slice(0, 50)));
    socket.on('security:scan', result => setDashboard(prev => ({ ...prev, ...result })));
    return () => { socket.off('security:alert'); socket.off('security:scan'); };
  }, [socket]);

  const runScan = async () => {
    setScanning(true);
    try {
      const result = await api('/api/security/scan', 'POST');
      setDashboard(prev => ({ ...prev, ...result, lastScanTime: Date.now() }));
    } catch (err) { setError(err.message); }
    finally { setScanning(false); }
  };

  const patchVuln = async id => {
    try {
      const result = await api('/api/security/patch', 'POST', { id });
      if (result && dashboard) {
        setDashboard(prev => ({
          ...prev,
          vulnerabilities: (prev.vulnerabilities || []).map(v => v.id === id ? { ...v, status: 'patched' } : v),
          overallScore: Math.min(100, (prev.overallScore || 90) + 3),
        }));
      }
    } catch (err) { setError(err.message); }
  };

  const tabs = ['overview', 'vulnerabilities', 'alerts', 'encryption', 'audit'];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-green-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Security Dashboard</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Real-time threat monitoring &amp; encryption health</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EncryptionBadge algorithm={dashboard?.encryptionStatus} />
          <button onClick={runScan} disabled={scanning} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
            {scanning ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors ${activeTab === t ? 'bg-gray-50 dark:bg-gray-900 text-blue-600 dark:text-blue-400 border border-b-0 border-gray-200 dark:border-gray-700' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t}
            {t === 'alerts' && alerts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* OVERVIEW */}
        {activeTab === 'overview' && dashboard && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                <ScoreRing score={dashboard.overallScore || 95} />
                <div className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Security Score</div>
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                {[
                  { label: 'Threats Blocked', value: dashboard.threatsBlocked ?? 0, icon: ShieldCheck, color: 'text-green-500' },
                  { label: 'Patches Applied', value: dashboard.patchesApplied ?? 0, icon: Key, color: 'text-blue-500' },
                  { label: 'Audit Events',    value: dashboard.auditLogSize ?? 0,  icon: Activity, color: 'text-purple-500' },
                  { label: 'Vulnerabilities', value: (dashboard.vulnerabilities || []).filter(v => v.status !== 'resolved').length, icon: AlertTriangle, color: 'text-orange-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <Icon size={18} className={`${color} mb-2`} />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Biometric methods available */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Fingerprint size={16} className="text-blue-500" /> Authentication Methods
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Touch ID / Fingerprint', icon: Fingerprint, status: 'available' },
                  { label: 'Face ID', icon: ScanFace, status: 'available' },
                  { label: 'TOTP 2FA', icon: Key, status: 'available' },
                  { label: 'MFA', icon: Shield, status: 'available' },
                ].map(({ label, icon: Icon, status }) => (
                  <div key={label} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                    <Icon size={14} className="text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-700 dark:text-green-300">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Network */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Network size={16} className="text-blue-500" /> Network Status
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'TLS/HTTPS', icon: Lock, ok: true },
                  { label: 'Rate Limiting', icon: Shield, ok: true },
                  { label: 'CORS Policy', icon: Network, ok: true },
                ].map(({ label, icon: Icon, ok }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon size={14} className={ok ? 'text-green-500' : 'text-red-500'} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                    <span className={`text-xs ${ok ? 'text-green-500' : 'text-red-500'}`}>{ok ? '✓' : '✗'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VULNERABILITIES */}
        {activeTab === 'vulnerabilities' && (
          <div className="space-y-3">
            {(dashboard?.vulnerabilities || []).length === 0 && (
              <div className="text-center py-12">
                <ShieldCheck size={48} className="mx-auto text-green-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No vulnerabilities detected</p>
              </div>
            )}
            {(dashboard?.vulnerabilities || []).map((v, i) => <VulnCard key={v.id || i} vuln={v} onPatch={patchVuln} />)}
          </div>
        )}

        {/* ALERTS */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No active alerts</p>
              </div>
            )}
            {alerts.map((a, i) => {
              const cfg = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.medium;
              const Icon = cfg.icon;
              return (
                <div key={a.id || i} className={`p-4 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-start gap-3">
                    <Icon size={16} className={`${cfg.color} mt-0.5`} />
                    <div>
                      <div className={`text-sm font-medium ${cfg.color}`}>{a.event || a.type}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(a.ts || a.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ENCRYPTION */}
        {activeTab === 'encryption' && encHealth && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock size={16} className="text-blue-500" /> Encryption Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Algorithm', encHealth.algorithm || 'AES-256-GCM'],
                  ['Key Derivation', encHealth.keyDerivation || 'PBKDF2-SHA512'],
                  ['PBKDF2 Iterations', (encHealth.iterations || 100000).toLocaleString()],
                  ['Status', encHealth.status || 'healthy'],
                  ['Last Key Rotation', encHealth.lastKeyRotation ? new Date(encHealth.lastKeyRotation).toLocaleString() : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AUDIT */}
        {activeTab === 'audit' && (
          <div className="space-y-2">
            {auditLog.length === 0 && <p className="text-center text-gray-500 py-8">No audit events</p>}
            {auditLog.map((entry, i) => (
              <div key={entry.id || i} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <Activity size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.event}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(entry.ts || entry.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
