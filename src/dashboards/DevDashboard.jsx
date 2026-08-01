// src/dashboards/DevDashboard.jsx
// Nexus AI Pro - Developer Dashboard
// Role: dev — project tracking, connectors, API keys, analytics, code metrics
// Date: 2026-08-01

import React, { useState, useEffect, useCallback } from 'react';

const API = '/api';

export default function DevDashboard({ token }) {
  const [projectDash, setProjectDash] = useState(null);
  const [connectors, setConnectors] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [security, setSecurity] = useState(null);
  const [tab, setTab] = useState('projects');
  const [loading, setLoading] = useState(true);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, connRes, secRes] = await Promise.all([
        fetch(`${API}/projects/dashboard`, { headers }),
        fetch(`${API}/connectors`, { headers }),
        fetch(`${API}/security/status`, { headers })
      ]);
      if (projRes.ok) setProjectDash(await projRes.json());
      if (connRes.ok) setConnectors(await connRes.json());
      if (secRes.ok) setSecurity(await secRes.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activateConnector = async (key) => {
    await fetch(`${API}/connectors/${key}/activate`, { method: 'POST', headers, body: '{}' });
    fetchAll();
  };

  const TABS = ['projects', 'connectors', 'security', 'api-docs'];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>💻</span>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Dev Dashboard</h1>
        <span style={{ background: '#a855f71a', border: '1px solid #a855f7', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#a855f7', fontWeight: 700 }}>DEV</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 12 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#a855f7' : 'none', border: `1px solid ${tab === t ? '#a855f7' : '#1e293b'}`,
            borderRadius: 8, padding: '6px 14px', color: tab === t ? '#fff' : '#64748b',
            cursor: 'pointer', fontSize: 12, textTransform: 'capitalize', fontWeight: tab === t ? 700 : 400
          }}>{t.replace('-', ' ')}</button>
        ))}
      </div>

      {/* Projects Tab */}
      {tab === 'projects' && projectDash && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Projects', value: projectDash.totalProjects, color: '#a855f7' },
              { label: 'Active', value: projectDash.activeProjects, color: '#22c55e' },
              { label: 'Completed', value: projectDash.completedProjects, color: '#3b82f6' },
              { label: 'Avg Progress', value: `${projectDash.avgProgress}%`, color: '#f59e0b' }
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: '1 1 140px', background: '#111827', borderRadius: 12, padding: '16px 20px', border: '1px solid #1e293b' }}>
                <div style={{ color, fontSize: 26, fontWeight: 800 }}>{value}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(projectDash.byType || {}).filter(([, ps]) => ps.length > 0).map(([type, ps]) => {
              const icons = { coding: '💻', game_dev: '🎮', ar_vr_3d: '🥽', app_dev: '📱', web: '🌐' };
              return (
                <div key={type} style={{ flex: '1 1 220px', background: '#111827', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{icons[type] || '📁'} {type.replace('_', ' ')}</div>
                  {ps.slice(0, 3).map(p => (
                    <div key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
                      <div style={{ color: '#fff', fontSize: 13 }}>{p.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <div style={{ flex: 1, background: '#1e293b', borderRadius: 3, height: 4 }}>
                          <div style={{ width: `${p.progress}%`, background: '#6366f1', height: '100%', borderRadius: 3 }} />
                        </div>
                        <span style={{ color: '#64748b', fontSize: 10 }}>{p.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Connectors Tab */}
      {tab === 'connectors' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.entries(connectors).map(([key, c]) => (
            <div key={key} style={{
              flex: '1 1 260px', background: '#111827', borderRadius: 12, padding: 16,
              border: `1px solid ${c.connected ? '#22c55e44' : '#1e293b'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{c.name}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{c.category}</div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700,
                  background: c.connected ? '#0d2e1a' : c.status === 'ready' ? '#0d2e40' : '#1e293b',
                  color: c.connected ? '#4ade80' : c.status === 'ready' ? '#38bdf8' : '#64748b'
                }}>
                  {c.connected ? '● Connected' : c.status === 'ready' ? '○ Ready' : '⚙ Setup needed'}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {c.services?.slice(0, 3).map(s => (
                  <span key={s} style={{ background: '#0f172a', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: '#64748b' }}>{s}</span>
                ))}
              </div>
              {!c.connected && c.status === 'ready' && (
                <button onClick={() => activateConnector(key)} style={{
                  background: '#6366f122', border: '1px solid #6366f1', borderRadius: 6,
                  padding: '5px 12px', color: '#818cf8', cursor: 'pointer', fontSize: 12, fontWeight: 700, width: '100%'
                }}>
                  Connect
                </button>
              )}
              {c.status === 'needs_config' && (
                <div style={{ color: '#64748b', fontSize: 11 }}>Set env vars: {c.services?.slice(0, 2).join(', ')}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && security && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {[
            { label: 'Algorithm', val: security.algorithm?.toUpperCase() || 'AES-256-GCM', ok: true },
            { label: 'Status', val: security.status || 'secure', ok: security.status === 'secure' },
            { label: 'Encryption', val: security.encryptionActive ? 'Active' : 'Inactive', ok: security.encryptionActive },
            { label: 'Threats Blocked', val: security.threatsBlocked || 0, ok: true },
            { label: 'Patches Applied', val: security.patchesApplied || 0, ok: true },
            { label: 'Audit Log', val: `${security.auditLogSize || 0} entries`, ok: true }
          ].map(({ label, val, ok }) => (
            <div key={label} style={{
              flex: '1 1 160px', background: '#111827', borderRadius: 12,
              padding: 16, border: `1px solid ${ok ? '#22c55e22' : '#ef444422'}`
            }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
              <div style={{ color: ok ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 16, marginTop: 4 }}>{String(val)}</div>
            </div>
          ))}
        </div>
      )}

      {/* API Docs Tab */}
      {tab === 'api-docs' && (
        <div style={{ background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 16px', color: '#fff' }}>API Reference</h3>
          {[
            { method: 'POST', path: '/api/auth/register', desc: 'Register new user' },
            { method: 'POST', path: '/api/auth/login', desc: 'Login with credentials' },
            { method: 'POST', path: '/api/auth/refresh', desc: 'Refresh access token' },
            { method: 'GET',  path: '/api/analytics/summary', desc: 'Cross-platform analytics' },
            { method: 'GET',  path: '/api/projects', desc: 'List projects (query: type)' },
            { method: 'POST', path: '/api/projects', desc: 'Create project' },
            { method: 'POST', path: '/api/payments/checkout', desc: 'Start Stripe checkout' },
            { method: 'GET',  path: '/api/connectors', desc: 'List external connectors' },
            { method: 'GET',  path: '/api/i18n/languages', desc: 'Supported languages' },
            { method: 'POST', path: '/api/security/network-scan', desc: 'Run network security scan' }
          ].map(({ method, path, desc }) => {
            const colors = { GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b', DELETE: '#ef4444' };
            return (
              <div key={path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #0f172a' }}>
                <span style={{ background: `${colors[method]}22`, color: colors[method], borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, minWidth: 46, textAlign: 'center' }}>{method}</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 13 }}>{path}</span>
                <span style={{ color: '#475569', fontSize: 12, marginLeft: 'auto' }}>{desc}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
