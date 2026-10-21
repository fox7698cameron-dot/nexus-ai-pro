// src/components/AdminDashboard.jsx
// Role-based dashboards: Admin, Developer, Moderator, User
// Each role sees only their authorized panels
// Updated: 2026-10-21

import React, { useState, useCallback } from 'react';

export const ROLE_PERMISSIONS = {
  admin: {
    label: 'Admin',
    badge: '👑',
    color: '#ef4444',
    panels: ['overview', 'users', 'security', 'billing', 'analytics', 'system', 'logs', 'config'],
  },
  dev: {
    label: 'Developer',
    badge: '💻',
    color: '#f97316',
    panels: ['overview', 'analytics', 'gamedev', 'api_keys', 'logs', 'config'],
  },
  moderator: {
    label: 'Moderator',
    badge: '🛡️',
    color: '#8b5cf6',
    panels: ['overview', 'users', 'reports', 'analytics'],
  },
  user: {
    label: 'User',
    badge: '👤',
    color: '#10b981',
    panels: ['overview', 'subscription', 'analytics', 'gamedev'],
  },
};

function StatTile({ label, value, delta, icon, color }) {
  const positive = delta >= 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 11, color: positive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          {positive ? '▲' : '▼'} {Math.abs(delta)}%
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function AdminOverview({ role }) {
  const roleConf = ROLE_PERMISSIONS[role];
  const stats = [
    { label: 'Total Users', value: '12,847', delta: 8.2, icon: '👥', color: '#6366f1' },
    { label: 'Active Sessions', value: '1,204', delta: 3.1, icon: '🟢', color: '#10b981' },
    { label: 'Revenue MRR', value: '$48,320', delta: 12.4, icon: '💰', color: '#f59e0b' },
    { label: 'Threats Blocked', value: '2,891', delta: -15.2, icon: '🛡️', color: '#ef4444' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{roleConf.badge}</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#fff' }}>{roleConf.label} Dashboard</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#666' }}>Welcome back · {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {stats.map(s => <StatTile key={s.label} {...s} />)}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#aaa' }}>Recent Activity</h4>
        {[
          { msg: 'New user registered: user_⚡neo', time: '2m ago', type: 'info' },
          { msg: 'SQL injection attempt blocked from 45.33.32.156', time: '8m ago', type: 'threat' },
          { msg: 'Subscription upgraded: Cameron Fox → Enterprise', time: '15m ago', type: 'success' },
          { msg: 'New game project created: Project Nexus', time: '1h ago', type: 'info' },
          { msg: 'Failed login attempt (5x) - IP throttled', time: '2h ago', type: 'warning' },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
            <span style={{ color: { info: '#6366f1', threat: '#ef4444', success: '#10b981', warning: '#f59e0b' }[a.type] }}>
              {{ info: 'ℹ', threat: '⚠', success: '✓', warning: '⚠' }[a.type]}
            </span>
            <span style={{ flex: 1, color: '#aaa' }}>{a.msg}</span>
            <span style={{ color: '#555' }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserManagement() {
  const users = [
    { id: 1, name: '🎮 Cameron Fox', email: 'cameron@nexus.pro', role: 'admin', status: 'active', plan: 'enterprise', joined: '2025-06-01' },
    { id: 2, name: '⚡ neo_gamer', email: 'neo@user.io', role: 'user', status: 'active', plan: 'pro', joined: '2026-01-15' },
    { id: 3, name: '🛡️ mod_sarah', email: 'sarah@nexus.pro', role: 'moderator', status: 'active', plan: 'enterprise', joined: '2025-09-10' },
    { id: 4, name: '💻 dev_alex', email: 'alex@devteam.io', role: 'dev', status: 'inactive', plan: 'pro', joined: '2026-03-22' },
  ];
  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#fff' }}>User Management</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['User', 'Email', 'Role', 'Plan', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#555', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const role = ROLE_PERMISSIONS[u.role];
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '10px 12px', color: '#888' }}>{u.email}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 7px', background: `${role.color}20`, color: role.color, borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                      {role.badge} {role.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#aaa', textTransform: 'capitalize' }}>{u.plan}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 7px', background: u.status === 'active' ? '#10b98120' : '#ef444420', color: u.status === 'active' ? '#10b981' : '#ef4444', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ padding: '3px 8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 4, color: '#a5b4fc', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                      <button style={{ padding: '3px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, color: '#fca5a5', fontSize: 11, cursor: 'pointer' }}>Suspend</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SystemConfig() {
  const [config, setConfig] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    requireMFA: true,
    auditLogging: true,
    apiRateLimit: 100,
    maxUploadMB: 100,
  });
  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#fff' }}>System Configuration</h3>
      {[
        { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Disable all user access temporarily' },
        { key: 'allowRegistrations', label: 'Allow New Registrations', desc: 'Enable public sign-up' },
        { key: 'requireMFA', label: 'Require MFA', desc: 'Force all users to set up 2FA' },
        { key: 'auditLogging', label: 'Audit Logging', desc: 'Log all user and system actions' },
      ].map(setting => (
        <div key={setting.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{setting.label}</div>
            <div style={{ fontSize: 11, color: '#666' }}>{setting.desc}</div>
          </div>
          <button
            onClick={() => setConfig(c => ({ ...c, [setting.key]: !c[setting.key] }))}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: config[setting.key] ? '#6366f1' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: config[setting.key] ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
        </div>
      ))}
    </div>
  );
}

const PANEL_COMPONENTS = {
  overview: AdminOverview,
  users: () => <UserManagement />,
  security: () => <div style={{ color: '#aaa', fontSize: 13 }}>Security dashboard loaded via SecurityDashboardV2</div>,
  billing: () => <div style={{ color: '#aaa', fontSize: 13 }}>Billing / subscription management panel</div>,
  analytics: () => <div style={{ color: '#aaa', fontSize: 13 }}>Analytics dashboard loaded via AnalyticsDashboard</div>,
  gamedev: () => <div style={{ color: '#aaa', fontSize: 13 }}>Game dev dashboard loaded via GameDevDashboard</div>,
  api_keys: () => <div style={{ color: '#aaa', fontSize: 13 }}>API key management for connected services</div>,
  reports: () => <div style={{ color: '#aaa', fontSize: 13 }}>Content moderation and user reports</div>,
  logs: () => <div style={{ color: '#aaa', fontSize: 13 }}>Audit log viewer (minimal, date-labeled)</div>,
  config: () => <SystemConfig />,
  system: () => <SystemConfig />,
  subscription: () => <div style={{ color: '#aaa', fontSize: 13 }}>Your subscription and billing details</div>,
};

const PANEL_ICONS = {
  overview: '🏠', users: '👥', security: '🔒', billing: '💳',
  analytics: '📊', gamedev: '🎮', api_keys: '🔑', reports: '📋',
  logs: '📝', config: '⚙️', system: '🖥️', subscription: '💰',
};

export default function AdminDashboard({ role = 'user' }) {
  const roleConf = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
  const [activePanel, setActivePanel] = useState('overview');

  const PanelComponent = PANEL_COMPONENTS[activePanel] || (() => <div style={{ color: '#666' }}>Panel not found</div>);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d0d1a', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: 'rgba(0,0,0,0.4)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 12px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, paddingLeft: 8 }}>
          <span style={{ fontSize: 20 }}>{roleConf.badge}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{roleConf.label}</div>
            <div style={{ fontSize: 10, color: '#555' }}>Dashboard</div>
          </div>
        </div>
        {roleConf.panels.map(panel => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            style={{
              width: '100%', padding: '9px 12px', marginBottom: 3,
              background: activePanel === panel ? 'rgba(99,102,241,0.15)' : 'transparent',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              color: activePanel === panel ? '#a5b4fc' : '#666',
              fontSize: 13, fontWeight: activePanel === panel ? 600 : 400,
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
          >
            <span>{PANEL_ICONS[panel] || '📌'}</span>
            <span style={{ textTransform: 'capitalize' }}>{panel.replace('_', ' ')}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '8px', background: `${roleConf.color}15`, borderRadius: 8, border: `1px solid ${roleConf.color}30` }}>
          <div style={{ fontSize: 10, color: roleConf.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            {roleConf.badge} {roleConf.label} Access
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
            {roleConf.panels.length} panels available
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <PanelComponent role={role} />
      </div>
    </div>
  );
}
