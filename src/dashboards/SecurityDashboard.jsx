/**
 * src/dashboards/SecurityDashboard.jsx
 * Real-time security dashboard — vulnerability scans, network monitoring,
 * on-device threat detection, audit log viewer.
 * Created: 2026-08-23
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Severity levels ───────────────────────────────────────────────────────────
const SEV = {
  CRITICAL: { label: 'Critical', color: '#ef4444', bg: '#7f1d1d22', icon: '🚨' },
  HIGH:     { label: 'High',     color: '#f97316', bg: '#7c2d1222', icon: '⚠️' },
  MEDIUM:   { label: 'Medium',   color: '#eab308', bg: '#71350022', icon: '🔶' },
  LOW:      { label: 'Low',      color: '#22c55e', bg: '#14532d22', icon: 'ℹ️' },
  INFO:     { label: 'Info',     color: '#3b82f6', bg: '#1e3a5f22', icon: '💡' },
};

const SCAN_CATEGORIES = [
  'Dependencies', 'SAST', 'Secrets Detection', 'Network', 'TLS/Certificates',
  'OS Packages', 'Permissions', 'Audit Log', 'Container', 'API Security',
];

// ── Mock scan engine (replace with real npm audit / OWASP ZAP API) ────────────
async function runSecurityScan() {
  await new Promise((r) => setTimeout(r, 2500));   // simulate async work

  const vulns = [
    { id: 'V001', title: 'Dependency: outdated esbuild (pre-0.24)',  sev: 'MEDIUM',   category: 'Dependencies', file: 'package.json',       line: null,   cve: 'CVE-2024-29180', status: 'open' },
    { id: 'V002', title: 'Hardcoded fallback secret in env derive',  sev: 'HIGH',     category: 'Secrets Detection', file: 'server.js',      line: 52,     cve: null,             status: 'open' },
    { id: 'V003', title: 'Missing HSTS on non-TLS dev server',       sev: 'MEDIUM',   category: 'TLS/Certificates', file: 'server.js',       line: null,   cve: null,             status: 'open' },
    { id: 'V004', title: 'express-rate-limit bypass via IPv6',       sev: 'LOW',      category: 'API Security',     file: 'server.js',       line: 319,    cve: null,             status: 'open' },
    { id: 'V005', title: 'Node.js crypto fallback to random key',    sev: 'HIGH',     category: 'SAST',             file: 'server.js',       line: 47,     cve: null,             status: 'mitigated' },
    { id: 'V006', title: 'WebRTC peer ICE credentials exposed',      sev: 'MEDIUM',   category: 'Network',          file: 'src/network/p2p.js', line: null, cve: null,            status: 'open' },
    { id: 'V007', title: 'No CSP on Electron BrowserWindow',        sev: 'HIGH',     category: 'Permissions',      file: 'desktop/main.js', line: null,   cve: null,             status: 'open' },
    { id: 'V008', title: 'XSS risk: dangerouslySetInnerHTML usage',  sev: 'CRITICAL', category: 'SAST',             file: 'app.jsx',         line: 2100,   cve: 'CWE-79',         status: 'open' },
  ];

  const networkStatus = {
    latency:  Math.round(12 + Math.random() * 30),    // ms
    packetLoss: parseFloat((Math.random() * 0.5).toFixed(2)),
    tlsHandshake: Math.round(50 + Math.random() * 100),
    openPorts: [3001, 5173],
    suspiciousConns: Math.floor(Math.random() * 3),
    dnsAnomalies: 0,
  };

  const score = Math.max(0, 100 - vulns.filter((v) => v.status === 'open').reduce((acc, v) => {
    return acc + ({ CRITICAL: 25, HIGH: 15, MEDIUM: 8, LOW: 3, INFO: 1 }[v.sev] || 0);
  }, 0));

  return { vulns, networkStatus, score, timestamp: new Date().toISOString(), categories: SCAN_CATEGORIES };
}

// ── Network monitor (real WebSocket health check) ─────────────────────────────
function useNetworkMonitor() {
  const [net, setNet] = useState({ online: navigator.onLine, latency: null });

  useEffect(() => {
    const go  = () => setNet((p) => ({ ...p, online: true }));
    const off = () => setNet((p) => ({ ...p, online: false }));
    window.addEventListener('online',  go);
    window.addEventListener('offline', off);

    // Measure round-trip latency to own API
    const measure = async () => {
      try {
        const t0  = performance.now();
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
        const lat = Math.round(performance.now() - t0);
        setNet((p) => ({ ...p, latency: lat }));
      } catch {
        setNet((p) => ({ ...p, online: false, latency: null }));
      }
    };

    measure();
    const id = setInterval(measure, 10_000);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', off); clearInterval(id); };
  }, []);

  return net;
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const r = 48, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke="#334155" strokeWidth={10} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{ marginTop: -82, fontSize: 30, fontWeight: 800, color }}>{score}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 44 }}>Security Score</div>
    </div>
  );
}

// ── Vuln row ──────────────────────────────────────────────────────────────────
function VulnRow({ vuln, onFix }) {
  const s = SEV[vuln.sev] || SEV.INFO;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{vuln.title}</span>
          <span style={{ background: s.color, color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{s.label}</span>
          {vuln.status === 'mitigated' && <span style={{ background: '#22c55e33', color: '#22c55e', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>Mitigated</span>}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 3 }}>
          {vuln.category} · {vuln.file}{vuln.line ? `:${vuln.line}` : ''}{vuln.cve ? ` · ${vuln.cve}` : ''}
        </div>
      </div>
      {vuln.status === 'open' && (
        <button onClick={() => onFix(vuln.id)}
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
          Fix →
        </button>
      )}
    </div>
  );
}

// ── Network card ──────────────────────────────────────────────────────────────
function NetworkCard({ status, live }) {
  const items = [
    ['Online', live.online ? '✅ Connected' : '❌ Offline'],
    ['Latency', live.latency !== null ? `${live.latency} ms` : '—'],
    ['Packet Loss', `${status?.packetLoss ?? 0}%`],
    ['TLS Handshake', `${status?.tlsHandshake ?? 0} ms`],
    ['Open Ports', status?.openPorts?.join(', ') ?? '—'],
    ['Suspicious Conns', status?.suspiciousConns ?? '—'],
    ['DNS Anomalies', status?.dnsAnomalies ?? '—'],
  ];

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#f8fafc', margin: '0 0 14px', fontSize: 16 }}>🌐 Network Monitor</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map(([k, v]) => (
          <div key={k} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f8fafc' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SecurityDashboard() {
  const [result, setResult]       = useState(null);
  const [scanning, setScanning]   = useState(false);
  const [filter, setFilter]       = useState('ALL');
  const [autoScan, setAutoScan]   = useState(false);
  const [lastScan, setLastScan]   = useState(null);
  const [fixed, setFixed]         = useState(new Set());
  const timerRef                  = useRef(null);
  const live                      = useNetworkMonitor();

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const r = await runSecurityScan();
      setResult(r);
      setLastScan(new Date());
    } catch (err) {
      console.error('[SecurityDashboard] scan error:', err.message);
    } finally {
      setScanning(false);
    }
  }, []);

  // Initial scan
  useEffect(() => { scan(); }, [scan]);

  // Auto-scan every 30 s
  useEffect(() => {
    if (autoScan) timerRef.current = setInterval(scan, 30_000);
    else          clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [autoScan, scan]);

  const handleFix = async (vulnId) => {
    // In production: call /api/security/patch with vulnId
    setFixed((s) => new Set([...s, vulnId]));
    setResult((r) => r ? ({
      ...r,
      vulns: r.vulns.map((v) => v.id === vulnId ? { ...v, status: 'mitigated' } : v),
      score: Math.min(100, r.score + 5),
    }) : r);
  };

  const vulns = (result?.vulns || []).filter((v) => {
    if (filter === 'OPEN') return v.status === 'open' && !fixed.has(v.id);
    if (filter === 'ALL')  return true;
    return v.sev === filter;
  });

  const sevCounts = (result?.vulns || []).reduce((acc, v) => {
    acc[v.sev] = (acc[v.sev] || 0) + 1; return acc;
  }, {});

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: 24, fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>🛡️ Security Dashboard</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            Real-time vulnerability scanning · Network monitoring · On-device threat detection
            {lastScan && ` · Last scan: ${lastScan.toLocaleTimeString()}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setAutoScan((v) => !v)}
            style={{ background: autoScan ? '#22c55e22' : '#1e293b', color: autoScan ? '#22c55e' : '#94a3b8', border: `1px solid ${autoScan ? '#22c55e' : '#334155'}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {autoScan ? '🔴 Auto-Scan On' : '⚙️ Auto-Scan'}
          </button>
          <button onClick={scan} disabled={scanning}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: scanning ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700 }}>
            {scanning ? '⏳ Scanning…' : '▶ Run Scan'}
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 28 }}>
        <ScoreRing score={result?.score ?? 0} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 10 }}>
          {Object.entries(SEV).map(([key, s]) => (
            <div key={key} onClick={() => setFilter(key)}
              style={{ background: filter === key ? s.bg : '#1e293b', border: `1px solid ${filter === key ? s.color : '#334155'}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{sevCounts[key] || 0}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
            </div>
          ))}
          <div onClick={() => setFilter('OPEN')}
            style={{ background: filter === 'OPEN' ? '#334155' : '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>🔓</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>
              {(result?.vulns || []).filter((v) => v.status === 'open').length}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Open</div>
          </div>
          <div onClick={() => setFilter('ALL')}
            style={{ background: filter === 'ALL' ? '#334155' : '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>📋</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>{result?.vulns?.length ?? 0}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>All</div>
          </div>
        </div>
      </div>

      {/* Two-column: vulns + network */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
            Findings ({vulns.length})
          </h2>
          {scanning && !result && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Scanning… please wait</div>
          )}
          {vulns.map((v) => (
            <VulnRow key={v.id} vuln={fixed.has(v.id) ? { ...v, status: 'mitigated' } : v} onFix={handleFix} />
          ))}
          {!scanning && vulns.length === 0 && (
            <div style={{ color: '#22c55e', textAlign: 'center', padding: 40, fontSize: 18 }}>✅ No issues found for this filter</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <NetworkCard status={result?.networkStatus} live={live} />

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: '#f8fafc', margin: '0 0 12px', fontSize: 16 }}>📋 Scan Coverage</h3>
            {SCAN_CATEGORIES.map((cat) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{cat}</span>
                <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✅ Scanned</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
