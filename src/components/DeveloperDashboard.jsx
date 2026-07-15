/**
 * src/components/DeveloperDashboard.jsx
 * Nexus AI Pro — Developer Dashboard
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Developer role: API keys, usage metrics, build status, connector config,
 * test coverage, CI/CD pipelines, webhook logs.
 */

import React, { useState, useEffect } from 'react';
import AuthService from '../auth/AuthService.js';
import { formatNumber, formatDate } from '../i18n/index.js';

function getHeaders() {
  const token = AuthService.getToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...getHeaders(), ...(opts.headers ?? {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

function ApiKeyCard({ keyData, onRevoke }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 10, padding: '14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{keyData.name}</div>
          <div style={{ color: '#555', fontSize: 11 }}>Created {formatDate(keyData.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setRevealed(r => !r)} style={{
            padding: '4px 10px', background: '#2d2d44', color: '#888',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11,
          }}>
            {revealed ? 'Hide' : 'Show'}
          </button>
          <button onClick={() => onRevoke(keyData.id)} style={{
            padding: '4px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11,
          }}>
            Revoke
          </button>
        </div>
      </div>
      <code style={{
        display: 'block', fontSize: 12, fontFamily: 'monospace',
        color: revealed ? '#a855f7' : '#555',
        padding: '8px 10px', background: '#12121f', borderRadius: 6,
        wordBreak: 'break-all',
      }}>
        {revealed ? keyData.key : '•'.repeat(32)}
      </code>
    </div>
  );
}

export default function DeveloperDashboard() {
  const [stats, setStats]   = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [tab, setTab]       = useState('overview');
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating]     = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/developer/stats').catch(() => null),
      apiFetch('/api/developer/api-keys').catch(() => ({ keys: [] })),
    ])
      .then(([s, k]) => { s && setStats(s); setApiKeys(k?.keys ?? []); })
      .finally(() => setLoading(false));
  }, []);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const data = await apiFetch('/api/developer/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      setApiKeys(prev => [data.apiKey, ...prev]);
      setNewKeyName('');
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id) {
    await apiFetch(`/api/developer/api-keys/${id}`, { method: 'DELETE' });
    setApiKeys(prev => prev.filter(k => k.id !== id));
  }

  if (!AuthService.isDeveloper()) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>🚫 Developer access required</div>;
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'apikeys',  label: '🔑 API Keys' },
    { id: 'builds',   label: '🔨 Builds' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, background: 'linear-gradient(135deg, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Developer Dashboard
        </h1>
        <div style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(168,85,247,0.15)', color: '#a855f7', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
          DEVELOPER
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t.id ? '#a855f7' : '#1f1f2e', color: '#fff',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>Loading…</div>}

      {!loading && tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {[
            { icon: '⚡', label: 'API Calls (24h)', value: formatNumber(stats?.apiCalls24h ?? 0), color: '#a855f7' },
            { icon: '✅', label: 'Success Rate',    value: `${stats?.successRate ?? 100}%`,       color: '#10b981' },
            { icon: '⏱', label: 'Avg Latency',     value: `${stats?.avgLatencyMs ?? 0}ms`,       color: '#f59e0b' },
            { icon: '🔑', label: 'API Keys',        value: apiKeys.length,                        color: '#3b82f6' },
            { icon: '🔨', label: 'Builds (7d)',     value: formatNumber(stats?.builds7d ?? 0),    color: '#06b6d4' },
            { icon: '🧪', label: 'Test Coverage',   value: `${stats?.coverage ?? 0}%`,            color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'apikeys' && (
        <div>
          {/* Create key */}
          <div style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 12, padding: '18px', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: 15, fontWeight: 700 }}>Create API Key</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Production)"
                style={{
                  flex: 1, padding: '10px 12px', background: '#1a1a2e', border: '1px solid #2d2d44',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none',
                }}
              />
              <button onClick={createKey} disabled={creating || !newKeyName.trim()} style={{
                padding: '10px 20px', background: creating ? '#2d2d44' : '#a855f7',
                color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700,
              }}>
                {creating ? '…' : '+ Create'}
              </button>
            </div>
          </div>
          {/* Key list */}
          {apiKeys.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: '#555', border: '2px dashed #2d2d44', borderRadius: 12 }}>No API keys yet</div>
            : apiKeys.map(k => <ApiKeyCard key={k.id} keyData={k} onRevoke={revokeKey} />)
          }
        </div>
      )}

      {!loading && tab === 'builds' && (
        <div style={{ background: '#12121f', border: '1px solid #2d2d44', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #2d2d44', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
            Recent Builds
          </div>
          {(stats?.recentBuilds ?? []).map((b, i) => (
            <div key={i} style={{
              padding: '12px 20px', borderBottom: '1px solid #1f1f2e',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{b.project}</div>
                <div style={{ color: '#555', fontSize: 12 }}>{b.branch} · {formatDate(b.timestamp)}</div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: b.status === 'passed' ? 'rgba(16,185,129,0.15)' : b.status === 'running' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                color: b.status === 'passed' ? '#10b981' : b.status === 'running' ? '#3b82f6' : '#ef4444',
              }}>
                {b.status?.toUpperCase()}
              </span>
            </div>
          ))}
          {!(stats?.recentBuilds?.length) && (
            <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>No builds logged</div>
          )}
        </div>
      )}
    </div>
  );
}
