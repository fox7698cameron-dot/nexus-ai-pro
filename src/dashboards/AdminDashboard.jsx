/**
 * @file AdminDashboard.jsx
 * @description Role-Separated Dashboard System
 *   Admin | Developer | Moderator | User — each role sees a dedicated view.
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 */

import React, { useState, useEffect } from 'react';
import { useAuth, RoleBadge, ROLES } from '../auth/AuthSystem.jsx';

// ─── Stat Tile ─────────────────────────────────────────────────────────────────

function StatTile({ icon, label, value, color = '#6366f1', delta }) {
  const pos = delta === undefined ? null : delta >= 0;
  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      {pos !== null && (
        <div style={{ fontSize: 11, color: pos ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          {pos ? '▲' : '▼'} {Math.abs(delta)}% vs last week
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboardView() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'users', label: '👥 Users' },
    { id: 'system', label: '⚙️ System' },
    { id: 'audit', label: '📋 Audit Log' }
  ];

  const demoUsers = [
    { id: 'u1', username: 'cameron_fox', email: 'cameron@nexusai.pro', role: 'admin', status: 'active', joined: '2025-01-01' },
    { id: 'u2', username: 'alex_dev 🚀', email: 'alex@nexusai.pro', role: 'developer', status: 'active', joined: '2025-03-15' },
    { id: 'u3', username: 'mod_jordan', email: 'jordan@nexusai.pro', role: 'moderator', status: 'active', joined: '2025-05-20' },
    { id: 'u4', username: 'user_123', email: 'user@example.com', role: 'user', status: 'active', joined: '2026-01-10' }
  ];

  const auditLog = [
    { ts: new Date(Date.now() - 120000).toISOString(), action: 'LOGIN_SUCCESS', user: 'cameron_fox', ip: '::1' },
    { ts: new Date(Date.now() - 300000).toISOString(), action: 'USER_REGISTER', user: 'user_123', ip: '10.0.0.5' },
    { ts: new Date(Date.now() - 600000).toISOString(), action: 'KEY_ROTATION', user: 'system', ip: 'localhost' },
    { ts: new Date(Date.now() - 900000).toISOString(), action: 'PAYMENT_SUCCESS', user: 'alex_dev', ip: '10.0.0.8' }
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🛡️ Admin Panel</h2>
        <RoleBadge role={ROLES.ADMIN} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            background: activeTab === t.id ? '#0f172a' : 'transparent',
            color: activeTab === t.id ? '#818cf8' : '#64748b', fontWeight: activeTab === t.id ? 700 : 400, fontSize: 13,
            borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <StatTile icon="👥" label="Total Users" value="1,247" color="#6366f1" delta={12} />
          <StatTile icon="💰" label="MRR" value="$18,940" color="#10b981" delta={8} />
          <StatTile icon="🔐" label="Security Score" value="92/100" color="#10b981" />
          <StatTile icon="⚡" label="API Requests / hr" value="45,230" color="#f59e0b" delta={-3} />
          <StatTile icon="💬" label="AI Chats Today" value="3,891" color="#8b5cf6" delta={22} />
          <StatTile icon="📦" label="Active Plans" value="Pro: 892 | Dev: 203 | Ent: 37" color="#64748b" />
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {['Username', 'Email', 'Role', 'Status', 'Joined'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demoUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '10px 12px', color: '#f1f5f9' }}>{u.username}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{u.email}</td>
                  <td style={{ padding: '10px 12px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: '#10b981', fontSize: 11 }}>● {u.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{u.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Node.js Version', value: '>=20.0.0', ok: true },
            { label: 'Database', value: 'PostgreSQL 16', ok: true },
            { label: 'Redis', value: 'Connected', ok: true },
            { label: 'JWT Algorithm', value: 'HS512', ok: true },
            { label: 'Encryption', value: 'AES-256-GCM', ok: true },
            { label: 'TLS', value: '1.3', ok: true },
            { label: 'Rate Limiting', value: 'Enabled', ok: true },
            { label: 'CORS', value: 'Configured', ok: true }
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0f172a', borderRadius: 10 }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>{item.label}</span>
              <span style={{ color: item.ok ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
                {item.ok ? '✓ ' : '✗ '}{item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div style={{ fontFamily: 'monospace', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {auditLog.map((entry, i) => (
            <div key={i} style={{ padding: '8px 12px', background: '#0f172a', borderRadius: 8, color: '#94a3b8' }}>
              <span style={{ color: '#475569' }}>{new Date(entry.ts).toLocaleString()} </span>
              <span style={{ color: '#818cf8', fontWeight: 700 }}>[{entry.action}]</span>
              {' '}{entry.user} @ {entry.ip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Developer Dashboard ──────────────────────────────────────────────────────

function DeveloperDashboardView() {
  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⚙️ Developer Dashboard</h2>
        <RoleBadge role={ROLES.DEVELOPER} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatTile icon="🔑" label="API Keys" value="3 active" color="#8b5cf6" />
        <StatTile icon="📡" label="API Calls / mo" value="482,300" color="#6366f1" delta={15} />
        <StatTile icon="⚡" label="Avg Latency" value="42ms" color="#10b981" />
        <StatTile icon="🔗" label="Webhooks" value="7 configured" color="#f59e0b" />
      </div>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>🔑 API Keys</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['nexus_live_...••••••', 'nexus_test_...••••••', 'nexus_wh_...••••••'].map((k, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#050e1d', borderRadius: 8 }}>
              <code style={{ color: '#818cf8', fontSize: 13 }}>{k}</code>
              <span style={{ fontSize: 11, color: '#64748b' }}>Created 2026-06-0{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Moderator Dashboard ──────────────────────────────────────────────────────

function ModeratorDashboardView() {
  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔧 Moderator Dashboard</h2>
        <RoleBadge role={ROLES.MODERATOR} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatTile icon="🚩" label="Reports Queue" value="12" color="#ef4444" />
        <StatTile icon="✅" label="Resolved Today" value="34" color="#10b981" />
        <StatTile icon="🚫" label="Accounts Suspended" value="3" color="#f97316" />
        <StatTile icon="💬" label="Active Chats" value="891" color="#6366f1" />
      </div>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>🚩 Pending Reports</h3>
        {[
          { id: 1, user: 'spammer_99', reason: 'Spam / promotional content', time: '5m ago' },
          { id: 2, user: 'troll_456', reason: 'Harassment', time: '22m ago' },
          { id: 3, user: 'bot_789', reason: 'Automated behavior', time: '1h ago' }
        ].map(r => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#050e1d', borderRadius: 8, marginBottom: 6 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.user}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{r.reason}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '4px 10px', borderRadius: 6, background: '#10b98122', color: '#10b981', border: '1px solid #10b98144', cursor: 'pointer', fontSize: 11 }}>Dismiss</button>
              <button style={{ padding: '4px 10px', borderRadius: 6, background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', cursor: 'pointer', fontSize: 11 }}>Suspend</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── User Dashboard ───────────────────────────────────────────────────────────

function UserDashboardView({ user }) {
  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>👤 My Dashboard</h2>
        <RoleBadge role={ROLES.USER} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatTile icon="💬" label="Messages Today" value="23" color="#6366f1" />
        <StatTile icon="📁" label="Projects" value="4" color="#8b5cf6" />
        <StatTile icon="⭐" label="Current Plan" value="Pro" color="#f59e0b" />
        <StatTile icon="🎖️" label="Account Age" value="124 days" color="#10b981" />
      </div>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>👤 Profile</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Username', user?.username || '—'],
            ['Email', user?.email || '—'],
            ['Language', user?.language || 'en'],
            ['Region', user?.region || 'US'],
            ['Member since', '2026-04-16'],
            ['2FA', 'Enabled ✅'],
            ['Biometrics', 'Enrolled ✅']
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0f172a' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
              <span style={{ fontSize: 13, color: '#f1f5f9' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Role Router ───────────────────────────────────────────────────────────────

export default function RoleDashboard() {
  const { user } = useAuth();

  const dashboards = {
    [ROLES.ADMIN]:     AdminDashboardView,
    [ROLES.DEVELOPER]: DeveloperDashboardView,
    [ROLES.MODERATOR]: ModeratorDashboardView,
    [ROLES.USER]:      UserDashboardView
  };

  const DashboardView = dashboards[user?.role] || UserDashboardView;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020817',
      color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px'
    }}>
      <DashboardView user={user} />
    </div>
  );
}
