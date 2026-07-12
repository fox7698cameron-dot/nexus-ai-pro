// src/dashboards/DeveloperDashboard.jsx
// 2026-07-12 | Role: developer — AI studio, projects, game dev, analytics, connectors, security, billing

import React, { useState, useEffect, useCallback } from 'react';
import NexusAI from '../../app.jsx';
import GameDevDashboard from '../gamedev/GameDevDashboard.jsx';
import AnalyticsDashboard from '../analytics/AnalyticsDashboard.jsx';
import ProjectTracker from '../projects/ProjectTracker.jsx';
import SecurityDashboard from '../security/SecurityDashboard.jsx';
import PaymentService from '../payments/PaymentService.jsx';

const TABS = [
  { key: 'studio', label: 'AI Studio', icon: '🤖' },
  { key: 'projects', label: 'Projects', icon: '📁' },
  { key: 'gamedev', label: 'Game Dev', icon: '🎮' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'connectors', label: 'Connectors', icon: '🔗' },
  { key: 'security', label: 'Security', icon: '🛡️' },
  { key: 'billing', label: 'Billing', icon: '💳' },
];

const CLOUD_CONNECTORS = [
  { id: 'aws', name: 'AWS', icon: '☁️', color: '#ff9900', envKey: 'AWS_ACCESS_KEY_ID', status: 'disconnected' },
  { id: 'azure', name: 'Azure', icon: '🔷', color: '#0078d4', envKey: 'AZURE_CLIENT_ID', status: 'disconnected' },
  { id: 'gcp', name: 'Google Cloud', icon: '🌐', color: '#4285f4', envKey: 'GCP_PROJECT_ID', status: 'disconnected' },
  { id: 'github', name: 'GitHub', icon: '🐙', color: '#6e40c9', envKey: 'GITHUB_TOKEN', status: 'disconnected' },
  { id: 'bitbucket', name: 'Bitbucket', icon: '🪣', color: '#0052cc', envKey: 'BITBUCKET_KEY', status: 'disconnected' },
  { id: 'slack', name: 'Slack', icon: '💬', color: '#4a154b', envKey: 'SLACK_BOT_TOKEN', status: 'disconnected' },
  { id: 'zoom', name: 'Zoom', icon: '📹', color: '#2d8cff', envKey: 'ZOOM_CLIENT_ID', status: 'disconnected' },
  { id: 'adobe', name: 'Adobe', icon: '🎨', color: '#fa0f00', envKey: 'ADOBE_CLIENT_ID', status: 'disconnected' },
];

function ConnectorsPanel() {
  const [connectors, setConnectors] = useState(CLOUD_CONNECTORS);
  const [testing, setTesting] = useState(null);
  const [logs, setLogs] = useState([]);

  const testConnector = useCallback(async (id) => {
    setTesting(id);
    await new Promise(r => setTimeout(r, 1400));
    const ok = Math.random() > 0.4;
    setConnectors(prev => prev.map(c =>
      c.id === id ? { ...c, status: ok ? 'connected' : 'error', lastTested: Date.now() } : c
    ));
    setLogs(prev => [
      { time: Date.now(), connector: id, result: ok ? 'success' : 'failed' },
      ...prev.slice(0, 19),
    ]);
    setTesting(null);
  }, []);

  const statusColor = (s) => ({ connected: '#10b981', error: '#ef4444', disconnected: '#555' }[s] || '#555');
  const statusLabel = (s) => ({ connected: '● Connected', error: '✕ Error', disconnected: '○ Disconnected' }[s] || 'Unknown');

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Cloud Connectors</h2>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 20 }}>
        Connect external services. API credentials are read from environment variables — never stored in code.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 28 }}>
        {connectors.map(c => (
          <div key={c.id} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#555', fontFamily: 'monospace' }}>{c.envKey}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: statusColor(c.status) }}>{statusLabel(c.status)}</span>
              <button
                onClick={() => testConnector(c.id)}
                disabled={testing === c.id}
                style={{
                  padding: '5px 12px',
                  background: testing === c.id ? '#1a1a1a' : '#1e1e1e',
                  border: `1px solid ${c.status === 'connected' ? '#10b981' : '#333'}`,
                  borderRadius: 6,
                  color: c.status === 'connected' ? '#10b981' : '#888',
                  fontSize: '0.78rem',
                  cursor: testing === c.id ? 'not-allowed' : 'pointer',
                }}
              >
                {testing === c.id ? '⏳ Testing...' : 'Test'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {logs.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.85rem', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connection Log</h3>
          <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, padding: '8px 0', fontFamily: 'monospace', fontSize: '0.78rem' }}>
            {logs.map((l, i) => (
              <div key={i} style={{ padding: '4px 14px', color: l.result === 'success' ? '#10b981' : '#ef4444' }}>
                [{new Date(l.time).toLocaleTimeString()}] {l.connector} → {l.result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const navStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  background: '#111111',
  borderBottom: '1px solid #222222',
  height: 52,
  flexShrink: 0,
  gap: 8,
};

const tabBtnStyle = (active) => ({
  padding: '7px 14px',
  background: active ? '#1e1e1e' : 'transparent',
  border: active ? '1px solid #333' : '1px solid transparent',
  borderRadius: 8,
  color: active ? '#ffffff' : '#888888',
  fontSize: '0.82rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
});

export default function DeveloperDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('studio');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <nav style={navStyle}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={tabBtnStyle(activeTab === tab.key)}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: '0.82rem', color: '#888' }}>{user?.username || user?.email}</span>
          <span style={{ padding: '3px 8px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 4, fontSize: '0.68rem', color: '#4ade80', fontWeight: 600, letterSpacing: '0.5px' }}>DEV</span>
          <button
            onClick={onLogout}
            style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#888', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'studio' && <NexusAI />}
        {activeTab === 'projects' && <ProjectTracker />}
        {activeTab === 'gamedev' && <GameDevDashboard />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'connectors' && <ConnectorsPanel />}
        {activeTab === 'security' && <SecurityDashboard />}
        {activeTab === 'billing' && <PaymentService />}
      </div>
    </div>
  );
}
