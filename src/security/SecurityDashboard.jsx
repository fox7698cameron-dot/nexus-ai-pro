// src/security/SecurityDashboard.jsx
// 2026-06-12 | Nexus AI Pro — Enhanced Security Dashboard
// Real-time scans · network detection · device health · dependency audit
// Deep-nesting detector · lint checks · multi-platform support

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ---- severity helpers -----------------------------------------------

const SEV_CONFIG = {
  critical: { color: '#ff4444', bg: '#2d0000', label: 'Critical' },
  high:     { color: '#ff8c00', bg: '#2d1500', label: 'High' },
  medium:   { color: '#ffd700', bg: '#2d2600', label: 'Medium' },
  low:      { color: '#4caf50', bg: '#002d0a', label: 'Low' },
  info:     { color: '#1f6feb', bg: '#00102d', label: 'Info' }
};

function SevBadge({ severity }) {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG.info;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function ScoreRing({ score }) {
  const color = score >= 80 ? '#4caf50' : score >= 60 ? '#ffd700' : '#ff4444';
  const dash = 2 * Math.PI * 40;
  const offset = dash - (dash * score) / 100;
  return (
    <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={50} cy={50} r={40} fill="none" stroke="#21262d" strokeWidth={8} />
      <circle cx={50} cy={50} r={40} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={50} y={54} textAnchor="middle" fill={color} fontSize={18} fontWeight={700}
        style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>{score}</text>
    </svg>
  );
}

function StatusLight({ active, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: active ? '#4caf50' : '#ff4444',
        boxShadow: active ? '0 0 6px #4caf50' : 'none'
      }} />
      {label}
    </div>
  );
}

// ---- main component -------------------------------------------------

