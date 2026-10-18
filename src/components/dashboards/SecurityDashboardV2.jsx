// src/components/dashboards/SecurityDashboardV2.jsx
// Created: 2026-10-18
// Real-time security dashboard: scans, network detection, on-device issues, threat feed

import React, { useState, useEffect, useCallback, useRef } from 'react';

const SEVERITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', info: '#6366f1' };
const STATUS_COLOR = { secure: '#22c55e', warning: '#eab308', critical: '#ef4444', scanning: '#6366f1' };

function SeverityBadge({ level }) {
  return (
    <span style={{ background: SEVERITY_COLOR[level] || '#475569', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
      {level}
    </span>
  );
}

function StatusIndicator({ status, animated }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: STATUS_COLOR[status] || '#94a3b8', fontWeight: 700 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[status] || '#94a3b8', animation: animated ? 'pulse 1.5s infinite' : 'none' }} />
      {status?.toUpperCase()}
    </span>
  );
}

function ScoreGauge({ score }) {
  const angle = (score / 100) * 180;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <svg viewBox="0 0 120 70" width="180" height="110">
        <path d="M10,65 A50,50 0 0,1 110,65" fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M10,65 A50,50 0 0,1 110,65"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 157} 157`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="60" y="62" textAnchor="middle" fill={color} fontSize="20" fontWeight="bold">{score}</text>
        <text x="60" y="73" textAnchor="middle" fill="#64748b" fontSize="9">/ 100</text>
      </svg>
      <div style={{ color, fontWeight: 700, fontSize: 14 }}>
        {score >= 80 ? 'Secure' : score >= 50 ? 'At Risk' : 'Critical'}
      </div>
    </div>
  );
}

function NetworkMonitor({ data }) {
  if (!data) return null;
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>🌐 Network Monitor</div>
      <div style={styles.grid2}>
        <div style={styles.statRow}><span style={styles.statLabel}>Inbound</span><span style={styles.statVal}>{data.inboundMbps || '—'} Mbps</span></div>
        <div style={styles.statRow}><span style={styles.statLabel}>Outbound</span><span style={styles.statVal}>{data.outboundMbps || '—'} Mbps</span></div>
        <div style={styles.statRow}><span style={styles.statLabel}>Active Connections</span><span style={styles.statVal}>{data.activeConnections || '—'}</span></div>
        <div style={styles.statRow}><span style={styles.statLabel}>Blocked IPs</span><span style={styles.statVal}>{data.blockedIPs || 0}</span></div>
        <div style={styles.statRow}><span style={styles.statLabel}>TLS Connections</span><span style={styles.statVal}>{data.tlsConnections || '—'}</span></div>
        <div style={styles.statRow}><span style={styles.statLabel}>Anomalies (24h)</span><span style={{ ...styles.statVal, color: (data.anomalies || 0) > 0 ? '#f97316' : '#22c55e' }}>{data.anomalies || 0}</span></div>
      </div>
    </div>
  );
}

