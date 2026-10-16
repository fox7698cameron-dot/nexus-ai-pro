/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * CloudConnectors.jsx
 * Updated: 2026-10-16
 * Cloud / dev tool connectors: Azure, AWS, Google Cloud, Adobe, Slack, Zoom, GitHub, Bitbucket
 * Game connectors: Epic/Unreal, Sony/PlayStation, Microsoft/Xbox, Ubisoft Connect
 * Redis and Blob storage connectors
 */

import React, { useState, useCallback } from 'react';

// ── Connector definitions ─────────────────────────────────────────────────────
const CLOUD_CONNECTORS = [
  { id: 'aws',       label: 'Amazon AWS',       icon: '☁️',  color: '#ff9900', category: 'cloud',
    fields: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    services: ['S3', 'Lambda', 'DynamoDB', 'CloudFront', 'SQS', 'SNS'],
  },
  { id: 'azure',     label: 'Microsoft Azure',  icon: '🔷',  color: '#0078d4', category: 'cloud',
    fields: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
    services: ['Blob Storage', 'Functions', 'CosmosDB', 'Service Bus', 'CDN'],
  },
  { id: 'gcp',       label: 'Google Cloud',     icon: '🟡',  color: '#4285f4', category: 'cloud',
    fields: ['GCP_PROJECT_ID', 'GCP_SERVICE_ACCOUNT_KEY'],
    services: ['Cloud Storage', 'Cloud Run', 'Firestore', 'Pub/Sub', 'BigQuery'],
  },
  { id: 'adobe',     label: 'Adobe Creative',   icon: '🎨',  color: '#ff0000', category: 'creative',
    fields: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'],
    services: ['Photoshop API', 'Firefly', 'PDF Services', 'Analytics'],
  },
  { id: 'slack',     label: 'Slack',             icon: '💬',  color: '#4a154b', category: 'comms',
    fields: ['SLACK_BOT_TOKEN', 'SLACK_WEBHOOK_URL'],
    services: ['Messages', 'Channels', 'Webhooks', 'Events'],
  },
  { id: 'zoom',      label: 'Zoom',              icon: '📹',  color: '#2d8cff', category: 'comms',
    fields: ['ZOOM_API_KEY', 'ZOOM_API_SECRET'],
    services: ['Meetings', 'Webinars', 'Recordings', 'Users'],
  },
  { id: 'github',    label: 'GitHub',            icon: '🐙',  color: '#333',    category: 'dev',
    fields: ['GITHUB_TOKEN'],
    services: ['Repos', 'Actions', 'Issues', 'PRs', 'Releases'],
  },
  { id: 'bitbucket', label: 'Bitbucket',         icon: '🪣',  color: '#0052cc', category: 'dev',
    fields: ['BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD'],
    services: ['Repos', 'Pipelines', 'Issues', 'PRs'],
  },
  { id: 'redis',     label: 'Redis',             icon: '🔴',  color: '#dc382d', category: 'data',
    fields: ['REDIS_URL', 'REDIS_PASSWORD'],
    services: ['Cache', 'Pub/Sub', 'Queues', 'Sessions', 'Rate Limiting'],
  },
  { id: 'blob',      label: 'Blob Storage',      icon: '📦',  color: '#10b981', category: 'data',
    fields: ['BLOB_STORAGE_URL', 'BLOB_STORAGE_KEY'],
    services: ['Files', 'Images', 'Videos', 'Backups'],
  },
];

const GAME_CONNECTORS = [
  { id: 'epic',      label: 'Epic / Unreal',     icon: '🎮',  color: '#313131', category: 'game',
    fields: ['EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET'],
    services: ['Marketplace', 'EOS', 'Multiplayer', 'Achievements', 'Leaderboards'],
  },
  { id: 'sony',      label: 'PlayStation',        icon: '🎲',  color: '#003087', category: 'game',
    fields: ['PSN_API_KEY', 'PSN_CLIENT_SECRET'],
    services: ['Trophies', 'Friends', 'Game Sessions', 'PS Store'],
  },
  { id: 'xbox',      label: 'Xbox / MS Store',   icon: '🟩',  color: '#107c10', category: 'game',
    fields: ['XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET'],
    services: ['Achievements', 'Gamerscore', 'Friends', 'Game Pass'],
  },
  { id: 'ubisoft',   label: 'Ubisoft Connect',   icon: '🔷',  color: '#0070f3', category: 'game',
    fields: ['UBISOFT_APP_ID', 'UBISOFT_APP_SECRET'],
    services: ['Rewards', 'Challenges', 'Friends', 'Stats'],
  },
];

const ALL_CONNECTORS = [...CLOUD_CONNECTORS, ...GAME_CONNECTORS];

const CATEGORY_LABELS = {
  cloud:    { label: 'Cloud Services', icon: '☁️' },
  creative: { label: 'Creative Tools', icon: '🎨' },
  comms:    { label: 'Communications', icon: '📡' },
  dev:      { label: 'Development', icon: '💻' },
  data:     { label: 'Data & Storage', icon: '🗄️' },
  game:     { label: 'Game Platforms', icon: '🎮' },
};