export default function SecurityDashboard({ socket }) {
  const [dashData, setDashData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [networkChecking, setNetworkChecking] = useState(false);
  const [deviceHealth, setDeviceHealth] = useState(null);
  const [encHealth, setEncHealth] = useState(null);
  const [threatHistory, setThreatHistory] = useState([]);
  const [liveMode, setLiveMode] = useState(false);

  const fetchDash = useCallback(async () => {
    try {
      const [dashR, alertsR, encR] = await Promise.all([
        fetch('/api/security/dashboard'),
        fetch('/api/security/alerts'),
        fetch('/api/security/encryption-health')
      ]);
      if (dashR.ok) setDashData(await dashR.json());
      if (alertsR.ok) setAlerts((await alertsR.json()).alerts || []);
      if (encR.ok) setEncHealth(await encR.json());
    } catch { /* ignore — stale data shows */ }
  }, []);

  const fetchDeviceHealth = useCallback(async () => {
    try {
      const r = await fetch('/api/security/device-health');
      if (r.ok) setDeviceHealth(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchDash(); fetchDeviceHealth(); }, [fetchDash, fetchDeviceHealth]);

  // Live-mode polling every 10s
  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(() => { fetchDash(); fetchDeviceHealth(); }, 10_000);
    return () => clearInterval(id);
  }, [liveMode, fetchDash, fetchDeviceHealth]);

  // Socket.io real-time threat feed
  useEffect(() => {
    if (!socket) return;
    const handler = (event) => {
      setThreatHistory(prev => [
        { ...event, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 49)
      ]);
    };
    socket.on('security:threat', handler);
    socket.on('security:alert', handler);
    return () => { socket.off('security:threat', handler); socket.off('security:alert', handler); };
  }, [socket]);

  const runScan = async () => {
    setScanning(true);
    try {
      const r = await fetch('/api/security/scan', { method: 'POST' });
      if (r.ok) await fetchDash();
    } finally {
      setScanning(false);
    }
  };

  const runNetworkCheck = async () => {
    setNetworkChecking(true);
    try {
      const r = await fetch('/api/security/network-scan', { method: 'POST' });
      if (r.ok) {
        const data = await r.json();
        setDashData(prev => prev ? { ...prev, networkScan: data } : prev);
      }
    } finally {
      setNetworkChecking(false);
    }
  };

  const score = dashData?.overallScore ?? 0;

  return (
    <div style={{ background: '#0d1117', color: '#e6edf3', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Security Dashboard</h1>
          <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>
            AES-256-GCM · PBKDF2/SHA-512 · Real-time threat monitoring
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={runScan} disabled={scanning} style={btnStyle('#1f6feb')}>
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
          <button onClick={runNetworkCheck} disabled={networkChecking} style={btnStyle('#8957e5')}>
            {networkChecking ? 'Checking…' : 'Network Scan'}
          </button>
          <button onClick={() => setLiveMode(m => !m)} style={btnStyle(liveMode ? '#166534' : '#30363d')}>
            {liveMode ? '● Live Mode ON' : 'Live Mode'}
          </button>
        </div>
      </div>

      {/* Score + status strip */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        {/* Security score */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <ScoreRing score={score} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Security Score</div>
            <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>
              {score >= 80 ? 'Good posture' : score >= 60 ? 'Needs attention' : 'Critical — action required'}
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <StatusLight active={dashData?.encryptionActive} label="Encryption Active" />
              <StatusLight active={!alerts.some(a => a.severity === 'critical')} label="No Critical Alerts" />
              <StatusLight active={encHealth?.status === 'healthy'} label="Key Health OK" />
            </div>
          </div>
        </div>

        {/* Encryption health */}
        {encHealth && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Encryption Health</div>
            <Row label="Algorithm" value={encHealth.algorithm} />
            <Row label="Last Key Rotation" value={new Date(encHealth.lastKeyRotation).toLocaleDateString()} />
            <Row label="Next Rotation" value={new Date(encHealth.nextKeyRotation).toLocaleDateString()} />
            <Row label="TLS Certificate" value={`expires ${new Date(encHealth.certificateExpiry).toLocaleDateString()}`} />
          </div>
        )}

        {/* Device health */}
        {deviceHealth && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Device Health</div>
            {deviceHealth.checks?.map((c, i) => (
              <Row key={i} label={c.name} value={<StatusLight active={c.pass} label={c.pass ? 'Pass' : 'Fail'} />} />
            ))}
          </div>
        )}
      </div>

      {/* Vulnerabilities */}
      {dashData?.vulnerabilities?.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Vulnerabilities ({dashData.vulnerabilities.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dashData.vulnerabilities.map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <SevBadge severity={v.severity} />
                <span style={{ flex: 1, fontSize: 14 }}>{v.name}</span>
                <span style={{ fontSize: 12, color: v.status === 'resolved' ? '#4caf50' : '#8b949e' }}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network scan results */}
      {dashData?.networkScan && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Network Scan Results</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <StatPill label="Open Ports" value={dashData.networkScan.openPorts?.length ?? 'N/A'} />
            <StatPill label="TLS Issues" value={dashData.networkScan.tlsIssues ?? 0} />
            <StatPill label="DNS Health" value={dashData.networkScan.dnsHealthy ? 'OK' : 'Issue'} />
            <StatPill label="Latency (ms)" value={dashData.networkScan.latencyMs ?? '—'} />
          </div>
          {dashData.networkScan.openPorts?.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#8b949e' }}>
              Open ports: {dashData.networkScan.openPorts.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Live threat feed */}
      {threatHistory.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Live Threat Feed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {threatHistory.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                <span style={{ color: '#8b949e', minWidth: 70 }}>{t.time}</span>
                <SevBadge severity={t.severity || 'info'} />
                <span style={{ flex: 1 }}>{t.type || t.event}</span>
                <span style={{ color: '#8b949e' }}>{t.ip || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent audit log */}
      {dashData?.recentActivity?.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Audit Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
            {dashData.recentActivity.map((entry, i) => (
              <div key={entry.id || i} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                <span style={{ color: '#8b949e', minWidth: 80 }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span style={{ color: '#58a6ff', minWidth: 180 }}>{entry.event}</span>
                <span style={{ flex: 1, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {JSON.stringify(entry.details || {})}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- local helpers -------------------------------------------------

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #21262d', fontSize: 13 }}>
      <span style={{ color: '#8b949e' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#8b949e' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg, color: '#e6edf3', border: 'none', borderRadius: 8,
    padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity .2s'
  };
}
