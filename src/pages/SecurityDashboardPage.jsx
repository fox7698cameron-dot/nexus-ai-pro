// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Lock,
  Network, Wifi, Activity, BarChart3, Eye, Search,
  RefreshCw, Download, CheckCircle, XCircle, AlertCircle,
  Cpu, Server, Globe
} from 'lucide-react';

const BG = '#0a0a0c';
const SURFACE = '#111116';
const BORDER = '#1e1e28';
const RED = '#ef4444';
const ORANGE = '#f97316';
const YELLOW = '#eab308';
const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const MUTED = '#6b7280';

const SEV_COLOR = { critical: RED, high: ORANGE, medium: YELLOW, low: BLUE, unknown: MUTED };
const REQUIRED_VARS = ['ENCRYPTION_SECRET', 'JWT_SECRET', 'DATABASE_URL'];

function card(extra = {}) {
  return {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 20,
    ...extra
  };
}

function badge(color) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 700,
    background: color + '22',
    color
  };
}

function ScoreArc({ score }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circ - (pct / 100) * circ * 0.75;
  const color = pct >= 80 ? GREEN : pct >= 60 ? YELLOW : RED;
  return (
    <svg width={140} height={100} style={{ display: 'block', margin: '0 auto' }}>
      <circle
        cx={70} cy={80} r={r}
        fill="none" stroke={BORDER} strokeWidth={10}
        strokeDasharray={`${circ * 0.75} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        style={{ transform: 'rotate(135deg)', transformOrigin: '70px 80px' }}
      />
      <circle
        cx={70} cy={80} r={r}
        fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${circ * 0.75} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: 'rotate(135deg)', transformOrigin: '70px 80px', transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={70} y={74} textAnchor="middle" fill={color} fontSize={26} fontWeight={700}>{pct}</text>
      <text x={70} y={90} textAnchor="middle" fill={MUTED} fontSize={11}>/ 100</text>
    </svg>
  );
}

function AnimatedNumber({ value }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const diff = value - prev.current;
    if (diff === 0) return;
    const steps = 20;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setDisplayed(Math.round(prev.current + (diff * step) / steps));
      if (step >= steps) { clearInterval(id); prev.current = value; }
    }, 20);
    return () => clearInterval(id);
  }, [value]);
  return <>{displayed}</>;
}

function Spinner() {
  return (
    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
  );
}

function LatencyBar({ name, reachable, latencyMs }) {
  const color = !reachable ? RED : latencyMs < 100 ? GREEN : latencyMs < 500 ? YELLOW : RED;
  const pct = reachable ? Math.min(100, (latencyMs / 1000) * 100) : 100;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#d1d5db' }}>{name}</span>
        <span style={{ fontSize: 12, color }}>{reachable ? `${latencyMs}ms` : 'unreachable'}</span>
      </div>
      <div style={{ height: 6, background: BORDER, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const color = SEV_COLOR[severity] || MUTED;
  return <span style={badge(color)}>{(severity || 'unknown').toUpperCase()}</span>;
}

function CheckRow({ label, pass, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
      {pass
        ? <CheckCircle size={16} color={GREEN} style={{ flexShrink: 0, marginTop: 1 }} />
        : <XCircle size={16} color={RED} style={{ flexShrink: 0, marginTop: 1 }} />}
      <div>
        <div style={{ fontSize: 13, color: '#d1d5db' }}>{label}</div>
        {detail && <div style={{ fontSize: 11, color: MUTED }}>{detail}</div>}
      </div>
    </div>
  );
}

function ScoreHistoryChart({ history }) {
  if (!history.length) return <div style={{ color: MUTED, fontSize: 12, textAlign: 'center', padding: 20 }}>No history yet</div>;
  const W = 560, H = 120, pad = 16;
  const iW = W - pad * 2, iH = H - pad * 2;
  const minS = Math.min(...history.map(h => h.score));
  const maxS = Math.max(...history.map(h => h.score));
  const range = maxS - minS || 1;
  const pts = history.map((h, i) => {
    const x = pad + (i / (history.length - 1 || 1)) * iW;
    const y = pad + iH - ((h.score - minS) / range) * iH;
    return `${x},${y}`;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" />
      {history.map((h, i) => {
        const [x, y] = pts[i].split(',').map(Number);
        return <circle key={i} cx={x} cy={y} r={3} fill={BLUE} />;
      })}
    </svg>
  );
}

function ScanPanel({ title, icon: Icon, scanType, onScan, scanning }) {
  const [results, setResults] = useState(null);
  const [visible, setVisible] = useState(false);

  async function runScan() {
    const data = await onScan(scanType);
    setResults(data);
    setVisible(true);
  }

  return (
    <div style={{ ...card(), marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} color={ORANGE} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: scanning ? BORDER : ORANGE, color: '#fff',
            fontSize: 12, fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {scanning ? <><Spinner /> Scanning…</> : <><Search size={12} /> Scan</>}
        </button>
      </div>
      {visible && results && <ScanResults type={scanType} data={results} />}
    </div>
  );
}

function ScanResults({ type, data }) {
  const style = { animation: 'slideIn 0.3s ease' };
  if (type === 'vulnerabilities') {
    const vulns = data.vulnerabilities || [];
    if (!vulns.length) return <div style={{ ...style, color: GREEN, fontSize: 13 }}>No vulnerabilities found.</div>;
    return (
      <div style={style}>
        {vulns.map((v, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#d1d5db' }}>{v.cveId || 'Unknown'}</span>
              <SeverityBadge severity={v.severity} />
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{v.summary}</div>
            {v.fixAvailable && <div style={{ fontSize: 11, color: GREEN, marginTop: 2 }}>Fix available</div>}
          </div>
        ))}
      </div>
    );
  }
  if (type === 'network') {
    const checks = data.checks || [];
    return (
      <div style={style}>
        {checks.map((c, i) => <CheckRow key={i} label={c.check} pass={c.pass} detail={c.detail} />)}
      </div>
    );
  }
  if (type === 'device') {
    const mem = data.memory || {};
    const env = data.envValidation || [];
    return (
      <div style={style}>
        <CheckRow label={`Node.js ${data.nodeVersion}`} pass={true} />
        <CheckRow label={`Platform: ${data.platform}`} pass={true} />
        <CheckRow label={`Memory heap used: ${Math.round((mem.heapUsed || 0) / 1024 / 1024)}MB`} pass={(mem.heapUsed || 0) < 512 * 1024 * 1024} />
        <CheckRow label={`CPUs: ${data.cpuCount}`} pass={data.cpuCount > 0} />
        <CheckRow label={`/tmp accessible`} pass={data.diskCheck?.accessible} />
        {env.map((e, i) => <CheckRow key={i} label={`${e.key} set`} pass={e.present} />)}
      </div>
    );
  }
  return null;
}

export default function SecurityDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [threats, setThreats] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [auditFilter, setAuditFilter] = useState('all');
  const [scanning, setScanning] = useState({});
  const [fullScanBusy, setFullScanBusy] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [connected, setConnected] = useState(false);
  const threatFeedRef = useRef(null);
  const socketRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/security/dashboard');
      if (!res.ok) return;
      const data = await res.json();
      setDashboard(data);
      setScoreHistory(prev => {
        const next = [...prev, { score: data.score, ts: Date.now() }].slice(-30);
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  const fetchThreats = useCallback(async () => {
    try {
      const res = await fetch('/api/security/threats');
      if (!res.ok) return;
      const data = await res.json();
      setThreats(data.threats || []);
    } catch { /* ignore */ }
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/security/audit');
      if (!res.ok) return;
      const data = await res.json();
      setAuditLog(data.entries || []);
    } catch { /* ignore */ }
  }, []);

  const fetchNetworkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/security/network/status');
      if (!res.ok) return;
      const data = await res.json();
      setNetworkStatus(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchThreats();
    fetchAudit();
    fetchNetworkStatus();

    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('security:threat', (threat) => {
      setThreats(prev => [threat, ...prev].slice(0, 100));
      if (threatFeedRef.current) {
        threatFeedRef.current.scrollTop = 0;
      }
    });
    socket.on('security:scan:result', () => {
      fetchDashboard();
    });

    const iv = setInterval(() => { fetchDashboard(); fetchNetworkStatus(); }, 30000);
    return () => { socket.disconnect(); clearInterval(iv); };
  }, [fetchDashboard, fetchNetworkStatus]);

  async function runFullScan() {
    setFullScanBusy(true);
    await Promise.allSettled([
      fetch('/api/security/scan/vulnerabilities', { method: 'POST' }),
      fetch('/api/security/scan/network', { method: 'POST' }),
      fetch('/api/security/scan/device', { method: 'POST' })
    ]);
    setLastScan(new Date());
    await fetchDashboard();
    await fetchThreats();
    setFullScanBusy(false);
  }

  async function runScan(type) {
    setScanning(s => ({ ...s, [type]: true }));
    try {
      const res = await fetch(`/api/security/scan/${type}`, { method: 'POST' });
      const data = res.ok ? await res.json() : {};
      setLastScan(new Date());
      return data;
    } finally {
      setScanning(s => ({ ...s, [type]: false }));
    }
  }

  function exportAuditCSV() {
    const filtered = auditFilter === 'all' ? auditLog : auditLog.filter(e => e.event === auditFilter);
    const rows = [
      ['Timestamp', 'Event', 'User/IP', 'Details'],
      ...filtered.map(e => [
        new Date(e.timestamp).toISOString(),
        e.event,
        e.details?.ip || e.details?.user || '',
        JSON.stringify(e.details || {})
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const score = dashboard?.score ?? 0;
  const activeThreatCount = threats.filter(t => t.severity === 'critical' || t.severity === 'high').length;
  const vulnCount = dashboard?.vulnerabilities?.length ?? 0;
  const eventTypes = [...new Set(auditLog.map(e => e.event).filter(Boolean))];
  const filteredAudit = auditFilter === 'all' ? auditLog : auditLog.filter(e => e.event === auditFilter);

  const styles = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    * { box-sizing: border-box; }
    body { background: ${BG}; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: ${SURFACE}; }
    ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 3px; }
  `;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '0 0 40px 0' }}>
      <style>{styles}</style>

      {/* Header */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color={RED} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Security Command Center</div>
              <div style={{ fontSize: 12, color: MUTED }}>
                Last scan: {lastScan ? lastScan.toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? GREEN : RED, display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <span style={{ color: connected ? GREEN : RED }}>{connected ? 'Live' : 'Offline'}</span>
            </div>
            <button
              onClick={runFullScan}
              disabled={fullScanBusy}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: fullScanBusy ? BORDER : RED, color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: fullScanBusy ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {fullScanBusy ? <><Spinner /> Scanning…</> : <><Search size={14} /> Run Full Scan</>}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }}>

        {/* Score Arc + Status Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Score card */}
          <div style={{ ...card(), textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <ShieldCheck size={16} color={GREEN} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Overall Score</span>
            </div>
            <ScoreArc score={score} />
          </div>

          {/* Active Threats */}
          <div style={{ ...card() }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <ShieldAlert size={16} color={RED} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Active Threats</span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: activeThreatCount > 0 ? RED : '#d1d5db' }}>
              <AnimatedNumber value={activeThreatCount} />
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Critical + High severity</div>
            {activeThreatCount > 0 && (
              <span style={{ ...badge(RED), marginTop: 8 }}>ACTION REQUIRED</span>
            )}
          </div>

          {/* Vulnerabilities */}
          <div style={{ ...card() }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <AlertTriangle size={16} color={ORANGE} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Vulnerabilities</span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: vulnCount > 0 ? ORANGE : '#d1d5db' }}>
              <AnimatedNumber value={vulnCount} />
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Found in last scan</div>
          </div>

          {/* Encryption */}
          <div style={{ ...card() }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Lock size={16} color={GREEN} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Encryption</span>
            </div>
            <span style={{ ...badge(GREEN), fontSize: 13 }}>ACTIVE</span>
            <div style={{ fontSize: 13, color: '#d1d5db', marginTop: 10, fontWeight: 600 }}>AES-256-GCM</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Military-grade encryption</div>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,0.8fr)', gap: 20, marginBottom: 24 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Real-Time Threat Feed */}
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Activity size={16} color={RED} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Real-Time Threat Feed</span>
                <span style={{ ...badge(RED), marginLeft: 'auto' }}>{threats.length}</span>
              </div>
              <div ref={threatFeedRef} style={{ maxHeight: 280, overflowY: 'auto' }}>
                {!threats.length && (
                  <div style={{ color: MUTED, fontSize: 13, textAlign: 'center', padding: 20 }}>No threats detected</div>
                )}
                {threats.map((t, i) => {
                  const color = SEV_COLOR[t.severity] || MUTED;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                      borderBottom: `1px solid ${BORDER}`,
                      animation: i === 0 ? 'slideIn 0.3s ease' : undefined
                    }}>
                      <AlertCircle size={14} color={color} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6' }}>{t.type || 'Unknown'}</span>
                          <SeverityBadge severity={t.severity} />
                        </div>
                        <div style={{ fontSize: 11, color: MUTED }}>
                          {t.ip && <span>{t.ip} · </span>}
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <span style={{ ...badge(GREEN), fontSize: 10 }}>BLOCKED</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vulnerability Scanner Panels */}
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Eye size={16} color={ORANGE} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Vulnerability Scanner</span>
              </div>
              <ScanPanel title="Dependency Scan" icon={Server} scanType="vulnerabilities" onScan={runScan} scanning={!!scanning.vulnerabilities} />
              <ScanPanel title="Network Scan" icon={Network} scanType="network" onScan={runScan} scanning={!!scanning.network} />
              <ScanPanel title="Device / Environment Scan" icon={Cpu} scanType="device" onScan={runScan} scanning={!!scanning.device} />
            </div>

          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Encryption Status */}
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Lock size={16} color={GREEN} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Encryption Status</span>
              </div>
              {[
                { label: 'Algorithm', value: 'AES-256-GCM' },
                { label: 'Key Rotation', value: 'Daily (auto)' },
                { label: 'HMAC', value: 'SHA-256 active' },
                { label: 'TLS Version', value: 'TLS 1.3' },
                { label: 'Certificate', value: 'Valid' }
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                  <span style={{ color: MUTED }}>{label}</span>
                  <span style={{ color: '#d1d5db', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Network Connectivity */}
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Wifi size={16} color={BLUE} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Network Connectivity</span>
                <button
                  onClick={fetchNetworkStatus}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}
                  title="Refresh"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
              {networkStatus
                ? networkStatus.results.map(r => (
                    <LatencyBar key={r.name} name={r.name} reachable={r.reachable} latencyMs={r.latencyMs} />
                  ))
                : <div style={{ color: MUTED, fontSize: 13 }}>Checking connectivity…</div>}
            </div>

            {/* Score History */}
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <BarChart3 size={16} color={BLUE} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Score History (30 days)</span>
              </div>
              <ScoreHistoryChart history={scoreHistory} />
            </div>

          </div>
        </div>

        {/* Audit Log */}
        <div style={card()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={16} color={BLUE} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Audit Log</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={auditFilter}
                onChange={e => setAuditFilter(e.target.value)}
                style={{
                  background: BORDER, border: `1px solid ${BORDER}`, color: '#d1d5db',
                  padding: '5px 10px', borderRadius: 6, fontSize: 12
                }}
              >
                <option value="all">All Events</option>
                {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={exportAuditCSV}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 6, border: `1px solid ${BORDER}`,
                  background: 'none', color: '#d1d5db', fontSize: 12, cursor: 'pointer'
                }}
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Timestamp', 'Event', 'User / IP', 'Details'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: MUTED, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filteredAudit.length && (
                  <tr>
                    <td colSpan={4} style={{ padding: '20px 10px', color: MUTED, textAlign: 'center' }}>No audit entries</td>
                  </tr>
                )}
                {filteredAudit.slice(-50).reverse().map((e, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '7px 10px', color: MUTED, whiteSpace: 'nowrap' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '7px 10px', color: '#d1d5db', fontWeight: 600 }}>{e.event}</td>
                    <td style={{ padding: '7px 10px', color: MUTED }}>{e.details?.ip || e.details?.user || '—'}</td>
                    <td style={{ padding: '7px 10px', color: MUTED, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(e.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
