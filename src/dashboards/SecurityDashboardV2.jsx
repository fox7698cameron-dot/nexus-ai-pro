/*
 * Copyright © 2025-2026 Cameron Fox
 * Licensed under the Apache 2.0 License
 * File: src/dashboards/SecurityDashboardV2.jsx
 * Last updated: 2026-05-09
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

const TABS = ['Overview', 'Vulnerabilities', 'Network', 'Threats', 'Audit'];
const SEV_COLORS = {
  critical: 'bg-red-700 text-red-100',
  high: 'bg-orange-600 text-orange-100',
  medium: 'bg-yellow-600 text-yellow-100',
  low: 'bg-blue-600 text-blue-100',
};
const SCORE_COLOR = (s) =>
  s >= 80 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400';

function authHeaders() {
  const token = localStorage.getItem('nexus_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...opts.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function SevBadge({ severity }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${SEV_COLORS[severity] ?? 'bg-gray-600 text-gray-100'}`}>
      {severity}
    </span>
  );
}

export default function SecurityDashboardV2({ user }) {
  const [tab, setTab] = useState('Overview');
  const [scan, setScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [patching, setPatching] = useState({});
  const [encHealth, setEncHealth] = useState(null);
  const [rotating, setRotating] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [auditPage, setAuditPage] = useState(0);
  const [network, setNetwork] = useState({ status: 'online', latency: null });
  const [device, setDevice] = useState({ battery: null, storage: null, memory: null, platform: '' });
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const PAGE_SIZE = 20;

  // --- Platform detection ---
  const detectPlatform = useCallback(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/win/i.test(ua)) return 'Windows';
    if (/mac/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Desktop';
  }, []);

  // --- Device info ---
  useEffect(() => {
    const platform = detectPlatform();
    const memory = typeof performance !== 'undefined' && performance.memory
      ? { used: performance.memory.usedJSHeapSize, total: performance.memory.jsHeapSizeLimit }
      : null;

    let batteryPromise = null;
    if (navigator.getBattery) {
      batteryPromise = navigator.getBattery().then((b) => ({
        level: Math.round(b.level * 100),
        charging: b.charging,
      })).catch(() => null);
    }

    let storagePromise = null;
    if (navigator.storage && navigator.storage.estimate) {
      storagePromise = navigator.storage.estimate().then((est) => ({
        used: est.usage,
        quota: est.quota,
        pct: est.quota ? Math.round((est.usage / est.quota) * 100) : 0,
      })).catch(() => null);
    }

    Promise.all([batteryPromise, storagePromise]).then(([battery, storage]) => {
      setDevice({ battery, storage, memory, platform });
    });
  }, [detectPlatform]);

  // --- Network monitoring ---
  const checkLatency = useCallback(async () => {
    if (!navigator.onLine) { setNetwork({ status: 'offline', latency: null }); return; }
    const start = Date.now();
    try {
      await fetch('/api/health', { method: 'HEAD', cache: 'no-store', headers: authHeaders() });
      const ms = Date.now() - start;
      setNetwork({ status: ms > 2000 ? 'degraded' : 'online', latency: ms });
    } catch {
      setNetwork({ status: navigator.onLine ? 'degraded' : 'offline', latency: null });
    }
  }, []);

  useEffect(() => {
    checkLatency();
    const id = setInterval(checkLatency, 15000);
    const onOnline = () => checkLatency();
    const onOffline = () => setNetwork({ status: 'offline', latency: null });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { clearInterval(id); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [checkLatency]);

  // --- Security scan ---
  const runScan = useCallback(async () => {
    setScanning(true); setError(null);
    try {
      const data = await apiFetch('/api/security/scan', { method: 'POST' });
      setScan(data);
    } catch (e) { setError(e.message); }
    finally { setScanning(false); }
  }, []);

  useEffect(() => {
    runScan();
    const id = setInterval(runScan, 60000);
    return () => clearInterval(id);
  }, [runScan]);

  // --- Patch vulnerability ---
  const patchVuln = useCallback(async (id) => {
    setPatching((p) => ({ ...p, [id]: true }));
    try {
      await apiFetch('/api/security/patch', { method: 'POST', body: JSON.stringify({ id }) });
      await runScan();
    } catch (e) { setError(e.message); }
    finally { setPatching((p) => ({ ...p, [id]: false })); }
  }, [runScan]);

  // --- Encryption health ---
  const fetchEncHealth = useCallback(async () => {
    try { setEncHealth(await apiFetch('/api/security/encryption-health')); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { fetchEncHealth(); }, [fetchEncHealth]);

  const rotateKeys = useCallback(async () => {
    setRotating(true); setError(null);
    try { await apiFetch('/api/security/rotate-keys', { method: 'POST' }); await fetchEncHealth(); }
    catch (e) { setError(e.message); }
    finally { setRotating(false); }
  }, [fetchEncHealth]);

  // --- Alerts ---
  const fetchAlerts = useCallback(async () => {
    try { const d = await apiFetch('/api/security/alerts'); setAlerts(d.alerts ?? d ?? []); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 30000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  // --- Audit log ---
  const fetchAudit = useCallback(async () => {
    try { const d = await apiFetch(`/api/security/audit?limit=${PAGE_SIZE}&offset=${auditPage * PAGE_SIZE}`); setAudit(d.events ?? d ?? []); }
    catch (e) { setError(e.message); }
  }, [auditPage]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  // --- WebSocket for scan:complete ---
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (!token) return;
    try {
      const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'security:scan:complete') { setScan(msg.data ?? null); }
        } catch {}
      };
      return () => ws.close();
    } catch {}
  }, []);

  // --- Helpers ---
  const vulns = scan?.vulnerabilities ?? [];
  const score = scan?.score ?? null;
  const netColor = network.status === 'online' ? 'text-green-400' : network.status === 'degraded' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
            {user && <p className="text-gray-400 text-sm mt-0.5">Logged in as {user.name ?? user.email ?? 'User'}</p>}
          </div>
          {score !== null && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Security Score</span>
              <span className={`text-3xl font-bold ${SCORE_COLOR(score)}`}>{score}</span>
              <span className="text-gray-500 text-sm">/100</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-900 border border-red-700 text-red-200 rounded px-4 py-2 text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'Overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card title="Scan Status">
              <p className="text-sm text-gray-400 mb-3">{scan ? `Last scan: ${new Date(scan.timestamp ?? Date.now()).toLocaleString()}` : 'No scan data'}</p>
              <button onClick={runScan} disabled={scanning}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded transition-colors">
                {scanning ? 'Scanning…' : 'Run Scan Now'}
              </button>
            </Card>
            <Card title="Network">
              <p className={`text-lg font-semibold capitalize ${netColor}`}>{network.status}</p>
              {network.latency !== null && <p className="text-sm text-gray-400">Latency: {network.latency}ms {network.latency > 2000 && <span className="text-yellow-400">(slow)</span>}</p>}
            </Card>
            <Card title="Device">
              <p className="text-sm text-gray-300">Platform: {device.platform}</p>
              {device.battery && <p className="text-sm text-gray-400">Battery: {device.battery.level}% {device.battery.charging ? '⚡' : ''}</p>}
              {device.storage && <p className={`text-sm ${device.storage.pct > 80 ? 'text-yellow-400' : 'text-gray-400'}`}>Storage: {device.storage.pct}% used{device.storage.pct > 80 ? ' (Warning)' : ''}</p>}
              {device.memory && <p className="text-sm text-gray-400">JS Heap: {Math.round(device.memory.used / 1048576)}MB / {Math.round(device.memory.total / 1048576)}MB</p>}
            </Card>
            <Card title="Encryption">
              {encHealth ? (
                <>
                  <p className="text-sm text-gray-300">Algorithm: {encHealth.algorithm}</p>
                  <p className="text-sm text-gray-400">Last rotation: {encHealth.lastRotation}</p>
                  <p className="text-sm text-gray-400">Next rotation: {encHealth.nextRotation}</p>
                  <p className={`text-sm ${encHealth.certExpiry && new Date(encHealth.certExpiry) < new Date(Date.now() + 30 * 86400000) ? 'text-red-400' : 'text-gray-400'}`}>
                    Cert expiry: {encHealth.certExpiry}
                  </p>
                  <button onClick={rotateKeys} disabled={rotating}
                    className="mt-3 w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm py-1.5 rounded transition-colors">
                    {rotating ? 'Rotating…' : 'Rotate Keys'}
                  </button>
                </>
              ) : <p className="text-gray-500 text-sm">Loading…</p>}
            </Card>
            <Card title="Threats">
              <p className="text-2xl font-bold text-white">{alerts.length}</p>
              <p className="text-sm text-gray-400">Active alerts</p>
            </Card>
            <Card title="Vulnerabilities">
              {scan ? (
                <div className="flex flex-wrap gap-2">
                  {['critical', 'high', 'medium', 'low'].map((s) => {
                    const c = vulns.filter((v) => v.severity === s).length;
                    return c > 0 ? <span key={s} className={`px-2 py-1 rounded text-xs font-semibold ${SEV_COLORS[s]}`}>{c} {s}</span> : null;
                  })}
                  {vulns.length === 0 && <p className="text-green-400 text-sm">No vulnerabilities</p>}
                </div>
              ) : <p className="text-gray-500 text-sm">Awaiting scan…</p>}
            </Card>
          </div>
        )}

        {/* Vulnerabilities */}
        {tab === 'Vulnerabilities' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Vulnerabilities ({vulns.length})</h2>
              <button onClick={runScan} disabled={scanning}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors">
                {scanning ? 'Scanning…' : 'Refresh'}
              </button>
            </div>
            {vulns.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">{scan ? 'No vulnerabilities detected.' : 'Run a scan to see results.'}</div>
            ) : (
              <div className="space-y-3">
                {vulns.map((v) => (
                  <div key={v.id} className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SevBadge severity={v.severity} />
                        <span className="font-medium text-white text-sm truncate">{v.title ?? v.id}</span>
                      </div>
                      {v.description && <p className="text-xs text-gray-400 truncate">{v.description}</p>}
                      {v.cve && <p className="text-xs text-gray-500">{v.cve}</p>}
                    </div>
                    <button onClick={() => patchVuln(v.id)} disabled={!!patching[v.id]}
                      className="shrink-0 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition-colors">
                      {patching[v.id] ? 'Patching…' : 'Patch'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Network */}
        {tab === 'Network' && (
          <div className="space-y-4">
            <Card title="Connectivity">
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-3 h-3 rounded-full ${network.status === 'online' ? 'bg-green-400' : network.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                <span className={`text-lg font-semibold capitalize ${netColor}`}>{network.status}</span>
              </div>
              {network.latency !== null && (
                <p className="text-sm text-gray-300">Round-trip latency: <span className={network.latency > 2000 ? 'text-yellow-400' : 'text-green-400'}>{network.latency}ms</span></p>
              )}
              <button onClick={checkLatency} className="mt-3 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors">Check Now</button>
            </Card>
            <Card title="Recent Request Stats">
              {audit.length > 0 ? (
                <div className="space-y-1">
                  {audit.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-400">
                      <span className="truncate mr-2">{a.event ?? a.action}</span>
                      <span className="shrink-0">{a.duration != null ? `${a.duration}ms` : '—'}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500 text-sm">No audit data available.</p>}
            </Card>
          </div>
        )}

        {/* Threats */}
        {tab === 'Threats' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Active Alerts ({alerts.length})</h2>
              <button onClick={fetchAlerts} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded transition-colors">Refresh</button>
            </div>
            {alerts.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">No active threats detected.</div>
            ) : (
              <div className="space-y-3">
                {alerts.map((a, i) => (
                  <div key={a.id ?? i} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <SevBadge severity={a.severity} />
                      <span className="text-sm font-medium text-white">{a.type ?? 'Alert'}</span>
                      <span className="ml-auto text-xs text-gray-500">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
                    </div>
                    {a.message && <p className="text-xs text-gray-400">{a.message}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit */}
        {tab === 'Audit' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Audit Log</h2>
              <button onClick={fetchAudit} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded transition-colors">Refresh</button>
            </div>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-300 font-medium">Event</th>
                    <th className="text-left px-4 py-2 text-gray-300 font-medium hidden sm:table-cell">Timestamp</th>
                    <th className="text-left px-4 py-2 text-gray-300 font-medium hidden md:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {audit.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No audit events found.</td></tr>
                  ) : audit.map((a, i) => (
                    <tr key={a.id ?? i} className="hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-200 font-mono text-xs">{a.event ?? a.action ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs hidden sm:table-cell whitespace-nowrap">{a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs hidden md:table-cell truncate max-w-xs">{a.details ?? a.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <button onClick={() => setAuditPage((p) => Math.max(0, p - 1))} disabled={auditPage === 0}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded transition-colors">
                Previous
              </button>
              <span className="text-gray-400 text-sm">Page {auditPage + 1}</span>
              <button onClick={() => setAuditPage((p) => p + 1)} disabled={audit.length < PAGE_SIZE}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}
