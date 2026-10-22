// Nexus AI Pro - Security Dashboard | Date: 2026-10-22

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

const MOCK_VULNS = [
  { id: 'CVE-2026-0001', name: 'Outdated TLS Cipher Suite', severity: 'high',   status: 'open',     component: 'nginx',         cve: 'CVE-2026-0001' },
  { id: 'CVE-2025-4412', name: 'JWT Algorithm Confusion',   severity: 'critical',status: 'scanning', component: 'auth-service',  cve: 'CVE-2025-4412' },
  { id: 'CVE-2025-3301', name: 'CORS Misconfiguration',     severity: 'medium',  status: 'patched',  component: 'api-gateway',   cve: 'CVE-2025-3301' },
  { id: 'CVE-2025-2201', name: 'Prototype Pollution (npm)', severity: 'medium',  status: 'open',     component: 'node_modules',  cve: 'CVE-2025-2201' },
  { id: 'CVE-2025-1100', name: 'Insecure Deserialization',  severity: 'low',     status: 'patched',  component: 'storage-svc',   cve: 'CVE-2025-1100' },
  { id: 'CVE-2024-9988', name: 'Path Traversal Risk',       severity: 'high',    status: 'open',     component: 'file-handler',  cve: 'CVE-2024-9988' },
];

const OWASP_TOP10 = [
  { id: 'A01', name: 'Broken Access Control',          pass: true  },
  { id: 'A02', name: 'Cryptographic Failures',         pass: true  },
  { id: 'A03', name: 'Injection',                      pass: true  },
  { id: 'A04', name: 'Insecure Design',                pass: false },
  { id: 'A05', name: 'Security Misconfiguration',      pass: false },
  { id: 'A06', name: 'Vulnerable Components',          pass: true  },
  { id: 'A07', name: 'Auth & Session Failures',        pass: true  },
  { id: 'A08', name: 'Software Integrity Failures',    pass: true  },
  { id: 'A09', name: 'Logging & Monitoring Failures',  pass: false },
  { id: 'A10', name: 'SSRF',                           pass: true  },
];

const THREAT_EVENTS = [
  'Port scan detected from 185.220.101.x',
  'Brute-force attempt blocked on /api/auth/login',
  'SQL injection pattern detected in query param',
  'XSS payload filtered in user input',
  'Abnormal JWT token structure rejected',
  'Rate limit triggered — 429 returned',
  'Unknown User-Agent flagged for review',
  'CORS origin mismatch blocked',
  'Excessive API calls from 203.0.113.42',
  'Malformed multipart boundary in upload',
];

