/**
 * NEXUS AI PRO - Security Dashboard Component
 * File: src/dashboards/SecurityDashboard.jsx
 * Date: 2026-08-26
 *
 * Real-time security dashboard with:
 * - On-demand full security scans
 * - Network issue detection
 * - On-device health monitoring
 * - Audit log viewer
 * - Real-time alerts via WebSocket
 */

import { useState, useEffect, useCallback } from 'react';

const LEVEL_CONFIG = {
  critical: { color: '#ef4444', bg: '#ef444422', icon: '🔴', weight: 4 },
  high: { color: '#f97316', bg: '#f9731622', icon: '🟠', weight: 3 },
  medium: { color: '#eab308', bg: '#eab30822', icon: '🟡', weight: 2 },
  low: { color: '#3b82f6', bg: '#3b82f622', icon: '🔵', weight: 1 },
  info: { color: '#6b7280', bg: '#6b728022', icon: '⚪', weight: 0 },
};

const STATUS_ICONS = { ok: '✅', warning: '⚠️', critical: '🚨', error: '❌', info: 'ℹ️', configured: '✅', not_configured: '⚪', connected: '✅' };

function ScanSummary({ summary }) {
  if (!summary) return null;
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '1rem' }}>
      {Object.entries(summary).map(([level, count]) => {
        const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.info;
        return (
          <div key={level} style={{ background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: 10, padding: '0.5rem 1rem', minWidth: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: cfg.color, fontWeight: 700, textTransform: 'uppercase' }}>{level}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: cfg.color }}>{count}</div>
          </div>
        );
      })}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.5rem 1rem', minWidth: 80, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{total}</div>
      </div>
    </div>
  );
}

