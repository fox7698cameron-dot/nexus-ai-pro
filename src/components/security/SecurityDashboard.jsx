/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Security Dashboard — Real-time vulnerability scanning, network monitoring,
 * device health, on-device issues, live metrics, patch management
 * Date: 2026-08-09
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Scan, Activity, Wifi, WifiOff, Server,
  AlertTriangle, CheckCircle, XCircle, Clock,
  RefreshCw, Loader2, Lock, Eye, Network, Cpu,
  Wrench, AlertCircle
} from 'lucide-react';

// ─── Severity configs ─────────────────────────────────────────────────────────

const SEVERITY = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Critical' },
  high: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'High' },
  medium: { color: '#eab308', bg: 'rgba(234,179,8,0.12)', label: 'Medium' },
  low: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Low' },
  info: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Info' },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' },
  scoreRing: (score) => {
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
    return {
      width: '96px',
      height: '96px',
      borderRadius: '50%',
      background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    };
  },
  scoreInner: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    background: '#0a0a0c',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: (borderColor) => ({
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${borderColor || 'rgba(255,255,255,0.06)'}`,
    borderRadius: '12px',
    padding: '20px',
  }),
  cardTitle: { fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' },
  cardValue: { fontSize: '1.6rem', fontWeight: '700', color: '#fff' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  vulnItem: (sev) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    background: SEVERITY[sev]?.bg ?? 'rgba(255,255,255,0.03)',
    border: `1px solid ${SEVERITY[sev]?.color ?? '#374151'}33`,
    borderRadius: '8px',
    marginBottom: '8px',
  }),
  badge: (sev) => ({
    padding: '2px 8px',
    background: SEVERITY[sev]?.bg,
    color: SEVERITY[sev]?.color,
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600',
    flexShrink: 0,
  }),
  patchBtn: {
    marginLeft: 'auto',
    padding: '4px 12px',
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '6px',
    color: '#22c55e',
    cursor: 'pointer',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  scanBtn: (loading) => ({
    padding: '10px 20px',
    background: loading ? 'rgba(102,126,234,0.3)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
  }),
  liveTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: '#22c55e',
    background: 'rgba(34,197,94,0.1)',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(34,197,94,0.25)',
  },
  dot: (on) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: on ? '#22c55e' : '#ef4444',
    animation: on ? 'pulse 2s infinite' : 'none',
  }),
  statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  statusLabel: { fontSize: '0.85rem', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '8px' },
  statusValue: (ok) => ({ fontSize: '0.85rem', color: ok ? '#22c55e' : '#ef4444', fontWeight: '500' }),
  empty: { color: '#6b7280', fontSize: '0.85rem', textAlign: 'center', padding: '20px' },
};

function ScoreRing({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  return (
    <div style={s.scoreRing(score)}>
      <div style={s.scoreInner}>
        <span style={{ fontSize: '1.4rem', fontWeight: '700', color }}>{score}</span>
        <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>/ 100</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecurityDashboard() {
  const { authFetch } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patchingId, setPatchingId] = useState(null);
  const wsRef = useRef(null);
  const pollRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [dashResp, statusResp] = await Promise.all([
        authFetch('/api/security/dashboard'),
        authFetch('/api/security/status'),
      ]);
      if (dashResp.ok) setDashboard(await dashResp.json());
      if (statusResp.ok) setStatus(await statusResp.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadDashboard();

    // WebSocket for real-time scan updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'security:scan:complete') loadDashboard();
      } catch { /* ignore */ }
    };

    // Poll status every 30s for live metrics
    pollRef.current = setInterval(loadDashboard, 30000);

    return () => {
      ws.close();
      clearInterval(pollRef.current);
    };
  }, [loadDashboard]);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const resp = await authFetch('/api/security/scan', { method: 'POST', body: JSON.stringify({ scope: 'full' }) });
      if (!resp.ok) throw new Error('Scan failed');
      const result = await resp.json();
      setDashboard(d => ({ ...(d ?? {}), ...result }));
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }, [authFetch]);

  const patchVuln = useCallback(async (id) => {
    setPatchingId(id);
    try {
      const resp = await authFetch(`/api/security/patch/${id}`, { method: 'POST' });
      if (resp.ok) {
        setDashboard(d => ({
          ...d,
          vulnerabilities: (d?.vulnerabilities ?? []).map(v =>
            v.id === id ? { ...v, status: 'patched' } : v
          ),
          overallScore: Math.min(100, (d?.overallScore ?? 0) + 5),
        }));
      }
    } finally {
      setPatchingId(null);
    }
  }, [authFetch]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#6b7280', gap: '10px' }}>
        <Loader2 size={22} />
        <span>Loading security dashboard…</span>
      </div>
    );
  }

  const vulns = dashboard?.vulnerabilities ?? [];
  const networkIssues = dashboard?.networkIssues ?? [];
  const deviceIssues = dashboard?.deviceIssues ?? [];
  const score = dashboard?.overallScore ?? 95;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>
          <Shield size={22} color="#667eea" />
          Security Dashboard
          <div style={s.liveTag}>
            <div style={s.dot(true)} />
            LIVE
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={s.scanBtn(scanning)} onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 size={16} /> : <Scan size={16} />}
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#fca5a5', display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Overview row */}
      <div style={s.overviewRow}>
        {/* Score ring */}
        <div style={{ ...s.card('rgba(102,126,234,0.2)'), display: 'flex', alignItems: 'center', gap: '20px' }}>
          <ScoreRing score={score} />
          <div>
            <div style={s.cardTitle}><Shield size={12} /> Security Score</div>
            <div style={{ fontSize: '1rem', color: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444', fontWeight: '600' }}>
              {score >= 80 ? '✓ Secure' : score >= 60 ? '⚠ At Risk' : '✗ Vulnerable'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              {dashboard?.lastScan ? `Last scan: ${new Date(dashboard.lastScan).toLocaleTimeString()}` : 'Not yet scanned'}
            </div>
          </div>
        </div>

        <div style={s.card()}>
          <div style={s.cardTitle}><AlertTriangle size={12} /> Vulnerabilities</div>
          <div style={{ ...s.cardValue, color: vulns.length > 0 ? '#f97316' : '#22c55e' }}>{vulns.filter(v => v.status !== 'patched').length}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{vulns.filter(v => v.status === 'patched').length} patched</div>
        </div>

        <div style={s.card()}>
          <div style={s.cardTitle}><Network size={12} /> Network Issues</div>
          <div style={{ ...s.cardValue, color: networkIssues.length > 0 ? '#eab308' : '#22c55e' }}>{networkIssues.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{networkIssues.length === 0 ? 'All clear' : 'Requires attention'}</div>
        </div>

        <div style={s.card()}>
          <div style={s.cardTitle}><Cpu size={12} /> Device Health</div>
          <div style={{ ...s.cardValue, color: deviceIssues.length > 0 ? '#eab308' : '#22c55e' }}>{deviceIssues.length > 0 ? 'Issues' : 'Healthy'}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{deviceIssues.length} issues detected</div>
        </div>

        <div style={s.card()}>
          <div style={s.cardTitle}><Lock size={12} /> Encryption</div>
          <div style={{ ...s.cardValue, color: '#22c55e', fontSize: '1rem' }}>AES-256-GCM</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>PBKDF2-SHA512 · JWT HS256</div>
        </div>
      </div>

      {/* Main grid */}
      <div style={s.grid2}>
        {/* Vulnerabilities */}
        <div style={s.card()}>
          <div style={s.sectionTitle}><ShieldAlert size={18} color="#f97316" /> Active Vulnerabilities</div>
          {vulns.filter(v => v.status !== 'patched').length === 0 ? (
            <div style={s.empty}>
              <CheckCircle size={32} color="#22c55e" style={{ margin: '0 auto 8px', display: 'block' }} />
              No active vulnerabilities
            </div>
          ) : (
            vulns.filter(v => v.status !== 'patched').map(v => (
              <div key={v.id} style={s.vulnItem(v.severity)}>
                <span style={s.badge(v.severity)}>{SEVERITY[v.severity]?.label ?? v.severity}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', color: '#e5e7eb', fontWeight: '500' }}>{v.name}</div>
                  {v.detail && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>{v.detail}</div>}
                  <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>Category: {v.category}</div>
                </div>
                <button
                  style={{ ...s.patchBtn, opacity: patchingId === v.id ? 0.6 : 1 }}
                  onClick={() => patchVuln(v.id)}
                  disabled={patchingId === v.id}
                >
                  <Wrench size={12} />
                  {patchingId === v.id ? 'Patching…' : 'Patch'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Network + Device */}
        <div>
          <div style={s.card()}>
            <div style={s.sectionTitle}><Wifi size={18} color="#667eea" /> Network Monitor</div>
            {networkIssues.length === 0 ? (
              <div style={s.empty}><CheckCircle size={24} color="#22c55e" style={{ margin: '0 auto 6px', display: 'block' }} />Network secure</div>
            ) : networkIssues.map(issue => (
              <div key={issue.id} style={s.vulnItem(issue.severity)}>
                <span style={s.badge(issue.severity)}>{issue.severity}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>{issue.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{issue.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...s.card(), marginTop: '16px' }}>
            <div style={s.sectionTitle}><Server size={18} color="#a78bfa" /> Device Health</div>
            {status && (
              <>
                <div style={s.statusRow}>
                  <span style={s.statusLabel}><Activity size={14} /> CPU Load</span>
                  <span style={s.statusValue(status.os?.loadAvg?.[0] < status.os?.cpus * 0.75)}>
                    {status.os?.loadAvg?.[0]?.toFixed(2)} / {status.os?.cpus} cores
                  </span>
                </div>
                <div style={s.statusRow}>
                  <span style={s.statusLabel}><Cpu size={14} /> Memory</span>
                  <span style={s.statusValue(parseFloat(status.os?.freeMemMB) > 500)}>
                    {status.memoryMB?.heapUsed}MB heap / {status.os?.totalMemMB}MB total
                  </span>
                </div>
                <div style={s.statusRow}>
                  <span style={s.statusLabel}><Clock size={14} /> Uptime</span>
                  <span style={{ fontSize: '0.85rem', color: '#22c55e' }}>{status.uptimeFormatted}</span>
                </div>
                <div style={s.statusRow}>
                  <span style={s.statusLabel}><Shield size={14} /> TLS</span>
                  <span style={s.statusValue(status.tlsEnabled)}>
                    {status.tlsEnabled ? 'Enabled' : 'Dev mode (HTTP)'}
                  </span>
                </div>
                <div style={s.statusRow}>
                  <span style={s.statusLabel}><Lock size={14} /> Platform</span>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{status.os?.platform} {status.os?.arch}</span>
                </div>
              </>
            )}
            {deviceIssues.length > 0 && deviceIssues.map(issue => (
              <div key={issue.id} style={{ ...s.vulnItem(issue.severity), marginTop: '8px' }}>
                <span style={s.badge(issue.severity)}>{issue.severity}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>{issue.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{issue.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Patched vulnerabilities */}
      {vulns.filter(v => v.status === 'patched').length > 0 && (
        <div style={s.card()}>
          <div style={s.sectionTitle}><ShieldCheck size={18} color="#22c55e" /> Patched Vulnerabilities</div>
          {vulns.filter(v => v.status === 'patched').map(v => (
            <div key={v.id} style={{ ...s.vulnItem('info'), opacity: 0.6 }}>
              <CheckCircle size={14} color="#22c55e" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{v.name}</div>
                {v.patchedAt && <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Patched {new Date(v.patchedAt).toLocaleString()}</div>}
              </div>
              <span style={s.badge('info')}>Patched</span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
