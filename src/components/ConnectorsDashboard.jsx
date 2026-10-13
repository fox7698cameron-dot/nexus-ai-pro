// src/components/ConnectorsDashboard.jsx
// External Connectors & Integrations Dashboard
// Updated: 2026-10-13

import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCw, Activity, Globe, AlertTriangle, ChevronDown } from 'lucide-react';
import { CONNECTORS, CONNECTOR_CATEGORIES, connectorManager } from '../services/ConnectorService.js';

function ConnectorCard({ connKey, connector, connected, health, onConnect, onDisconnect, onHealthCheck }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: connected ? `${connector.color}15` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${connected ? connector.color + '44' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 10, padding: 12, transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{connector.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{connector.name}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{connector.endpoints.join(' · ')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {connected && health && (
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 10,
              background: health.healthy ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: health.healthy ? '#34d399' : '#f87171',
              border: `1px solid ${health.healthy ? '#10b98133' : '#ef444433'}`
            }}>
              {health.healthy ? `${health.latency}ms` : 'Error'}
            </span>
          )}
          {connected ? (
            <button
              onClick={() => onDisconnect(connKey)}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef444444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#f87171', fontSize: 11 }}
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => onConnect(connKey)}
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f144', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#818cf8', fontSize: 11 }}
            >
              Connect
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 2 }}
          >
            <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Available Endpoints</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {connector.endpoints.map(ep => (
              <span key={ep} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#ccc' }}>
                {ep}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 8, marginBottom: 4 }}>Required Config (from environment)</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {connector.configFields.map(f => (
              <span key={f} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#fbbf24' }}>
                {f}
              </span>
            ))}
          </div>
          {connected && (
            <button
              onClick={() => onHealthCheck(connKey)}
              style={{ marginTop: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#aaa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <RefreshCw size={11} /> Check Health
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConnectorsDashboard() {
  const [connections, setConnections] = useState({});
  const [health, setHealth] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleConnect = (key) => {
    connectorManager.connect(key, {});
    setConnections(p => ({ ...p, [key]: true }));
  };

  const handleDisconnect = (key) => {
    connectorManager.disconnect(key);
    setConnections(p => { const n = { ...p }; delete n[key]; return n; });
    setHealth(p => { const n = { ...p }; delete n[key]; return n; });
  };

  const handleHealthCheck = async (key) => {
    const result = await connectorManager.checkHealth(key);
    setHealth(p => ({ ...p, [key]: result }));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      for (const key of Object.keys(connections)) {
        if (connections[key]) handleHealthCheck(key);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [connections]);

  const filtered = Object.entries(CONNECTORS).filter(([key, c]) => {
    const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
    const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = Object.values(connections).filter(Boolean).length;

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 14, padding: 16, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Connectors</h2>
          <p style={{ margin: '2px 0 0', color: '#888', fontSize: 12 }}>{connectedCount} active / {Object.keys(CONNECTORS).length} available</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connectedCount > 0 ? '#10b981' : '#6b7280' }} />
          <span style={{ fontSize: 12, color: connectedCount > 0 ? '#34d399' : '#9ca3af' }}>
            {connectedCount > 0 ? 'Integrations Active' : 'No Integrations'}
          </span>
        </div>
      </div>

      {/* Search */}
      <input
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search connectors..."
        style={{
          width: '100%', boxSizing: 'border-box', marginBottom: 12,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13
        }}
      />

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            background: activeCategory === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${activeCategory === 'all' ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 20, padding: '3px 12px', cursor: 'pointer',
            color: activeCategory === 'all' ? '#818cf8' : '#888', fontSize: 11
          }}
        >
          All
        </button>
        {Object.entries(CONNECTOR_CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            style={{
              background: activeCategory === key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeCategory === key ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 20, padding: '3px 12px', cursor: 'pointer',
              color: activeCategory === key ? '#818cf8' : '#888', fontSize: 11
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Security notice */}
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 10, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 11, color: '#d97706' }}>
          API keys, tokens, and secrets are never stored in the client. Configure them via environment variables on the server.
        </p>
      </div>

      {/* Connector Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {filtered.map(([key, connector]) => (
          <ConnectorCard
            key={key}
            connKey={key}
            connector={connector}
            connected={!!connections[key]}
            health={health[key] || null}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onHealthCheck={handleHealthCheck}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>
          No connectors match your search.
        </div>
      )}
    </div>
  );
}
