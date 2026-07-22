// src/components/dashboards/SecurityDashboard.jsx
// 2026-07-22 | Real-time security dashboard — scans, network, device, threats

import { useState, useEffect, useCallback } from 'react';

const SEVERITY_COLOR = {
  critical: '#ef4444', high: '#f97316', medium: '#fbbf24',
  low: '#4ade80', info: '#60a5fa', resolved: '#4ade80',
};

function StatusBadge({ status }) {
  const cfg = {
    secure: { bg: '#14532d', color: '#4ade80', label: 'Secure' },
    warning: { bg: '#78350f', color: '#fbbf24', label: 'Warning' },
    critical: { bg: '#7f1d1d', color: '#ef4444', label: 'Critical' },
  }[status] || { bg: '#1e293b', color: '#94a3b8', label: status };

  return (
    <span style={{
      background: cfg.bg, color: cfg.color, borderRadius: 999,
      padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    }}>
      {cfg.label}
    </span>
  );
}

function ScoreRing({ score }) {
  const r = 50, c = 2 * Math.PI * r;
  const progress = (score / 100) * c;
  const color = score > 80 ? '#4ade80' : score > 60 ? '#fbbf24' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg viewBox="0 0 120 120" style={{ width: 140, height: 140, transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${progress} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 30, fontWeight: 700, color }}>{score}</div>
        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Score</div>
      </div>
    </div>
  );
}

function ThreatRow({ event, date, details }) {
  const color = event.includes('CRITICAL') ? '#ef4444'
    : event.includes('THREAT') || event.includes('BLOCKED') ? '#f97316' : '#60a5fa';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>{event}</div>
        {details?.ip && <div style={{ color: '#6b7280', fontSize: 11 }}>IP: {details.ip}</div>}
      </div>
      <div style={{ color: '#4b5563', fontSize: 10, flexShrink: 0 }}>
        {new Date(date).toLocaleTimeString()}
      </div>
    </div>
  );
}

