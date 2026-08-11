/**
 * src/dashboards/RoleDashboards.jsx
 * Nexus AI Pro — Role-Based Dashboards
 * Admin, Developer, Moderator, User — each separate with role-specific features.
 * Date: 2026-08-11
 */

import React, { useState, useEffect } from 'react';
import { ROLES } from '../auth/AuthModule.jsx';

// ─── Shared Role Header ───────────────────────────────────────────────────────
function RoleHeader({ role, user, onLogout }) {
  const roleColors = {
    [ROLES.ADMIN]:     '#ef4444',
    [ROLES.DEV]:       '#3b82f6',
    [ROLES.MODERATOR]: '#f59e0b',
    [ROLES.USER]:      '#22c55e',
  };
  const roleLabels = {
    [ROLES.ADMIN]: '🔴 Admin', [ROLES.DEV]: '🔵 Developer',
    [ROLES.MODERATOR]: '🟡 Moderator', [ROLES.USER]: '🟢 User',
  };
  return (
    <div className="role-header" style={{ borderBottom: `3px solid ${roleColors[role]}` }}>
      <div className="rh-left">
        <span className="role-badge" style={{ background: roleColors[role] }}>{roleLabels[role]}</span>
        <span className="rh-name">{user?.displayName ?? user?.username ?? 'User'}</span>
      </div>
      <div className="rh-right">
        <span className="rh-email">{user?.email}</span>
        <button className="btn-secondary" onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export function AdminDashboard({ user, onLogout }) {
  const [users, setUsers]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/admin/users', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/stats', { credentials: 'include' }).then(r => r.json()),
    ]).then(([u, s]) => {
      if (u.status === 'fulfilled') setUsers(u.value.users ?? demoUsers);
      if (s.status === 'fulfilled') setStats(s.value);
    }).finally(() => setLoading(false));
  }, []);

  const adminTabs = [
    { id: 'overview', label: '📊 Overview'  },
    { id: 'users',    label: '👥 Users'     },
    { id: 'system',   label: '⚙️ System'   },
    { id: 'audit',    label: '📋 Audit Log' },
    { id: 'config',   label: '🔧 Config'   },
  ];

  const displayStats = stats ?? {
    totalUsers: 1247, activeToday: 89, newThisWeek: 34,
    totalProjects: 512, totalRequests: 98423, errorRate: 0.02,
    avgResponseMs: 143, uptimePercent: 99.97,
  };

  return (
    <div className="admin-dashboard role-dashboard">
      <RoleHeader role={ROLES.ADMIN} user={user} onLogout={onLogout} />
      <div className="role-tabs">
        {adminTabs.map(t => (
          <button key={t.id} className={`role-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="admin-overview">
          <h2>System Overview</h2>
          <div className="stats-grid">
            <AdminStat icon="👥" label="Total Users"     value={displayStats.totalUsers.toLocaleString()} />
            <AdminStat icon="🟢" label="Active Today"    value={displayStats.activeToday} />
            <AdminStat icon="📈" label="New This Week"   value={displayStats.newThisWeek} />
            <AdminStat icon="📂" label="Total Projects"  value={displayStats.totalProjects.toLocaleString()} />
            <AdminStat icon="⚡" label="API Calls"       value={displayStats.totalRequests.toLocaleString()} />
            <AdminStat icon="❌" label="Error Rate"      value={`${(displayStats.errorRate * 100).toFixed(2)}%`} />
            <AdminStat icon="⏱️" label="Avg Response"   value={`${displayStats.avgResponseMs}ms`} />
            <AdminStat icon="✅" label="Uptime"          value={`${displayStats.uptimePercent}%`} />
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-users">
          <div className="users-toolbar">
            <h2>User Management ({users.length})</h2>
            <button className="btn-primary" onClick={() => alert('Open invite modal')}>+ Invite User</button>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><span className="user-avatar">{u.avatar ?? u.displayName?.[0] ?? '?'}</span> {u.displayName}</td>
                    <td>{u.email}</td>
                    <td><RolePill role={u.role} /></td>
                    <td><span className={`status-badge ${u.status ?? 'active'}`}>{u.status ?? 'active'}</span></td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <button className="btn-icon" title="Edit">✏️</button>
                      <button className="btn-icon" title="Suspend">🚫</button>
                      <button className="btn-icon danger" title="Delete">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="admin-system">
          <h2>System Configuration</h2>
          <div className="system-cards">
            <SystemCard title="🔒 Security" items={[
              'AES-256-GCM encryption: Active', 'Auto key rotation: 24h', 'Rate limiting: 100 req/15min',
              'Threat detection: Active', 'Audit logging: Active',
            ]} />
            <SystemCard title="🌐 Connectors" items={[
              'GitHub: Connected', 'AWS: Connected', 'Slack: Connected',
              'Epic Games: Pending', 'Stripe: Connected',
            ]} />
            <SystemCard title="📦 Storage" items={[
              'Redis cache: Active', 'Blob storage: Active', 'In-memory store: Active',
            ]} />
            <SystemCard title="🌍 i18n" items={[
              '27 supported locales', 'Auto-translate: Enabled', 'RTL support: Active',
            ]} />
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="admin-config">
          <h2>Platform Configuration</h2>
          <div className="config-form">
            <ConfigRow label="Max upload size"        value="50 MB"  type="text" />
            <ConfigRow label="Session timeout"        value="24h"    type="text" />
            <ConfigRow label="Rate limit window"      value="15 min" type="text" />
            <ConfigRow label="Rate limit max"         value="100"    type="number" />
            <ConfigRow label="Min password length"    value="13"     type="number" />
            <ConfigRow label="MFA required for admins" value={true}  type="bool" />
            <ConfigRow label="Biometric login"        value={true}   type="bool" />
            <ConfigRow label="Key rotation interval"  value="24h"    type="text" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Developer Dashboard ──────────────────────────────────────────────────────
export function DevDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('overview');
  const devTabs = [
    { id: 'overview',    label: '📊 Overview'   },
    { id: 'api',         label: '🔌 API Docs'   },
    { id: 'connectors',  label: '🔗 Connectors' },
    { id: 'builds',      label: '🔨 Builds'     },
    { id: 'logs',        label: '📋 Logs'       },
    { id: 'settings',    label: '⚙️ Settings'  },
  ];

  return (
    <div className="dev-dashboard role-dashboard">
      <RoleHeader role={ROLES.DEV} user={user} onLogout={onLogout} />
      <div className="role-tabs">
        {devTabs.map(t => (
          <button key={t.id} className={`role-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="dev-overview">
          <h2>Developer Overview</h2>
          <div className="stats-grid">
            <AdminStat icon="🔑" label="API Keys"        value="3 active" />
            <AdminStat icon="📡" label="Webhooks"        value="7 registered" />
            <AdminStat icon="⚡" label="API Calls (24h)" value="12,847" />
            <AdminStat icon="❌" label="Errors (24h)"    value="23" />
          </div>
          <div className="dev-quick-links">
            <h3>Quick Access</h3>
            <div className="quick-links-grid">
              {[
                { icon: '📖', label: 'API Reference', href: '/docs/api' },
                { icon: '🔌', label: 'Webhooks',      href: '/settings/webhooks' },
                { icon: '🔑', label: 'API Keys',      href: '/settings/api-keys' },
                { icon: '📊', label: 'Analytics',     href: '/analytics' },
                { icon: '🛡️', label: 'Security',     href: '/security' },
                { icon: '🔗', label: 'Connectors',    href: '/connectors' },
              ].map((link, i) => (
                <a key={i} className="quick-link" href={link.href}>
                  <span>{link.icon}</span> {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'api' && (
        <div className="dev-api-docs">
          <h2>API Documentation</h2>
          <p>Base URL: <code>{window.location.origin}/api</code></p>
          <APIEndpointList />
        </div>
      )}

      {tab === 'connectors' && (
        <div className="dev-connectors">
          <h2>Connector Configuration</h2>
          <ConnectorStatus />
        </div>
      )}
    </div>
  );
}

// ─── Moderator Dashboard ──────────────────────────────────────────────────────
export function ModeratorDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('queue');
  const modTabs = [
    { id: 'queue',    label: '📋 Queue'     },
    { id: 'reports',  label: '⚠️ Reports'  },
    { id: 'users',    label: '👥 Users'    },
    { id: 'content',  label: '📝 Content'  },
    { id: 'activity', label: '📊 Activity' },
  ];

  return (
    <div className="mod-dashboard role-dashboard">
      <RoleHeader role={ROLES.MODERATOR} user={user} onLogout={onLogout} />
      <div className="role-tabs">
        {modTabs.map(t => (
          <button key={t.id} className={`role-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'queue' && (
        <div className="mod-queue">
          <h2>Moderation Queue</h2>
          <div className="stats-grid">
            <AdminStat icon="⏳" label="Pending Review" value="12" />
            <AdminStat icon="✅" label="Resolved Today" value="47" />
            <AdminStat icon="🚨" label="High Priority"  value="3"  />
          </div>
          <div className="queue-list">
            {demoQueueItems.map((item, i) => (
              <div key={i} className="queue-item">
                <span className={`severity-dot ${item.priority}`} />
                <div className="qi-content">
                  <span className="qi-type">{item.type}</span>
                  <span className="qi-desc">{item.description}</span>
                  <span className="qi-meta">{item.reporter} · {new Date(item.at).toLocaleTimeString()}</span>
                </div>
                <div className="qi-actions">
                  <button className="btn-primary-sm">Review</button>
                  <button className="btn-secondary-sm">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Dashboard ───────────────────────────────────────────────────────────
export function UserDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('home');
  const userTabs = [
    { id: 'home',       label: '🏠 Home'         },
    { id: 'projects',   label: '📂 My Projects'  },
    { id: 'analytics',  label: '📊 Analytics'    },
    { id: 'billing',    label: '💳 Billing'      },
    { id: 'profile',    label: '👤 Profile'      },
    { id: 'settings',   label: '⚙️ Settings'    },
  ];

  return (
    <div className="user-dashboard role-dashboard">
      <RoleHeader role={ROLES.USER} user={user} onLogout={onLogout} />
      <div className="role-tabs">
        {userTabs.map(t => (
          <button key={t.id} className={`role-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'home' && (
        <div className="user-home">
          <h2>Welcome back, {user?.displayName ?? user?.username ?? 'there'}! 👋</h2>
          <div className="user-quick-stats">
            <AdminStat icon="📂" label="Active Projects" value="4" />
            <AdminStat icon="✅" label="Tasks Due"       value="7" />
            <AdminStat icon="💬" label="AI Chats"        value="23 today" />
            <AdminStat icon="⭐" label="Plan"            value={user?.subscription ?? 'Free'} />
          </div>
          <div className="recent-activity">
            <h3>Recent Activity</h3>
            {demoActivity.map((a, i) => (
              <div key={i} className="activity-item">
                <span className="activity-icon">{a.icon}</span>
                <span className="activity-desc">{a.description}</span>
                <span className="activity-time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="user-profile">
          <h2>Profile Settings</h2>
          <div className="profile-form">
            <label>Display Name<input className="field-input" defaultValue={user?.displayName} /></label>
            <label>Username<input className="field-input" defaultValue={user?.username} /></label>
            <label>Email<input className="field-input" type="email" defaultValue={user?.email} /></label>
            <label>Bio<textarea className="field-textarea" placeholder="Tell us about yourself…" /></label>
            <label>Language
              <select className="field-select" defaultValue={user?.locale ?? 'en-US'}>
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="es-ES">🇪🇸 Español</option>
                <option value="fr-FR">🇫🇷 Français</option>
                <option value="de-DE">🇩🇪 Deutsch</option>
                <option value="zh-CN">🇨🇳 中文</option>
                <option value="ja-JP">🇯🇵 日本語</option>
                <option value="ar-SA">🇸🇦 العربية</option>
              </select>
            </label>
            <button className="btn-primary">Save Changes</button>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="user-settings">
          <h2>Account Security</h2>
          <div className="security-settings">
            <SettingRow icon="🔒" label="Change Password" action="Change" />
            <SettingRow icon="📱" label="Two-Factor Authentication" badge="Recommended" action="Setup" />
            <SettingRow icon="🫆" label="Biometric Login"           action="Configure" />
            <SettingRow icon="🔑" label="Active Sessions"           action="View" />
            <SettingRow icon="📋" label="Login History"             action="View" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Role Router ──────────────────────────────────────────────────────────────
export function RoleRouter({ user, onLogout }) {
  if (!user) return <div className="role-loading">Loading…</div>;
  switch (user.role) {
    case ROLES.ADMIN:     return <AdminDashboard     user={user} onLogout={onLogout} />;
    case ROLES.DEV:       return <DevDashboard       user={user} onLogout={onLogout} />;
    case ROLES.MODERATOR: return <ModeratorDashboard user={user} onLogout={onLogout} />;
    default:              return <UserDashboard      user={user} onLogout={onLogout} />;
  }
}

// ─── Shared Sub-components ────────────────────────────────────────────────────
function AdminStat({ icon, label, value }) {
  return (
    <div className="admin-stat">
      <span className="as-icon">{icon}</span>
      <span className="as-value">{value}</span>
      <span className="as-label">{label}</span>
    </div>
  );
}

function RolePill({ role }) {
  const colors = {
    admin: '#ef4444', dev: '#3b82f6', moderator: '#f59e0b', user: '#22c55e',
  };
  return (
    <span className="role-pill" style={{ background: colors[role] ?? '#6b7280' }}>{role}</span>
  );
}

function SystemCard({ title, items }) {
  return (
    <div className="system-card">
      <h3>{title}</h3>
      <ul>{items.map((item, i) => <li key={i}>✓ {item}</li>)}</ul>
    </div>
  );
}

function ConfigRow({ label, value, type }) {
  return (
    <div className="config-row">
      <label className="config-label">{label}</label>
      {type === 'bool' ? (
        <input type="checkbox" defaultChecked={value} className="config-checkbox" />
      ) : (
        <input type={type === 'number' ? 'number' : 'text'} defaultValue={value} className="field-input config-input" />
      )}
    </div>
  );
}

function SettingRow({ icon, label, badge, action }) {
  return (
    <div className="setting-row">
      <span className="sr-icon">{icon}</span>
      <span className="sr-label">{label}</span>
      {badge && <span className="sr-badge">{badge}</span>}
      <button className="btn-secondary sr-action">{action}</button>
    </div>
  );
}

function APIEndpointList() {
  const endpoints = [
    { method: 'GET',  path: '/api/health',           desc: 'Health check' },
    { method: 'POST', path: '/api/chat',              desc: 'AI chat completion' },
    { method: 'POST', path: '/api/auth/register',     desc: 'Register user' },
    { method: 'POST', path: '/api/auth/login',        desc: 'Sign in' },
    { method: 'GET',  path: '/api/analytics/overview',desc: 'Analytics overview' },
    { method: 'POST', path: '/api/payments/create-intent', desc: 'Create payment intent' },
    { method: 'GET',  path: '/api/projects',          desc: 'List projects' },
    { method: 'GET',  path: '/api/security/status',   desc: 'Security status' },
  ];
  const methodColors = { GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b', DELETE: '#ef4444', PATCH: '#8b5cf6' };
  return (
    <div className="api-endpoint-list">
      {endpoints.map((ep, i) => (
        <div key={i} className="api-endpoint">
          <span className="ep-method" style={{ color: methodColors[ep.method] }}>{ep.method}</span>
          <code className="ep-path">{ep.path}</code>
          <span className="ep-desc">{ep.desc}</span>
        </div>
      ))}
    </div>
  );
}

function ConnectorStatus() {
  const connectors = [
    { name: 'GitHub',     icon: '🐙', connected: true  },
    { name: 'AWS',        icon: '☁️', connected: true  },
    { name: 'Slack',      icon: '💬', connected: true  },
    { name: 'Azure',      icon: '🔷', connected: false },
    { name: 'Google Cloud', icon: '🌐', connected: false },
    { name: 'Zoom',       icon: '📹', connected: true  },
    { name: 'Epic Games', icon: '🎮', connected: false },
    { name: 'Stripe',     icon: '💳', connected: true  },
  ];
  return (
    <div className="connector-status-grid">
      {connectors.map((c, i) => (
        <div key={i} className={`connector-card ${c.connected ? 'connected' : 'disconnected'}`}>
          <span className="conn-icon">{c.icon}</span>
          <span className="conn-name">{c.name}</span>
          <span className={`conn-status ${c.connected ? 'ok' : 'off'}`}>
            {c.connected ? '✅ Connected' : '⚡ Connect'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const demoUsers = [
  { id: '1', displayName: 'Cameron Fox', email: 'fox7698cameron@gmail.com', role: 'admin', status: 'active', createdAt: Date.now() - 86400000 * 30 },
  { id: '2', displayName: 'Alex Dev',   email: 'alex@example.com',          role: 'dev',   status: 'active', createdAt: Date.now() - 86400000 * 15 },
  { id: '3', displayName: 'Sam Mod',    email: 'sam@example.com',           role: 'moderator', status: 'active', createdAt: Date.now() - 86400000 * 7 },
  { id: '4', displayName: 'Jordan User',email: 'jordan@example.com',        role: 'user',  status: 'active', createdAt: Date.now() - 86400000 * 3 },
];

const demoQueueItems = [
  { type: 'Content Report',  description: 'Reported post #4821',      priority: 'high',   reporter: 'user#882', at: Date.now() - 300000  },
  { type: 'Account Flag',    description: 'Suspicious login activity', priority: 'critical',reporter: 'system',  at: Date.now() - 900000  },
  { type: 'Spam Report',     description: 'Bulk message from user#44', priority: 'medium', reporter: 'user#317', at: Date.now() - 1800000 },
];

const demoActivity = [
  { icon: '💬', description: 'Chatted with Claude 4 Opus',       time: '2 min ago'  },
  { icon: '📂', description: 'Updated project "Nexus Mobile App"', time: '1 hour ago' },
  { icon: '✅', description: 'Completed task: "Auth module"',      time: '3 hours ago'},
  { icon: '📈', description: 'Viewed analytics report',            time: 'Yesterday'  },
];