function VulnerabilityList({ vulnerabilities, onPatch }) {
  if (!vulnerabilities?.length) {
    return <div style={{ color: '#22c55e', padding: 16, textAlign: 'center' }}>✅ No vulnerabilities found</div>;
  }
  return (
    <div>
      {vulnerabilities.map(v => (
        <div key={v.id || v.name} style={styles.vulnRow}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 15 }}>{v.name}</div>
            {v.description && <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{v.description}</div>}
            {v.cve && <div style={{ color: '#6366f1', fontSize: 11, marginTop: 2 }}>CVE: {v.cve}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <SeverityBadge level={v.severity} />
            {v.status === 'patched'
              ? <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>✅ Patched</span>
              : <button style={styles.patchBtn} onClick={() => onPatch(v.id || v.name)}>Patch</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SecurityDashboardV2({ token }) {
  const [dashboard, setDashboard] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [networkData, setNetworkData] = useState(null);
  const [encHealth, setEncHealth] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const wsRef = useRef(null);

  const apiFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [token]);

  const loadDashboard = useCallback(async () => {
    try {
      const [dash, alertData, net, enc, audit] = await Promise.allSettled([
        apiFetch('/api/security/dashboard'),
        apiFetch('/api/security/alerts'),
        apiFetch('/api/security/network'),
        apiFetch('/api/security/encryption-health'),
        apiFetch('/api/security/audit'),
      ]);
      if (dash.status === 'fulfilled') setDashboard(dash.value);
      if (alertData.status === 'fulfilled') setAlerts(alertData.value?.alerts || []);
      if (net.status === 'fulfilled') setNetworkData(net.value);
      if (enc.status === 'fulfilled') setEncHealth(enc.value);
      if (audit.status === 'fulfilled') setAuditLog(audit.value?.log?.slice(-20) || []);
    } catch (err) {
      console.error('[SecurityDashboardV2] load failed:', err.message);
    }
  }, [apiFetch]);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await apiFetch('/api/security/scan', { method: 'POST' });
      setDashboard(result);
      await loadDashboard();
    } catch (err) {
      console.error('[SecurityDashboardV2] scan failed:', err.message);
    } finally {
      setScanning(false);
    }
  }, [apiFetch, loadDashboard]);

  const patchVuln = useCallback(async (id) => {
    try {
      await apiFetch('/api/security/patch', { method: 'POST', body: JSON.stringify({ vulnerabilityId: id }) });
      await loadDashboard();
    } catch (err) {
      console.error('[SecurityDashboardV2] patch failed:', err.message);
    }
  }, [apiFetch, loadDashboard]);

  useEffect(() => {
    loadDashboard();
    const id = setInterval(loadDashboard, 15000);
    return () => clearInterval(id);
  }, [loadDashboard]);

  const score = dashboard?.overallScore ?? 95;
  const status = scanning ? 'scanning' : (score >= 80 ? 'secure' : score >= 50 ? 'warning' : 'critical');

  return (
    <div style={styles.container}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🛡️ Security Dashboard</h1>
          <StatusIndicator status={status} animated={scanning} />
        </div>
        <div style={styles.headerActions}>
          <button style={styles.scanBtn} onClick={runScan} disabled={scanning}>
            {scanning ? '🔄 Scanning…' : '🔍 Run Scan'}
          </button>
          <button style={styles.outlineBtn} onClick={loadDashboard}>⟳ Refresh</button>
        </div>
      </div>

      {/* Top metrics */}
      <div style={styles.topRow}>
        <div style={{ ...styles.card, minWidth: 200, textAlign: 'center' }}>
          <div style={styles.cardTitle}>Security Score</div>
          <ScoreGauge score={score} />
        </div>
        <div style={{ ...styles.card, flex: 1 }}>
          <div style={styles.cardTitle}>Quick Stats</div>
          <div style={styles.grid2}>
            <div style={styles.statRow}><span style={styles.statLabel}>Threats Blocked</span><span style={styles.statVal}>{dashboard?.threatsBlocked ?? '—'}</span></div>
            <div style={styles.statRow}><span style={styles.statLabel}>Patches Applied</span><span style={styles.statVal}>{dashboard?.patchesApplied ?? '—'}</span></div>
            <div style={styles.statRow}><span style={styles.statLabel}>Last Scan</span><span style={styles.statVal}>{dashboard?.lastScan ? new Date(dashboard.lastScan).toLocaleTimeString() : '—'}</span></div>
            <div style={styles.statRow}><span style={styles.statLabel}>Encryption</span><span style={{ ...styles.statVal, color: '#22c55e' }}>AES-256-GCM</span></div>
            <div style={styles.statRow}><span style={styles.statLabel}>Open Vulns</span><span style={{ ...styles.statVal, color: (dashboard?.vulnerabilities?.filter(v => v.status !== 'patched').length || 0) > 0 ? '#ef4444' : '#22c55e' }}>{dashboard?.vulnerabilities?.filter(v => v.status !== 'patched').length ?? 0}</span></div>
            <div style={styles.statRow}><span style={styles.statLabel}>Audit Log Size</span><span style={styles.statVal}>{dashboard?.auditLogSize ?? '—'}</span></div>
          </div>
        </div>
        <NetworkMonitor data={networkData} />
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview', 'vulnerabilities', 'alerts', 'audit', 'encryption'].map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Recent Alerts</div>
          {alerts.length === 0
            ? <div style={{ color: '#22c55e', padding: 16, textAlign: 'center' }}>✅ No recent alerts</div>
            : alerts.slice(0, 5).map((a, i) => (
              <div key={i} style={styles.alertRow}>
                <SeverityBadge level={a.severity || 'info'} />
                <span style={{ flex: 1, color: '#e2e8f0', fontSize: 14 }}>{a.message || a.type}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
              </div>
            ))}
        </div>
      )}

      {/* Vulnerabilities */}
      {activeTab === 'vulnerabilities' && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Vulnerability Report</div>
          <VulnerabilityList vulnerabilities={dashboard?.vulnerabilities} onPatch={patchVuln} />
        </div>
      )}

      {/* Alerts */}
      {activeTab === 'alerts' && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>All Security Alerts</div>
          {alerts.length === 0
            ? <div style={{ color: '#22c55e', padding: 16, textAlign: 'center' }}>No alerts</div>
            : alerts.map((a, i) => (
              <div key={i} style={styles.alertRow}>
                <SeverityBadge level={a.severity || 'info'} />
                <span style={{ flex: 1, color: '#e2e8f0', fontSize: 14 }}>{a.message || a.type}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{a.ip && `IP: ${a.ip}`}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
              </div>
            ))}
        </div>
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Audit Log (last 20 entries)</div>
          {auditLog.length === 0
            ? <div style={{ color: '#64748b', padding: 16 }}>No audit entries</div>
            : auditLog.map((entry, i) => (
              <div key={i} style={styles.auditRow}>
                <span style={{ color: '#6366f1', fontFamily: 'monospace', fontSize: 12 }}>{new Date(entry.timestamp).toISOString()}</span>
                <span style={{ color: '#e2e8f0', flex: 1, fontSize: 13, fontWeight: 600 }}>{entry.event}</span>
                <span style={{ color: '#94a3b8', fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(entry.details)}</span>
              </div>
            ))}
        </div>
      )}

      {/* Encryption */}
      {activeTab === 'encryption' && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Encryption Health</div>
          {encHealth ? (
            <div style={styles.grid2}>
              <div style={styles.statRow}><span style={styles.statLabel}>Algorithm</span><span style={{ ...styles.statVal, color: '#22c55e' }}>{encHealth.algorithm || 'AES-256-GCM'}</span></div>
              <div style={styles.statRow}><span style={styles.statLabel}>Key Status</span><span style={{ ...styles.statVal, color: '#22c55e' }}>{encHealth.keyStatus || 'Active'}</span></div>
              <div style={styles.statRow}><span style={styles.statLabel}>IV Length</span><span style={styles.statVal}>{encHealth.ivLength || 12} bytes</span></div>
              <div style={styles.statRow}><span style={styles.statLabel}>Tag Length</span><span style={styles.statVal}>{encHealth.tagLength || 16} bytes</span></div>
              <div style={styles.statRow}><span style={styles.statLabel}>Iterations</span><span style={styles.statVal}>{encHealth.iterations || 100000}</span></div>
              <div style={styles.statRow}><span style={styles.statLabel}>Hash</span><span style={styles.statVal}>{encHealth.hashAlgorithm || 'SHA-512'}</span></div>
            </div>
          ) : (
            <div style={{ color: '#64748b', padding: 16 }}>Loading encryption data…</div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#f8fafc' },
  headerActions: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  scanBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  outlineBtn: { background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 500 },
  topRow: { display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', flex: 1, minWidth: 260 },
  cardTitle: { fontWeight: 700, fontSize: 16, color: '#f1f5f9', marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  statRow: { display: 'flex', flexDirection: 'column', gap: 2 },
  statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { fontSize: 18, fontWeight: 700, color: '#f1f5f9' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 500 },
  tabActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  vulnRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #1e293b' },
  patchBtn: { background: '#f97316', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  alertRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e293b' },
  auditRow: { display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b' },
};
