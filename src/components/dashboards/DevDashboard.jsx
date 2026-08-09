/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Developer Dashboard — Cloud connectors, CI/CD, code metrics, API usage
 * Date: 2026-08-09
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Code, GitBranch, Zap, Box, Cloud, Link, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const s = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  title: { fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' },
  subtitle: { color: '#6b7280', fontSize: '0.9rem', marginBottom: '28px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' },
  connectorGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' },
  connectorCard: (ok) => ({
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${ok ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }),
  badge: (ok) => ({
    padding: '2px 8px',
    background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
    color: ok ? '#22c55e' : '#6b7280',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600',
    alignSelf: 'flex-start',
  }),
  connectBtn: (ok) => ({
    padding: '6px 12px',
    background: ok ? 'rgba(239,68,68,0.1)' : 'rgba(102,126,234,0.15)',
    border: `1px solid ${ok ? 'rgba(239,68,68,0.3)' : 'rgba(102,126,234,0.3)'}`,
    borderRadius: '6px',
    color: ok ? '#ef4444' : '#667eea',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }),
};

export default function DevDashboard() {
  const { user, authFetch } = useAuth();
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [repos, setRepos] = useState([]);

  useEffect(() => {
    Promise.all([
      authFetch('/api/connectors').then(r => r.ok && r.json()),
      authFetch('/api/connectors/github/repos').then(r => r.ok && r.json()).catch(() => null),
    ]).then(([conn, ghRepos]) => {
      if (conn) setConnectors(conn.connectors ?? []);
      if (ghRepos) setRepos(ghRepos.repos ?? []);
    }).finally(() => setLoading(false));
  }, [authFetch]);

  const toggle = async (id, connected) => {
    setConnecting(id);
    const url = connected ? `/api/connectors/${id}/disconnect` : `/api/connectors/${id}/connect`;
    const resp = await authFetch(url, { method: 'POST' });
    if (resp.ok) {
      const upd = await authFetch('/api/connectors').then(r => r.ok && r.json());
      if (upd) setConnectors(upd.connectors ?? []);
    }
    setConnecting(null);
  };

  const devConnectors = connectors.filter(c => ['github', 'bitbucket', 'azure', 'aws', 'google_cloud', 'redis'].includes(c.id));

  return (
    <div style={s.container}>
      <div style={s.title}><Code size={24} color="#8b5cf6" /> Developer Dashboard</div>
      <div style={s.subtitle}>Welcome, {user?.displayName ?? user?.username} 🛠️</div>

      {/* Stats */}
      <div style={s.grid}>
        {[
          { label: 'Active Projects', value: '7', icon: <Box size={18} color="#667eea" />, color: '#667eea' },
          { label: 'Open PRs', value: '3', icon: <GitBranch size={18} color="#22c55e" />, color: '#22c55e' },
          { label: 'CI Pipelines', value: '12', icon: <Zap size={18} color="#f59e0b" />, color: '#f59e0b' },
          { label: 'Connectors', value: devConnectors.filter(c => c.connected).length.toString(), icon: <Link size={18} color="#8b5cf6" />, color: '#8b5cf6' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ ...s.card, borderLeft: `3px solid ${color}` }}>
            <div style={{ marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Cloud & Dev connectors */}
      <div style={{ ...s.card, marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cloud size={18} color="#667eea" /> Cloud & Dev Connectors
        </h3>
        {loading ? (
          <div style={{ color: '#6b7280', display: 'flex', gap: '8px', alignItems: 'center' }}><Loader2 size={16} />Loading…</div>
        ) : (
          <div style={s.connectorGrid}>
            {devConnectors.map(c => (
              <div key={c.id} style={s.connectorCard(c.connected)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>{c.name}</div>
                  <span style={s.badge(c.connected)}>{c.connected ? 'Connected' : c.configured ? 'Ready' : 'Not configured'}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{c.category}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {c.features.slice(0, 3).map(f => (
                    <span key={f} style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', color: '#9ca3af' }}>
                      {f.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                {c.connected && c.connectedAt && (
                  <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                    Connected {new Date(c.connectedAt).toLocaleDateString()}
                  </div>
                )}
                <button
                  style={{ ...s.connectBtn(c.connected), opacity: connecting === c.id ? 0.7 : 1 }}
                  onClick={() => toggle(c.id, c.connected)}
                  disabled={connecting === c.id || (!c.configured && !c.connected)}
                >
                  {connecting === c.id ? <Loader2 size={12} /> : c.connected ? <XCircle size={12} /> : <CheckCircle size={12} />}
                  {connecting === c.id ? 'Updating…' : c.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GitHub repos */}
      {repos.length > 0 && (
        <div style={s.card}>
          <h3 style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🐙 GitHub Repositories
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {repos.slice(0, 9).map(repo => (
              <div key={repo.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{repo.name}</div>
                {repo.description && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '8px' }}>{repo.description.slice(0, 80)}</div>}
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: '#9ca3af' }}>
                  {repo.language && <span>💻 {repo.language}</span>}
                  <span>⭐ {repo.stars}</span>
                  <span>🍴 {repo.forks}</span>
                  {repo.openIssues > 0 && <span style={{ color: '#f59e0b' }}>⚠ {repo.openIssues}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