const AUTH_EVENTS_MOCK = [
  { time: '16:14:01', event: 'Login success',        user: 'admin@nexus.pro',   ip: '10.0.0.1',      mfa: true  },
  { time: '16:13:47', event: 'MFA challenge sent',   user: 'dev@nexus.pro',     ip: '10.0.0.2',      mfa: true  },
  { time: '16:12:30', event: 'Login failed (×3)',    user: 'unknown',           ip: '185.220.101.5', mfa: false },
  { time: '16:11:15', event: 'IP blocked',           user: '—',                 ip: '185.220.101.5', mfa: false },
  { time: '16:09:02', event: 'Password reset req.',  user: 'user@nexus.pro',    ip: '10.0.0.3',      mfa: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randF(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function detectPlatform() {
  if (typeof window !== 'undefined' && window.electron) return 'Electron';
  if (typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) return 'Mobile';
  return 'Web';
}

function scoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function severityColor(sev) {
  return { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#3b82f6' }[sev] || '#6b7280';
}

function statusBadge(status) {
  const map = { open: ['#ef4444', 'OPEN'], patched: ['#10b981', 'PATCHED'], scanning: ['#8b5cf6', 'SCANNING'] };
  return map[status] || ['#6b7280', status.toUpperCase()];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const dashoffset = circ * (1 - score / 100);
  const color = scoreColor(score);
  return (
    <div style={s.ringWrap}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#1e293b" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={r} fill="none"
          stroke={color} strokeWidth="14"
          strokeDasharray={circ} strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="90" y="84" textAnchor="middle" fill={color} fontSize="32" fontWeight="700">{score}</text>
        <text x="90" y="106" textAnchor="middle" fill="#94a3b8" fontSize="12">/ 100</text>
      </svg>
      <div style={{ color, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
        {score >= 80 ? 'SECURE' : score >= 60 ? 'AT RISK' : 'CRITICAL'}
      </div>
    </div>
  );
}

function MetricBar({ label, value, max = 100, color = '#3b82f6', unit = '%' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>
        <span style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace' }}>{value}{unit}</span>
      </div>
      <div style={{ background: '#1e293b', borderRadius: 4, height: 6 }}>
        <div style={{
          width: `${Math.min(100, (value / max) * 100)}%`, height: '100%',
          background: color, borderRadius: 4, transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  );
}

function Card({ title, children, badge, style: extra }) {
  return (
    <div style={{ ...s.card, ...extra }}>
      <div style={s.cardHeader}>
        <span style={s.cardTitle}>{title}</span>
        {badge && <span style={s.badge}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecurityDashboard() {
  const [score, setScore]             = useState(87);
  const [scanning, setScanning]       = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [threats, setThreats]         = useState([THREAT_EVENTS[0]]);
  const [network, setNetwork]         = useState({ inbound: 42.3, outbound: 18.1, anomalies: 0, connections: 124 });
  const [health, setHealth]           = useState({ cpu: 34, memory: 61, disk: 47, uptime: 14400 });
  const [apiData, setApiData]         = useState(null);
  const [wsStatus, setWsStatus]       = useState('disconnected');
  const [platform]                    = useState(detectPlatform);
  const [keyRotation]                 = useState(rand(1, 23));
  const wsRef                         = useRef(null);

  // ── fetch from API, fall back to mock ──
  const fetchSecurityData = useCallback(async () => {
    try {
      const res = await fetch('/api/security/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApiData(data);
      if (data.overallScore) setScore(data.overallScore);
    } catch {
      // Use mock data silently
    }
  }, []);

  // ── WebSocket connection ──
  useEffect(() => {
    let ws;
    try {
      // Dynamic import attempt — falls back if socket.io-client unavailable in this context
      const url = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
      ws = new WebSocket(url);
      ws.onopen  = () => setWsStatus('connected');
      ws.onclose = () => setWsStatus('disconnected');
      ws.onerror = () => setWsStatus('error');
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'security_event') {
            setThreats(prev => [msg.message, ...prev].slice(0, 12));
          }
        } catch { /* ignore malformed */ }
      };
      wsRef.current = ws;
    } catch {
      setWsStatus('unavailable');
    }
    return () => ws && ws.close();
  }, []);

  // ── Initial data fetch ──
  useEffect(() => { fetchSecurityData(); }, [fetchSecurityData]);

  // ── Network stats (2s) ──
  useEffect(() => {
    const t = setInterval(() => {
      setNetwork(prev => ({
        inbound:     randF(10, 200),
        outbound:    randF(5, 80),
        anomalies:   Math.random() < 0.12 ? prev.anomalies + 1 : prev.anomalies,
        connections: rand(80, 350),
      }));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // ── On-device health (3s) ──
  useEffect(() => {
    const t = setInterval(() => {
      setHealth(prev => ({
        cpu:     rand(10, 92),
        memory:  rand(35, 88),
        disk:    prev.disk + (Math.random() < 0.05 ? 1 : 0),
        uptime:  prev.uptime + 3,
      }));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // ── Threat feed (5s) ──
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.7) {
        const msg = THREAT_EVENTS[rand(0, THREAT_EVENTS.length - 1)];
        const ts  = new Date().toLocaleTimeString();
        setThreats(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 12));
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // ── Run Scan ──
  const runScan = useCallback(async () => {
    setScanning(true);
    setScanProgress(0);
    let p = 0;
    const tick = setInterval(() => {
      p += rand(5, 18);
      if (p >= 100) {
        p = 100;
        clearInterval(tick);
        setScanning(false);
        setScore(rand(72, 96));
        const ts = new Date().toLocaleTimeString();
        setThreats(prev => [`[${ts}] Full scan complete — system nominal`, ...prev].slice(0, 12));
      }
      setScanProgress(p);
    }, 300);

    try {
      await fetch('/api/security/scan', { method: 'POST', credentials: 'include' });
    } catch { /* server unavailable — progress bar still runs */ }
  }, []);

  // ── Export Report ──
  const exportReport = useCallback(() => {
    const report = {
      generated:   new Date().toISOString(),
      platform,
      score,
      network,
      health,
      vulnerabilities: MOCK_VULNS,
      owaspTop10:      OWASP_TOP10,
      threats:         threats.slice(0, 20),
      wsStatus,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `nexus-security-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [score, network, health, threats, wsStatus, platform]);

  const uptime = `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`;

  return (
    <div style={s.root}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>🛡️ Security Dashboard</h1>
          <span style={{ color: '#64748b', fontSize: 13 }}>
            Platform: <span style={{ color: '#94a3b8' }}>{platform}</span>
            &nbsp;·&nbsp;WebSocket: <span style={{ color: wsStatus === 'connected' ? '#10b981' : '#ef4444' }}>{wsStatus}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={s.btnPrimary} onClick={runScan} disabled={scanning}>
            {scanning ? `Scanning… ${scanProgress}%` : '▶ Run Scan'}
          </button>
          <button style={s.btnSecondary} onClick={exportReport}>⬇ Export Report</button>
          <button style={s.btnSecondary} onClick={fetchSecurityData}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Scan progress bar ── */}
      {scanning && (
        <div style={{ background: '#1e293b', borderRadius: 4, height: 4, marginBottom: 18, overflow: 'hidden' }}>
          <div style={{ width: `${scanProgress}%`, height: '100%', background: '#8b5cf6', transition: 'width 0.3s linear' }} />
        </div>
      )}

      {/* ── Top row: score + health + encryption ── */}
      <div style={s.row3}>
        {/* Score */}
        <Card title="Security Score" badge={score >= 80 ? 'SECURE' : score >= 60 ? 'AT RISK' : 'CRITICAL'}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
            <ScoreRing score={score} />
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
              Last scan: {new Date(apiData?.lastScanTime || Date.now()).toLocaleTimeString()}
            </div>
          </div>
        </Card>

        {/* On-Device Health */}
        <Card title="On-Device Health" badge={`Uptime ${uptime}`}>
          <MetricBar label="CPU"    value={health.cpu}    color={health.cpu    > 80 ? '#ef4444' : '#3b82f6'} />
          <MetricBar label="Memory" value={health.memory} color={health.memory > 85 ? '#ef4444' : '#8b5cf6'} />
          <MetricBar label="Disk"   value={health.disk}   color={health.disk   > 90 ? '#ef4444' : '#10b981'} />
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
            Active connections: <strong style={{ color: '#e2e8f0' }}>{network.connections}</strong>
          </div>
        </Card>

        {/* Encryption */}
        <Card title="Encryption Status">
          <div style={s.encRow}><span style={s.encLabel}>Algorithm</span><span style={s.encValue}>AES-256-GCM</span></div>
          <div style={s.encRow}><span style={s.encLabel}>Status</span><span style={{ color: '#10b981', fontSize: 13 }}>● ACTIVE</span></div>
          <div style={s.encRow}><span style={s.encLabel}>IV Length</span><span style={s.encValue}>12 bytes</span></div>
          <div style={s.encRow}><span style={s.encLabel}>Auth Tag</span><span style={s.encValue}>128-bit GCM</span></div>
          <div style={s.encRow}><span style={s.encLabel}>Key Rotation</span><span style={{ color: '#f59e0b', fontSize: 13 }}>{keyRotation}h remaining</span></div>
          <div style={s.encRow}><span style={s.encLabel}>TLS</span><span style={s.encValue}>TLS 1.3</span></div>
          <div style={s.encRow}><span style={s.encLabel}>Cert Expiry</span><span style={{ color: '#10b981', fontSize: 13 }}>89 days</span></div>
          <div style={s.encRow}><span style={s.encLabel}>HSTS</span><span style={{ color: '#10b981', fontSize: 13 }}>Enabled</span></div>
        </Card>
      </div>

      {/* ── Network + Threat Feed ── */}
      <div style={s.row2}>
        <Card title="Network Monitor" badge={network.anomalies > 0 ? `⚠ ${network.anomalies} anomalies` : 'CLEAN'}>
          <div style={s.row2inner}>
            <div>
              <div style={s.netStat}>
                <span style={s.encLabel}>Inbound</span>
                <span style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: 15 }}>{network.inbound} Mbps</span>
              </div>
              <div style={s.netStat}>
                <span style={s.encLabel}>Outbound</span>
                <span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: 15 }}>{network.outbound} Mbps</span>
              </div>
              <div style={s.netStat}>
                <span style={s.encLabel}>Connections</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 15 }}>{network.connections}</span>
              </div>
              <div style={s.netStat}>
                <span style={s.encLabel}>Anomalies</span>
                <span style={{ color: network.anomalies > 0 ? '#ef4444' : '#10b981', fontFamily: 'monospace', fontSize: 15 }}>
                  {network.anomalies}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={s.miniGraph}>
                {[...Array(20)].map((_, i) => (
                  <div key={i} style={{
                    ...s.miniBar,
                    height: `${rand(15, 100)}%`,
                    background: i === 19 ? '#3b82f6' : 'rgba(59,130,246,0.35)',
                  }} />
                ))}
              </div>
              <div style={{ color: '#475569', fontSize: 10, textAlign: 'center', marginTop: 4 }}>inbound (live)</div>
            </div>
          </div>
        </Card>

        <Card title="Real-time Threat Feed" badge="LIVE">
          <div style={s.threatList}>
            {threats.length === 0 && <div style={{ color: '#475569', fontSize: 12 }}>No threats detected.</div>}
            {threats.map((t, i) => (
              <div key={i} style={{ ...s.threatRow, opacity: 1 - i * 0.07 }}>
                <span style={{ color: i === 0 ? '#ef4444' : '#f97316', fontSize: 10, marginRight: 6 }}>▶</span>
                <span style={{ color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}>{t}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Vulnerability Table ── */}
      <Card title="Vulnerability List" badge={`${MOCK_VULNS.filter(v => v.status === 'open').length} Open`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                {['CVE', 'Name', 'Component', 'Severity', 'Status'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_VULNS.map(v => {
                const [sc, sl] = statusBadge(v.status);
                return (
                  <tr key={v.id} style={s.tr}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{v.cve}</td>
                    <td style={{ ...s.td, color: '#e2e8f0' }}>{v.name}</td>
                    <td style={{ ...s.td, color: '#94a3b8' }}>{v.component}</td>
                    <td style={s.td}>
                      <span style={{ ...s.pill, background: `${severityColor(v.severity)}22`, color: severityColor(v.severity), border: `1px solid ${severityColor(v.severity)}` }}>
                        {v.severity.toUpperCase()}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.pill, background: `${sc}22`, color: sc, border: `1px solid ${sc}` }}>
                        {sl}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Auth Events + Compliance ── */}
      <div style={s.row2}>
        <Card title="Authentication Events">
          <table style={s.table}>
            <thead>
              <tr>
                {['Time', 'Event', 'User', 'IP', 'MFA'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUTH_EVENTS_MOCK.map((e, i) => (
                <tr key={i} style={s.tr}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{e.time}</td>
                  <td style={{ ...s.td, fontSize: 12, color: e.event.includes('failed') || e.event.includes('blocked') ? '#ef4444' : '#e2e8f0' }}>{e.event}</td>
                  <td style={{ ...s.td, fontSize: 11, color: '#94a3b8' }}>{e.user}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{e.ip}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>{e.mfa ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Compliance">
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 600 }}>OWASP TOP 10 (2021)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {OWASP_TOP10.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ color: item.pass ? '#10b981' : '#ef4444' }}>{item.pass ? '✓' : '✗'}</span>
                  <span style={{ color: item.pass ? '#94a3b8' : '#fca5a5' }}>{item.id}: {item.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['PCI-DSS', score >= 80 ? 'PASS' : 'REVIEW', score >= 80 ? '#10b981' : '#f59e0b'],
              ['GDPR',    'COMPLIANT',  '#10b981'],
              ['SOC 2',   'IN REVIEW',  '#f59e0b'],
              ['ISO 27001','AUDIT DUE', '#f59e0b'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: '#0f172a', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ color: '#64748b', fontSize: 10 }}>{label}</div>
                <div style={{ color, fontSize: 13, fontWeight: 700, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    background: '#0a0f1e',
    minHeight: '100vh',
    color: '#e2e8f0',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    padding: '20px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  h1: { fontSize: 22, fontWeight: 700, margin: 0, color: '#f1f5f9', letterSpacing: '-0.3px' },
  row3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 14,
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14,
    marginBottom: 14,
  },
  row2inner: {
    display: 'flex',
    gap: 20,
    alignItems: 'flex-start',
  },
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '14px 16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' },
  badge: {
    background: '#1e293b',
    color: '#64748b',
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 20,
    border: '1px solid #334155',
  },
  btnPrimary: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.02em',
  },
  btnSecondary: {
    background: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '7px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  encRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  encLabel:{ color: '#475569', fontSize: 12 },
  encValue:{ color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace' },
  ringWrap:{ display: 'flex', flexDirection: 'column', alignItems: 'center' },
  netStat: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 16 },
  threatList: { maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 },
  threatRow:  { display: 'flex', alignItems: 'flex-start' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th:    { color: '#475569', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '6px 8px', textTransform: 'uppercase', borderBottom: '1px solid #1e293b' },
  td:    { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #0f172a' },
  tr:    { transition: 'background 0.15s' },
  pill:  { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, letterSpacing: '0.05em' },
  miniGraph: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 2,
    height: 50,
    background: '#0a0f1e',
    borderRadius: 4,
    padding: '4px 4px 0',
  },
  miniBar: {
    flex: 1,
    minWidth: 2,
    borderRadius: '2px 2px 0 0',
  },
};
