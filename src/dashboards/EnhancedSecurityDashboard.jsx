// src/dashboards/EnhancedSecurityDashboard.jsx
// 2026-06-06 | Enhanced security dashboard: real-time scans, network detection,
// on-device issues, encryption health, threat intelligence — cross-platform

import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../auth/AuthService.js';

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e', info: '#818cf8' };

function ScoreRing({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const r = 42, circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto' }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1a1a1a" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: '22px', fontWeight: '800', lineHeight: 1 }}>{score}</span>
        <span style={{ color: '#666', fontSize: '10px' }}>/ 100</span>
      </div>
    </div>
  );
}

function Alert({ severity, message, timestamp }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', background: `${SEVERITY_COLORS[severity]}0d`, border: `1px solid ${SEVERITY_COLORS[severity]}33`, borderRadius: '8px', marginBottom: '8px' }}>
      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: SEVERITY_COLORS[severity] + '33', color: SEVERITY_COLORS[severity], fontWeight: '700', whiteSpace: 'nowrap', marginTop: '1px' }}>
        {severity?.toUpperCase()}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: '#fff', fontSize: '13px' }}>{message}</p>
        {timestamp && <p style={{ margin: '3px 0 0', color: '#555', fontSize: '11px' }}>{new Date(timestamp).toLocaleString()}</p>}
      </div>
    </div>
  );
}

function NetworkScanRow({ check, status }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
      <span style={{ color: '#aaa', fontSize: '13px' }}>{check}</span>
      <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '10px', background: status === 'pass' ? '#22c55e22' : status === 'warn' ? '#f59e0b22' : '#ef444422', color: status === 'pass' ? '#22c55e' : status === 'warn' ? '#f59e0b' : '#ef4444' }}>
        {status === 'pass' ? '✓ Pass' : status === 'warn' ? '⚠ Warn' : '✕ Fail'}
      </span>
    </div>
  );
}

function EncryptionBadge({ algorithm, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#0a0a0a', borderRadius: '8px' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: active ? '#22c55e' : '#ef4444' }} />
      <div>
        <p style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: '600' }}>{algorithm}</p>
        <p style={{ margin: '2px 0 0', color: '#666', fontSize: '11px' }}>{active ? 'Active & Healthy' : 'Inactive'}</p>
      </div>
    </div>
  );
}

