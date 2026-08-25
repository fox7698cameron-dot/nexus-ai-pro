/**
 * src/components/security/EnhancedSecurityDashboard.jsx
 * Nexus AI Pro — Enhanced Security Dashboard
 * Labeled: 2026-08-25
 *
 * Real-time security scanning:
 *  - Full security score with live updates via Socket.IO
 *  - Network issue detection
 *  - On-device/server health
 *  - Dependency vulnerability scan
 *  - Threat intelligence & audit log
 * Role: admin only (UI enforces, server enforces separately)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('nexus:accessToken');
  const res   = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Score gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  const label = score >= 80 ? 'Secure'  : score >= 60 ? 'Warning' : 'Critical';
  const r     = 54;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={140} height={140} aria-label={`Security score: ${score}`}>
        <circle cx={70} cy={70} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={70} cy={70} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x={70} y={65} textAnchor="middle" fill="var(--text-primary)" fontSize={28} fontWeight={700}>{score}</text>
        <text x={70} y={85} textAnchor="middle" fill={color} fontSize={13} fontWeight={600}>{label}</text>
      </svg>
    </div>
  );
}

// ── Severity badge ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const map = {
    critical: { bg: '#fef2f2', color: '#991b1b', label: '🔴 Critical' },
    high:     { bg: '#fff7ed', color: '#92400e', label: '🟠 High'     },
    medium:   { bg: '#fefce8', color: '#713f12', label: '🟡 Medium'   },
    moderate: { bg: '#fefce8', color: '#713f12', label: '🟡 Moderate' },
    low:      { bg: '#f0fdf4', color: '#14532d', label: '🟢 Low'      }
  };
  const s = map[severity] || map.low;
  return (
    <span style={{
      padding:      '2px 8px', borderRadius: 20,
      background:   s.bg, color: s.color,
      fontSize:     12, fontWeight: 600, whiteSpace: 'nowrap'
    }}>
      {s.label}
    </span>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ ok }) {
  return (
    <span style={{
      display:      'inline-block',
      width:        10, height: 10,
      borderRadius: '50%',
      background:   ok ? '#16a34a' : '#dc2626',
      flexShrink:   0
    }} aria-label={ok ? 'OK' : 'Issue'} />
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, collapsible = false }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background:   'var(--card-bg)',
      border:       '1px solid var(--border)',
      borderRadius: 14,
      overflow:     'hidden'
    }}>
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        style={{
          display:     'flex', alignItems: 'center', justifyContent: 'space-between',
          width:       '100%', padding:   '16px 20px',
          background:  'transparent', border: 'none', cursor: collapsible ? 'pointer' : 'default',
          textAlign:   'left'
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true">{icon}</span> {title}
        </span>
        {collapsible && <span aria-hidden="true">{open ? '▾' : '▸'}</span>}
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function EnhancedSecurityDashboard({ userRole }) {
  const [scanData,     setScanData]     = useState(null);
  const [auditLog,     setAuditLog]     = useState([]);
  const [networkData,  setNetworkData]  = useState(null);
  const [scanning,     setScanning]     = useState(false);
  const [error,        setError]        = useState('');
  const [activeTab,    setActiveTab]    = useState('overview');
  const pollRef = useRef(null);

  const isAdmin = userRole === 'admin' || userRole === 'dev';

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch('/security/status');
      setScanData(data);
    } catch (err) {
      if (err.message !== 'Not authenticated') setError(err.message);
    }
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError('');
    try {
      const data = await apiFetch('/security/scan', { method: 'POST', body: JSON.stringify({ force: true }) });
      setScanData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }, []);

  const runNetworkScan = useCallback(async () => {
    setError('');
    try {
      const data = await apiFetch('/security/scan/network', { method: 'POST', body: JSON.stringify({}) });
      setNetworkData(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAuditLog = useCallback(async () => {
    try {
      const data = await apiFetch('/security/audit?limit=50');
      setAuditLog(data.entries || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadStatus();
    if (isAdmin) loadAuditLog();
    // Poll status every 30 s
    pollRef.current = setInterval(loadStatus, 30_000);
    return () => clearInterval(pollRef.current);
  }, [loadStatus, loadAuditLog, isAdmin]);

  const tabs = [
    { id: 'overview',     label: 'Overview' },
    { id: 'network',      label: 'Network'  },
    { id: 'deps',         label: 'Dependencies' },
    { id: 'system',       label: 'System'   },
    { id: 'audit',        label: 'Audit Log' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 4px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🛡️ Security Dashboard</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Real-time security monitoring, scanning & threat detection
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button
              onClick={runScan}
              disabled={scanning}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: scanning ? '#6b7280' : '#dc2626', color: '#fff',
                cursor: scanning ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600
              }}
            >
              {scanning ? '⏳ Scanning…' : '🔍 Run Full Scan'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: '#fef2f2', color: '#991b1b', fontSize: 14
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding:      '10px 16px', border: 'none',
              background:   'transparent', cursor: 'pointer',
              fontSize:     14, fontWeight: activeTab === t.id ? 700 : 500,
              color:        activeTab === t.id ? '#6366f1' : 'var(--text-muted)',
              borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {scanData && !scanData.message ? (
            <>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{
                  background: 'var(--card-bg)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8, minWidth: 200
                }}>
                  <ScoreGauge score={scanData.overallScore || 0} />
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                    Scanned {scanData.scannedAt ? new Date(scanData.scannedAt).toLocaleTimeString() : '—'}
                  </p>
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Blocked IPs',    value: scanData.threatStats?.blockedIPs    || 0, icon: '🚫' },
                    { label: 'Suspicious IPs', value: scanData.threatStats?.suspiciousIPs || 0, icon: '⚠️' },
                    { label: 'Dep Vulns',      value: scanData.dependencies?.totalVulns   || 0, icon: '📦' },
                    { label: 'System Issues',  value: scanData.system?.issues?.length     || 0, icon: '💻' },
                    { label: 'Network Errors', value: (scanData.network || []).filter(n => !n.reachable).length, icon: '🌐' },
                    { label: 'Env Gaps',       value: scanData.system?.envStatus?.missing || 0, icon: '🔑' }
                  ].map(item => (
                    <div key={item.label} style={{
                      background: 'var(--card-bg)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '14px 16px'
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }} aria-hidden="true">{item.icon}</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{item.value}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dependency quick list */}
              {scanData.dependencies?.high?.length > 0 && (
                <SectionCard title="High Severity Dependencies" icon="📦" collapsible>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scanData.dependencies.high.slice(0, 10).map((v, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 8, background: 'var(--input-bg)',
                        flexWrap: 'wrap', gap: 8
                      }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{v.package}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <SeverityBadge severity={v.severity} />
                          {v.fixAvailable && (
                            <span style={{
                              padding: '2px 8px', borderRadius: 20,
                              background: '#f0fdf4', color: '#14532d', fontSize: 12, fontWeight: 600
                            }}>
                              Fix available
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* System issues */}
              {scanData.system?.issues?.length > 0 && (
                <SectionCard title="System Issues" icon="💻" collapsible>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scanData.system.issues.map((issue, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '10px 12px', borderRadius: 8, background: '#fef2f2'
                      }}>
                        <SeverityBadge severity={issue.severity} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{issue.type}</div>
                          <div style={{ fontSize: 13, color: '#991b1b' }}>
                            {Array.isArray(issue.detail) ? issue.detail.join(', ') : issue.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: 'var(--text-muted)', fontSize: 15
            }}>
              {isAdmin ? (
                <>
                  <p style={{ fontSize: 40, margin: 0 }} aria-hidden="true">🛡️</p>
                  <p style={{ margin: '12px 0' }}>No scan data yet</p>
                  <button
                    onClick={runScan}
                    disabled={scanning}
                    style={{
                      padding: '12px 24px', borderRadius: 8, border: 'none',
                      background: '#6366f1', color: '#fff', cursor: 'pointer',
                      fontSize: 15, fontWeight: 600
                    }}
                  >
                    Run First Security Scan
                  </button>
                </>
              ) : (
                <p>Security scan data not available</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Network tab */}
      {activeTab === 'network' && (
        <SectionCard title="Network Connectivity" icon="🌐">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={runNetworkScan} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}>
              🔄 Scan Now
            </button>
          </div>
          {(networkData?.network || scanData?.network || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(networkData?.network || scanData?.network || []).map((n, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 8,
                  background: n.reachable ? '#f0fdf4' : '#fef2f2',
                  flexWrap: 'wrap'
                }}>
                  <StatusDot ok={n.reachable} />
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{n.host}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Port {n.port}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: n.reachable ? '#16a34a' : '#dc2626' }}>
                    {n.reachable ? `${n.latencyMs}ms` : `Error: ${n.error || 'unreachable'}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              Click "Scan Now" to check network connectivity
            </p>
          )}
        </SectionCard>
      )}

      {/* Dependencies tab */}
      {activeTab === 'deps' && (
        <SectionCard title="Dependency Vulnerabilities" icon="📦">
          {scanData?.dependencies ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { level: 'critical', data: scanData.dependencies.critical, color: '#dc2626' },
                  { level: 'high',     data: scanData.dependencies.high,     color: '#ea580c' },
                  { level: 'moderate', data: scanData.dependencies.moderate, color: '#ca8a04' },
                  { level: 'low',      data: scanData.dependencies.low,      color: '#16a34a' }
                ].map(({ level, data, color }) => (
                  <div key={level} style={{
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 20px', textAlign: 'center', minWidth: 100
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color }}>{data?.length || 0}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{level}</div>
                  </div>
                ))}
              </div>
              {scanData.dependencies.all?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {scanData.dependencies.all.map((v, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8, background: 'var(--input-bg)',
                      flexWrap: 'wrap'
                    }}>
                      <SeverityBadge severity={v.severity} />
                      <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{v.package}</span>
                      {v.via?.length > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>via {v.via.join(', ')}</span>
                      )}
                      {v.fixAvailable && (
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Fix ✓</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#16a34a', textAlign: 'center', fontWeight: 600, padding: 20 }}>
                  ✅ No vulnerabilities found
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              Run a security scan to check dependencies
            </p>
          )}
        </SectionCard>
      )}

      {/* System tab */}
      {activeTab === 'system' && (
        <SectionCard title="System Health" icon="💻">
          {scanData?.system ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Node.js',  value: scanData.system.nodeVersion },
                  { label: 'Platform', value: scanData.system.platform    },
                  { label: 'Uptime',   value: `${Math.round((scanData.system.uptime || 0) / 3600)}h` },
                  { label: 'Heap Used', value: `${scanData.system.memory?.heapUsed || 0}MB` },
                  { label: 'RSS',      value: `${scanData.system.memory?.rss || 0}MB` },
                  { label: 'Env Vars', value: `${scanData.system.envStatus?.missing || 0} missing` }
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'var(--input-bg)', borderRadius: 10, padding: '12px 16px'
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {scanData.system.cpu && (
                <div style={{
                  background: 'var(--input-bg)', borderRadius: 10, padding: '12px 16px'
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>CPU Load Average</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    1m: {scanData.system.cpu.load1} &nbsp;
                    5m: {scanData.system.cpu.load5} &nbsp;
                    15m: {scanData.system.cpu.load15}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              Run a security scan to view system health
            </p>
          )}
        </SectionCard>
      )}

      {/* Audit log tab */}
      {activeTab === 'audit' && (
        <SectionCard title="Security Audit Log" icon="📋">
          {!isAdmin ? (
            <p style={{ color: '#dc2626', textAlign: 'center', padding: 24 }}>
              Admin role required to view audit log
            </p>
          ) : auditLog.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Time', 'Event', 'Actor', 'Details'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: 'left',
                        color: 'var(--text-muted)', fontWeight: 600
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{entry.event}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>
                        {entry.actor?.slice(0, 12) || 'system'}
                      </td>
                      <td style={{ padding: '9px 12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {JSON.stringify(entry.details).slice(0, 80)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              No audit log entries yet
            </p>
          )}
        </SectionCard>
      )}
    </div>
  );
}