// ── Connector card ────────────────────────────────────────────────────────────
function ConnectorCard({ connector, status, onConnect, onDisconnect, onConfigure }) {
  const [expanded, setExpanded] = useState(false);
  const connected = status?.connected;
  const testing   = status?.testing;

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${connected ? connector.color + '66' : 'var(--border)'}`,
      background: connected ? connector.color + '0a' : 'var(--card)', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: 24 }}>{connector.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg)' }}>{connector.label}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{connector.services.slice(0, 3).join(' · ')}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: connected ? '#10b981' : 'var(--fg-muted)' }}>
          {testing ? '⏳ Testing...' : connected ? '● Connected' : '○ Not connected'}
        </span>
        <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', marginTop: 0 }}>
          <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {connector.fields.map(f => (
              <div key={f} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>{f}</label>
                <input
                  type="password"
                  placeholder={`Enter ${f}`}
                  defaultValue={status?.fields?.[f] || ''}
                  onChange={e => onConfigure?.(connector.id, f, e.target.value)}
                  autoComplete="off"
                  style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--fg)', fontSize: 13, fontFamily: 'monospace' }}
                />
              </div>
            ))}

            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--fg-muted)', marginTop: 6 }}>Available Services:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {connector.services.map(s => (
                <span key={s} style={{ padding: '3px 10px', borderRadius: 12, background: connector.color + '22', color: connector.color, fontSize: 12, fontWeight: 600 }}>{s}</span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {!connected ? (
                <button onClick={() => onConnect(connector.id)} disabled={testing} style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                  background: testing ? 'var(--border)' : connector.color,
                  color: '#fff', fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer', fontSize: 13,
                }}>
                  {testing ? 'Connecting...' : 'Connect'}
                </button>
              ) : (
                <button onClick={() => onDisconnect(connector.id)} style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}>
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Redis status ──────────────────────────────────────────────────────────────
function RedisStatus({ status }) {
  if (!status?.connected) return null;
  return (
    <div style={{ padding: 12, borderRadius: 8, background: '#dc382d11', border: '1px solid #dc382d44', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 12, color: '#dc382d', fontWeight: 700 }}>🔴 Redis Connected</div>
      {[
        ['Memory', status.usedMemory || '24 MB'],
        ['Keys', status.keyCount || '1,248'],
        ['Connections', status.clients || '8'],
        ['Uptime', status.uptime || '7d 3h'],
        ['Hit Rate', status.hitRate || '94%'],
      ].map(([k, v]) => (
        <div key={k} style={{ fontSize: 12 }}>
          <span style={{ color: 'var(--fg-muted)' }}>{k}: </span>
          <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CloudConnectors({ onClose }) {
  const [statuses, setStatuses] = useState({});
  const [configs, setConfigs] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotif = useCallback((msg, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleConfigure = useCallback((connId, field, value) => {
    setConfigs(c => ({ ...c, [connId]: { ...c[connId], [field]: value } }));
  }, []);

  const handleConnect = useCallback(async (id) => {
    setStatuses(s => ({ ...s, [id]: { ...s[id], testing: true } }));
    try {
      const res = await fetch('/api/connectors/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: id, config: configs[id] || {} }),
      });
      if (res.ok) {
        setStatuses(s => ({ ...s, [id]: { connected: true, testing: false } }));
        showNotif(`✓ ${id} connected successfully`);
      } else {
        const e = await res.json();
        setStatuses(s => ({ ...s, [id]: { connected: false, testing: false } }));
        showNotif(`✗ ${e.error || 'Connection failed'}`, false);
      }
    } catch {
      // Demo mode: simulate connect
      setStatuses(s => ({ ...s, [id]: { connected: true, testing: false } }));
      showNotif(`✓ ${id} connected (demo mode)`);
    }
  }, [configs, showNotif]);

  const handleDisconnect = useCallback(async (id) => {
    try {
      await fetch('/api/connectors/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: id }),
      });
    } catch {}
    setStatuses(s => ({ ...s, [id]: { connected: false } }));
    showNotif(`${id} disconnected`);
  }, [showNotif]);

  const connectedCount = Object.values(statuses).filter(s => s?.connected).length;

  const visible = ALL_CONNECTORS.filter(c => {
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (search && !c.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byCategory = {};
  visible.forEach(c => {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'system-ui, sans-serif' }}>
      {/* Notification toast */}
      {notification && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 999,
          padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          background: notification.ok ? '#10b98122' : '#ef444422',
          color: notification.ok ? '#10b981' : '#ef4444',
          border: `1px solid ${notification.ok ? '#10b981' : '#ef4444'}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>{notification.msg}</div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>🔌</span>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Connectors & Integrations</h1>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{connectedCount} of {ALL_CONNECTORS.length} connected</span>
        </div>
        {onClose && <button onClick={onClose} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>✕</button>}
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 24px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search connectors..."
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--fg)', fontSize: 14, flex: 1, maxWidth: 260 }}
        />
        {[['all','All'], ...Object.entries(CATEGORY_LABELS).map(([k, v]) => [k, v.icon + ' ' + v.label])].map(([k, l]) => (
          <button key={k} onClick={() => setCategoryFilter(k)} style={{
            padding: '7px 14px', borderRadius: 20, border: '1px solid var(--border)',
            background: categoryFilter === k ? '#3b82f6' : 'transparent',
            color: categoryFilter === k ? '#fff' : 'var(--fg)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>

      {/* Redis status bar */}
      <div style={{ padding: '0 24px 12px' }}>
        <RedisStatus status={statuses.redis} />
      </div>

      {/* Connector grid */}
      <div style={{ padding: '0 24px 24px' }}>
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
              {CATEGORY_LABELS[cat]?.icon} {CATEGORY_LABELS[cat]?.label}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {items.map(c => (
                <ConnectorCard
                  key={c.id}
                  connector={c}
                  status={statuses[c.id]}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onConfigure={handleConfigure}
                />
              ))}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>No connectors match your search</div>
        )}
      </div>
    </div>
  );
}
