/**
 * src/dashboards/SecurityDashboardV2.jsx
 * Nexus AI Pro — Enhanced Security Dashboard
 * Features: real-time threat monitoring, network issue detection, on-device scan,
 *           vulnerability list, encryption status, audit log viewer, key rotation
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Helpers ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8} strokeDasharray={circ}
        strokeDashoffset={offset} strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.6s' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={size * 0.22} fontWeight={800} fill={color}>
        {score}
      </text>
    </svg>
  );
}

function Badge({ status }) {
  const cfg = {
    critical:  { label: '🚨 Critical', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    high:      { label: '🔴 High', bg: 'rgba(239,68,68,0.1)', color: '#f87171' },
    medium:    { label: '🟠 Medium', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    low:       { label: '🟡 Low', bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
    info:      { label: 'ℹ️ Info', bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    resolved:  { label: '✅ Resolved', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    warning:   { label: '⚠️ Warning', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    blocked:   { label: '🚫 Blocked', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    secure:    { label: '🔒 Secure', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  }[status?.toLowerCase()] || { label: status, bg: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>{cfg.label}</span>
  );
}

function PulsingDot({ active }) {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: active ? '#22c55e' : '#ef4444',
      boxShadow: active ? '0 0 0 0 rgba(34,197,94,0.4)' : 'none',
      animation: active ? 'pulse 2s infinite' : 'none',
    }} />
  );
}

function Card({ title, children, style }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 20px', ...style,
    }}>
      {title && <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>{title}</h3>}
      {children}
    </div>
  );
}

// ── Network ping scan ──────────────────────────────────────────────────────

async function runNetworkScan() {
  const endpoints = [
    { name: 'API Server', url: '/api/health' },
    { name: 'Auth Service', url: '/api/auth/health' },
    { name: 'Database', url: '/api/db/health' },
  ];
  const results = await Promise.allSettled(
    endpoints.map(async (ep) => {
      const t0 = performance.now();
      const res = await fetch(ep.url, { method: 'GET' });
      const latency = Math.round(performance.now() - t0);
      return { name: ep.name, status: res.ok ? 'ok' : 'error', latency, code: res.status };
    })
  );
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: endpoints[i].name, status: 'unreachable', latency: null, code: null }
  );
}

// ── Main SecurityDashboardV2 ───────────────────────────────────────────────

export function SecurityDashboardV2({ authToken }) {
  const [status, setStatus] = useState(null);
  const [vulns, setVulns] = useState([]);
  const [threats, setThreats] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [netResults, setNetResults] = useState([]);
  const [encHealth, setEncHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [networkScanning, setNetworkScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoScan, setAutoScan] = useState(false);
  const scanIntervalRef = useRef(null);

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }),
    [authToken]
  );

  const fetchAll = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const [statusRes, dashRes, encRes, auditRes] = await Promise.all([
        fetch('/api/security/status', { headers: headers() }),
        fetch('/api/security/dashboard', { headers: headers() }),
        fetch('/api/security/encryption-health', { headers: headers() }),
        fetch('/api/security/audit?limit=50', { headers: headers() }),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (dashRes.ok) {
        const d = await dashRes.json();
        setVulns(d.vulnerabilities || []);
        setThreats(d.threats || []);
      }
      if (encRes.ok) setEncHealth(await encRes.json());
      if (auditRes.ok) {
        const a = await auditRes.json();
        setAuditLog(a.logs || []);
      }
    } catch (err) {
      console.error('Security fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [authToken, headers]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!autoScan) { clearInterval(scanIntervalRef.current); return; }
    scanIntervalRef.current = setInterval(fetchAll, 30_000);
    return () => clearInterval(scanIntervalRef.current);
  }, [autoScan, fetchAll]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/security/scan', { method: 'POST', headers: headers() });
      const data = await res.json();
      setScanResult(data);
      await fetchAll();
    } catch (err) {
      setScanResult({ error: err.message });
    } finally {
      setScanning(false);
    }
  };

  const rotateKeys = async () => {
    if (!window.confirm('Rotate encryption keys? Active sessions will not be affected.')) return;
    await fetch('/api/security/rotate-keys', { method: 'POST', headers: headers() });
    await fetchAll();
  };

  const runNetScan = async () => {
    setNetworkScanning(true);
    const results = await runNetworkScan();
    setNetResults(results);
    setNetworkScanning(false);
  };

  const score = status?.overallScore ?? 0;
  const tabs = ['overview', 'vulnerabilities', 'threats', 'network', 'encryption', 'audit'];

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'var(--text-primary, #1a1a2e)',
      maxWidth: 1100, margin: '0 auto', padding: '24px 16px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🛡️ Security Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Real-time threat detection &amp; system security
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoScan} onChange={(e) => setAutoScan(e.target.checked)} />
            Auto-scan (30s)
          </label>
          <button onClick={runScan} disabled={scanning}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {scanning ? '⟳ Scanning…' : '🔍 Run Scan'}
          </button>
          <button onClick={rotateKeys}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
            🔑 Rotate Keys
          </button>
          <button onClick={fetchAll} disabled={loading}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#6b7280', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            ⟳ Refresh
          </button>
        </div>
      </div>

      {/* Score hero */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <ScoreRing score={score} size={100} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {score >= 80 ? '🔒 Secure' : score >= 50 ? '⚠️ At Risk' : '🚨 Critical'}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>
              Security score: <strong>{score}/100</strong>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <InfoPill icon="🔐" label="Encryption" value={status?.algorithm || 'AES-256-GCM'} />
              <InfoPill icon="🧱" label="Threats Blocked" value={status?.threatsBlocked ?? '—'} />
              <InfoPill icon="📋" label="Audit Log" value={status?.auditLogSize ?? '—'} />
              <InfoPill icon="🩹" label="Patches Applied" value={status?.patchesApplied ?? '—'} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PulsingDot active={status?.encryptionActive} />
                <span style={{ fontSize: 13 }}>{status?.encryptionActive ? 'Active' : 'Inactive'}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none',
              borderBottom: activeTab === t ? '2px solid #3b82f6' : '2px solid transparent',
              fontWeight: activeTab === t ? 700 : 400,
              color: activeTab === t ? '#3b82f6' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 14, marginBottom: -2,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Card title="⚡ Recent Threats" style={{ flex: '1 1 300px' }}>
            {threats.length === 0
              ? <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No recent threats ✅</p>
              : threats.slice(0, 5).map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{t.type}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Badge status={t.status} />
                    <span style={{ color: 'var(--text-secondary)' }}>{t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                </div>
              ))
            }
          </Card>
          <Card title="⚠️ Top Vulnerabilities" style={{ flex: '1 1 300px' }}>
            {vulns.slice(0, 5).map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span>{v.name}</span>
                <Badge status={v.severity} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {activeTab === 'vulnerabilities' && (
        <Card title="🔍 Vulnerability Report">
          {scanResult && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: scanResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', fontSize: 13 }}>
              {scanResult.error ? `❌ Scan error: ${scanResult.error}` : `✅ Scan completed at ${new Date(scanResult.timestamp).toLocaleTimeString()}`}
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['#', 'Name', 'Severity', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vulns.map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                  <td style={{ padding: '8px 12px' }}>{v.name}</td>
                  <td style={{ padding: '8px 12px' }}><Badge status={v.severity} /></td>
                  <td style={{ padding: '8px 12px' }}><Badge status={v.status} /></td>
                </tr>
              ))}
              {vulns.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>No vulnerabilities detected ✅</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'threats' && (
        <Card title="🚨 Threat Log">
          {threats.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13, flexWrap: 'wrap' }}>
              <Badge status={t.status || 'blocked'} />
              <span style={{ fontWeight: 600 }}>{t.type}</span>
              {t.ip && <span style={{ color: 'var(--text-secondary)' }}>IP: {t.ip}</span>}
              <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
                {t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}
              </span>
            </div>
          ))}
          {threats.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No threats detected ✅</p>}
        </Card>
      )}

      {activeTab === 'network' && (
        <Card title="🌐 Network Health">
          <button onClick={runNetScan} disabled={networkScanning}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
            {networkScanning ? '⟳ Scanning network…' : '🔍 Run Network Scan'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {netResults.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
                borderRadius: 10, background: 'var(--bg-secondary)',
              }}>
                <PulsingDot active={r.status === 'ok'} />
                <span style={{ fontWeight: 600, minWidth: 120 }}>{r.name}</span>
                <Badge status={r.status === 'ok' ? 'secure' : 'critical'} />
                {r.latency !== null && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.latency}ms</span>}
                {r.code && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>HTTP {r.code}</span>}
              </div>
            ))}
            {netResults.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Press "Run Network Scan" to check connectivity.</p>}
          </div>
        </Card>
      )}

      {activeTab === 'encryption' && (
        <Card title="🔐 Encryption Health">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {[
              { label: 'Algorithm', value: encHealth?.algorithm || 'AES-256-GCM' },
              { label: 'Status', value: encHealth?.status || 'healthy' },
              { label: 'Key Rotation', value: encHealth?.keyRotationInterval || '24h' },
              { label: 'Last Rotation', value: encHealth?.lastKeyRotation ? new Date(encHealth.lastKeyRotation).toLocaleString() : '—' },
              { label: 'Next Rotation', value: encHealth?.nextKeyRotation ? new Date(encHealth.nextKeyRotation).toLocaleString() : '—' },
              { label: 'Cert Expiry', value: encHealth?.certificateExpiry ? new Date(encHealth.certificateExpiry).toLocaleDateString() : '—' },
            ].map((item) => (
              <div key={item.label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'audit' && (
        <Card title="📋 Audit Log (last 50)">
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {auditLog.map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)', minWidth: 90, flexShrink: 0 }}>
                  {entry.ts ? new Date(entry.ts).toLocaleTimeString() : entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''}
                </span>
                <span style={{ fontWeight: 600, minWidth: 160, flexShrink: 0 }}>{entry.event}</span>
                <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{JSON.stringify(entry.details || {}).slice(0, 200)}</span>
              </div>
            ))}
            {auditLog.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No audit entries yet.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoPill({ icon, label, value }) {
  return (
    <span style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--bg-secondary)', borderRadius: 10, padding: '6px 12px', minWidth: 70,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
    </span>
  );
}

export default SecurityDashboardV2;
