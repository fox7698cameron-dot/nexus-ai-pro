/**
 * SecurityDashboardFull.jsx
 * Nexus AI Pro — Full Security Dashboard
 * Real-time scanning, threat feed, network detection, on-device issues
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Severity config ───────────────────────────────────────────────────────────
const SEV = {
  critical: { color: '#f56565', bg: 'rgba(245,101,101,.15)', label: 'Critical' },
  high:     { color: '#ed8936', bg: 'rgba(237,137,54,.15)',  label: 'High'     },
  medium:   { color: '#ecc94b', bg: 'rgba(236,201,75,.15)',  label: 'Medium'   },
  low:      { color: '#68d391', bg: 'rgba(104,211,145,.15)', label: 'Low'      },
};

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 44, c = Math.PI * 2 * r;
  const dash = c * (score / 100);
  const color = score >= 80 ? '#48bb78' : score >= 50 ? '#d69e2e' : '#f56565';
  return (
    <svg width={110} height={110} viewBox="0 0 110 110" aria-label={`Security score: ${score}`}>
      <circle cx={55} cy={55} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
      <circle cx={55} cy={55} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 55 55)" />
      <text x={55} y={55} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={22} fontWeight="700">{score}</text>
      <text x={55} y={74} textAnchor="middle" fill="var(--muted)" fontSize={10}>/ 100</text>
    </svg>
  );
}

// ── VulnRow ───────────────────────────────────────────────────────────────────
function VulnRow({ vuln, onPatch }) {
  const s = SEV[vuln.severity] ?? SEV.low;
  return (
    <div className="vuln-row">
      <span className="vuln-sev-tag" style={{ background: s.bg, color: s.color }}>{s.label}</span>
      <div className="vuln-info">
        <span className="vuln-name">{vuln.name}</span>
        {vuln.description && <span className="vuln-desc">{vuln.description}</span>}
      </div>
      <span className={`vuln-status ${vuln.status === 'patched' ? 'status-patched' : 'status-open'}`}>
        {vuln.status === 'patched' ? '✓ Patched' : '⚠ Open'}
      </span>
      {vuln.status !== 'patched' && (
        <button className="patch-btn" onClick={() => onPatch(vuln.id)}>Patch</button>
      )}
    </div>
  );
}

// ── ThreatEvent ───────────────────────────────────────────────────────────────
function ThreatEvent({ event }) {
  const s = SEV[event.severity] ?? SEV.low;
  return (
    <div className="threat-event" style={{ borderLeftColor: s.color }}>
      <span className="threat-ts">{new Date(event.timestamp).toLocaleTimeString()}</span>
      <span className="threat-type" style={{ color: s.color }}>{event.type}</span>
      {event.ip && <span className="threat-ip">from {event.ip}</span>}
      <span className="threat-detail">{event.detail}</span>
    </div>
  );
}

// ── NetworkPanel ──────────────────────────────────────────────────────────────
function NetworkPanel({ data }) {
  if (!data) return <p className="empty-msg">No network data available.</p>;
  return (
    <div className="network-grid">
      <div className="net-tile">
        <div className="net-label">Ping Latency</div>
        <div className="net-value" style={{ color: data.latency > 200 ? '#f56565' : '#48bb78' }}>{data.latency ?? '—'} ms</div>
      </div>
      <div className="net-tile">
        <div className="net-label">Packet Loss</div>
        <div className="net-value" style={{ color: data.packetLoss > 1 ? '#ed8936' : '#48bb78' }}>{data.packetLoss ?? 0}%</div>
      </div>
      <div className="net-tile">
        <div className="net-label">SSL Expiry</div>
        <div className="net-value" style={{ color: data.sslDaysLeft < 30 ? '#f56565' : '#48bb78' }}>
          {data.sslDaysLeft != null ? `${data.sslDaysLeft}d` : '—'}
        </div>
      </div>
      <div className="net-tile">
        <div className="net-label">Open Ports</div>
        <div className="net-value">{(data.openPorts ?? []).join(', ') || 'None'}</div>
      </div>
    </div>
  );
}

// ── DevicePanel ───────────────────────────────────────────────────────────────
function DevicePanel({ data }) {
  if (!data) return <p className="empty-msg">No device data available.</p>;
  return (
    <div className="device-list">
      {data.storageWarning  && <div className="device-alert">⚠ Low disk space: {data.storageFree}</div>}
      {data.memoryPressure  && <div className="device-alert">⚠ High memory pressure: {data.memoryUsed}%</div>}
      {data.outdatedDeps?.length > 0 && (
        <div className="device-alert">⚠ Outdated dependencies: {data.outdatedDeps.join(', ')}</div>
      )}
      {!data.storageWarning && !data.memoryPressure && (!data.outdatedDeps?.length) &&
        <div className="device-ok">✓ No device issues detected</div>
      }
    </div>
  );
}

// ── E2E Status ────────────────────────────────────────────────────────────────
function E2EPanel({ connections }) {
  if (!connections || connections.length === 0)
    return <p className="empty-msg">No active encrypted connections.</p>;
  return (
    <div>
      {connections.map((c, i) => (
        <div key={i} className="e2e-row">
          <span className={`e2e-dot ${c.encrypted ? 'e2e-ok' : 'e2e-fail'}`}>●</span>
          <span className="e2e-peer">{c.peer}</span>
          <span className="e2e-cipher">{c.cipher ?? 'AES-256-GCM'}</span>
          <span className={c.encrypted ? 'status-active e2e-tag' : 'status-banned e2e-tag'}>
            {c.encrypted ? 'Encrypted' : 'Unencrypted'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
/**
 * @param {{ authToken: string }} props
 */
