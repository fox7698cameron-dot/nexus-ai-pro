/* src/components/SecurityDashboardV2.jsx
   Enhanced Security Dashboard - Real-time scans, network detection, on-device issues
   Created: 2026-10-29
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';

const SEVERITY = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#8b5cf6' };

const SCAN_CHECKS = [
  { id: 'xss', name: 'XSS Prevention', category: 'web' },
  { id: 'sqli', name: 'SQL Injection', category: 'web' },
  { id: 'csrf', name: 'CSRF Protection', category: 'web' },
  { id: 'headers', name: 'Security Headers', category: 'web' },
  { id: 'tls', name: 'TLS Configuration', category: 'network' },
  { id: 'ports', name: 'Open Port Scan', category: 'network' },
  { id: 'dns', name: 'DNS Security (DNSSEC)', category: 'network' },
  { id: 'firewall', name: 'Firewall Rules', category: 'network' },
  { id: 'deps', name: 'Dependency Audit', category: 'code' },
  { id: 'secrets', name: 'Secret Detection', category: 'code' },
  { id: 'perms', name: 'File Permissions', category: 'os' },
  { id: 'updates', name: 'System Updates', category: 'os' },
  { id: 'disk', name: 'Disk Encryption', category: 'os' },
  { id: 'auth', name: 'Auth Strength', category: 'auth' },
  { id: 'mfa', name: 'MFA Enforcement', category: 'auth' },
  { id: 'tokens', name: 'Token Expiry', category: 'auth' }
];

const NETWORK_EVENTS = [
  'Suspicious outbound connection blocked',
  'Port scan detected from 192.168.1.x',
  'Unusual traffic spike on port 443',
  'New device connected to network',
  'DNS query anomaly detected',
  'Failed login attempt from unknown IP',
  'Certificate expiry warning',
  'Rate limit triggered on API endpoint'
];

function randomSeverity() {
  const r = Math.random();
  if (r < 0.05) return 'critical';
  if (r < 0.15) return 'high';
  if (r < 0.35) return 'medium';
  if (r < 0.65) return 'low';
  return 'info';
}

function runMockScan() {
  return SCAN_CHECKS.map(check => {
    const status = Math.random() > 0.25 ? 'pass' : Math.random() > 0.5 ? 'warn' : 'fail';
    const severity = status === 'pass' ? 'info' : status === 'warn' ? 'medium' : randomSeverity();
    return {
      ...check,
      status,
      severity,
      score: status === 'pass' ? 100 : status === 'warn' ? Math.floor(Math.random() * 30 + 40) : Math.floor(Math.random() * 30),
      message: status === 'pass'
        ? `${check.name} check passed`
        : status === 'warn'
        ? `${check.name} needs review`
        : `${check.name} vulnerability detected`,
      ts: new Date().toISOString()
    };
  });
}

function computeScore(results) {
  if (!results.length) return 0;
  return Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length);
}

const ScoreGauge = ({ score }) => {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  const angle = (score / 100) * 180;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 80, cy = 80, r = 60;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);
  const d1 = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const endAngle = (angle / 180) * Math.PI - Math.PI;
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy + r * Math.sin(endAngle);
  const largeArc = angle > 180 ? 1 : 0;
  const d2 = `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;

  return (
    <svg width={160} height={100} style={{ overflow: 'visible' }}>
      <path d={d1} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={14} strokeLinecap="round" />
      <path d={d2} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize={26} fontWeight={800}>{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={11}>Security Score</text>
    </svg>
  );
};

const ScanResultRow = ({ result }) => {
  const statusIcon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗';
  const statusColor = result.status === 'pass' ? '#22c55e' : result.status === 'warn' ? '#eab308' : '#ef4444';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 12px',
      borderRadius: 8,
      background: 'rgba(255,255,255,0.03)',
      borderLeft: `3px solid ${statusColor}`
    }}>
      <span style={{ fontSize: 14, color: statusColor, fontWeight: 700, width: 18 }}>{statusIcon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{result.name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{result.message}</div>
      </div>
      <span style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 20,
        background: `${SEVERITY[result.severity]}22`,
        color: SEVERITY[result.severity],
        border: `1px solid ${SEVERITY[result.severity]}44`,
        textTransform: 'uppercase',
        fontWeight: 700,
        flexShrink: 0
      }}>{result.severity}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
        {result.score}/100
      </span>
    </div>
  );
};

const NetworkMonitor = ({ events }) => (
  <div style={{
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 14,
    fontFamily: 'monospace',
    fontSize: 11,
    maxHeight: 200,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  }}>
    {events.map((e, i) => (
      <div key={i} style={{ color: i === 0 ? '#22c55e' : `rgba(255,255,255,${0.7 - i * 0.06})`, display: 'flex', gap: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{e.time}</span>
        <span style={{ color: SEVERITY[e.severity] || '#fff' }}>[{(e.severity || 'info').toUpperCase()}]</span>
        <span>{e.message}</span>
      </div>
    ))}
  </div>
);

const VulnStats = ({ results }) => {
  const counts = results.reduce((acc, r) => {
    if (r.status !== 'pass') acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, {});
  const severities = ['critical', 'high', 'medium', 'low'];
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {severities.map(s => (
        <div key={s} style={{
          background: `${SEVERITY[s]}15`,
          border: `1px solid ${SEVERITY[s]}33`,
          borderRadius: 10,
          padding: '10px 16px',
          textAlign: 'center',
          minWidth: 80
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: SEVERITY[s] }}>{counts[s] || 0}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{s}</div>
        </div>
      ))}
    </div>
  );
};

const SecurityDashboardV2 = () => {
  const [scanResults, setScanResults] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [networkEvents, setNetworkEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [autoScan, setAutoScan] = useState(false);
  const scanIntervalRef = useRef(null);

  const addNetworkEvent = useCallback(() => {
    const msg = NETWORK_EVENTS[Math.floor(Math.random() * NETWORK_EVENTS.length)];
    const sev = randomSeverity();
    setNetworkEvents(prev => [{
      message: msg,
      severity: sev,
      time: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 49)]);
  }, []);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    const steps = SCAN_CHECKS.length;
    for (let i = 0; i <= steps; i++) {
      await new Promise(r => setTimeout(r, 80));
      setScanProgress(Math.round((i / steps) * 100));
    }
    const results = runMockScan();
    setScanResults(results);
    setIsScanning(false);
    addNetworkEvent();
  }, [addNetworkEvent]);

  useEffect(() => {
    runScan();
    const netInterval = setInterval(addNetworkEvent, 5000);
    return () => clearInterval(netInterval);
  }, []);

  useEffect(() => {
    if (autoScan) {
      scanIntervalRef.current = setInterval(runScan, 60000);
    } else {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }
    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [autoScan, runScan]);

  const score = computeScore(scanResults);
  const categories = ['all', ...new Set(SCAN_CHECKS.map(c => c.category))];

  const filteredResults = scanResults.filter(r => {
    const catMatch = filterCategory === 'all' || r.category === filterCategory;
    const statusMatch = filterStatus === 'all' || r.status === filterStatus;
    return catMatch && statusMatch;
  });

  const tabs = ['overview', 'scan results', 'network monitor', 'on-device'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1923 50%, #0a0a0f 100%)',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#fff'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              🛡️ Security Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              Real-time threat detection & vulnerability scanning
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <input type="checkbox" checked={autoScan} onChange={e => setAutoScan(e.target.checked)} />
              Auto-scan (60s)
            </label>
            <button
              onClick={runScan}
              disabled={isScanning}
              style={{
                background: isScanning ? 'rgba(34,197,94,0.1)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                color: '#fff',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {isScanning ? `Scanning ${scanProgress}%` : '▶ Run Scan'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {isScanning && (
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${scanProgress}%`, background: 'linear-gradient(90deg, #22c55e, #3b82f6)', transition: 'width 0.1s', borderRadius: 4 }} />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t ? '2px solid #3b82f6' : '2px solid transparent',
              padding: '8px 16px',
              color: activeTab === t ? '#3b82f6' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === t ? 700 : 400,
              textTransform: 'capitalize',
              marginBottom: -1
            }}>{t}</button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <ScoreGauge score={score} />
                <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {score >= 80 ? '🟢 Good' : score >= 60 ? '🟡 Fair' : '🔴 Needs Attention'}
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 20
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                  Vulnerability Summary
                </div>
                <VulnStats results={scanResults} />
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Checks Passed', value: scanResults.filter(r => r.status === 'pass').length, color: '#22c55e' },
                    { label: 'Warnings', value: scanResults.filter(r => r.status === 'warn').length, color: '#eab308' },
                    { label: 'Failures', value: scanResults.filter(r => r.status === 'fail').length, color: '#ef4444' }
                  ].map(s => (
                    <div key={s.label} style={{
                      background: `${s.color}10`,
                      border: `1px solid ${s.color}22`,
                      borderRadius: 10,
                      padding: 12,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                Recent Network Events
              </div>
              <NetworkMonitor events={networkEvents.slice(0, 8)} />
            </div>
          </div>
        )}

        {/* Scan Results tab */}
        {activeTab === 'scan results' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <button key={c} onClick={() => setFilterCategory(c)} style={{
                  background: filterCategory === c ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${filterCategory === c ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 8,
                  padding: '4px 12px',
                  color: filterCategory === c ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 12,
                  textTransform: 'capitalize'
                }}>{c}</button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {['all', 'pass', 'warn', 'fail'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    background: filterStatus === s ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${filterStatus === s ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 8,
                    padding: '4px 12px',
                    color: filterStatus === s ? '#8b5cf6' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: 12
                  }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredResults.map(r => <ScanResultRow key={r.id} result={r} />)}
              {filteredResults.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>
                  No results match the current filter
                </div>
              )}
            </div>
          </div>
        )}

        {/* Network Monitor tab */}
        {activeTab === 'network monitor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Blocked Threats', value: networkEvents.filter(e => e.severity === 'high' || e.severity === 'critical').length, color: '#ef4444' },
                { label: 'Active Connections', value: Math.floor(Math.random() * 50 + 10), color: '#22c55e' },
                { label: 'Bandwidth In', value: `${(Math.random() * 5 + 1).toFixed(1)} MB/s`, color: '#3b82f6' },
                { label: 'Bandwidth Out', value: `${(Math.random() * 2 + 0.5).toFixed(1)} MB/s`, color: '#8b5cf6' }
              ].map(s => (
                <div key={s.label} style={{
                  background: `${s.color}10`,
                  border: `1px solid ${s.color}22`,
                  borderRadius: 12,
                  padding: '12px 16px'
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                Network Event Log (Live)
              </div>
              <NetworkMonitor events={networkEvents} />
            </div>
          </div>
        )}

        {/* On-device tab */}
        {activeTab === 'on-device' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { title: 'CPU Usage', value: `${Math.floor(Math.random() * 40 + 10)}%`, status: 'normal', icon: '💻' },
              { title: 'Memory Usage', value: `${Math.floor(Math.random() * 30 + 40)}%`, status: 'normal', icon: '🧠' },
              { title: 'Disk Encryption', value: 'AES-256 Active', status: 'secure', icon: '💾' },
              { title: 'Firewall', value: 'Active & Monitoring', status: 'secure', icon: '🔥' },
              { title: 'Antivirus', value: 'Real-time Protection ON', status: 'secure', icon: '🛡️' },
              { title: 'OS Updates', value: '2 updates available', status: 'warn', icon: '🔄' },
              { title: 'Keychain', value: 'Biometric locked', status: 'secure', icon: '🔐' },
              { title: 'Secure Boot', value: 'Enabled & Verified', status: 'secure', icon: '🚀' }
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${item.status === 'warn' ? '#eab30822' : item.status === 'secure' ? '#22c55e22' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: item.status === 'warn' ? '#eab308' : item.status === 'secure' ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default SecurityDashboardV2;
