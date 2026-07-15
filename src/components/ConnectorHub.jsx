/**
 * src/components/ConnectorHub.jsx
 * Nexus AI Pro — Integrations & Connector Hub
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Connectors: Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket,
 * Unreal/Epic Games, Sony, Microsoft Xbox, Ubisoft Connect, Redis, Blob Storage.
 * All OAuth flows redirect through the server — no tokens hardcoded here.
 */

import React, { useState, useEffect, useCallback } from 'react';
import AuthService from '../auth/AuthService.js';

// ─── Connector Registry ───────────────────────────────────────────────────────

const CONNECTORS = {
  // Cloud / DevOps
  github: {
    id: 'github', name: 'GitHub', category: 'DevOps',
    icon: '🐱', color: '#24292e', accent: '#6e5494',
    description: 'Repos, issues, PRs, CI/CD',
    authType: 'oauth', scopes: ['repo', 'read:user'],
  },
  bitbucket: {
    id: 'bitbucket', name: 'Bitbucket', category: 'DevOps',
    icon: '🪣', color: '#0052CC', accent: '#0052CC',
    description: 'Repos, pipelines, pull requests',
    authType: 'oauth', scopes: ['repository', 'pullrequest'],
  },
  aws: {
    id: 'aws', name: 'AWS', category: 'Cloud',
    icon: '☁️', color: '#FF9900', accent: '#FF9900',
    description: 'S3, Lambda, EC2, DynamoDB, CloudWatch',
    authType: 'apikey', fields: ['accessKeyId', 'secretAccessKey', 'region'],
  },
  azure: {
    id: 'azure', name: 'Microsoft Azure', category: 'Cloud',
    icon: '🔷', color: '#0078D4', accent: '#0078D4',
    description: 'Azure Blob, Functions, Cosmos DB, Monitor',
    authType: 'oauth', scopes: ['openid', 'profile'],
  },
  google: {
    id: 'google', name: 'Google Cloud', category: 'Cloud',
    icon: '🔵', color: '#4285F4', accent: '#4285F4',
    description: 'GCS, BigQuery, Cloud Run, Firestore',
    authType: 'oauth', scopes: ['email', 'profile', 'openid'],
  },
  // Collaboration
  slack: {
    id: 'slack', name: 'Slack', category: 'Collaboration',
    icon: '💬', color: '#4A154B', accent: '#E01E5A',
    description: 'Channels, notifications, commands',
    authType: 'oauth', scopes: ['chat:write', 'channels:read'],
  },
  zoom: {
    id: 'zoom', name: 'Zoom', category: 'Collaboration',
    icon: '📹', color: '#2D8CFF', accent: '#2D8CFF',
    description: 'Meetings, webinars, recordings',
    authType: 'oauth', scopes: ['meeting:write'],
  },
  // Creative
  adobe: {
    id: 'adobe', name: 'Adobe Creative Cloud', category: 'Creative',
    icon: '🎨', color: '#FF0000', accent: '#FF0000',
    description: 'Photoshop, Premiere, Fonts',
    authType: 'oauth', scopes: ['openid', 'creative_sdk'],
  },
  // Game Publishers
  unreal: {
    id: 'unreal', name: 'Unreal / Epic Games', category: 'Game Dev',
    icon: '⚡', color: '#313131', accent: '#0078F2',
    description: 'UE5 projects, Fab marketplace, Epic Account',
    authType: 'oauth', scopes: ['basic', 'presence'],
  },
  sony: {
    id: 'sony', name: 'PlayStation Network', category: 'Game Dev',
    icon: '🎮', color: '#003087', accent: '#00BFFF',
    description: 'PSN achievements, trophies, game sessions',
    authType: 'oauth', scopes: ['psn:s2s'],
  },
  xbox: {
    id: 'xbox', name: 'Xbox / Microsoft', category: 'Game Dev',
    icon: '🟩', color: '#107C10', accent: '#52b043',
    description: 'Xbox Live, achievements, game pass',
    authType: 'oauth', scopes: ['xboxlive.signin'],
  },
  ubisoft: {
    id: 'ubisoft', name: 'Ubisoft Connect', category: 'Game Dev',
    icon: '🦅', color: '#007be6', accent: '#007be6',
    description: 'Game progress, challenges, units',
    authType: 'apikey', fields: ['clientId', 'clientSecret'],
  },
  // Data / Storage
  redis: {
    id: 'redis', name: 'Redis', category: 'Data',
    icon: '🔴', color: '#DC382C', accent: '#DC382C',
    description: 'Caching, sessions, pub/sub',
    authType: 'connection', fields: ['url'],
  },
  blob: {
    id: 'blob', name: 'Blob Storage', category: 'Data',
    icon: '🗄️', color: '#0089D6', accent: '#0089D6',
    description: 'Azure Blob / S3 / GCS file storage',
    authType: 'apikey', fields: ['connectionString'],
  },
};

const CATEGORIES = ['All', ...new Set(Object.values(CONNECTORS).map(c => c.category))];

// ─── API helpers ──────────────────────────────────────────────────────────────

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

// ─── Connection modal ─────────────────────────────────────────────────────────

