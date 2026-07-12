// src/dashboards/UserDashboard.jsx
// 2026-07-12 | Role: user — chat, analytics, projects, billing, security

import React, { useState } from 'react';
import NexusAI from '../../app.jsx';
import AnalyticsDashboard from '../analytics/AnalyticsDashboard.jsx';
import ProjectTracker from '../projects/ProjectTracker.jsx';
import PaymentService from '../payments/PaymentService.jsx';
import SecurityDashboard from '../security/SecurityDashboard.jsx';

const TABS = [
  { key: 'chat', label: 'AI Chat', icon: '💬' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'projects', label: 'Projects', icon: '📁' },
  { key: 'billing', label: 'Billing', icon: '💳' },
  { key: 'security', label: 'Security', icon: '🛡️' },
];

const NAV_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  background: '#111111',
  borderBottom: '1px solid #222222',
  height: 52,
  flexShrink: 0,
  overflowX: 'auto',
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

export default function UserDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <nav style={NAV_STYLE}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={tabBtnStyle(activeTab === tab.key)}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: '0.82rem', color: '#888' }}>{user?.username || user?.email}</span>
          <span style={{ padding: '3px 8px', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4, fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600, letterSpacing: '0.5px' }}>USER</span>
          <button
            onClick={onLogout}
            style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#888', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'chat' && <NexusAI />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'projects' && <ProjectTracker />}
        {activeTab === 'billing' && <PaymentService />}
        {activeTab === 'security' && <SecurityDashboard />}
      </div>
    </div>
  );
}
