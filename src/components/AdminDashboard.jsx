/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * AdminDashboard.jsx
 * Updated: 2026-10-16
 * Separate admin/dev/mod/user dashboard routing with role guards
 */

import React, { useState, useEffect } from 'react';

// ── Role guard ────────────────────────────────────────────────────────────────
export function RoleGuard({ user, requiredRole, children, fallback }) {
  const hierarchy = ['user', 'mod', 'dev', 'admin'];
  const userLevel = hierarchy.indexOf(user?.role || 'user');
  const reqLevel  = hierarchy.indexOf(requiredRole || 'user');
  if (userLevel < reqLevel) {
    return fallback || (
      <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2>Access Denied</h2>
        <p>This area requires <strong>{requiredRole}</strong> role or higher.</p>
        <p style={{ fontSize: 12, color: '#6b7280' }}>Your role: <strong>{user?.role || 'none'}</strong></p>
      </div>
    );
  }
  return children;
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ icon, label, value, color = '#3b82f6', delta }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      {delta !== undefined && <div style={{ fontSize: 12, color: delta >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</div>}
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────
const ROLE_COLORS = { user: '#6b7280', mod: '#f59e0b', dev: '#3b82f6', admin: '#8b5cf6' };
function UserRow({ u, onRoleChange, onBan }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 18, background: `${ROLE_COLORS[u.role]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
        {u.avatar || '👤'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
      </div>
      <select value={u.role} onChange={e => onRoleChange?.(u.id, e.target.value)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${ROLE_COLORS[u.role]}`, background: 'transparent', color: ROLE_COLORS[u.role], fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
        {['user','mod','dev','admin'].map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <button onClick={() => onBan?.(u.id)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Ban</button>
    </div>
  );
}

// ── API Key row ────────────────────────────────────────────────────────────────
function ApiKeyRow({ k }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{k.name}</div>
        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--muted)', letterSpacing: 1 }}>
          {show ? k.key : k.key.slice(0, 8) + '•••••••••••••••••' + k.key.slice(-4)}
        </div>
      </div>
      <button onClick={() => setShow(!show)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', fontSize: 12 }}>{show ? '🙈' : '👁️'}</button>
      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: k.active ? '#10b98122' : '#ef444422', color: k.active ? '#10b981' : '#ef4444' }}>{k.active ? 'Active' : 'Revoked'}</span>
    </div>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────
function mockUsers() {
  return [
    { id: '1', username: 'cameron_fox', email: 'fox7698cameron@gmail.com', role: 'admin', avatar: '👑' },
    { id: '2', username: 'dev_alice',   email: 'alice@example.com',        role: 'dev',   avatar: '💻' },
    { id: '3', username: 'mod_bob',     email: 'bob@example.com',          role: 'mod',   avatar: '🛡️' },
    { id: '4', username: 'user_carol',  email: 'carol@example.com',        role: 'user',  avatar: '👤' },
    { id: '5', username: 'user_dave',   email: 'dave@example.com',         role: 'user',  avatar: '👤' },
  ];
}

function mockApiKeys() {
  return [
    { id: 'k1', name: 'Production API', key: 'nxp_live_' + 'x'.repeat(32), active: true },
    { id: 'k2', name: 'Test API',        key: 'nxp_test_' + 'x'.repeat(32), active: true },
    { id: 'k3', name: 'Legacy Key',      key: 'nxp_old_'  + 'x'.repeat(32), active: false },
  ];
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
export function AdminPanel({ user }) {
  const [users, setUsers] = useState(mockUsers());
  const [tab, setTab] = useState('overview');
  const [apiKeys] = useState(mockApiKeys());

  const handleRoleChange = (id, role) => {
    setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--fg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>👑</span>
        <div>
          <h2 style={{ margin: 0 }}>Admin Panel</h2>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Full system access · {user?.username}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[['overview','📊 Overview'],['users','👥 Users'],['apikeys','🔑 API Keys'],['logs','📋 Logs']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', background: 'transparent', border: 'none',
            borderBottom: tab === t ? '3px solid #8b5cf6' : '3px solid transparent',
            color: tab === t ? '#8b5cf6' : 'var(--muted)', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 400,
          }}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <StatTile icon="👥" label="Total Users"     value={users.length}   color="#3b82f6" delta={12} />
          <StatTile icon="💻" label="Active Devs"     value={users.filter(u=>u.role==='dev').length}  color="#3b82f6" />
          <StatTile icon="🛡️"label="Moderators"       value={users.filter(u=>u.role==='mod').length}  color="#f59e0b" />
          <StatTile icon="⚡" label="Requests / day"  value="48.2K"          color="#10b981" delta={8} />
          <StatTile icon="🔒" label="Security Score"  value="87"             color="#10b981" />
          <StatTile icon="💰" label="MRR"             value="$2,890"         color="#8b5cf6" delta={5} />
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '8px 16px', border: '1px solid var(--border)' }}>
          {users.map(u => <UserRow key={u.id} u={u} onRoleChange={handleRoleChange} />)}
        </div>
      )}

      {tab === 'apikeys' && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '8px 16px', border: '1px solid var(--border)' }}>
          {apiKeys.map(k => <ApiKeyRow key={k.id} k={k} />)}
          <button style={{ marginTop: 12, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            + Generate New Key
          </button>
        </div>
      )}

      {tab === 'logs' && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 12, color: 'var(--fg)' }}>
          {Array.from({length: 8}, (_, i) => ({
            ts: new Date(Date.now() - i * 60000).toISOString(),
            event: ['USER_LOGIN', 'API_CALL', 'PAYMENT', 'SCAN', 'ERROR'][i % 5],
            user: users[i % users.length]?.username,
            ip: `192.168.1.${i + 1}`,
          })).map((e, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
              <span style={{ color: '#6b7280' }}>{new Date(e.ts).toLocaleTimeString()}</span>
              <span style={{ color: '#3b82f6', minWidth: 160 }}>{e.event}</span>
              <span style={{ flex: 1 }}>{e.user}</span>
              <span style={{ color: '#6b7280' }}>{e.ip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Developer Panel ───────────────────────────────────────────────────────────
export function DevPanel({ user }) {
  const [tab, setTab] = useState('apis');
  const [apiKeys] = useState(mockApiKeys());
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--fg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>💻</span>
        <div>
          <h2 style={{ margin: 0 }}>Developer Dashboard</h2>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>API keys · Webhooks · CI/CD · {user?.username}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[['apis','🔑 API Keys'],['webhooks','🪝 Webhooks'],['pipeline','⚙️ Pipeline']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: tab===t ? '3px solid #3b82f6':'3px solid transparent', color: tab===t?'#3b82f6':'var(--muted)', cursor: 'pointer', fontSize: 13, fontWeight: tab===t?700:400 }}>{l}</button>
        ))}
      </div>
      {tab === 'apis' && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '8px 16px', border: '1px solid var(--border)' }}>
          {apiKeys.map(k => <ApiKeyRow key={k.id} k={k} />)}
        </div>
      )}
      {tab === 'webhooks' && <div style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>Configure webhooks for your integration endpoints</div>}
      {tab === 'pipeline' && <div style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>View CI/CD pipeline status and deploy logs</div>}
    </div>
  );
}

