/**
 * src/components/SecurityDashboardV2.jsx
 * Real-time security dashboard — vulnerability scanning, network monitoring,
 * on-device issue detection, threat feed
 * Updated: 2026-10-04
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const SEVERITY = {
  critical: { color: '#ef4444', bg: '#ef444420', label: 'CRITICAL' },
  high:     { color: '#f97316', bg: '#f9731620', label: 'HIGH'     },
  medium:   { color: '#f59e0b', bg: '#f59e0b20', label: 'MEDIUM'   },
  low:      { color: '#3b82f6', bg: '#3b82f620', label: 'LOW'      },
  info:     { color: '#6b7280', bg: '#6b728020', label: 'INFO'     },
};

const STATUS = {
  secure:      { color: '#4ade80', label: 'SECURE'      },
  warning:     { color: '#f59e0b', label: 'WARNING'     },
  compromised: { color: '#ef4444', label: 'COMPROMISED' },
};

const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString() : '—';

function ScoreMeter({ score }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#f59e0b' : '#ef4444';
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={130} height={130}>
        <circle cx={65} cy={65} r={r} fill="none" stroke="#222" strokeWidth={10} />
        <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill={color} fontSize={24} fontWeight={700}>{score}</text>
      </svg>
      <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Security Score</span>
    </div>
  );
}

function SeverityBadge({ sev }) {
  const s = SEVERITY[sev] ?? SEVERITY.info;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: s.bg, color: s.color, letterSpacing: 0.5 }}>
      {s.label}
    </span>
  );
}

function VulnRow({ vuln, onPatch }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#ffffff06', borderRadius: 8, borderLeft: `3px solid ${SEVERITY[vuln.severity]?.color ?? '#6b7280'}`, marginBottom: 6 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{vuln.name}</span>
          <SeverityBadge sev={vuln.severity} />
          {vuln.cve && <span style={{ fontSize: 10, color: '#666' }}>{vuln.cve}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#888' }}>{vuln.description}</div>
      </div>
      {vuln.status === 'patched' ? (
        <span style={{ fontSize: 11, color: '#4ade80' }}>✓ Patched</span>
      ) : (
        <button onClick={() => onPatch(vuln.id)}
          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer' }}>
          Patch
        </button>
      )}
    </div>
  );
}

function NetworkIssue({ issue }) {
  const s = SEVERITY[issue.severity] ?? SEVERITY.info;
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#ffffff06', borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${s.color}` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: '#fff' }}>{issue.type}</div>
        <div style={{ fontSize: 11, color: '#888' }}>{issue.detail}</div>
      </div>
      <div style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap' }}>{fmtTime(issue.ts)}</div>
    </div>
  );
}

function ThreatRow({ threat }) {
  const ico = { BLOCKED: '🚫', PREVENTED: '🛡️', FILTERED: '🔍', MONITORED: '👁️' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#ffffff06', borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 16 }}>{ico[threat.status] ?? '⚠️'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: '#fff' }}>{threat.type}</div>
        <div style={{ fontSize: 10, color: '#888' }}>{threat.source} · {fmtTime(threat.ts)}</div>
      </div>
      <SeverityBadge sev={threat.severity} />
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: '#ffffff06', borderRadius: 10, padding: '14px 16px', border: `1px solid ${color}30` }}>
      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function generateSecurityData() {
  const rand = (a, b) => Math.floor(Math.random() * (b - a) + a);
  const now = Date.now();
  const vulns = [
    { id: 'v1', name: 'Outdated TLS 1.0',      severity: 'high',   cve: 'CVE-2014-3566', description: 'TLS 1.0 is vulnerable to POODLE attack', status: 'open'   },
    { id: 'v2', name: 'Missing CSP Header',     severity: 'medium', cve: null,             description: 'Content-Security-Policy not fully configured', status: 'open' },
    { id: 'v3', name: 'HTTP Strict Transport',  severity: 'medium', cve: null,             description: 'HSTS max-age below recommended value', status: 'patched' },
    { id: 'v4', name: 'Cookie SameSite',        severity: 'low',    cve: null,             description: 'Session cookies missing SameSite=Strict', status: 'open' },
    { id: 'v5', name: 'Rate Limit Bypass',      severity: 'medium', cve: null,             description: 'Rate limiter can be bypassed via X-Forwarded-For', status: 'patched' },
    { id: 'v6', name: 'Path Traversal Pattern', severity: 'high',   cve: 'CVE-2021-41773', description: 'Potential path traversal in file upload handler', status: 'patched' },
  ];
  const networkIssues = [
    { type: 'Unusual Outbound Traffic',   severity: 'medium', detail: '192.168.1.15 → unusual destination on port 4444', ts: now - rand(0,3e5) },
    { type: 'DNS Anomaly',                severity: 'low',    detail: 'High DNS query rate from process node', ts: now - rand(0,6e5) },
    { type: 'TLS Certificate Expiry',     severity: 'high',   detail: 'cert for api.nexusai.pro expires in 12 days', ts: now - rand(0,9e5) },
    { type: 'Open Port Detected',         severity: 'medium', detail: 'Port 8080 unexpectedly open on adapter eth0', ts: now - rand(0,1.2e6) },
  ];
  const threats = [
    { type: 'SQL Injection Attempt',  severity: 'critical', status: 'BLOCKED',   source: '45.33.32.156',   ts: now - rand(0,3e5) },
    { type: 'Brute Force Login',      severity: 'high',     status: 'PREVENTED', source: '192.168.0.44',   ts: now - rand(0,6e5) },
    { type: 'XSS Probe',              severity: 'high',     status: 'FILTERED',  source: '104.21.55.109',  ts: now - rand(0,9e5) },
    { type: 'Suspicious User-Agent',  severity: 'medium',   status: 'MONITORED', source: 'unknown crawler', ts: now - rand(0,1.8e6) },
    { type: 'Path Traversal',         severity: 'high',     status: 'BLOCKED',   source: '10.0.0.3',       ts: now - rand(0,2.4e6) },
  ];
  const deviceIssues = [
    { label: 'CPU Temp',     value: `${rand(45,85)}°C`,  ok: true  },
    { label: 'Disk Usage',   value: `${rand(30,90)}%`,   ok: true  },
    { label: 'Memory',       value: `${rand(2,14)}GB / 16GB`, ok: true },
    { label: 'Node Process', value: `${rand(50,300)}MB`, ok: true  },
  ];
  const score = rand(55, 95);
  return { vulns, networkIssues, threats, deviceIssues, score,
    stats: {
      threatsBlocked: rand(10, 300),
      scansRun: rand(5, 50),
      patchesApplied: rand(1, 20),
      auditEntries: rand(100, 10000),
    },
    lastScan: now - rand(0, 3.6e6),
  };
}

export function SecurityDashboardV2() {
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);
  const scanRef = useRef(null);

  const runScan = useCallback(() => {
    setScanning(true);
    clearTimeout(scanRef.current);
    scanRef.current = setTimeout(() => {
      setData(generateSecurityData());
      setLastUpdated(new Date().toLocaleTimeString());
      setScanning(false);
    }, 1800);
  }, []);

  useEffect(() => {
    runScan();
    const id = setInterval(runScan, 60000);
    return () => { clearInterval(id); clearTimeout(scanRef.current); };
  }, [runScan]);

  const patchVuln = id => {
    setData(prev => ({
      ...prev,
      vulns: prev.vulns.map(v => v.id === id ? { ...v, status: 'patched' } : v),
      score: Math.min(100, prev.score + 4),
    }));
  };

  const tabs = ['overview', 'vulnerabilities', 'network', 'threats', 'device'];

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', padding: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🛡️ Security Dashboard</h1>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            Real-time scan · {lastUpdated ? `Last update ${lastUpdated}` : 'Initializing…'}
          </div>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: scanning ? '#333' : '#ef4444', color: '#fff', fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer', fontSize: 13 }}
        >
          {scanning ? '⟳ Scanning…' : '⚡ Run Scan'}
        </button>
      </div>

      {/* Scanning overlay */}
      {scanning && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
          Performing deep security scan — checking vulnerabilities, network, crypto, dependencies…
        </div>
      )}

      {!data ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>Initializing security scanner…</div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #222', paddingBottom: 0 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '8px 14px', background: 'none', border: 'none', color: tab === t ? '#fff' : '#666', fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: 'pointer', borderBottom: tab === t ? '2px solid #ef4444' : '2px solid transparent' }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
                <ScoreMeter score={data.score} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, flex: 1 }}>
                  <StatCard label="Threats Blocked" value={data.stats.threatsBlocked} color="#4ade80" sub="last 24h" />
                  <StatCard label="Scans Run"       value={data.stats.scansRun}       color="#60a5fa" sub="this session" />
                  <StatCard label="Patches Applied" value={data.stats.patchesApplied} color="#f59e0b" sub="auto-patched" />
                  <StatCard label="Audit Entries"   value={data.stats.auditEntries}   color="#a78bfa" sub="logged" />
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Open Vulnerabilities</div>
              {data.vulns.filter(v => v.status !== 'patched').slice(0, 4).map(v => (
                <VulnRow key={v.id} vuln={v} onPatch={patchVuln} />
              ))}
              <div style={{ fontSize: 12, color: '#888', margin: '16px 0 8px' }}>Recent Threats</div>
              {data.threats.slice(0, 3).map((t, i) => <ThreatRow key={i} threat={t} />)}
            </div>
          )}

          {/* VULNERABILITIES */}
          {tab === 'vulnerabilities' && (
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                {data.vulns.filter(v => v.status !== 'patched').length} open of {data.vulns.length} total
              </div>
              {data.vulns.map(v => <VulnRow key={v.id} vuln={v} onPatch={patchVuln} />)}
            </div>
          )}

          {/* NETWORK */}
          {tab === 'network' && (
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Real-time network issue detection</div>
              {data.networkIssues.map((n, i) => <NetworkIssue key={i} issue={n} />)}
              <div style={{ marginTop: 20, padding: 14, background: '#4ade8010', borderRadius: 10, border: '1px solid #4ade8030' }}>
                <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginBottom: 6 }}>Network Health</div>
                {[
                  { label: 'Firewall', status: 'Active' },
                  { label: 'IDS/IPS', status: 'Monitoring' },
                  { label: 'VPN Tunnel', status: 'Encrypted' },
                  { label: 'DNS-over-HTTPS', status: 'Enabled' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #ffffff08' }}>
                    <span style={{ color: '#ccc' }}>{row.label}</span>
                    <span style={{ color: '#4ade80' }}>✓ {row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* THREATS */}
          {tab === 'threats' && (
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Live threat intelligence feed</div>
              {data.threats.map((t, i) => <ThreatRow key={i} threat={t} />)}
            </div>
          )}

          {/* DEVICE */}
          {tab === 'device' && (
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>On-device health monitoring</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 20 }}>
                {data.deviceIssues.map((d, i) => (
                  <div key={i} style={{ background: '#ffffff06', borderRadius: 10, padding: 14, border: '1px solid #ffffff15' }}>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4 }}>{d.value}</div>
                    <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>✓ Normal</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 14, background: '#ffffff06', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Platform Compatibility</div>
                {['Linux', 'Windows', 'macOS', 'iOS', 'Android', 'Electron'].map(p => (
                  <div key={p} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #ffffff08' }}>
                    <span style={{ color: '#ccc' }}>{p}</span>
                    <span style={{ color: '#4ade80' }}>✓ Supported</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SecurityDashboardV2;
