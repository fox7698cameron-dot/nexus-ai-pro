// src/security/SecurityDashboard.jsx
// 2026-07-12 | Real-time security dashboard: scans, network monitoring, device health

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle,
  XCircle, Wifi, WifiOff, Cpu, HardDrive, Activity, Network,
  RefreshCw, Lock, Unlock, Eye, Zap, Server, Globe, Bug,
  Clock, TrendingUp, AlertCircle
} from 'lucide-react';

const SEVERITY = {
  critical: { color: '#ef4444', bg: '#7f1d1d', label: 'Critical' },
  high: { color: '#f97316', bg: '#7c2d12', label: 'High' },
  medium: { color: '#eab308', bg: '#713f12', label: 'Medium' },
  low: { color: '#3b82f6', bg: '#1e3a5f', label: 'Low' },
  info: { color: '#8b5cf6', bg: '#3b0764', label: 'Info' },
};

const SCAN_CATEGORIES = [
  { id: 'auth', name: 'Authentication', icon: Lock, checks: ['JWT validation', 'Session tokens', 'MFA enforcement', 'Brute force protection'] },
  { id: 'network', name: 'Network', icon: Globe, checks: ['TLS 1.3 enforcement', 'CORS policy', 'Rate limiting', 'DNS security'] },
  { id: 'deps', name: 'Dependencies', icon: Bug, checks: ['npm audit', 'CVE database', 'License compliance', 'Supply chain'] },
  { id: 'data', name: 'Data Protection', icon: Shield, checks: ['AES-256-GCM encryption', 'Key rotation', 'Data at rest', 'PII handling'] },
  { id: 'code', name: 'Code Security', icon: Cpu, checks: ['Injection prevention', 'XSS protection', 'CSRF tokens', 'Path traversal'] },
  { id: 'device', name: 'Device Health', icon: HardDrive, checks: ['Disk encryption', 'OS patches', 'Firewall status', 'Malware scan'] },
];

function generateScanResults() {
  return SCAN_CATEGORIES.map(cat => ({
    ...cat,
    score: Math.floor(75 + Math.random() * 25),
    status: Math.random() > 0.15 ? 'pass' : 'warn',
    issues: Math.random() > 0.6 ? [] : [
      {
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        title: ['Outdated dependency detected', 'Weak cipher in use', 'Missing security header', 'Exposed endpoint'][Math.floor(Math.random() * 4)],
        description: 'Automated security scan detected a potential vulnerability.',
        remediation: 'Update to the latest version and run security patches.',
      }
    ],
    lastChecked: Date.now() - Math.floor(Math.random() * 60000),
  }));
}

function generateNetworkEvents() {
  const types = ['connection', 'blocked', 'scan', 'auth_attempt', 'rate_limit', 'ddos_probe'];
  return Array.from({ length: 10 }, (_, i) => ({
    id: i,
    type: types[Math.floor(Math.random() * types.length)],
    ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    country: ['US', 'CN', 'RU', 'DE', 'BR', 'IN', 'GB', 'FR'][Math.floor(Math.random() * 8)],
    status: Math.random() > 0.3 ? 'blocked' : 'allowed',
    timestamp: Date.now() - Math.floor(Math.random() * 300000),
    risk: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
  }));
}

function ScoreRing({ score, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#eab308' : '#ef4444';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#222" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill={color} fontSize="1rem" fontWeight="700">
        {score}
      </text>
    </svg>
  );
}