export default function SecurityDashboardFull({ authToken }) {
  const [data,       setData]       = useState(null);
  const [scanning,   setScanning]   = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [threats,    setThreats]    = useState([]);
  const [auditFilter,setAuditFilter]= useState('');
  const [error,      setError]      = useState(null);
  const socketRef = useRef(null);
  const hdrs = { Authorization: `Bearer ${authToken}` };

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/security/dashboard', { headers: hdrs });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) { setError(e.message); }
  }, [authToken]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // WebSocket for live threat feed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let socket;
    import('socket.io-client').then(({ io }) => {
      socket = io({ auth: { token: authToken }, transports: ['websocket'] });
      socket.on('security:threat', (evt) => setThreats(prev => [evt, ...prev].slice(0, 50)));
      socket.on('security:scan:progress', (pct) => setProgress(pct));
      socketRef.current = socket;
    }).catch(() => {});
    return () => { socket?.disconnect(); };
  }, [authToken]);

  const runScan = async () => {
    setScanning(true); setProgress(0); setError(null);
    try {
      const res  = await fetch('/api/security/scan', { method: 'POST', headers: hdrs });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setData(prev => ({ ...prev, ...d }));
      setProgress(100);
    } catch (e) { setError(e.message); }
    finally { setScanning(false); }
  };

  const patchVuln = async (id) => {
    try {
      const res = await fetch(`/api/security/vulnerabilities/${id}/patch`, { method: 'POST', headers: hdrs });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(prev => prev ? {
        ...prev,
        vulnerabilities: prev.vulnerabilities.map(v => v.id === id ? { ...v, status: 'patched' } : v),
        score: Math.min(100, (prev.score ?? 0) + 5),
      } : prev);
    } catch (e) { setError(e.message); }
  };

  const filteredAudit = (data?.auditLog ?? []).filter(e =>
    !auditFilter || JSON.stringify(e).toLowerCase().includes(auditFilter.toLowerCase())
  );

  const score = data?.score ?? 0;

  return (
    <div className="sec-root">
      <style>{SEC_CSS}</style>

      {/* Header */}
      <div className="sec-header">
        <h2>🛡 Security Dashboard</h2>
        <div className="sec-header-actions">
          <button className="scan-btn" onClick={runScan} disabled={scanning}>
            {scanning ? `Scanning… ${progress}%` : '⟳ Run Scan'}
          </button>
          <button className="btn-ghost" onClick={loadDashboard}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="sec-error">⚠ {error} <button onClick={() => setError(null)}>✕</button></div>}

      {scanning && (
        <div className="scan-progress">
          <div className="scan-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Score + status row */}
      <div className="sec-overview">
        <div className="score-section">
          <ScoreRing score={score} />
          <div>
            <div className="sec-label">Security Score</div>
            <div className="sec-meta">Last scan: {data?.lastScan ? new Date(data.lastScan).toLocaleString() : 'Never'}</div>
            <div className="sec-meta">Threats blocked: <strong>{data?.threatsBlocked ?? 0}</strong></div>
          </div>
        </div>
        <div className="encryption-status">
          <div className="enc-item">
            <span className={data?.encryption?.active ? 'enc-active' : 'enc-inactive'}>●</span>
            Encryption: {data?.encryption?.algorithm ?? 'AES-256-GCM'}
          </div>
          <div className="enc-item">
            <span className={data?.mfa?.enabled ? 'enc-active' : 'enc-inactive'}>●</span>
            MFA: {data?.mfa?.enabled ? 'Enabled' : 'Disabled'}
          </div>
          <div className="enc-item">
            <span className="enc-active">●</span>
            HTTPS/TLS: Active
          </div>
        </div>
      </div>

      {/* Grid panels */}
      <div className="sec-grid">

        {/* Vulnerabilities */}
        <section className="sec-panel">
          <h3>Vulnerabilities ({(data?.vulnerabilities ?? []).length})</h3>
          {(data?.vulnerabilities ?? []).length === 0
            ? <p className="empty-msg">No vulnerabilities found.</p>
            : (data.vulnerabilities ?? []).map(v => <VulnRow key={v.id ?? v.name} vuln={v} onPatch={patchVuln} />)
          }
        </section>

        {/* Live threat feed */}
        <section className="sec-panel">
          <h3>🔴 Live Threat Feed</h3>
          {threats.length === 0
            ? <p className="empty-msg">No threats detected.</p>
            : threats.slice(0, 10).map((t, i) => <ThreatEvent key={i} event={t} />)
          }
        </section>

        {/* Network */}
        <section className="sec-panel">
          <h3>🌐 Network Health</h3>
          <NetworkPanel data={data?.network} />
        </section>

        {/* Device */}
        <section className="sec-panel">
          <h3>💻 On-Device Issues</h3>
          <DevicePanel data={data?.device} />
        </section>

        {/* Firewall */}
        <section className="sec-panel">
          <h3>🔥 Firewall Rules</h3>
          {(data?.firewallRules ?? []).length === 0
            ? <p className="empty-msg">No firewall rules configured.</p>
            : (data.firewallRules ?? []).map((r, i) => (
              <div key={i} className="fw-rule">
                <span className={`fw-action ${r.action === 'allow' ? 'fw-allow' : 'fw-deny'}`}>{r.action.toUpperCase()}</span>
                <span>{r.source}</span>
                <span>→ port {r.port}</span>
                <span className="fw-proto">{r.protocol}</span>
              </div>
            ))
          }
        </section>

        {/* Recommendations */}
        <section className="sec-panel">
          <h3>📋 Recommendations</h3>
          {(data?.recommendations ?? []).length === 0
            ? <p className="empty-msg">All recommendations addressed.</p>
            : (data.recommendations ?? []).map((r, i) => (
              <div key={i} className="rec-item">
                <span className={`rec-priority priority-${r.priority}`}>{r.priority}</span>
                <span>{r.text}</span>
              </div>
            ))
          }
        </section>

        {/* E2E status */}
        <section className="sec-panel">
          <h3>🔒 E2E Encryption</h3>
          <E2EPanel connections={data?.e2eConnections} />
        </section>

        {/* Audit log */}
        <section className="sec-panel wide">
          <div className="audit-header">
            <h3>📜 Audit Log (last 50)</h3>
            <input className="audit-search" placeholder="Filter…"
              value={auditFilter} onChange={e => setAuditFilter(e.target.value)} />
          </div>
          {filteredAudit.slice(0, 50).map((e, i) => (
            <div key={i} className="audit-row">
              <span className="audit-ts">{new Date(e.timestamp).toLocaleString()}</span>
              <span className="audit-event">{e.event}</span>
              <span className="audit-detail">{JSON.stringify(e.details ?? {}).slice(0, 100)}</span>
            </div>
          ))}
          {filteredAudit.length === 0 && <p className="empty-msg">No matching entries.</p>}
        </section>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const SEC_CSS = `
:root{--bg:#0f1117;--surface:#1a1d27;--border:#2a2d3a;--text:#e2e8f0;--muted:#718096;--radius:10px;}
@media(prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#f7f8fc;--surface:#fff;--border:#e2e8f0;--text:#1a202c;--muted:#4a5568;}}
.sec-root{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;padding:16px;min-height:100vh;}
.sec-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;}
.sec-header h2{margin:0;font-size:1.4rem;}
.sec-header-actions{display:flex;gap:10px;}
.scan-btn{background:#805ad5;color:#fff;border:none;border-radius:var(--radius);padding:8px 18px;cursor:pointer;font-weight:600;}
.scan-btn:disabled{opacity:.7;cursor:not-allowed;}
.btn-ghost{background:none;border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:6px 14px;cursor:pointer;}
.sec-error{background:rgba(245,101,101,.15);color:#fc8181;border:1px solid #fc8181;border-radius:var(--radius);padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;}
.scan-progress{height:4px;background:var(--border);border-radius:2px;margin-bottom:16px;overflow:hidden;}
.scan-progress-bar{height:100%;background:#805ad5;border-radius:2px;transition:width .3s;}
.sec-overview{display:flex;gap:24px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:20px;}
.score-section{display:flex;align-items:center;gap:16px;}
.sec-label{font-weight:600;font-size:1rem;margin-bottom:4px;}
.sec-meta{font-size:.82rem;color:var(--muted);}
.encryption-status{display:flex;flex-direction:column;gap:8px;margin-left:auto;}
.enc-item{display:flex;align-items:center;gap:8px;font-size:.85rem;}
.enc-active{color:#48bb78;}
.enc-inactive{color:#f56565;}
.sec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;}
.sec-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;}
.sec-panel.wide{grid-column:1/-1;}
.sec-panel h3{margin:0 0 14px;font-size:1rem;}
.empty-msg{color:var(--muted);font-style:italic;font-size:.88rem;}
.vuln-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:.85rem;}
.vuln-sev-tag{padding:2px 8px;border-radius:9999px;font-size:.73rem;white-space:nowrap;}
.vuln-info{flex:1;display:flex;flex-direction:column;gap:2px;}
.vuln-name{font-weight:600;}
.vuln-desc{color:var(--muted);font-size:.78rem;}
.vuln-status{font-size:.75rem;}
.status-patched{color:#48bb78;}
.status-open{color:#f56565;}
.patch-btn{background:none;border:1px solid #3182ce;color:#63b3ed;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:.75rem;white-space:nowrap;}
.threat-event{border-left:3px solid transparent;padding:6px 10px;margin-bottom:6px;background:rgba(255,255,255,.03);border-radius:0 4px 4px 0;display:flex;gap:10px;flex-wrap:wrap;font-size:.82rem;}
.threat-ts{color:var(--muted);white-space:nowrap;}
.threat-type{font-weight:700;}
.threat-ip{color:var(--muted);}
.network-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
.net-tile{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;}
.net-label{font-size:.75rem;color:var(--muted);margin-bottom:4px;}
.net-value{font-size:1.2rem;font-weight:700;}
.device-alert{background:rgba(237,137,54,.1);color:#ed8936;border:1px solid #ed8936;border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:.85rem;}
.device-ok{color:#48bb78;font-size:.9rem;}
.fw-rule{display:flex;gap:12px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:.83rem;}
.fw-action{font-weight:700;padding:1px 8px;border-radius:9999px;font-size:.72rem;}
.fw-allow{background:rgba(72,187,120,.2);color:#48bb78;}
.fw-deny{background:rgba(245,101,101,.2);color:#f56565;}
.fw-proto{color:var(--muted);}
.rec-item{display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border);font-size:.85rem;}
.rec-priority{font-size:.7rem;padding:2px 8px;border-radius:9999px;white-space:nowrap;}
.priority-high{background:rgba(237,137,54,.2);color:#ed8936;}
.priority-medium{background:rgba(236,201,75,.2);color:#ecc94b;}
.priority-low{background:rgba(104,211,145,.2);color:#68d391;}
.e2e-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:.85rem;}
.e2e-dot{font-size:1rem;}
.e2e-ok{color:#48bb78;}
.e2e-fail{color:#f56565;}
.e2e-peer{flex:1;}
.e2e-cipher{color:var(--muted);font-size:.78rem;}
.e2e-tag{font-size:.72rem;padding:1px 8px;border-radius:9999px;}
.status-active{background:rgba(72,187,120,.2);color:#48bb78;}
.status-banned{background:rgba(245,101,101,.2);color:#f56565;}
.audit-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.audit-header h3{margin:0;}
.audit-search{background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:5px 10px;font-size:.82rem;}
.audit-row{display:flex;gap:10px;font-size:.78rem;padding:5px 0;border-bottom:1px solid var(--border);}
.audit-ts{color:var(--muted);white-space:nowrap;}
.audit-event{font-weight:600;white-space:nowrap;min-width:120px;}
.audit-detail{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@media(max-width:640px){.sec-grid{grid-template-columns:1fr;} .network-grid{grid-template-columns:1fr;}}
`;