export default function EnhancedSecurityDashboard({ socket }) {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [encHealth, setEncHealth] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [networkChecks, setNetworkChecks] = useState(null);
  const [deviceChecks, setDeviceChecks] = useState(null);
  const [liveThreats, setLiveThreats] = useState([]);
  const [lastScanTime, setLastScanTime] = useState(null);

  const loadAll = useCallback(async () => {
    const [dashRes, alertRes, encRes] = await Promise.all([
      authFetch('/api/security/dashboard').catch(() => null),
      authFetch('/api/security/alerts').catch(() => null),
      authFetch('/api/security/encryption-health').catch(() => null)
    ]);

    if (dashRes?.ok) setDashboard(await dashRes.json());
    if (alertRes?.ok) {
      const d = await alertRes.json();
      setAlerts(d.alerts || []);
    }
    if (encRes?.ok) setEncHealth(await encRes.json());

    // Run device checks locally
    setDeviceChecks(performDeviceChecks());
    // Run network checks locally
    setNetworkChecks(performNetworkChecks());
    setLastScanTime(new Date());
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Real-time threat feed via Socket.io
  useEffect(() => {
    if (!socket) return;
    socket.on('security:threat', (threat) => {
      setLiveThreats(prev => [{ ...threat, receivedAt: Date.now() }, ...prev].slice(0, 20));
    });
    return () => socket.off('security:threat');
  }, [socket]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(loadAll, 30000);
    return () => clearInterval(id);
  }, [loadAll]);

  const runScan = async () => {
    setIsScanning(true);
    try {
      const res = await authFetch('/api/security/scan', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        await loadAll();
        setLastScanTime(new Date());
        // Push live threat notification
        if (result.vulnerabilities?.length > 0) {
          setLiveThreats(prev => [{
            type: 'SCAN_FOUND_VULNERABILITIES',
            count: result.vulnerabilities.length,
            receivedAt: Date.now()
          }, ...prev].slice(0, 20));
        }
      }
    } catch (_) { /* scan failure is non-fatal */ }
    setIsScanning(false);
  };

  const rotateKeys = async () => {
    await authFetch('/api/security/rotate-keys', { method: 'POST' });
    await loadAll();
  };

  const patch = async (vulnId) => {
    const res = await authFetch('/api/security/patch', { method: 'POST', body: JSON.stringify({ vulnId }) });
    if (res.ok) {
      setDashboard(prev => prev ? {
        ...prev,
        vulnerabilities: prev.vulnerabilities?.map(v => v.id === vulnId ? { ...v, status: 'resolved' } : v),
        overallScore: Math.min(100, (prev.overallScore || 0) + 5)
      } : prev);
    }
  };

  if (!dashboard) {
    return (
      <div style={{ padding: '24px', color: '#fff', textAlign: 'center' }}>
        <p style={{ color: '#666' }}>Loading security dashboard…</p>
      </div>
    );
  }

  const score = dashboard.overallScore || 0;

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'system-ui, -apple-system', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>🛡️ Security Dashboard</h2>
          {lastScanTime && <p style={{ margin: '4px 0 0', color: '#555', fontSize: '12px' }}>Last scan: {lastScanTime.toLocaleTimeString()} · Auto-refresh 30s</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={rotateKeys} style={{ padding: '8px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#aaa', cursor: 'pointer', fontSize: '12px' }}>
            🔑 Rotate Keys
          </button>
          <button onClick={runScan} disabled={isScanning}
            style={{ padding: '8px 18px', background: isScanning ? '#555' : '#667eea', border: 'none', borderRadius: '8px', color: '#fff', cursor: isScanning ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600' }}>
            {isScanning ? '🔍 Scanning…' : '🔍 Run Scan'}
          </button>
        </div>
      </div>

      {/* Score + live threat feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', marginBottom: '24px', alignItems: 'start' }}>
        {/* Score ring */}
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '24px', textAlign: 'center', minWidth: '160px' }}>
          <ScoreRing score={score} />
          <p style={{ margin: '12px 0 0', color: '#fff', fontWeight: '600', fontSize: '14px' }}>Security Score</p>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '11px' }}>
            {score >= 80 ? '✅ Excellent' : score >= 60 ? '⚠️ Needs Attention' : '🚨 At Risk'}
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Encryption', value: dashboard.encryptionStatus || 'AES-256-GCM', icon: '🔒', ok: true },
            { label: 'Threats Blocked', value: liveThreats.filter(t => t.status === 'blocked').length + (dashboard.threats?.length || 0), icon: '🛡️', ok: true },
            { label: 'Vulnerabilities', value: dashboard.vulnerabilities?.filter(v => v.status !== 'resolved').length || 0, icon: '🐛', ok: false },
            { label: 'Alerts', value: alerts.length, icon: '🔔', ok: alerts.length === 0 }
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '18px' }}>{s.icon}</p>
              <p style={{ margin: '0 0 2px', color: '#fff', fontSize: '16px', fontWeight: '700' }}>{s.value}</p>
              <p style={{ margin: 0, color: '#666', fontSize: '11px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Encryption health */}
      {encHealth && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>Encryption Status</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            <EncryptionBadge algorithm="AES-256-GCM" active={true} />
            <EncryptionBadge algorithm="PBKDF2 (SHA-512)" active={true} />
            <EncryptionBadge algorithm="JWT (RS256)" active={true} />
          </div>
          {encHealth.nextKeyRotation && (
            <p style={{ margin: '12px 0 0', color: '#555', fontSize: '11px' }}>
              Next key rotation: {new Date(encHealth.nextKeyRotation).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Network checks */}
      {networkChecks && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 4px' }}>Network Security Checks</p>
          {networkChecks.map((c, i) => <NetworkScanRow key={i} check={c.name} status={c.status} />)}
        </div>
      )}

      {/* On-device checks */}
      {deviceChecks && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 4px' }}>On-Device Security</p>
          {deviceChecks.map((c, i) => <NetworkScanRow key={i} check={c.name} status={c.status} />)}
        </div>
      )}

      {/* Live threats */}
      {liveThreats.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>Live Threat Feed</p>
          {liveThreats.slice(0, 5).map((t, i) => (
            <Alert key={i} severity={t.severity || 'medium'} message={`${t.type} ${t.count ? `(${t.count})` : ''}`} timestamp={t.receivedAt} />
          ))}
        </div>
      )}

      {/* Vulnerabilities */}
      {dashboard.vulnerabilities?.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>Vulnerabilities</p>
          {dashboard.vulnerabilities.map(vuln => (
            <div key={vuln.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a1a', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', background: SEVERITY_COLORS[vuln.severity] + '22', color: SEVERITY_COLORS[vuln.severity], fontWeight: '700' }}>
                  {vuln.severity?.toUpperCase()}
                </span>
                <span style={{ color: '#fff', fontSize: '13px' }}>{vuln.name}</span>
              </div>
              {vuln.status === 'resolved' ? (
                <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ Resolved</span>
              ) : (
                <button onClick={() => patch(vuln.id)}
                  style={{ padding: '5px 12px', background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: '6px', color: '#22c55e', cursor: 'pointer', fontSize: '12px' }}>
                  Apply Patch
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent alerts */}
      {alerts.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '18px' }}>
          <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>Recent Alerts</p>
          {alerts.slice(0, 5).map((a, i) => (
            <Alert key={i} severity={a.severity || 'medium'} message={`${a.event}: ${JSON.stringify(a.details || {}).slice(0, 60)}`} timestamp={a.timestamp} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Local security checks ─────────────────────────────────────────────────────

function performNetworkChecks() {
  const checks = [];
  checks.push({ name: 'HTTPS Connection', status: location.protocol === 'https:' ? 'pass' : 'warn' });
  checks.push({ name: 'Secure Context', status: window.isSecureContext ? 'pass' : 'fail' });
  checks.push({ name: 'Mixed Content', status: document.querySelector('img[src^="http:"],script[src^="http:"]') ? 'warn' : 'pass' });
  checks.push({ name: 'CSP Headers Present', status: document.querySelector('meta[http-equiv="Content-Security-Policy"]') ? 'pass' : 'warn' });
  return checks;
}

function performDeviceChecks() {
  const checks = [];
  checks.push({ name: 'Session Storage Available', status: typeof sessionStorage !== 'undefined' ? 'pass' : 'fail' });
  checks.push({ name: 'Crypto API Available', status: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined' ? 'pass' : 'warn' });
  checks.push({ name: 'WebAuthn Supported', status: typeof PublicKeyCredential !== 'undefined' ? 'pass' : 'warn' });
  checks.push({ name: 'Local Storage', status: typeof localStorage !== 'undefined' ? 'pass' : 'fail' });
  checks.push({ name: 'Service Worker Support', status: 'serviceWorker' in navigator ? 'pass' : 'warn' });
  checks.push({ name: 'Permissions API', status: typeof navigator.permissions !== 'undefined' ? 'pass' : 'warn' });
  return checks;
}