function FindingRow({ finding }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = LEVEL_CONFIG[finding.level] || LEVEL_CONFIG.info;
  return (
    <div style={{ border: `1px solid ${cfg.color}44`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', background: cfg.bg, border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: 16 }}>{cfg.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, minWidth: 60, textTransform: 'uppercase' }}>{finding.level}</span>
        <span style={{ fontWeight: 600, color: 'var(--text)', flex: 1 }}>{finding.type?.replace(/_/g, ' ')}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{STATUS_ICONS[finding.status] || ''} {finding.status}</span>
        <span style={{ color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--card-bg)', fontSize: 13, color: 'var(--text-muted)' }}>
          {finding.detail}
          {finding.port && <span style={{ marginLeft: 8, background: '#6366f122', color: '#6366f1', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>Port {finding.port}</span>}
        </div>
      )}
    </div>
  );
}

function AuditLogViewer({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/security/audit-log?limit=50', { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        setLogs(data.logs || []);
      }
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>🗒 Audit Log</h3>
        <button onClick={fetchLogs} style={{ padding: '4px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Refresh</button>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto', background: 'var(--code-bg)', borderRadius: 10, padding: '0.75rem', fontFamily: 'monospace', fontSize: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No audit events recorded</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ marginBottom: 6, padding: '4px 8px', borderRadius: 6, background: log.level === 'error' ? '#ef444411' : 'transparent' }}>
              <span style={{ color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleString()}</span>
              {' '}
              <span style={{ color: log.level === 'error' ? '#ef4444' : log.level === 'warn' ? '#f97316' : '#6366f1', fontWeight: 600 }}>[{log.level?.toUpperCase()}]</span>
              {' '}
              <span style={{ color: 'var(--text)' }}>{log.event}</span>
              {log.data && Object.keys(log.data).length > 0 && (
                <span style={{ color: '#94a3b8' }}> {JSON.stringify(log.data)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function SecurityDashboard({ socket, userRole }) {
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_token') : null;

  const canScan = ['admin', 'dev'].includes(userRole);

  const runScan = async () => {
    if (!canScan) return;
    setScanning(true);
    try {
      const resp = await fetch('/api/security/scan', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        setScanResult(data);
      }
    } catch (err) {
      console.error('Scan failed', err);
    } finally {
      setScanning(false);
    }
  };

  const fetchLatest = useCallback(async () => {
    try {
      const resp = await fetch('/api/security/latest', { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) setScanResult(await resp.json());
    } catch { /* noop */ }
  }, [token]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join', 'security');

    socket.on('security:status', (data) => {
      setDeviceStatus(data);
    });

    socket.on('security:alert', (data) => {
      setLiveAlerts(prev => [...data.alerts.map(a => ({ ...a, timestamp: data.timestamp })), ...prev].slice(0, 50));
    });

    return () => {
      socket.off('security:status');
      socket.off('security:alert');
    };
  }, [socket]);

  const overallStatus = scanResult?.overallStatus;
  const statusColor = overallStatus === 'healthy' ? '#4ade80' : overallStatus === 'degraded' ? '#f59e0b' : '#ef4444';

  const tabs = ['overview', 'findings', 'audit', 'alerts'];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--text)', padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🛡 Security Dashboard</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Real-time security monitoring, scanning & network detection
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canScan && (
            <button
              onClick={runScan}
              disabled={scanning}
              style={{ padding: '0.5rem 1.25rem', background: scanning ? '#475569' : '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: scanning ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              {scanning ? '⏳ Scanning...' : '🔍 Run Scan'}
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {overallStatus && (
        <div style={{ background: `${statusColor}22`, border: `2px solid ${statusColor}`, borderRadius: 14, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>{overallStatus === 'healthy' ? '✅' : overallStatus === 'degraded' ? '⚠️' : '🚨'}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: statusColor, textTransform: 'capitalize' }}>System {overallStatus}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Last scan: {scanResult?.timestamp ? new Date(scanResult.timestamp).toLocaleString() : 'Never'} · Duration: {scanResult?.durationMs ? `${scanResult.durationMs}ms` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Live Alerts */}
      {liveAlerts.length > 0 && (
        <div style={{ background: '#ef444411', border: '1px solid #ef4444', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>🚨 Live Alerts ({liveAlerts.length})</div>
          {liveAlerts.slice(0, 5).map((a, i) => (
            <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #ef444422', color: '#ef4444' }}>
              {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ''} · {a.type?.replace(/_/g, ' ')} · {a.detail}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: 2 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '0.5rem 1rem', border: 'none', background: activeTab === tab ? '#6366f1' : 'transparent', color: activeTab === tab ? '#fff' : 'var(--text-muted)', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 400, textTransform: 'capitalize' }}
          >
            {tab === 'overview' ? '📊' : tab === 'findings' ? '🔍' : tab === 'audit' ? '📋' : '🔔'} {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div>
          {scanResult?.summary && <ScanSummary summary={scanResult.summary} />}
          {scanResult?.categories && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {Object.entries(scanResult.categories).map(([cat, statuses]) => {
                const hasIssues = statuses.some(s => s === 'warning' || s === 'critical' || s === 'error');
                return (
                  <div key={cat} style={{ background: hasIssues ? '#f9731622' : '#4ade8022', border: `1px solid ${hasIssues ? '#f97316' : '#4ade80'}44`, borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700, textTransform: 'capitalize', marginBottom: 4 }}>{cat.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{statuses.filter(s => s === 'ok' || s === 'configured').length}/{statuses.length} passing</div>
                    <div style={{ fontSize: 20, marginTop: 4 }}>{hasIssues ? '⚠️' : '✅'}</div>
                  </div>
                );
              })}
            </div>
          )}
          {!scanResult && !scanning && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              {canScan ? 'Run a scan to see security findings' : 'No scan results available'}
            </div>
          )}
        </div>
      )}

      {activeTab === 'findings' && (
        <div>
          {scanResult?.findings ? (
            [...scanResult.findings]
              .sort((a, b) => (LEVEL_CONFIG[b.level]?.weight || 0) - (LEVEL_CONFIG[a.level]?.weight || 0))
              .map((f, i) => <FindingRow key={i} finding={f} />)
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No findings — run a scan first</div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        canScan ? <AuditLogViewer token={token} /> : <div style={{ color: 'var(--text-muted)' }}>Admin/Dev access required</div>
      )}

      {activeTab === 'alerts' && (
        <div>
          <h3 style={{ margin: '0 0 1rem' }}>Real-time Alerts</h3>
          {liveAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No active alerts</div>
          ) : (
            liveAlerts.map((a, i) => {
              const cfg = LEVEL_CONFIG[a.level] || LEVEL_CONFIG.info;
              return (
                <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: 10, padding: '0.75rem 1rem', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{cfg.icon}</span>
                    <span style={{ fontWeight: 700, color: cfg.color }}>{a.type?.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{a.detail}</div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
