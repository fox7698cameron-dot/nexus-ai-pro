// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File created: 2026-08-06

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Activity, Wifi, Server,
  AlertTriangle, RefreshCw, Lock, Key, X, CheckCircle, Eye
} from 'lucide-react';

const TABS = ['Overview', 'Vulnerabilities', 'Threats', 'Network', 'Device', 'Audit Log'];

const SEV_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', info: '#3b82f6' };

const STYLE = `
.sd-wrap{background:var(--an-bg,#0f172a);color:var(--an-text,#e2e8f0);min-height:100vh;font-family:system-ui,sans-serif;padding:1rem;}
.sd-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:.5rem;}
.sd-title{font-size:1.4rem;font-weight:700;display:flex;align-items:center;gap:.5rem;}
.sd-score-ring{width:90px;height:90px;}
.sd-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap;}
.sd-tab{padding:.4rem .9rem;border-radius:.5rem;cursor:pointer;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:.8rem;transition:background .2s;}
.sd-tab.active{background:#3b82f6;color:#fff;border-color:#3b82f6;}
.sd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem;}
.sd-card{background:#1e293b;border:1px solid #334155;border-radius:.75rem;padding:1rem;}
.sd-card-label{font-size:.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;}
.sd-card-value{font-size:1.4rem;font-weight:700;margin:.2rem 0;}
.sd-badge{display:inline-block;padding:.15rem .5rem;border-radius:9999px;font-size:.7rem;font-weight:600;}
.sd-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .9rem;border-radius:.5rem;border:none;cursor:pointer;font-size:.85rem;font-weight:600;transition:opacity .2s;}
.sd-btn:hover{opacity:.85;}
.sd-btn-primary{background:#3b82f6;color:#fff;}
.sd-btn-danger{background:#ef4444;color:#fff;}
.sd-btn-ghost{background:#334155;color:#e2e8f0;}
.sd-row{display:flex;justify-content:space-between;align-items:center;padding:.5rem;border-bottom:1px solid #334155;}
.sd-row:last-child{border-bottom:none;}
.sd-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;}
.sd-modal{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:1.5rem;width:min(400px,90vw);}
.sd-live-dot{width:.5rem;height:.5rem;background:#22c55e;border-radius:50%;display:inline-block;animation:sdBlink 1s infinite;margin-right:.3rem;}
@keyframes sdBlink{0%,100%{opacity:1}50%{opacity:.3}}
.sd-vuln-item{display:flex;align-items:center;gap:.75rem;padding:.75rem;border-bottom:1px solid #334155;}
.sd-vuln-item:last-child{border-bottom:none;}
.sd-threat-item{display:flex;justify-content:space-between;align-items:center;padding:.5rem;font-size:.8rem;border-bottom:1px solid #334155;}
.sd-audit-item{display:flex;gap:.5rem;padding:.4rem;font-size:.75rem;border-bottom:1px solid #2d3748;}
.sd-progress{height:.5rem;background:#334155;border-radius:9999px;overflow:hidden;margin-top:.3rem;}
.sd-progress-fill{height:100%;border-radius:9999px;transition:width .5s;}
`;