// ── Moderator Panel ───────────────────────────────────────────────────────────
export function ModPanel({ user }) {
  const [reports] = useState([
    { id: 'r1', reporter: 'user_carol', target: 'user_dave', reason: 'Spam',    status: 'open' },
    { id: 'r2', reporter: 'user_dave',  target: 'user_carol',reason: 'Abuse',   status: 'open' },
    { id: 'r3', reporter: 'dev_alice',  target: 'user_dave', reason: 'Off-topic',status: 'resolved' },
  ]);
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--fg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>🛡️</span>
        <div>
          <h2 style={{ margin: 0 }}>Moderator Dashboard</h2>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Reports · Content review · {user?.username}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatTile icon="🚩" label="Open Reports"    value={reports.filter(r=>r.status==='open').length}     color="#ef4444" />
        <StatTile icon="✅" label="Resolved Today"  value={reports.filter(r=>r.status==='resolved').length}  color="#10b981" />
        <StatTile icon="⏳" label="Avg Response"    value="2.4h"  color="#f59e0b" />
      </div>
      <div style={{ background: 'var(--card)', borderRadius: 12, padding: '8px 16px', border: '1px solid var(--border)' }}>
        {reports.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ flex: 1, fontSize: 13 }}>
              <strong>{r.reporter}</strong> reported <strong>{r.target}</strong>: {r.reason}
            </span>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: r.status==='open' ? '#ef444422':'#10b98122', color: r.status==='open'?'#ef4444':'#10b981' }}>
              {r.status}
            </span>
            {r.status === 'open' && (
              <button style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Review</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── User Dashboard (standard) ─────────────────────────────────────────────────
export function UserPanel({ user }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--fg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          {user?.avatar || '👤'}
        </div>
        <div>
          <h2 style={{ margin: 0 }}>{user?.displayName || user?.username}</h2>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Standard Account · {user?.preferredLang?.toUpperCase()}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <StatTile icon="💬" label="Chats Today"   value="12"   color="#3b82f6" />
        <StatTile icon="🧠" label="Memories"      value="84"   color="#8b5cf6" />
        <StatTile icon="📁" label="Files Stored"  value="2.4GB" color="#f59e0b" />
        <StatTile icon="⭐" label="Plan"           value="Pro"   color="#10b981" />
      </div>
    </div>
  );
}

// ── Dashboard router ──────────────────────────────────────────────────────────
const PANELS = {
  admin: AdminPanel,
  dev:   DevPanel,
  mod:   ModPanel,
  user:  UserPanel,
};

export default function DashboardRouter({ user }) {
  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h2>Sign in to continue</h2>
      </div>
    );
  }

  const Panel = PANELS[user.role] || UserPanel;
  return <Panel user={user} />;
}
