// ================================================
// NEXUS AI PRO - Enhanced Security Dashboard
// Real-time scans | Network monitoring | On-device
// 2026-08-10 | Version 2.1.0
// ================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Severity helpers ─────────────────────────────
function severityColor(s) {
  return { critical: '#ef4444', high: '#f97316', medium: '#fbbf24', low: '#60a5fa', info: '#a78bfa' }[s] || '#6b7280';
}

function SeverityBadge({ severity }) {
  const color = severityColor(severity);
  return (
    <span style={{ fontSize: 11, color, background: `${color}20`, padding: '2px 8px', borderRadius: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {severity}
    </span>
  );
}

// ── Score ring ───────────────────────────────────
function ScoreRing({ score = 0, size = 110 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: color, fontSize: 24, fontWeight: 800, transform: 'rotate(90deg)', transformOrigin: 'center', transition: 'fill 0.4s' }}>
        {score}
      </text>
      <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: '#64748b', fontSize: 10, transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        /100
      </text>
    </svg>
  );
}

// ── Metric tile ──────────────────────────────────
function MetricTile({ icon, label, value, sub, color = '#94a3b8' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', flex: '1 1 140px' }}>
      <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Vulnerability row ────────────────────────────
function VulnRow({ vuln, onPatch }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <SeverityBadge severity={vuln.severity} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{vuln.name}</div>
        {vuln.detail && <div style={{ fontSize: 11, color: '#64748b' }}>{vuln.detail}</div>}
      </div>
      <span style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
        color: vuln.status === 'resolved' || vuln.status === 'patched' ? '#4ade80' : vuln.status === 'warning' ? '#fbbf24' : '#94a3b8',
        background: (vuln.status === 'resolved' || vuln.status === 'patched') ? 'rgba(74,222,128,0.1)' : vuln.status === 'warning' ? 'rgba(251,191,36,0.1)' : 'rgba(148,163,184,0.1)'
      }}>{vuln.status}</span>
      {(vuln.status === 'warning' || vuln.status === 'open') && onPatch && (
        <button onClick={() => onPatch(vuln.id)}
          style={{ background: '#7c3aed', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          Patch
        </button>
      )}
    </div>
  );
}

// ── Network issue row ────────────────────────────
function NetworkIssueRow({ issue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <SeverityBadge severity={issue.severity || 'info'} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#e2e8f0' }}>{issue.name}</div>
        {issue.detail && <div style={{ fontSize: 11, color: '#64748b' }}>{issue.detail}</div>}
      </div>
    </div>
  );
}

// ── Audit log entry ──────────────────────────────
function AuditEntry({ entry }) {
  const d = new Date(entry.timestamp);
  const isError = entry.event?.includes('ERROR') || entry.event?.includes('THREAT') || entry.event?.includes('FAIL');
  return (
    <div style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
      <span style={{ color: '#374151', flexShrink: 0, width: 80 }}>
        {d.toLocaleTimeString()}
      </span>
      <span style={{ color: isError ? '#f87171' : '#64748b', flex: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.event}
      </span>
    </div>
  );
}

// ── Main SecurityDashboardEnhanced ───────────────
export default function SecurityDashboardEnhanced({ authToken }) {
  const [dashboard, setDashboard] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isNetworkScanning, setIsNetworkScanning] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  const headers = { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, auditRes, netRes] = await Promise.all([
        fetch('/api/security/dashboard', { headers }),
        fetch('/api/security/audit?limit=20', { headers }),
        fetch('/api/security/network-status', { headers })
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (auditRes.ok) { const d = await auditRes.json(); setAuditLogs(d.logs || []); }
      if (netRes.ok) setNetworkStatus(await netRes.json());
      setLastRefresh(new Date().toLocaleTimeString());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [authToken]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 15_000); // auto-refresh every 15s
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  const runScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/security/scan', { method: 'POST', headers });
      if (res.ok) await fetchAll();
    } catch (e) { setError(e.message); }
    finally { setIsScanning(false); }
  };

  const runNetworkScan = async () => {
    setIsNetworkScanning(true);
    try {
      const res = await fetch('/api/security/network-scan', { method: 'POST', headers });
      if (res.ok) { setNetworkStatus(await res.json()); }
    } catch (e) { setError(e.message); }
    finally { setIsNetworkScanning(false); }
  };

  const patchVuln = async (vulnId) => {
    await fetch('/api/security/patch', { method: 'POST', headers, body: JSON.stringify({ vulnId }) });
    await fetchAll();
  };

  const score = dashboard?.overallScore ?? 0;

  const s = {
    wrap: { background: '#0a0a0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '24px' },
    section: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px', marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }
  };

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg,#ef4444,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flex: 1 }}>
          🛡️ Security Dashboard
        </h2>
        {lastRefresh && <span style={{ fontSize: 11, color: '#374151' }}>Auto-refresh · {lastRefresh}</span>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchAll}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>
            ⟳ Refresh
          </button>
          <button onClick={runScan} disabled={isScanning}
            style={{ background: isScanning ? '#374151' : '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 16px', cursor: isScanning ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
            {isScanning ? '⏳ Scanning…' : '🔍 Full Scan'}
          </button>
          <button onClick={runNetworkScan} disabled={isNetworkScanning}
            style={{ background: isNetworkScanning ? '#374151' : '#1d4ed8', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 16px', cursor: isNetworkScanning ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
            {isNetworkScanning ? '⏳ Scanning…' : '🌐 Network Scan'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Score + summary row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ ...s.section, display: 'flex', alignItems: 'center', gap: 20, flex: '0 0 auto' }}>
          <ScoreRing score={score} />
          <div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Security Score</div>
            <div style={{ fontSize: 13, color: score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#ef4444', fontWeight: 600 }}>
              {score >= 80 ? '✓ Secure' : score >= 60 ? '⚠ Moderate risk' : '✗ Action required'}
            </div>
            <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>
              {dashboard?.encryptionStatus || 'AES-256-GCM'} · HMAC-SHA256
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <MetricTile icon="🔒" label="Encryption"  value={dashboard?.encryptionActive ? 'Active' : 'Inactive'} color={dashboard?.encryptionActive ? '#4ade80' : '#ef4444'} />
          <MetricTile icon="🚫" label="Threats Blocked" value={dashboard?.threats?.filter(t => t.status === 'blocked').length ?? 0} color="#f97316" />
          <MetricTile icon="🔍" label="Last Scan" value={dashboard?.lastScanTime ? new Date(dashboard.lastScanTime).toLocaleTimeString() : 'Never'} color="#94a3b8" />
          <MetricTile icon="📋" label="Audit Entries" value={auditLogs.length} color="#60a5fa" sub="last 20" />
        </div>
      </div>

      {/* Vulnerabilities */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span>⚡</span> Vulnerabilities
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#374151', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {dashboard?.vulnerabilities?.filter(v => v.status !== 'resolved' && v.status !== 'patched').length ?? 0} open
          </span>
        </div>
        {(dashboard?.vulnerabilities || []).length === 0 ? (
          <div style={{ color: '#4ade80', fontSize: 13 }}>✓ No vulnerabilities detected</div>
        ) : (
          dashboard.vulnerabilities.map(v => (
            <VulnRow key={v.id} vuln={v} onPatch={patchVuln} />
          ))
        )}
      </div>

      {/* Network status */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span>🌐</span> Network Security
          {networkStatus && (
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 600,
              color: networkStatus.status === 'clean' ? '#4ade80' : networkStatus.status === 'issues_found' ? '#fbbf24' : '#94a3b8',
              textTransform: 'none', letterSpacing: 0
            }}>
              {networkStatus.status === 'clean' ? '✓ Clean' : networkStatus.status === 'issues_found' ? `⚠ ${networkStatus.issues?.length} issue(s)` : networkStatus.status}
            </span>
          )}
        </div>
        {!networkStatus ? (
          <div style={{ color: '#555', fontSize: 13 }}>Run a network scan to check configuration.</div>
        ) : networkStatus.issues?.length === 0 ? (
          <div style={{ color: '#4ade80', fontSize: 13 }}>✓ No network issues detected</div>
        ) : (
          networkStatus.issues.map((issue, i) => <NetworkIssueRow key={i} issue={issue} />)
        )}
        {networkStatus?.lastScan && (
          <div style={{ fontSize: 11, color: '#374151', marginTop: 10 }}>
            Last scanned: {new Date(networkStatus.lastScan).toLocaleString()}
          </div>
        )}
      </div>

      {/* On-device checks */}
      <div style={s.section}>
        <div style={s.sectionTitle}><span>💻</span> On-Device Security Checks</div>
        {[
          { label: 'HTTPS Transport', status: window.location.protocol === 'https:' || window.location.hostname === 'localhost', detail: 'All traffic encrypted in transit' },
          { label: 'Secure Context', status: window.isSecureContext, detail: 'Required for WebAuthn, crypto APIs' },
          { label: 'WebAuthn Available', status: !!window.PublicKeyCredential, detail: 'Biometric / hardware key auth' },
          { label: 'Web Crypto API', status: !!window.crypto?.subtle, detail: 'Client-side cryptography' },
          { label: 'Service Worker', status: 'serviceWorker' in navigator, detail: 'Offline support & CSP enforcement' },
          { label: 'Storage Isolation', status: !!(window.sessionStorage && window.localStorage), detail: 'Per-origin storage' }
        ].map(({ label, status, detail }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{status ? '✅' : '❌'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>{label}</div>
              <div style={{ fontSize: 11, color: '#475569' }}>{detail}</div>
            </div>
            <span style={{ fontSize: 12, color: status ? '#4ade80' : '#ef4444', fontWeight: 600 }}>
              {status ? 'OK' : 'FAIL'}
            </span>
          </div>
        ))}
      </div>

      {/* Encryption health */}
      <div style={s.section}>
        <div style={s.sectionTitle}><span>🔑</span> Encryption & Key Health</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Algorithm', value: 'AES-256-GCM', color: '#60a5fa' },
            { label: 'Key Derivation', value: 'PBKDF2-SHA512', color: '#a78bfa' },
            { label: 'HMAC', value: 'SHA-256', color: '#34d399' },
            { label: 'Token', value: 'JWT / RS256', color: '#fbbf24' }
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, color, fontWeight: 600, fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live audit log */}
      <div style={s.section}>
        <div style={s.sectionTitle}><span>📋</span> Live Audit Log <span style={{ marginLeft: 'auto', fontSize: 12, color: '#374151', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>Last 20 entries</span></div>
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {auditLogs.length === 0 ? (
            <div style={{ color: '#374151', fontSize: 13 }}>No audit entries yet</div>
          ) : (
            [...auditLogs].reverse().map((entry, i) => <AuditEntry key={i} entry={entry} />)
          )}
        </div>
      </div>

      {/* Recent threats */}
      {dashboard?.threats?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}><span>🚨</span> Blocked Threats</div>
          {dashboard.threats.map((threat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
              <span style={{ color: '#ef4444' }}>✗</span>
              <span style={{ flex: 1, color: '#94a3b8' }}>{threat.type}</span>
              <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 600 }}>BLOCKED</span>
              <span style={{ color: '#374151', fontSize: 11 }}>{threat.timestamp ? new Date(threat.timestamp).toLocaleTimeString() : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