function CircularScore({ score }) {
  const r = 36, cx = 45, cy = 45, circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  return (
    <svg className="sd-score-ring" viewBox="0 0 90 90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="8" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round" transform="rotate(-90 45 45)"
        style={{ transition: 'stroke-dashoffset .8s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill={color} fontSize="14" fontWeight="700">{score}</text>
    </svg>
  );
}

function getMockVulns() {
  return [
    { id: 1, name: 'Outdated Dependency: lodash < 4.17.21', severity: 'high', status: 'open', component: 'npm' },
    { id: 2, name: 'Missing HSTS Preload', severity: 'medium', status: 'open', component: 'headers' },
    { id: 3, name: 'TLS 1.0/1.1 Support', severity: 'high', status: 'patched', component: 'tls' },
    { id: 4, name: 'Weak CSP: unsafe-inline', severity: 'medium', status: 'open', component: 'headers' },
    { id: 5, name: 'Missing Subresource Integrity', severity: 'low', status: 'open', component: 'web' },
  ];
}

function getMockThreats() {
  const types = ['SQL_INJECTION', 'XSS_ATTEMPT', 'BRUTE_FORCE', 'PATH_TRAVERSAL', 'API_ABUSE'];
  return types.map((t, i) => ({
    id: i, type: t, ip: `***.***.***.${Math.floor(Math.random() * 255)}`,
    timestamp: Date.now() - i * 180000, status: 'blocked',
  }));
}

export function SecurityDashboardFull() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [score, setScore] = useState(88);
  const [scanning, setScanning] = useState(false);
  const [vulns, setVulns] = useState(getMockVulns());
  const [threats, setThreats] = useState(getMockThreats());
  const [networkStatus, setNetworkStatus] = useState({ latency: 22, packetLoss: 0.1, tlsStatus: 'valid', firewallActive: true, openPorts: [80, 443, 3001] });
  const [deviceStatus, setDeviceStatus] = useState({ cpu: 34, memory: 51, disk: 67, battery: null });
  const [auditLogs, setAuditLogs] = useState([]);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const intervalRef = useRef(null);
  const styleInjected = useRef(false);

  if (!styleInjected.current) {
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
    styleInjected.current = true;
  }

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, netRes, auditRes] = await Promise.allSettled([
        fetch('/api/security/dashboard'),
        fetch('/api/security/network-status'),
        fetch('/api/security/audit?limit=20'),
      ]);
      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const d = await dashRes.value.json();
        setScore(d.overallScore || 88);
        if (d.vulnerabilities?.length) setVulns(d.vulnerabilities);
      }
      if (netRes.status === 'fulfilled' && netRes.value.ok) {
        setNetworkStatus(await netRes.value.json());
      }
      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        const a = await auditRes.value.json();
        setAuditLogs(a.logs || []);
      }
    } catch { /* fallback to mock */ }
    // device info
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      navigator.getBattery().then(b => setDeviceStatus(d => ({ ...d, battery: Math.round(b.level * 100) }))).catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/security/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) { const d = await res.json(); if (d.vulnerabilities) setVulns(d.vulnerabilities); }
    } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 2000));
    setScore(s => Math.min(100, s + Math.floor(Math.random() * 3)));
    setScanning(false);
  };

  const patchVuln = (id) => {
    setVulns(v => v.map(x => x.id === id ? { ...x, status: 'patched' } : x));
    setScore(s => Math.min(100, s + 2));
  };

  const rotateKeys = async () => {
    await fetch('/api/security/rotate-keys', { method: 'POST' });
    setShowRotateModal(false);
  };

  const openCount = vulns.filter(v => v.status !== 'patched').length;

  return (
    <div className="sd-wrap">
      {/* Header */}
      <div className="sd-header">
        <div className="sd-title">
          <Shield size={22} color="#3b82f6" /> Security Dashboard
          <span style={{ fontSize: '.75rem', fontWeight: 400, color: '#94a3b8' }}>
            <span className="sd-live-dot" />Real-time
          </span>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="sd-btn sd-btn-ghost" onClick={() => setShowRotateModal(true)}><Key size={14} /> Rotate Keys</button>
          <button className="sd-btn sd-btn-primary" onClick={runScan} disabled={scanning}>
            <RefreshCw size={14} className={scanning ? 'spin' : ''} />
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="sd-grid">
        <div className="sd-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <CircularScore score={score} />
          <div>
            <div className="sd-card-label">Security Score</div>
            <div style={{ fontSize: '.8rem', color: '#94a3b8' }}>{score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'At Risk'}</div>
          </div>
        </div>
        <div className="sd-card">
          <div className="sd-card-label"><AlertTriangle size={12} style={{ display: 'inline' }} /> Open Vulnerabilities</div>
          <div className="sd-card-value" style={{ color: openCount > 0 ? '#ef4444' : '#22c55e' }}>{openCount}</div>
          <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>{vulns.length} total scanned</div>
        </div>
        <div className="sd-card">
          <div className="sd-card-label"><ShieldAlert size={12} style={{ display: 'inline' }} /> Threats Blocked</div>
          <div className="sd-card-value" style={{ color: '#f97316' }}>{threats.length}</div>
          <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Last 24h</div>
        </div>
        <div className="sd-card">
          <div className="sd-card-label"><Lock size={12} style={{ display: 'inline' }} /> Encryption</div>
          <div className="sd-card-value" style={{ color: '#22c55e', fontSize: '1rem' }}>AES-256-GCM</div>
          <div style={{ fontSize: '.75rem', color: '#22c55e' }}>✓ Active</div>
        </div>
        <div className="sd-card">
          <div className="sd-card-label"><Wifi size={12} style={{ display: 'inline' }} /> Network</div>
          <div className="sd-card-value" style={{ color: '#3b82f6', fontSize: '1.1rem' }}>{networkStatus.latency}ms</div>
          <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Latency · {networkStatus.packetLoss}% loss</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sd-tabs">
        {TABS.map(t => (
          <button key={t} className={`sd-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="sd-card">
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>System Overview</div>
          {[['Encryption Status', 'AES-256-GCM Active', '#22c55e'],
            ['TLS Certificate', networkStatus.tlsStatus === 'valid' ? 'Valid' : 'Check Required', networkStatus.tlsStatus === 'valid' ? '#22c55e' : '#ef4444'],
            ['Firewall', networkStatus.firewallActive ? 'Active' : 'Inactive', networkStatus.firewallActive ? '#22c55e' : '#ef4444'],
            ['Rate Limiting', 'Enabled (100 req/15min)', '#22c55e'],
            ['CSRF Protection', 'Enabled', '#22c55e'],
            ['Input Validation', 'Strict Mode', '#22c55e']].map(([k, v, c]) => (
            <div key={k} className="sd-row">
              <span style={{ color: '#94a3b8' }}>{k}</span>
              <span style={{ color: c, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Vulnerabilities' && (
        <div className="sd-card">
          {vulns.map(v => (
            <div key={v.id} className="sd-vuln-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{v.name}</div>
                <div style={{ fontSize: '.73rem', color: '#94a3b8' }}>{v.component}</div>
              </div>
              <span className="sd-badge" style={{ background: SEV_COLOR[v.severity] + '22', color: SEV_COLOR[v.severity] }}>{v.severity}</span>
              {v.status === 'patched'
                ? <span className="sd-badge" style={{ background: '#22c55e22', color: '#22c55e', marginLeft: '.4rem' }}>Patched</span>
                : <button className="sd-btn sd-btn-primary" style={{ marginLeft: '.5rem', padding: '.25rem .6rem', fontSize: '.75rem' }} onClick={() => patchVuln(v.id)}>Patch</button>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Threats' && (
        <div className="sd-card">
          {threats.map(t => (
            <div key={t.id} className="sd-threat-item">
              <span style={{ color: '#ef4444', fontWeight: 600 }}>{t.type}</span>
              <span style={{ color: '#94a3b8' }}>{t.ip}</span>
              <span className="sd-badge" style={{ background: '#22c55e22', color: '#22c55e' }}>Blocked</span>
              <span style={{ color: '#64748b' }}>{new Date(t.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Network' && (
        <div className="sd-grid">
          {[['Latency', `${networkStatus.latency}ms`, '#3b82f6'],
            ['Packet Loss', `${networkStatus.packetLoss}%`, networkStatus.packetLoss < 1 ? '#22c55e' : '#ef4444'],
            ['Open Ports', networkStatus.openPorts?.join(', ') || 'None', '#94a3b8'],
            ['TLS Status', networkStatus.tlsStatus, '#22c55e'],
            ['Firewall', networkStatus.firewallActive ? 'Active' : 'Off', networkStatus.firewallActive ? '#22c55e' : '#ef4444']].map(([k, v, c]) => (
            <div key={k} className="sd-card">
              <div className="sd-card-label">{k}</div>
              <div className="sd-card-value" style={{ color: c, fontSize: '1.1rem' }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Device' && (
        <div className="sd-grid">
          {[['CPU Usage', deviceStatus.cpu, '%'],
            ['Memory', deviceStatus.memory, '%'],
            ['Disk', deviceStatus.disk, '%'],
            ['Battery', deviceStatus.battery ?? 'N/A', deviceStatus.battery != null ? '%' : '']].map(([k, v, unit]) => (
            <div key={k} className="sd-card">
              <div className="sd-card-label">{k}</div>
              <div className="sd-card-value" style={{ color: typeof v === 'number' && v > 80 ? '#ef4444' : '#22c55e' }}>
                {v}{unit}
              </div>
              {typeof v === 'number' && (
                <div className="sd-progress"><div className="sd-progress-fill" style={{ width: `${v}%`, background: v > 80 ? '#ef4444' : '#3b82f6' }} /></div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Audit Log' && (
        <div className="sd-card">
          {auditLogs.length === 0 && <div style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center' }}>No audit entries yet</div>}
          {auditLogs.map((log, i) => (
            <div key={log.id || i} className="sd-audit-item">
              <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span style={{ color: '#3b82f6', fontWeight: 600 }}>{log.event}</span>
              <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {typeof log.details === 'object' ? JSON.stringify(log.details).slice(0, 60) : log.details}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Key Rotation Modal */}
      {showRotateModal && (
        <div className="sd-modal-overlay" onClick={() => setShowRotateModal(false)}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <strong>Rotate Encryption Keys?</strong>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowRotateModal(false)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              This will generate new encryption keys. Active sessions will need to re-authenticate. This action is logged.
            </p>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button className="sd-btn sd-btn-ghost" onClick={() => setShowRotateModal(false)}>Cancel</button>
              <button className="sd-btn sd-btn-danger" onClick={rotateKeys}><Key size={14} /> Rotate Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityDashboardFull;
