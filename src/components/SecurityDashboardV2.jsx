/**
 * src/components/SecurityDashboardV2.jsx
 * Nexus AI Pro — Enhanced Real-Time Security Dashboard
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Features: live vulnerability scans, network issue detection,
 * on-device health checks, threat feed, audit log, encryption status.
 * Works on web, Electron, Capacitor iOS/Android.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AuthService from '../auth/AuthService.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY = {
  critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'CRITICAL' },
  high:     { color: '#ea580c', bg: 'rgba(234,88,12,0.12)',  label: 'HIGH' },
  medium:   { color: '#d97706', bg: 'rgba(217,119,6,0.12)', label: 'MEDIUM' },
  low:      { color: '#2563eb', bg: 'rgba(37,99,235,0.12)', label: 'LOW' },
  info:     { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'INFO' },
};

const STATUS_ICONS = {
  healthy:  '✅',
  warning:  '⚠️',
  critical: '🚨',
  unknown:  '❓',
  scanning: '🔄',
  patched:  '🛡️',
};

// ─── API helpers ──────────────────────────────────────────────────────────────

function authHeaders() {
  const token = AuthService.getToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { ...authHeaders(), ...(options.headers ?? {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);

  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} fill="none" stroke="#2d2d44" strokeWidth={8} />
      <circle
        cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={50} y={50} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={20} fontWeight={700}>
        {score}
      </text>
    </svg>
  );
}

function SeverityBadge({ severity }) {
  const s = SEVERITY[severity] ?? SEVERITY.info;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.color, letterSpacing: '0.05em',
    }}>
      {s.label}
    </span>
  );
}

function StatusRow({ label, status, detail }) {
  const icon = STATUS_ICONS[status] ?? STATUS_ICONS.unknown;
  const color = status === 'healthy' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid #1f1f2e',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color: '#ccc', fontSize: 14 }}>{label}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color, fontSize: 13, fontWeight: 600 }}>{status.toUpperCase()}</div>
        {detail && <div style={{ color: '#555', fontSize: 11 }}>{detail}</div>}
      </div>
    </div>
  );
}

function VulnerabilityCard({ vuln, onPatch }) {
  const [patching, setPatching] = useState(false);

  async function handlePatch() {
    setPatching(true);
    try { await onPatch(vuln.id); } finally { setPatching(false); }
  }

  return (
    <div style={{
      background: '#12121f', border: `1px solid ${(SEVERITY[vuln.severity] ?? SEVERITY.info).color}40`,
      borderRadius: 10, padding: '14px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{vuln.name}</div>
        <SeverityBadge severity={vuln.severity} />
      </div>
      {vuln.description && (
        <p style={{ color: '#666', fontSize: 12, margin: '0 0 10px' }}>{vuln.description}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {vuln.cve && (
          <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{vuln.cve}</span>
        )}
        <div style={{ flex: 1 }} />
        {vuln.status === 'patched' ? (
          <div style={{
            padding: '6px 14px', background: 'rgba(16,185,129,0.15)',
            color: '#10b981', borderRadius: 6, fontSize: 12, fontWeight: 600,
          }}>
            🛡️ Patched
          </div>
        ) : (
          <button onClick={handlePatch} disabled={patching} style={{
            padding: '6px 14px', background: patching ? '#2d2d44' : '#7c3aed',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: patching ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            {patching ? 'Patching…' : 'Apply Patch'}
          </button>
        )}
      </div>
    </div>
  );
}

function ThreatFeed({ threats = [] }) {
  if (!threats.length) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#555', fontSize: 13 }}>
        No active threats — system is clean ✅
      </div>
    );
  }

  return (
    <div>
      {threats.slice(0, 10).map((t, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0', borderBottom: '1px solid #1f1f2e',
        }}>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{t.type}</div>
            <div style={{ color: '#555', fontSize: 11 }}>
              {t.source || 'Unknown source'} · {new Date(t.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
            background: t.status === 'blocked' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: t.status === 'blocked' ? '#10b981' : '#ef4444',
          }}>
            {(t.status ?? 'detected').toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

function NetworkPanel({ network }) {
  if (!network) {
    return <div style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: 20 }}>Checking network…</div>;
  }

  const checks = [
    { label: 'HTTPS / TLS',          status: network.tls,       detail: network.tlsVersion },
    { label: 'Certificate Validity', status: network.cert,      detail: network.certExpiry },
    { label: 'DNS Security (DNSSEC)',status: network.dnssec,    detail: null },
    { label: 'Content Security Policy', status: network.csp,   detail: null },
    { label: 'HSTS',                  status: network.hsts,     detail: null },
    { label: 'Inbound Firewall',      status: network.firewall, detail: null },
    { label: 'Rate Limiting',         status: network.rateLimit,detail: null },
    { label: 'VPN / Proxy',          status: network.vpn ?? 'info', detail: network.vpnProvider },
    { label: 'Tor / Anonymizer',      status: network.tor ? 'warning' : 'healthy', detail: null },
    { label: 'Open Ports (anomaly)',  status: network.openPorts > 5 ? 'warning' : 'healthy', detail: `${network.openPorts ?? 0} open` },
    { label: 'Packet Loss',           status: network.packetLoss > 2 ? 'warning' : 'healthy', detail: `${network.packetLoss ?? 0}%` },
    { label: 'Latency',               status: network.latencyMs > 300 ? 'warning' : 'healthy', detail: `${network.latencyMs ?? 0}ms` },
  ];

  return (
    <div>
      {checks.map(c => <StatusRow key={c.label} label={c.label} status={c.status ?? 'healthy'} detail={c.detail} />)}
    </div>
  );
}

function DevicePanel({ device }) {
  if (!device) {
    return <div style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: 20 }}>Checking device…</div>;
  }

  const checks = [
    { label: 'OS Updates',         status: device.osUpdated ? 'healthy' : 'warning',  detail: device.osVersion },
    { label: 'Disk Encryption',    status: device.diskEncryption,  detail: null },
    { label: 'Secure Boot',        status: device.secureBoot,      detail: null },
    { label: 'Antivirus / EDR',    status: device.antivirus,       detail: device.antivirusName },
    { label: 'Firewall (device)',   status: device.localFirewall,   detail: null },
    { label: 'Screen Lock',        status: device.screenLock,      detail: null },
    { label: 'Jailbreak / Root',   status: device.jailbreak ? 'critical' : 'healthy', detail: null },
    { label: 'Developer Mode',     status: device.devMode ? 'warning' : 'healthy', detail: null },
    { label: 'USB Debug',          status: device.usbDebug ? 'warning' : 'healthy', detail: null },
    { label: 'Biometrics Active',  status: device.biometrics,      detail: null },
  ];

  return (
    <div>
      {checks.map(c => <StatusRow key={c.label} label={c.label} status={c.status ?? 'unknown'} detail={c.detail} />)}
    </div>
  );
}

function AuditLog({ logs = [] }) {
  return (
    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
      {logs.length === 0 && (
        <div style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: 20 }}>No audit entries</div>
      )}
      {logs.slice(0, 50).map((entry, i) => (
        <div key={i} style={{
          padding: '8px 0', borderBottom: '1px solid #1f1f2e',
          display: 'flex', gap: 12, fontSize: 12,
        }}>
          <div style={{ color: '#555', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </div>
          <div style={{ color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>{entry.event}</div>
          <div style={{ color: '#555', fontSize: 11, whiteSpace: 'nowrap' }}>
            {entry.details?.ip ?? ''}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div style={{
      background: '#12121f', border: '1px solid #2d2d44',
      borderRadius: 14, padding: '20px', marginBottom: 20,
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecurityDashboardV2() {
  const [dashboard, setDashboard] = useState(null);
  const [scanning, setScanning]   = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [auditLogs, setAuditLogs] = useState([]);
  const pollRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await apiFetch('/api/security/dashboard');
      setDashboard(data);
    } catch (err) {
      console.error('Security dashboard load failed:', err.message);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const data = await apiFetch('/api/security/audit?limit=50');
      setAuditLogs(data.logs ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadAudit();
    pollRef.current = setInterval(() => {
      loadDashboard();
      loadAudit();
    }, 15_000);
    return () => clearInterval(pollRef.current);
  }, [loadDashboard, loadAudit]);

  async function runScan() {
    setScanning(true);
    try {
      await apiFetch('/api/security/scan', { method: 'POST', body: JSON.stringify({}) });
      await loadDashboard();
    } finally {
      setScanning(false);
    }
  }

  async function patchVulnerability(vulnId) {
    await apiFetch('/api/security/patch', { method: 'POST', body: JSON.stringify({ vulnId }) });
    await loadDashboard();
  }

  async function rotateKeys() {
    await apiFetch('/api/security/rotate-keys', { method: 'POST', body: JSON.stringify({}) });
  }

  const tabs = [
    { id: 'overview',       label: 'Overview',        icon: '🛡' },
    { id: 'vulnerabilities',label: 'Vulnerabilities', icon: '🔍' },
    { id: 'threats',        label: 'Threat Feed',     icon: '⚡' },
    { id: 'network',        label: 'Network',         icon: '🌐' },
    { id: 'device',         label: 'Device',          icon: '💻' },
    { id: 'audit',          label: 'Audit Log',       icon: '📋' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Security Center
          </h1>
          <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
            Real-time vulnerability scanning, threat detection &amp; network monitoring
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={rotateKeys} style={{
            padding: '8px 16px', background: '#1f1f2e', color: '#a855f7',
            border: '1px solid #7c3aed40', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            🔑 Rotate Keys
          </button>
          <button onClick={runScan} disabled={scanning} style={{
            padding: '8px 20px', background: scanning ? '#2d2d44' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: scanning ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            {scanning ? '🔄 Scanning…' : '🔍 Run Scan'}
          </button>
        </div>
      </div>

      {/* Score + quick stats */}
      {dashboard && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
          border: '1px solid #2d2d44', borderRadius: 16, padding: '24px',
          alignItems: 'center',
        }}>
          <ScoreRing score={dashboard.overallScore ?? 0} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
              Security Score
            </div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
              Last scan: {dashboard.lastScanTime ? new Date(dashboard.lastScanTime).toLocaleString() : 'Never'}
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Encryption',   value: dashboard.encryptionStatus ?? 'AES-256-GCM', icon: '🔒' },
                { label: 'Threats Blocked', value: dashboard.threatsBlocked ?? 0, icon: '🛡' },
                { label: 'Patches',      value: dashboard.patchesApplied ?? 0, icon: '🩹' },
                { label: 'Open Issues',  value: (dashboard.vulnerabilities ?? []).filter(v => v.status !== 'patched').length, icon: '⚠️' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 11, color: '#555' }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer',
            background: activeTab === tab.id ? '#7c3aed' : '#1f1f2e',
            color: activeTab === tab.id ? '#fff' : '#888',
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'overview' && dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Section title="Network Status" icon="🌐">
            <NetworkPanel network={dashboard.network} />
          </Section>
          <Section title="Device Health" icon="💻">
            <DevicePanel device={dashboard.device} />
          </Section>
        </div>
      )}

      {activeTab === 'vulnerabilities' && (
        <Section title="Vulnerabilities" icon="🔍">
          {!dashboard?.vulnerabilities?.length
            ? <div style={{ color: '#10b981', textAlign: 'center', padding: 20 }}>✅ No vulnerabilities detected</div>
            : dashboard.vulnerabilities.map(v => (
                <VulnerabilityCard key={v.id} vuln={v} onPatch={patchVulnerability} />
              ))
          }
        </Section>
      )}

      {activeTab === 'threats' && (
        <Section title="Threat Feed" icon="⚡">
          <ThreatFeed threats={dashboard?.threats ?? []} />
        </Section>
      )}

      {activeTab === 'network' && (
        <Section title="Network Analysis" icon="🌐">
          <NetworkPanel network={dashboard?.network} />
        </Section>
      )}

      {activeTab === 'device' && (
        <Section title="On-Device Security" icon="💻">
          <DevicePanel device={dashboard?.device} />
        </Section>
      )}

      {activeTab === 'audit' && (
        <Section title="Audit Log" icon="📋">
          <AuditLog logs={auditLogs} />
        </Section>
      )}
    </div>
  );
}
