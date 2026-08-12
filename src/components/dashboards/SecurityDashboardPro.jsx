/**
 * src/components/dashboards/SecurityDashboardPro.jsx
 * Enterprise Security Dashboard — Real-time scans, threat intelligence, network monitoring
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Features:
 *  - Real-time threat event stream (SSE)
 *  - Security score gauge
 *  - Vulnerability management
 *  - Network anomaly detection
 *  - Encryption health
 *  - On-device system metrics
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Scan, Activity, Wifi, WifiOff, AlertTriangle,
  Lock, Key, Server, Cpu, HardDrive, Network,
  RefreshCw, CheckCircle, XCircle, Info, Eye,
  Zap, BarChart3, Clock, Terminal, Globe
} from 'lucide-react';

// ─── Severity Config ──────────────────────────────────────────────────────────

const SEVERITY = {
  critical: { color: '#ef4444', bg: '#ef444422', label: 'Critical', Icon: XCircle     },
  high:     { color: '#f97316', bg: '#f9731622', label: 'High',     Icon: AlertTriangle },
  medium:   { color: '#f59e0b', bg: '#f59e0b22', label: 'Medium',   Icon: AlertTriangle },
  moderate: { color: '#f59e0b', bg: '#f59e0b22', label: 'Moderate', Icon: AlertTriangle },
  low:      { color: '#6366f1', bg: '#6366f122', label: 'Low',      Icon: Info         },
  info:     { color: '#06b6d4', bg: '#06b6d422', label: 'Info',     Icon: Info         },
};

function getSeverity(sev) {
  return SEVERITY[sev?.toLowerCase()] || SEVERITY.low;
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }) {
  const norm  = Math.min(100, Math.max(0, score || 0));
  const color = norm >= 80 ? '#10b981' : norm >= 60 ? '#f59e0b' : '#ef4444';
  const r     = 46;
  const circ  = 2 * Math.PI * r;
  const dash  = (norm / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
        <circle
          cx={60} cy={60} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
          fill={color} fontSize={22} fontWeight={700}>{norm}</text>
      </svg>
      <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>Security Score</span>
    </div>
  );
}

// ─── Threat Row ───────────────────────────────────────────────────────────────

function ThreatRow({ threat, isNew }) {
  const sev = getSeverity(threat.severity);
  const { Icon } = sev;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px',
      background: isNew ? `${sev.color}18` : 'transparent',
      borderRadius: 6,
      borderLeft: `3px solid ${sev.color}`,
      fontSize: 13,
      animation: isNew ? 'fadeIn 0.3s ease' : undefined,
    }}>
      <Icon size={14} style={{ color: sev.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text, #f9fafb)', truncate: true }}>
          {threat.type?.replace(/_/g, ' ')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>
          {threat.ip || 'unknown'} · {threat.path || ''} · {new Date(threat.timestamp).toLocaleTimeString()}
        </div>
      </div>
      <span style={{
        padding: '2px 6px', borderRadius: 4,
        background: sev.bg, color: sev.color,
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      }}>
        {sev.label}
      </span>
    </div>
  );
}

// ─── Finding Row ──────────────────────────────────────────────────────────────

function FindingRow({ finding }) {
  const sev = getSeverity(finding.severity);
  const { Icon } = sev;

  return (
    <div style={{
      padding: '10px 14px',
      background: 'var(--card-bg, rgba(255,255,255,0.04))',
      border: `1px solid ${sev.color}44`,
      borderRadius: 8,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <Icon size={16} style={{ color: sev.color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{finding.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', marginTop: 2 }}>
          {finding.description}
        </div>
        {finding.remediation && (
          <div style={{ fontSize: 11, marginTop: 4, color: '#10b981' }}>
            💡 {finding.remediation}
          </div>
        )}
        {finding.cve && (
          <div style={{ fontSize: 11, marginTop: 2, color: '#6366f1' }}>
            CVE: {finding.cve}
          </div>
        )}
      </div>
      <span style={{
        padding: '2px 8px', borderRadius: 4,
        background: sev.bg, color: sev.color,
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>
        {finding.status || sev.label}
      </span>
    </div>
  );
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, Icon, color = '#6366f1', sub }) {
  return (
    <div style={{
      background: 'var(--card-bg, rgba(255,255,255,0.05))',
      border:     '1px solid var(--border, rgba(255,255,255,0.1))',
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {Icon && <Icon size={14} style={{ color }} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text, #f9fafb)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecurityDashboardPro({ apiBase = '/api' }) {
  const [dashboard,      setDashboard]      = useState(null);
  const [threats,        setThreats]        = useState([]);
  const [newThreatIds,   setNewThreatIds]   = useState(new Set());
  const [scanning,       setScanning]       = useState(false);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [activeTab,      setActiveTab]      = useState('overview');
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const sseRef = useRef(null);

  const token = () => localStorage.getItem('nexus_token') || '';

  // ── Load dashboard ─────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${apiBase}/security/dashboard`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDashboard(data);
      setThreats(data.recentThreats || []);
    } catch (err) {
      setError(err.message);
      // Demo data for offline/dev
      setDashboard({
        overallScore:     87,
        status:           'warning',
        encryptionAlgo:   'AES-256-GCM',
        encryptionStatus: 'active',
        vulnerabilities:  [
          {
            id: 'DEMO-001', title: 'JWT_SECRET not configured',
            severity: 'critical', category: 'configuration',
            description: 'Set JWT_SECRET in your .env file', status: 'open',
          },
          {
            id: 'DEMO-002', title: 'Running in development mode',
            severity: 'low', category: 'configuration',
            description: 'Set NODE_ENV=production for deployment', status: 'open',
          },
        ],
        recentThreats: [],
        anomaly: { activeWindowIPs: 3, flaggedIPs: 0 },
        systemInfo: {
          platform: navigator.platform, nodeVer: 'N/A',
          uptime: 3600, memUsagePct: 42,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  // ── Run scan ───────────────────────────────────────────────────────────────
  const runScan = useCallback(async (deep = false) => {
    setScanning(true);
    try {
      const res = await fetch(`${apiBase}/security/scan`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ deep }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setDashboard(prev => prev ? { ...prev, ...result, overallScore: result.score } : result);
    } catch (err) {
      setError(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }, [apiBase]);

  // ── Real-time SSE ──────────────────────────────────────────────────────────
  const startRealtime = useCallback(() => {
    if (sseRef.current) return;
    const sse = new EventSource(`${apiBase}/security/realtime`);

    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'threat' && data.event) {
          const evt = data.event;
          setThreats(prev => [evt, ...prev].slice(0, 100));
          setNewThreatIds(prev => new Set([...prev, evt.id]));
          setTimeout(() => setNewThreatIds(prev => {
            const s = new Set(prev); s.delete(evt.id); return s;
          }), 3000);
        }
        if (data.type === 'heartbeat') {
          setDashboard(prev => prev ? {
            ...prev,
            anomaly:   data.anomaly || prev.anomaly,
            systemInfo: { ...prev.systemInfo, memUsagePct: data.mem },
          } : prev);
        }
      } catch {}
    };

    sse.onerror = () => { sse.close(); sseRef.current = null; setRealtimeActive(false); };
    sseRef.current = sse;
    setRealtimeActive(true);
  }, [apiBase]);

  const stopRealtime = useCallback(() => {
    sseRef.current?.close(); sseRef.current = null; setRealtimeActive(false);
  }, []);

  useEffect(() => {
    loadDashboard();
    return () => stopRealtime();
  }, [loadDashboard, stopRealtime]);

  const vulns   = dashboard?.vulnerabilities || [];
  const sysInfo = dashboard?.systemInfo || {};
  const anomaly = dashboard?.anomaly || {};

  const critCount   = vulns.filter(v => v.severity === 'critical').length;
  const highCount   = vulns.filter(v => v.severity === 'high').length;
  const statusColor = dashboard?.status === 'secure' ? '#10b981'
                    : dashboard?.status === 'warning' ? '#f59e0b' : '#ef4444';

  const tabs = ['overview', 'vulnerabilities', 'threats', 'network', 'encryption'];

  return (
    <div style={{ padding: 20, color: 'var(--text, #f9fafb)', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={24} style={{ color: statusColor }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Security Dashboard</h1>
            <p style={{ margin: 0, fontSize: 12, color: statusColor, fontWeight: 600 }}>
              {dashboard?.status?.toUpperCase() || 'LOADING'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={realtimeActive ? stopRealtime : startRealtime}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 7, border: 'none',
              background: realtimeActive ? '#10b98122' : 'rgba(255,255,255,0.1)',
              color: realtimeActive ? '#10b981' : 'var(--text, #f9fafb)',
              cursor: 'pointer', fontSize: 12,
            }}
          >
            {realtimeActive ? <Wifi size={13} /> : <WifiOff size={13} />}
            {realtimeActive ? 'Live' : 'Go Live'}
          </button>
          <button
            onClick={() => runScan(false)}
            disabled={scanning}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 7, border: 'none',
              background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 12,
            }}
          >
            <Scan size={13} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
          <button
            onClick={() => runScan(true)}
            disabled={scanning}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 7, border: 'none',
              background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12,
            }}
          >
            Deep Scan
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 14px', marginBottom: 14, background: '#f9731622', borderRadius: 7, fontSize: 12, color: '#fcd34d' }}>
          ⚠️ {error} — showing demo data
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px', border: 'none', borderRadius: '7px 7px 0 0',
              background: activeTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent',
              borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === tab ? '#818cf8' : 'var(--text-muted, #9ca3af)',
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              textTransform: 'capitalize', whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
            <ScoreGauge score={dashboard?.overallScore} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <StatTile label="Critical"      value={critCount}                    color="#ef4444" Icon={XCircle}       sub="vulnerabilities" />
              <StatTile label="High"          value={highCount}                    color="#f97316" Icon={AlertTriangle}  sub="vulnerabilities" />
              <StatTile label="Active IPs"    value={anomaly.activeWindowIPs || 0} color="#6366f1" Icon={Network}        sub="last 5 minutes" />
              <StatTile label="Flagged IPs"   value={anomaly.flaggedIPs || 0}      color="#ef4444" Icon={ShieldAlert}    sub="anomalies" />
              <StatTile label="Memory"        value={`${sysInfo.memUsagePct || 0}%`} color="#10b981" Icon={Cpu}          sub="usage" />
              <StatTile label="Encryption"    value={dashboard?.encryptionStatus || 'active'} color="#10b981" Icon={Lock} />
            </div>
          </div>

          {/* Recent Threats */}
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Recent Threats</h3>
          {threats.length === 0 ? (
            <div style={{ padding: 16, borderRadius: 8, background: '#10b98122', color: '#10b981', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <ShieldCheck size={16} /> No threats detected
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {threats.slice(0, 10).map(t => (
                <ThreatRow key={t.id} threat={t} isNew={newThreatIds.has(t.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vulnerabilities Tab */}
      {activeTab === 'vulnerabilities' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #9ca3af)', marginBottom: 16 }}>
            {vulns.length} finding{vulns.length !== 1 ? 's' : ''} from last scan
          </p>
          {vulns.length === 0 ? (
            <div style={{ padding: 16, borderRadius: 8, background: '#10b98122', color: '#10b981', fontSize: 13 }}>
              ✅ No vulnerabilities found in last scan
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vulns.map(f => <FindingRow key={f.id} finding={f} />)}
            </div>
          )}
        </div>
      )}

      {/* Threats Tab */}
      {activeTab === 'threats' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #9ca3af)', marginBottom: 14 }}>
            {threats.length} events — {realtimeActive ? '🟢 live updates active' : '⚫ live updates off'}
          </p>
          {threats.length === 0 ? (
            <div style={{ padding: 16, borderRadius: 8, background: '#10b98122', color: '#10b981', fontSize: 13 }}>
              No threats in log
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {threats.map(t => <ThreatRow key={t.id} threat={t} isNew={newThreatIds.has(t.id)} />)}
            </div>
          )}
        </div>
      )}

      {/* Network Tab */}
      {activeTab === 'network' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <StatTile label="Active IPs"   value={anomaly.activeWindowIPs || 0} Icon={Network}  color="#6366f1" sub="last 5 min window" />
            <StatTile label="Flagged IPs"  value={anomaly.flaggedIPs || 0}      Icon={ShieldAlert} color="#ef4444" sub="anomaly threshold" />
            <StatTile label="Total Tracked" value={anomaly.totalTracked || 0}   Icon={Globe}    color="#10b981" />
          </div>
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted, #9ca3af)' }}>
            <Globe size={14} style={{ display: 'inline', marginRight: 6 }} />
            Platform: {sysInfo.platform || 'unknown'} · Uptime: {Math.floor((sysInfo.uptime || 0) / 60)}m
          </div>
        </div>
      )}

      {/* Encryption Tab */}
      {activeTab === 'encryption' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Algorithm',       value: dashboard?.encryptionAlgo || 'AES-256-GCM' },
            { label: 'Status',          value: dashboard?.encryptionStatus || 'active' },
            { label: 'Key Length',      value: '256 bits' },
            { label: 'IV Length',       value: '96 bits (12 bytes)' },
            { label: 'Auth Tag',        value: '128 bits (16 bytes)' },
            { label: 'KDF',             value: 'PBKDF2-SHA512 (310k iterations)' },
            { label: 'HMAC',            value: 'HMAC-SHA256' },
            { label: 'Transport',       value: 'HTTPS (TLS enforced)' },
            { label: 'Token Signing',   value: 'HS256 (JWT)' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--card-bg, rgba(255,255,255,0.04))',
              borderRadius: 7, fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-muted, #9ca3af)' }}>{label}</span>
              <span style={{ color: '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
