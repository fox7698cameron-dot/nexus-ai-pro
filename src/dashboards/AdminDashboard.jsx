/**
 * src/dashboards/AdminDashboard.jsx
 * Role-separated dashboards for Admin, Developer, Moderator, and User.
 * Created: 2026-08-23
 */

import React, { useState, useEffect } from 'react';
import { ROLES, RoleGuard, useAuth } from '../auth/AuthSystem.jsx';

// ── Shared stat tile ──────────────────────────────────────────────────────────
function StatTile({ icon, label, value, color = '#3b82f6', sub }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Activity feed item ────────────────────────────────────────────────────────
function ActivityRow({ icon, text, time, level }) {
  const colors = { info: '#3b82f6', warn: '#eab308', error: '#ef4444', success: '#22c55e' };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#f8fafc' }}>{text}</div>
        <div style={{ fontSize: 11, color: '#475569' }}>{time}</div>
      </div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[level] || '#475569', marginTop: 5, flexShrink: 0 }} />
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 28 }}>
      <h2 style={{ color: '#94a3b8', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

// ── ADMIN view ────────────────────────────────────────────────────────────────
function AdminView() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    // Replace with GET /api/admin/users
    setUsers([
      { id: 'U1', username: 'cameron_fx 🎮', email: 'cameron@nexusai.pro', role: 'admin',     status: 'active', joined: '2025-01-01' },
      { id: 'U2', username: 'dev_tester',     email: 'dev@nexusai.pro',     role: 'developer',status: 'active', joined: '2025-03-15' },
      { id: 'U3', username: 'mod_alpha',      email: 'mod@nexusai.pro',     role: 'moderator',status: 'active', joined: '2025-06-01' },
      { id: 'U4', username: 'user_1234 ✨',   email: 'user@example.com',    role: 'user',     status: 'active', joined: '2026-01-20' },
    ]);
    setLoad(false);
  }, []);

  const roleColor = { admin: '#ef4444', developer: '#3b82f6', moderator: '#8b5cf6', user: '#22c55e' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 14 }}>
        <StatTile icon="👥" label="Total Users"     value={users.length}  color="#3b82f6" />
        <StatTile icon="✅" label="Active"          value={users.filter((u) => u.status === 'active').length} color="#22c55e" />
        <StatTile icon="🛡️" label="Admins"          value={users.filter((u) => u.role === 'admin').length} color="#ef4444" />
        <StatTile icon="🔧" label="Developers"      value={users.filter((u) => u.role === 'developer').length} color="#3b82f6" />
        <StatTile icon="🚩" label="Moderators"      value={users.filter((u) => u.role === 'moderator').length} color="#8b5cf6" />
        <StatTile icon="🔐" label="MFA Enabled"     value="100%" sub="All users" color="#22c55e" />
      </div>

      <SectionHead title="User Management" />
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Username', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>Loading…</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid #334155' }}>
                <td style={{ padding: '10px 14px', color: '#f8fafc', fontSize: 14 }}>{u.username}</td>
                <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 13 }}>{u.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: `${roleColor[u.role]}22`, color: roleColor[u.role], border: `1px solid ${roleColor[u.role]}`, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ color: '#22c55e', fontSize: 12 }}>● {u.status}</span>
                </td>
                <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{u.joined}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead title="Recent Audit Events" />
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '12px 16px' }}>
        {[
          { icon: '🔐', text: 'Admin signed in from 192.168.1.1', time: '2 min ago',   level: 'info' },
          { icon: '⚠️', text: 'Failed login attempt for user_9999', time: '15 min ago', level: 'warn' },
          { icon: '✅', text: 'New user registered: user_1234',    time: '1 hr ago',    level: 'success' },
          { icon: '🔧', text: 'Dev deployed new build v2.1.0',     time: '3 hr ago',    level: 'info' },
          { icon: '🚩', text: 'Moderator banned post #4512',       time: '5 hr ago',    level: 'warn' },
        ].map((e, i) => <ActivityRow key={i} {...e} />)}
      </div>
    </div>
  );
}

