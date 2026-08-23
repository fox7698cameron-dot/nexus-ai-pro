/**
 * src/dashboards/ConnectorsDashboard.jsx
 * Visual management panel for all platform connectors.
 * Created: 2026-08-23
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CONNECTORS, groupConnectorsByCategory, pingAllConnectors } from '../connectors/index.js';

const CATEGORY_LABELS = { cloud: '☁️ Cloud', devtools: '🔧 Dev Tools', collab: '💬 Collaboration', creative: '🎨 Creative', storage: '📦 Storage', game: '🎮 Game Platforms' };

function ConnectorCard({ connector, status, onConnect, onSync, onDisconnect }) {
  const connected = status?.connected;
  return (
    <div style={{ background: '#1e293b', border: `1px solid ${connected ? '#22c55e44' : '#334155'}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{connector.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>{connector.name}</div>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{connector.category}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
          <span style={{ fontSize: 12, color: connected ? '#22c55e' : '#ef4444' }}>
            {connected ? `${status.latency}ms` : 'Offline'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {connected ? (
          <>
            <button onClick={() => onSync(connector.id)}
              style={{ flex: 1, background: '#3b82f622', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: 7, padding: '6px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              🔄 Sync
            </button>
            <button onClick={() => onDisconnect(connector.id)}
              style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
              ✕
            </button>
          </>
        ) : (
          <button onClick={() => onConnect(connector.id)}
            style={{ flex: 1, background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e', borderRadius: 7, padding: '6px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            🔗 Connect
          </button>
        )}
        <a href={connector.docs} target="_blank" rel="noreferrer"
          style={{ background: '#1e293b', color: '#64748b', border: '1px solid #334155', borderRadius: 7, padding: '6px 10px', textDecoration: 'none', fontSize: 12 }}>
          Docs ↗
        </a>
      </div>
    </div>
  );
}

export default function ConnectorsDashboard() {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState({});

  const groups = groupConnectorsByCategory();

  const pingAll = useCallback(async () => {
    setLoading(true);
    const results = await pingAllConnectors();
    const map = {};
    results.forEach((r) => { map[r.id] = r; });
    setStatuses(map);
    setLoading(false);
  }, []);

  useEffect(() => { pingAll(); }, [pingAll]);

  const handleConnect = (id) => {
    // Start OAuth flow via server — avoids exposing client_secret
    window.location.href = `/api/connectors/${id}/oauth/start?return=${encodeURIComponent(window.location.href)}`;
  };

  const handleSync = async (id) => {
    setSyncing((s) => ({ ...s, [id]: true }));
    try {
      await fetch(`/api/connectors/${id}/sync`, { method: 'POST', credentials: 'include' });
    } finally {
      setSyncing((s) => ({ ...s, [id]: false }));
    }
  };

  const handleDisconnect = async (id) => {
    if (!confirm(`Disconnect ${id}? This will revoke access.`)) return;
    await fetch(`/api/connectors/${id}/disconnect`, { method: 'DELETE', credentials: 'include' });
    setStatuses((s) => ({ ...s, [id]: { connected: false, latency: 0 } }));
  };

  const connectedCount = Object.values(statuses).filter((s) => s.connected).length;

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>🔗 Connectors</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            {connectedCount} of {CONNECTORS.length} connected
          </p>
        </div>
        <button onClick={pingAll} disabled={loading}
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
          {loading ? 'Checking…' : '🔄 Refresh Status'}
        </button>
      </div>

      {Object.entries(groups).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
            {CATEGORY_LABELS[category] || category}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 }}>
            {items.map((c) => (
              <ConnectorCard
                key={c.id}
                connector={c}
                status={statuses[c.id]}
                onConnect={handleConnect}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