function ConnectModal({ connector, onClose, onConnected }) {
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => v => setFields(f => ({ ...f, [k]: v }));

  async function handleConnect() {
    setLoading(true);
    setError('');
    try {
      if (connector.authType === 'oauth') {
        const data = await apiFetch(`/api/connectors/${connector.id}/oauth-url`);
        window.location.href = data.url;
      } else {
        await apiFetch(`/api/connectors/${connector.id}/connect`, {
          method: 'POST',
          body: JSON.stringify({ fields }),
        });
        onConnected(connector.id);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: '#1a1a2e',
    border: '1px solid #2d2d44', borderRadius: 8, color: '#e2e8f0',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#12121f', border: '1px solid #2d2d44', borderRadius: 16,
        padding: '28px', width: '100%', maxWidth: 440,
        boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{connector.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16 }}>{connector.name}</div>
              <div style={{ fontSize: 12, color: '#555' }}>{connector.description}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        {connector.authType === 'oauth' && (
          <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.08)', borderRadius: 8, fontSize: 13, color: '#888', marginBottom: 16 }}>
            🔒 You'll be redirected to {connector.name} to authorize securely. No passwords are shared with us.
          </div>
        )}

        {(connector.fields ?? []).map(field => (
          <div key={field}>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4, fontWeight: 600 }}>
              {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
            <input
              type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('key') ? 'password' : 'text'}
              value={fields[field] ?? ''} onChange={e => set(field)(e.target.value)}
              placeholder={`Enter ${field}`} style={inputStyle}
            />
          </div>
        ))}

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', background: '#1a1a2e', color: '#888',
            border: '1px solid #2d2d44', borderRadius: 8, cursor: 'pointer', fontSize: 14,
          }}>Cancel</button>
          <button onClick={handleConnect} disabled={loading} style={{
            flex: 2, padding: '10px',
            background: loading ? '#2d2d44' : `linear-gradient(135deg, ${connector.accent}, #7c3aed)`,
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
          }}>
            {loading ? 'Connecting…' : connector.authType === 'oauth' ? `Connect with ${connector.name}` : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Connector card ───────────────────────────────────────────────────────────

function ConnectorCard({ connector, connected, onConnect, onDisconnect, onTest }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      await apiFetch(`/api/connectors/${connector.id}/test`);
      setTestResult({ success: true });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{
      background: '#12121f', border: `1px solid ${connected ? connector.accent + '60' : '#2d2d44'}`,
      borderRadius: 14, padding: '18px', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: `${connector.accent}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            {connector.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{connector.name}</div>
            <div style={{ fontSize: 11, color: '#555' }}>{connector.category}</div>
          </div>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? '#10b981' : '#3d3d3d',
          boxShadow: connected ? '0 0 6px #10b981' : 'none',
        }} />
      </div>

      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{connector.description}</div>

      {testResult && (
        <div style={{
          padding: '6px 10px', borderRadius: 6, fontSize: 11,
          background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: testResult.success ? '#10b981' : '#ef4444',
        }}>
          {testResult.success ? '✓ Connection OK' : `✗ ${testResult.message}`}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        {connected ? (
          <>
            <button onClick={handleTest} disabled={testing} style={{
              flex: 1, padding: '7px', background: '#1a1a2e', color: '#888',
              border: '1px solid #2d2d44', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            }}>
              {testing ? '…' : '🔌 Test'}
            </button>
            <button onClick={() => onDisconnect(connector.id)} style={{
              flex: 1, padding: '7px', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              border: '1px solid #ef444430', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            }}>
              Disconnect
            </button>
          </>
        ) : (
          <button onClick={() => onConnect(connector)} style={{
            width: '100%', padding: '8px',
            background: `linear-gradient(135deg, ${connector.accent}CC, #7c3aed)`,
            color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}>
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConnectorHub() {
  const [connected, setConnected]       = useState({});
  const [activeCategory, setCategory]   = useState('All');
  const [connectingTo, setConnectingTo] = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    apiFetch('/api/connectors/status')
      .then(d => setConnected(d.connected ?? {}))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleDisconnect(id) {
    await apiFetch(`/api/connectors/${id}/disconnect`, { method: 'DELETE' });
    setConnected(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  const filtered = Object.values(CONNECTORS).filter(
    c => activeCategory === 'All' || c.category === activeCategory
  );

  const connectedCount = Object.keys(connected).length;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {connectingTo && (
        <ConnectModal
          connector={connectingTo}
          onClose={() => setConnectingTo(null)}
          onConnected={id => setConnected(prev => ({ ...prev, [id]: true }))}
        />
      )}

      <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Integrations & Connectors
      </h1>
      <p style={{ margin: '0 0 20px', color: '#555', fontSize: 13 }}>
        Connect your tools: {connectedCount} of {Object.keys(CONNECTORS).length} active
      </p>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: activeCategory === cat ? '#f59e0b' : '#2d2d44',
            color: activeCategory === cat ? '#000' : '#888',
            fontSize: 13, fontWeight: 600,
          }}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>Loading connectors…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(c => (
            <ConnectorCard
              key={c.id} connector={c} connected={!!connected[c.id]}
              onConnect={setConnectingTo}
              onDisconnect={handleDisconnect}
              onTest={id => console.log('Test', id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