// ── DEVELOPER view ────────────────────────────────────────────────────────────
function DevView() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 14 }}>
        <StatTile icon="🔧" label="Build Status"   value="✅ Passing" color="#22c55e" />
        <StatTile icon="🧪" label="Test Coverage"  value="78%"       color="#3b82f6"  sub="Target: 90%" />
        <StatTile icon="🐛" label="Open Bugs"      value={12}        color="#ef4444" />
        <StatTile icon="📋" label="Open PRs"       value={4}         color="#eab308" />
        <StatTile icon="🚀" label="Deploys Today"  value={2}         color="#8b5cf6" />
        <StatTile icon="⏱️" label="Avg Build Time" value="2m 14s"    color="#64748b" />
      </div>

      <SectionHead title="Recent Activity" />
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '12px 16px' }}>
        {[
          { icon: '✅', text: 'CI pipeline passed for PR #88 (claude/gifted-mendel-bs91gi)', time: 'Just now',  level: 'success' },
          { icon: '🔧', text: 'Deployed v2.1.0 to staging',                                  time: '1 hr ago', level: 'info' },
          { icon: '🐛', text: 'Bug #42 reopened: auth token expiry not handled',              time: '2 hr ago', level: 'error' },
          { icon: '📦', text: 'Dependency audit: 0 vulnerabilities',                          time: '3 hr ago', level: 'success' },
        ].map((e, i) => <ActivityRow key={i} {...e} />)}
      </div>

      <SectionHead title="Quick Actions" />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {['Run Tests', 'View Logs', 'Deploy Staging', 'npm audit', 'Clear Cache', 'Rebuild Assets'].map((label) => (
          <button key={label}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MODERATOR view ────────────────────────────────────────────────────────────
function ModeratorView() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 14 }}>
        <StatTile icon="📢" label="Reported Posts"   value={7}   color="#ef4444" />
        <StatTile icon="👥" label="Active Users"     value={142} color="#22c55e" />
        <StatTile icon="🚫" label="Banned Today"     value={1}   color="#f97316" />
        <StatTile icon="✅" label="Reviewed Today"   value={23}  color="#3b82f6" />
      </div>

      <SectionHead title="Moderation Queue" />
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '12px 16px' }}>
        {['Reported post #1042 — potential spam', 'User report: user_5566 harassment', 'DMCA takedown request #7'].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #334155' }}>
            <span style={{ fontSize: 14, color: '#f8fafc' }}>⚠️ {item}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Approve</button>
              <button style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── USER view ─────────────────────────────────────────────────────────────────
function UserView() {
  const { user } = useAuth();
  return (
    <div>
      <div style={{ background: '#1e293b', borderRadius: 14, padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          {user?.username?.[0] || '👤'}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>{user?.username || 'User'}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{user?.email}</div>
          <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>● Active · {user?.plan || 'Free'} Plan</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 14 }}>
        <StatTile icon="💬" label="Total Chats"   value={42}   color="#3b82f6" />
        <StatTile icon="🧠" label="Memories"      value={8}    color="#8b5cf6" />
        <StatTile icon="📅" label="Days Active"   value={31}   color="#22c55e" />
        <StatTile icon="⭐" label="Saved Replies" value={15}   color="#f59e0b" />
      </div>

      <SectionHead title="Quick Access" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10 }}>
        {[['💬 Chat', 'Start a conversation'], ['📊 Analytics', 'View your stats'], ['⚙️ Settings', 'Manage account'], ['💳 Billing', 'Manage subscription']].map(([t, sub]) => (
          <div key={t} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 14, cursor: 'pointer' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{t}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard Router ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, hasRole } = useAuth();

  // Determine the highest privilege view
  const view = hasRole(ROLES.ADMIN)     ? 'admin'
             : hasRole(ROLES.DEV)       ? 'dev'
             : hasRole(ROLES.MODERATOR) ? 'mod'
             : 'user';

  const titles = {
    admin: '🛡️ Admin Dashboard',
    dev:   '🔧 Developer Dashboard',
    mod:   '🚩 Moderator Dashboard',
    user:  '👤 My Dashboard',
  };

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{titles[view]}</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Signed in as {user?.username} · Role: {user?.role}</p>
      </div>

      {view === 'admin' && <AdminView />}
      {view === 'dev'   && <DevView />}
      {view === 'mod'   && <ModeratorView />}
      {view === 'user'  && <UserView />}
    </div>
  );
}