export default function SecurityDashboard({ token }) {
  const [dashboard, setDashboard] = useState(null);
  const [encHealth, setEncHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = useCallback(async () => {
    try {
      const [dash, enc, alrt] = await Promise.all([
        fetch('/api/security/dashboard', { headers }).then(r => r.json()),
        fetch('/api/security/encryption-health', { headers }).then(r => r.json()),
        fetch('/api/security/alerts', { headers }).then(r => r.json()),
      ]);
      setDashboard(dash);
      setEncHealth(enc);
      setAlerts(alrt.alerts || []);
      setLastRefresh(new Date());
    } catch {
      // will retry
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchAll]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/security/scan', { method: 'POST', headers });
      const scan = await res.json();
      await fetchAll();
    } finally {
      setScanning(false);
    }
  };

  const rotateKeys = async () => {
    await fetch('/api/security/rotate-keys', { method: 'POST', headers });
    await fetchAll();
  };

  const style = {
    panel: { background: '#0a0a0f', minHeight: '100vh', padding: 24, color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
    title: { fontSize: 24, fontWeight: 700 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 },
    cardTitle: { color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 },
    metric: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    metricLabel: { color: '#9ca3af', fontSize: 12 },
    metricValue: { color: '#f1f5f9', fontSize: 13, fontWeight: 600 },
    btn: { border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
    row: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  };

  if (loading) return <div style={style.panel}>Loading security dashboard...</div>;

  const vulns = dashboard?.vulnerabilities || [];
  const networkIssues = dashboard?.networkIssues || [];
  const activity = dashboard?.recentActivity || [];

  return (
    <div style={style.panel}>
      <div style={style.header}>
        <div>
          <div style={style.title}>Security Dashboard</div>
          {lastRefresh && (
            <div style={{ color: '#4b5563', fontSize: 11, marginTop: 4 }}>
              Last refreshed {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
        <div style={style.row}>
          <button
            onClick={triggerScan}
            disabled={scanning}
            style={{ ...style.btn, background: scanning ? '#374151' : '#6366f1', color: '#fff' }}
          >
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
          <button
            onClick={rotateKeys}
            style={{ ...style.btn, background: 'rgba(255,255,255,0.06)', color: '#f1f5f9' }}
          >
            Rotate Keys
          </button>
        </div>
      </div>

      {/* Top row: score + status + encryption */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ ...style.card, display: 'flex', alignItems: 'center', gap: 24 }}>
          <ScoreRing score={dashboard?.overallScore ?? 0} />
          <div>
            <div style={style.cardTitle}>Security Status</div>
            <StatusBadge status={dashboard?.status || 'secure'} />
            <div style={{ marginTop: 10 }}>
              <div style={{ color: '#6b7280', fontSize: 11 }}>Threats Blocked</div>
              <div style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>
                {dashboard?.threats?.totalBlocked ?? 0}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 8 }}>Unique Threat IPs</div>
              <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600 }}>
                {dashboard?.threats?.uniqueIps ?? 0}
              </div>
            </div>
          </div>
        </div>

        {encHealth && (
          <div style={{ ...style.card, flex: 1, minWidth: 240 }}>
            <div style={style.cardTitle}>Encryption Health</div>
            {[
              ['Algorithm', encHealth.algorithm],
              ['Key Length', `${encHealth.keyLength} bits`],
              ['IV Length', `${encHealth.ivLength} bits`],
              ['Auth Tag', `${encHealth.authTagLength} bits`],
              ['KDF', encHealth.kdf],
              ['KDF Iterations', encHealth.iterations?.toLocaleString()],
              ['Last Rotation', new Date(encHealth.lastKeyRotation).toLocaleDateString()],
              ['Next Rotation', new Date(encHealth.nextKeyRotation).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} style={style.metric}>
                <span style={style.metricLabel}>{k}</span>
                <span style={style.metricValue}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={style.grid}>
        {/* Vulnerabilities */}
        <div style={style.card}>
          <div style={style.cardTitle}>Vulnerabilities ({vulns.length})</div>
          {vulns.length === 0 ? (
            <div style={{ color: '#4ade80', fontSize: 13 }}>No vulnerabilities detected</div>
          ) : vulns.map((v, i) => (
            <div key={i} style={{ ...style.metric, borderLeftColor: SEVERITY_COLOR[v.severity], borderLeftWidth: 2, paddingLeft: 8 }}>
              <span style={style.metricLabel}>{v.name}</span>
              <span style={{ ...style.metricValue, color: SEVERITY_COLOR[v.severity] }}>{v.severity}</span>
            </div>
          ))}
        </div>

        {/* Network issues */}
        <div style={style.card}>
          <div style={style.cardTitle}>Network Issues ({networkIssues.length})</div>
          {networkIssues.length === 0 ? (
            <div style={{ color: '#4ade80', fontSize: 13 }}>Network healthy</div>
          ) : networkIssues.map((issue, i) => (
            <div key={i} style={style.metric}>
              <span style={style.metricLabel}>{issue.type}</span>
              <span style={{ ...style.metricValue, color: '#f97316' }}>
                {issue.count} {issue.count === 1 ? 'item' : 'items'}
              </span>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div style={style.card}>
          <div style={style.cardTitle}>Recent Alerts ({alerts.length})</div>
          {alerts.length === 0 ? (
            <div style={{ color: '#4ade80', fontSize: 13 }}>No active alerts</div>
          ) : alerts.slice(0, 10).map((a, i) => (
            <ThreatRow key={i} event={a.event} date={a.date} details={a.details} />
          ))}
        </div>

        {/* Activity log */}
        <div style={style.card}>
          <div style={style.cardTitle}>Audit Activity (recent)</div>
          {activity.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 13 }}>No activity yet</div>
          ) : activity.slice(0, 12).map((a, i) => (
            <div key={i} style={style.metric}>
              <span style={{ ...style.metricLabel, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.event}
              </span>
              <span style={{ color: '#4b5563', fontSize: 10 }}>
                {a.date ? new Date(a.date).toLocaleTimeString() : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scan time */}
      <div style={{ color: '#4b5563', fontSize: 11, marginTop: 8 }}>
        Last scan: {dashboard?.lastScan ? new Date(dashboard.lastScan).toLocaleString() : 'Never'}
      </div>
    </div>
  );
}
