/**
 * SecurityDashboardEnhanced.jsx
 * Nexus AI Pro — Real-time Security & Network Monitoring Dashboard
 * Date: 2026-08-27
 * Features: real-time scans, network issue detection, on-device issues,
 *           threat map, vulnerability scoring, cryptographic audit
 * Platforms: Linux, Windows, macOS, iOS, Android, Electron, Web
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS  = 15_000;  // 15-second real-time refresh
const MAX_LOG_ENTRIES   = 50;

const SEVERITY = {
  critical: { color: '#ef4444', bg: '#450a0a', label: 'Critical' },
  high:     { color: '#f97316', bg: '#431407', label: 'High'     },
  medium:   { color: '#eab308', bg: '#422006', label: 'Medium'   },
  low:      { color: '#22c55e', bg: '#052e16', label: 'Low'      },
  info:     { color: '#6366f1', bg: '#1e1b4b', label: 'Info'     },
};

const NETWORK_CHECKS = [
  'TLS Certificate Validity',
  'DNS Integrity',
  'Open Port Exposure',
  'Firewall Rule Audit',
  'Inbound HTTPS Enforcement',
  'Outbound Request Filtering',
  'WebSocket Secure Connection',
  'CORS Policy Compliance',
];

const DEVICE_CHECKS = [
  'Dependency Vulnerability Scan',
  'Memory Usage Analysis',
  'Disk Space Integrity',
  'Process Anomaly Detection',
  'Privilege Escalation Check',
  'File Integrity Monitor',
  'Kernel Parameter Audit',
  'Crypto Key Rotation Status',
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function statusColor(status) {
  const map = { pass: '#22c55e', warn: '#eab308', fail: '#ef4444', scan: '#6366f1' };
  return map[status] || '#94a3b8';
}

function scoreGrade(score) {
  if (score >= 90) return { grade: 'A', color: '#22c55e' };
  if (score >= 75) return { grade: 'B', color: '#84cc16' };
  if (score >= 60) return { grade: 'C', color: '#eab308' };
  if (score >= 45) return { grade: 'D', color: '#f97316' };
  return { grade: 'F', color: '#ef4444' };
}

// ── Data generators (replace with real API in production) ─────────────────────
function generateNetworkResults() {
  return NETWORK_CHECKS.map(name => ({
    id: genId(),
    name,
    status: Math.random() > 0.15 ? 'pass' : (Math.random() > 0.5 ? 'warn' : 'fail'),
    latencyMs: randomBetween(1, 120),
    detail: `Checked at ${new Date().toLocaleTimeString()}`,
  }));
}

function generateDeviceResults() {
  return DEVICE_CHECKS.map(name => ({
    id: genId(),
    name,
    status: Math.random() > 0.2 ? 'pass' : (Math.random() > 0.5 ? 'warn' : 'fail'),
    detail: `Checked at ${new Date().toLocaleTimeString()}`,
  }));
}

function generateVulnerabilities() {
  const templates = [
    { title: 'Outdated TLS 1.0 Support',        severity: 'high'     },
    { title: 'Missing HSTS Header',              severity: 'medium'   },
    { title: 'JWT Algorithm Downgrade Risk',     severity: 'critical' },
    { title: 'Unencrypted Local Storage Key',    severity: 'high'     },
    { title: 'CORS Wildcard Origin Detected',    severity: 'medium'   },
    { title: 'Npm Dependency CVE-2025-41234',    severity: 'high'     },
    { title: 'CSP Script-src Unsafe-inline',     severity: 'medium'   },
    { title: 'Exposed Debug Endpoint /api/debug',severity: 'low'      },
    { title: 'Rate Limit Bypass via X-Forwarded',severity: 'high'     },
    { title: 'Unvalidated Redirect Parameter',   severity: 'low'      },
  ];
  return templates
    .filter(() => Math.random() > 0.6)
    .map(t => ({ ...t, id: genId(), patched: false, detectedAt: Date.now() }));
}

function calcSecurityScore(netResults, devResults, vulns) {
  const netPassed    = netResults.filter(r => r.status === 'pass').length;
  const devPassed    = devResults.filter(r => r.status === 'pass').length;
  const criticalOpen = vulns.filter(v => v.severity === 'critical' && !v.patched).length;
  const highOpen     = vulns.filter(v => v.severity === 'high' && !v.patched).length;
  const base = ((netPassed / NETWORK_CHECKS.length) * 40) +
               ((devPassed / DEVICE_CHECKS.length) * 40);
  const penalty = criticalOpen * 10 + highOpen * 5;
  return Math.max(0, Math.min(100, Math.round(base + 20 - penalty)));
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const { grade, color } = scoreGrade(score);
  const circumference = 2 * Math.PI * 54;
  const dash = (score / 100) * circumference;
  return (
    <div style={styles.gaugeContainer}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle cx="70" cy="70" r="54" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="70" y="65" textAnchor="middle" fontSize="28" fontWeight="700" fill={color}>{score}</text>
        <text x="70" y="88" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{grade}</text>
      </svg>
      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Security Score</div>
    </div>
  );
}

function CheckList({ items, title, icon }) {
  return (
    <div style={styles.checkPanel}>
      <div style={styles.checkTitle}>{icon} {title}</div>
      <div style={styles.checkList}>
        {items.map(item => (
          <div key={item.id} style={styles.checkItem}>
            <span style={{ color: statusColor(item.status), fontSize: 16, flexShrink: 0 }}>
              {item.status === 'pass' ? '✓' : item.status === 'warn' ? '⚠' : '✗'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </div>
              {item.latencyMs !== undefined && (
                <div style={{ fontSize: 11, color: '#64748b' }}>{item.latencyMs} ms</div>
              )}
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              background: statusColor(item.status) + '22',
              color: statusColor(item.status),
            }}>{item.status.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VulnerabilityList({ vulns, onPatch }) {
  return (
    <div style={styles.checkPanel}>
      <div style={styles.checkTitle}>🛡 Vulnerabilities ({vulns.length})</div>
      {vulns.length === 0
        ? <div style={{ padding: 16, color: '#22c55e', fontSize: 13 }}>✓ No open vulnerabilities detected</div>
        : (
          <div style={styles.checkList}>
            {vulns.map(v => {
              const sev = SEVERITY[v.severity] || SEVERITY.info;
              return (
                <div key={v.id} style={{ ...styles.vulnItem, background: v.patched ? '#0f2a1a' : sev.bg }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: v.patched ? '#22c55e' : sev.color, fontWeight: 600 }}>
                      {v.patched ? '✓ PATCHED: ' : ''}{v.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {new Date(v.detectedAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: sev.color + '33', color: sev.color, fontWeight: 700 }}>
                      {sev.label}
                    </span>
                    {!v.patched && (
                      <button style={styles.patchBtn} onClick={() => onPatch(v.id)}>Patch</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function AuditLog({ entries }) {
  return (
    <div style={styles.checkPanel}>
      <div style={styles.checkTitle}>📋 Audit Log</div>
      <div style={{ ...styles.checkList, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
        {entries.slice(0, MAX_LOG_ENTRIES).map((e, i) => (
          <div key={i} style={styles.logEntry}>
            <span style={{ color: '#475569' }}>{e.ts}</span>
            <span style={{ color: SEVERITY[e.level]?.color || '#94a3b8', fontWeight: 600 }}>[{e.level.toUpperCase()}]</span>
            <span style={{ color: '#cbd5e1' }}>{e.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SecurityDashboardEnhanced() {
  const [scanning, setScanning]         = useState(false);
  const [networkResults, setNetworkResults] = useState([]);
  const [deviceResults, setDeviceResults]   = useState([]);
  const [vulns, setVulns]               = useState([]);
  const [auditLog, setAuditLog]         = useState([]);
  const [score, setScore]               = useState(0);
  const [scanCount, setScanCount]       = useState(0);
  const [lastScan, setLastScan]         = useState(null);
  const intervalRef = useRef(null);

  const addLog = useCallback((level, msg) => {
    setAuditLog(prev => [
      { ts: new Date().toLocaleTimeString(), level, msg },
      ...prev.slice(0, MAX_LOG_ENTRIES - 1),
    ]);
  }, []);

  const runScan = useCallback(() => {
    setScanning(true);
    addLog('info', 'Security scan initiated');

    // Simulate async scan (replace with real API call)
    const timer = setTimeout(() => {
      const net = generateNetworkResults();
      const dev = generateDeviceResults();
      const vs  = generateVulnerabilities();
      const sc  = calcSecurityScore(net, dev, vs);

      setNetworkResults(net);
      setDeviceResults(dev);
      setVulns(prev => {
        const existing = prev.filter(v => v.patched);
        return [...existing, ...vs];
      });
      setScore(sc);
      setScanCount(c => c + 1);
      setLastScan(new Date().toLocaleTimeString());
      setScanning(false);

      const failCount = net.filter(r => r.status === 'fail').length + dev.filter(r => r.status === 'fail').length;
      if (failCount > 0) addLog('high', `${failCount} check(s) failed this scan`);
      else addLog('info', `Scan complete — score ${sc}/100`);
    }, 1_200);

    return () => clearTimeout(timer);
  }, [addLog]);

  useEffect(() => {
    runScan();
    intervalRef.current = setInterval(runScan, SCAN_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [runScan]);

  const patchVuln = useCallback(id => {
    setVulns(prev => prev.map(v => v.id === id ? { ...v, patched: true } : v));
    addLog('low', `Vulnerability ${id} patched successfully`);
  }, [addLog]);

  const failedNet = networkResults.filter(r => r.status === 'fail').length;
  const failedDev = deviceResults.filter(r => r.status === 'fail').length;
  const openVulns = vulns.filter(v => !v.patched).length;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🛡 Security Dashboard</h1>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Real-time monitoring · Scan #{scanCount} · Last: {lastScan || '–'}
          </div>
        </div>
        <button onClick={runScan} disabled={scanning} style={styles.scanBtn}>
          {scanning ? '⏳ Scanning…' : '🔍 Scan Now'}
        </button>
      </div>

      {/* Status strip */}
      <div style={styles.statusStrip}>
        {[
          { label: 'Network Issues', count: failedNet, color: failedNet > 0 ? '#ef4444' : '#22c55e' },
          { label: 'Device Issues',  count: failedDev, color: failedDev > 0 ? '#f97316' : '#22c55e' },
          { label: 'Open Vulns',     count: openVulns, color: openVulns > 0 ? '#eab308' : '#22c55e' },
          { label: 'Scans Run',      count: scanCount, color: '#6366f1' },
        ].map(s => (
          <div key={s.label} style={styles.statTile}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</div>
          </div>
        ))}
        <ScoreGauge score={score} />
      </div>

      {/* Main grid */}
      <div style={styles.grid}>
        <CheckList items={networkResults} title="Network & HTTPS Checks" icon="🌐" />
        <CheckList items={deviceResults}  title="On-Device Checks"       icon="💻" />
        <VulnerabilityList vulns={vulns} onPatch={patchVuln} />
        <AuditLog entries={auditLog} />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    background: '#0f172a',
    minHeight: '100vh',
    color: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: 20,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  scanBtn: {
    padding: '10px 20px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    opacity: 1,
    transition: 'opacity 0.15s',
  },
  statusStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  statTile: {
    background: '#1e293b',
    borderRadius: 12,
    padding: '14px 20px',
    border: '1px solid #334155',
    minWidth: 100,
    textAlign: 'center',
  },
  gaugeContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 16,
  },
  checkPanel: {
    background: '#1e293b',
    borderRadius: 12,
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  checkTitle: {
    padding: '12px 16px',
    borderBottom: '1px solid #334155',
    fontWeight: 600,
    fontSize: 14,
    color: '#f1f5f9',
  },
  checkList: { maxHeight: 320, overflowY: 'auto' },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    borderBottom: '1px solid #0f172a',
  },
  vulnItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 16px',
    borderBottom: '1px solid #0f172a',
  },
  patchBtn: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #22c55e',
    background: 'transparent',
    color: '#22c55e',
    cursor: 'pointer',
  },
  logEntry: {
    display: 'flex',
    gap: 8,
    padding: '4px 12px',
    borderBottom: '1px solid #0f172a',
    flexWrap: 'wrap',
  },
};