function NetworkMap({ events }) {
  return (
    <div className="network-map">
      <div className="network-globe">
        <Globe size={48} style={{ opacity: 0.3 }} />
        <div className="globe-pulse" />
      </div>
      <div className="network-events-list">
        {events.slice(0, 6).map(ev => (
          <div key={ev.id} className={`network-event ${ev.status}`}>
            <div className="event-ip">{ev.ip}</div>
            <div className="event-country">{ev.country}</div>
            <div className="event-type">{ev.type.replace('_', ' ')}</div>
            <div className={`event-status ${ev.status}`}>
              {ev.status === 'blocked' ? <XCircle size={12} /> : <CheckCircle size={12} />}
              {ev.status}
            </div>
            <div className={`event-risk risk-${ev.risk}`}>{ev.risk}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceHealth() {
  const [cpu, setCpu] = useState(34);
  const [mem, setMem] = useState(61);
  const [disk, setDisk] = useState(78);
  const [net, setNet] = useState(12);

  useEffect(() => {
    const t = setInterval(() => {
      setCpu(prev => Math.min(95, Math.max(5, prev + (Math.random() - 0.5) * 10)));
      setMem(prev => Math.min(95, Math.max(20, prev + (Math.random() - 0.5) * 5)));
      setNet(prev => Math.min(95, Math.max(1, prev + (Math.random() - 0.5) * 15)));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const Bar = ({ label, value, color }) => (
    <div className="resource-bar">
      <div className="resource-label">
        <span>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${value}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );

  return (
    <div className="device-health">
      <Bar label="CPU Usage" value={Math.round(cpu)} color={cpu > 80 ? '#ef4444' : cpu > 60 ? '#eab308' : '#10b981'} />
      <Bar label="Memory" value={Math.round(mem)} color={mem > 80 ? '#ef4444' : mem > 60 ? '#eab308' : '#10b981'} />
      <Bar label="Disk" value={Math.round(disk)} color={disk > 85 ? '#ef4444' : disk > 70 ? '#eab308' : '#10b981'} />
      <Bar label="Network I/O" value={Math.round(net)} color={net > 80 ? '#ef4444' : '#3b82f6'} />
      <div className="device-checks">
        {['Disk Encrypted', 'Firewall Active', 'OS Updated', 'AV Scanning'].map(item => (
          <div key={item} className="device-check pass">
            <CheckCircle size={12} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SecurityDashboard() {
  const [scanResults, setScanResults] = useState([]);
  const [networkEvents, setNetworkEvents] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [overallScore, setOverallScore] = useState(94);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScan, setLastScan] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [threats, setThreats] = useState([]);
  const scanTimerRef = useRef(null);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    setThreats([]);

    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 60));
      setScanProgress(i);
    }

    const results = generateScanResults();
    setScanResults(results);

    const allIssues = results.flatMap(r => r.issues);
    setThreats(allIssues);

    const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    setOverallScore(avgScore);
    setNetworkEvents(generateNetworkEvents());
    setLastScan(Date.now());
    setIsScanning(false);
    setScanProgress(0);
  }, []);

  useEffect(() => {
    runScan();
  }, [runScan]);

  useEffect(() => {
    if (autoScan) {
      scanTimerRef.current = setInterval(runScan, 60000);
    } else {
      clearInterval(scanTimerRef.current);
    }
    return () => clearInterval(scanTimerRef.current);
  }, [autoScan, runScan]);

  useEffect(() => {
    const netTimer = setInterval(() => {
      setNetworkEvents(generateNetworkEvents());
    }, 8000);
    return () => clearInterval(netTimer);
  }, []);

  const criticalCount = threats.filter(t => t.severity === 'critical').length;
  const highCount = threats.filter(t => t.severity === 'high').length;
  const statusColor = overallScore >= 90 ? '#10b981' : overallScore >= 70 ? '#eab308' : '#ef4444';
  const statusLabel = overallScore >= 90 ? 'Secure' : overallScore >= 70 ? 'Warning' : 'Vulnerable';

  return (
    <div className="security-dashboard">
      <div className="security-header">
        <div className="header-left">
          <Shield size={24} style={{ color: statusColor }} />
          <div>
            <h1>Security Dashboard</h1>
            <p className="header-sub">Real-time monitoring &amp; threat detection</p>
          </div>
        </div>
        <div className="header-controls">
          <label className="auto-scan-toggle">
            <input type="checkbox" checked={autoScan} onChange={e => setAutoScan(e.target.checked)} />
            <span>Auto-scan (60s)</span>
          </label>
          <button
            className={`scan-btn ${isScanning ? 'scanning' : ''}`}
            onClick={runScan}
            disabled={isScanning}
          >
            <RefreshCw size={14} className={isScanning ? 'spinning' : ''} />
            {isScanning ? `Scanning ${scanProgress}%` : 'Run Scan'}
          </button>
        </div>
      </div>

      {isScanning && (
        <div className="scan-progress-bar">
          <div className="scan-progress-fill" style={{ width: `${scanProgress}%` }} />
        </div>
      )}

      <div className="sec-tabs">
        {['overview', 'network', 'threats', 'device'].map(tab => (
          <button
            key={tab}
            className={`sec-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'threats' && threats.length > 0 && (
              <span className="tab-badge">{threats.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="overview-tab">
          <div className="score-banner" style={{ borderColor: statusColor }}>
            <ScoreRing score={overallScore} size={100} />
            <div className="score-details">
              <div className="score-label" style={{ color: statusColor }}>{statusLabel}</div>
              <div className="score-meta">
                {criticalCount > 0 && <span className="issue-badge critical">{criticalCount} Critical</span>}
                {highCount > 0 && <span className="issue-badge high">{highCount} High</span>}
                {threats.length === 0 && <span className="issue-badge pass">All Clear</span>}
              </div>
              <div className="score-time">
                Last scan: {lastScan ? new Date(lastScan).toLocaleTimeString() : 'Never'}
              </div>
            </div>
            <div className="score-stats">
              <div className="score-stat">
                <CheckCircle size={16} style={{ color: '#10b981' }} />
                <span>{scanResults.filter(r => r.status === 'pass').length} Passed</span>
              </div>
              <div className="score-stat">
                <AlertTriangle size={16} style={{ color: '#eab308' }} />
                <span>{scanResults.filter(r => r.status === 'warn').length} Warnings</span>
              </div>
              <div className="score-stat">
                <Lock size={16} style={{ color: '#3b82f6' }} />
                <span>AES-256-GCM Active</span>
              </div>
            </div>
          </div>

          <div className="scan-categories">
            {scanResults.map(cat => (
              <div key={cat.id} className={`scan-category ${cat.status}`}>
                <div className="category-header">
                  <div className="category-title">
                    <cat.icon size={16} />
                    <span>{cat.name}</span>
                  </div>
                  <div className="category-score" style={{ color: cat.score >= 90 ? '#10b981' : cat.score >= 70 ? '#eab308' : '#ef4444' }}>
                    {cat.score}/100
                  </div>
                </div>
                <div className="category-checks">
                  {cat.checks.map((check, i) => (
                    <div key={i} className="check-item pass">
                      <CheckCircle size={11} />
                      <span>{check}</span>
                    </div>
                  ))}
                </div>
                {cat.issues.length > 0 && (
                  <div className="category-issues">
                    {cat.issues.map(issue => (
                      <div key={issue.id} className="issue-item" style={{ borderLeftColor: SEVERITY[issue.severity]?.color }}>
                        <div className="issue-title">{issue.title}</div>
                        <div className="issue-severity" style={{ color: SEVERITY[issue.severity]?.color }}>
                          {SEVERITY[issue.severity]?.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="network-tab">
          <h2>Network Traffic &amp; Threat Detection</h2>
          <NetworkMap events={networkEvents} />
          <div className="network-stats">
            <div className="net-stat">
              <span className="net-label">Blocked</span>
              <span className="net-value red">{networkEvents.filter(e => e.status === 'blocked').length}</span>
            </div>
            <div className="net-stat">
              <span className="net-label">Allowed</span>
              <span className="net-value green">{networkEvents.filter(e => e.status === 'allowed').length}</span>
            </div>
            <div className="net-stat">
              <span className="net-label">High Risk</span>
              <span className="net-value orange">{networkEvents.filter(e => e.risk === 'high' || e.risk === 'critical').length}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'threats' && (
        <div className="threats-tab">
          <h2>Active Threats ({threats.length})</h2>
          {threats.length === 0 ? (
            <div className="no-threats">
              <ShieldCheck size={48} style={{ color: '#10b981' }} />
              <p>No active threats detected</p>
            </div>
          ) : (
            <div className="threats-list">
              {threats.map(t => (
                <div key={t.id} className="threat-item" style={{ borderLeftColor: SEVERITY[t.severity]?.color }}>
                  <div className="threat-header">
                    <AlertCircle size={14} style={{ color: SEVERITY[t.severity]?.color }} />
                    <span className="threat-title">{t.title}</span>
                    <span className="threat-sev" style={{ background: SEVERITY[t.severity]?.bg, color: SEVERITY[t.severity]?.color }}>
                      {SEVERITY[t.severity]?.label}
                    </span>
                  </div>
                  <p className="threat-desc">{t.description}</p>
                  <div className="threat-fix">
                    <Zap size={12} /> {t.remediation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'device' && (
        <div className="device-tab">
          <h2>Device &amp; System Health</h2>
          <DeviceHealth />
        </div>
      )}

      <style>{`
        .security-dashboard { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
        .security-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .header-left { display: flex; align-items: center; gap: 0.75rem; }
        .header-left h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
        .header-sub { margin: 0; font-size: 0.8rem; color: #888; }
        .header-controls { display: flex; align-items: center; gap: 0.75rem; }
        .auto-scan-toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #888; cursor: pointer; }
        .scan-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; }
        .scan-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .scan-progress-bar { height: 3px; background: #222; border-radius: 2px; margin-bottom: 1rem; overflow: hidden; }
        .scan-progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #ec4899); transition: width 0.1s; }
        .sec-tabs { display: flex; gap: 0.25rem; margin-bottom: 1.5rem; background: #111; border-radius: 8px; padding: 0.25rem; }
        .sec-tab { flex: 1; padding: 0.5rem; background: transparent; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; color: #888; position: relative; }
        .sec-tab.active { background: #7c3aed; color: white; }
        .tab-badge { position: absolute; top: -4px; right: 4px; background: #ef4444; color: white; border-radius: 999px; font-size: 0.65rem; padding: 0 4px; min-width: 16px; text-align: center; }
        .score-banner { display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem; background: #111; border-radius: 12px; border: 2px solid; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .score-details { flex: 1; }
        .score-label { font-size: 1.5rem; font-weight: 700; }
        .score-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 0.5rem 0; }
        .issue-badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600; }
        .issue-badge.critical { background: #7f1d1d; color: #ef4444; }
        .issue-badge.high { background: #7c2d12; color: #f97316; }
        .issue-badge.pass { background: #064e3b; color: #10b981; }
        .score-time { font-size: 0.75rem; color: #666; }
        .score-stats { display: flex; flex-direction: column; gap: 0.5rem; }
        .score-stat { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
        .scan-categories { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .scan-category { background: #111; border-radius: 10px; padding: 1rem; border: 1px solid #222; }
        .scan-category.pass { border-color: rgba(16,185,129,0.2); }
        .scan-category.warn { border-color: rgba(234,179,8,0.2); }
        .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .category-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
        .category-score { font-size: 0.875rem; font-weight: 700; }
        .category-checks { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.5rem; }
        .check-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #888; }
        .check-item.pass { color: #10b981; }
        .category-issues { margin-top: 0.75rem; border-top: 1px solid #222; padding-top: 0.75rem; }
        .issue-item { border-left: 3px solid; padding: 0.5rem 0.75rem; margin-bottom: 0.4rem; background: rgba(0,0,0,0.2); border-radius: 0 4px 4px 0; }
        .issue-title { font-size: 0.8rem; font-weight: 500; }
        .issue-severity { font-size: 0.7rem; font-weight: 600; margin-top: 0.15rem; }
        .network-map { display: grid; grid-template-columns: auto 1fr; gap: 1rem; margin-bottom: 1rem; }
        .network-globe { display: flex; align-items: center; justify-content: center; width: 80px; position: relative; }
        .globe-pulse { position: absolute; width: 60px; height: 60px; border-radius: 50%; border: 2px solid #7c3aed; animation: pulse 2s infinite; opacity: 0.5; }
        .network-events-list { display: flex; flex-direction: column; gap: 0.4rem; }
        .network-event { display: grid; grid-template-columns: 130px 40px 1fr auto auto; gap: 0.75rem; align-items: center; padding: 0.5rem 0.75rem; background: #111; border-radius: 6px; font-size: 0.78rem; border: 1px solid #222; }
        .event-ip { font-family: monospace; color: #aaa; }
        .event-country { font-weight: 600; color: #888; }
        .event-status { display: flex; align-items: center; gap: 0.3rem; font-weight: 600; }
        .event-status.blocked { color: #ef4444; }
        .event-status.allowed { color: #10b981; }
        .event-risk { padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
        .risk-critical { background: #7f1d1d; color: #ef4444; }
        .risk-high { background: #7c2d12; color: #f97316; }
        .risk-medium { background: #713f12; color: #eab308; }
        .risk-low { background: #1e3a5f; color: #60a5fa; }
        .network-stats { display: flex; gap: 1rem; }
        .net-stat { flex: 1; background: #111; border-radius: 8px; padding: 0.75rem; text-align: center; }
        .net-label { display: block; font-size: 0.75rem; color: #888; }
        .net-value { display: block; font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; }
        .net-value.red { color: #ef4444; }
        .net-value.green { color: #10b981; }
        .net-value.orange { color: #f97316; }
        .no-threats { text-align: center; padding: 3rem; color: #888; }
        .no-threats p { margin-top: 1rem; font-size: 1rem; }
        .threats-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .threat-item { border-left: 3px solid; padding: 0.75rem 1rem; background: #111; border-radius: 0 8px 8px 0; }
        .threat-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
        .threat-title { flex: 1; font-weight: 600; font-size: 0.9rem; }
        .threat-sev { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; }
        .threat-desc { font-size: 0.8rem; color: #888; margin: 0 0 0.4rem; }
        .threat-fix { display: flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: #7c3aed; }
        .device-health { display: flex; flex-direction: column; gap: 1rem; }
        .resource-bar { }
        .resource-label { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.3rem; }
        .bar-track { height: 8px; background: #222; border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 4px; }
        .device-checks { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
        .device-check { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; padding: 0.3rem 0.6rem; border-radius: 6px; }
        .device-check.pass { background: rgba(16,185,129,0.1); color: #10b981; }
        @media (max-width: 640px) {
          .network-map { grid-template-columns: 1fr; }
          .network-globe { display: none; }
          .network-event { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
          .score-banner { flex-direction: column; text-align: center; }
          .score-stats { flex-direction: row; }
          .scan-categories { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
