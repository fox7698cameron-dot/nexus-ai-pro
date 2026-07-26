/**
 * src/components/AdminDashboard.jsx
 * Nexus AI Pro - Role-based Admin / Dev / Moderator dashboards
 * Created: 2026-07-26
 */

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, Settings, Activity, BarChart3, AlertTriangle,
  CheckCircle2, RefreshCw, Ban, Edit3, Trash2, Eye,
  Crown, Code2, ShieldCheck, User, Key, Bell,
  Database, Server, Cpu, Globe, Clock, TrendingUp,
} from 'lucide-react';
import { apiFetch, AUTH_ROLES } from '../lib/auth.js';

// ── Mocked user data ────────────────────────────────────────────────
const MOCK_USERS = [
  { id: 'u1', username: '🎮 cameron_fox', email: 'cameron@nexusai.pro', role: 'admin', status: 'active', joined: Date.now() - 90 * 86400000, lastSeen: Date.now() - 60000 },
  { id: 'u2', username: 'dev_alice ⚡', email: 'alice@example.com', role: 'dev', status: 'active', joined: Date.now() - 60 * 86400000, lastSeen: Date.now() - 300000 },
  { id: 'u3', username: 'mod_bob 🛡️', email: 'bob@example.com', role: 'moderator', status: 'active', joined: Date.now() - 30 * 86400000, lastSeen: Date.now() - 900000 },
  { id: 'u4', username: 'jane_user', email: 'jane@example.com', role: 'user', status: 'active', joined: Date.now() - 15 * 86400000, lastSeen: Date.now() - 3600000 },
  { id: 'u5', username: '🦊 quick_fox', email: 'fox@example.com', role: 'user', status: 'suspended', joined: Date.now() - 45 * 86400000, lastSeen: Date.now() - 86400000 },
];

const ROLE_CONFIG = {
  admin:     { color: '#ef4444', icon: '👑', label: 'Admin' },
  dev:       { color: '#8b5cf6', icon: '⚙️', label: 'Developer' },
  moderator: { color: '#f97316', icon: '🛡️', label: 'Moderator' },
  user:      { color: '#3b82f6', icon: '👤', label: 'User' },
};

function timeSince(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Stat cards ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}22`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: color }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── UserRow ─────────────────────────────────────────────────────────
function UserRow({ user, onAction }) {
  const rc = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 6,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `${rc.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: rc.color, flexShrink: 0,
      }}>{rc.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.username}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{user.email} · Last seen {timeSince(user.lastSeen)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${rc.color}22`, color: rc.color }}>
          {rc.label}
        </div>
        <div style={{
          padding: '2px 7px', borderRadius: 4, fontSize: 11,
          background: user.status === 'active' ? '#22c55e22' : '#ef444422',
          color: user.status === 'active' ? '#22c55e' : '#ef4444',
        }}>
          {user.status}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onAction('view', user)} style={iconBtnStyle} title="View">
            <Eye size={12} />
          </button>
          <button onClick={() => onAction('edit', user)} style={iconBtnStyle} title="Edit role">
            <Edit3 size={12} />
          </button>
          <button onClick={() => onAction('suspend', user)} style={{ ...iconBtnStyle, color: '#ef4444' }} title="Suspend">
            <Ban size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── System metrics panel ────────────────────────────────────────────
function SystemMetrics() {
  const [metrics, setMetrics] = useState({ cpu: 34, memory: 62, requests: 1284, uptime: 99.97 });

  useEffect(() => {
    const t = setInterval(() => {
      setMetrics(m => ({
        cpu: Math.max(5, Math.min(95, m.cpu + (Math.random() - 0.5) * 8)),
        memory: Math.max(30, Math.min(90, m.memory + (Math.random() - 0.5) * 3)),
        requests: m.requests + Math.floor(Math.random() * 5),
        uptime: m.uptime,
      }));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const MiniBar = ({ v, color }) => (
    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${v}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
    </div>
  );

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Server size={14} /> System Health
        <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'CPU Usage', value: metrics.cpu, color: metrics.cpu > 80 ? '#ef4444' : '#3b82f6', suffix: '%' },
          { label: 'Memory', value: metrics.memory, color: metrics.memory > 85 ? '#ef4444' : '#8b5cf6', suffix: '%' },
          { label: 'Uptime', value: metrics.uptime, color: '#22c55e', suffix: '%' },
        ].map(m => (
          <div key={m.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
              <span>{m.label}</span>
              <span style={{ color: m.color, fontWeight: 600 }}>{Math.round(m.value)}{m.suffix}</span>
            </div>
            <MiniBar v={m.value} color={m.color} />
          </div>
        ))}
        <div style={{ fontSize: 12, color: 'var(--text-3)', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          Total Requests: {metrics.requests.toLocaleString()} · Node {process?.versions?.node || '18+'}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN VIEW ──────────────────────────────────────────────────────
function AdminView({ users, onAction }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Users" value={users.length} icon={<Users size={18} />} color="#3b82f6" />
        <StatCard label="Admins" value={users.filter(u => u.role === 'admin').length} icon={<Crown size={18} />} color="#ef4444" />
        <StatCard label="Active" value={users.filter(u => u.status === 'active').length} icon={<CheckCircle2 size={18} />} color="#22c55e" />
        <StatCard label="Suspended" value={users.filter(u => u.status === 'suspended').length} icon={<Ban size={18} />} color="#f97316" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>User Management</h4>
            <input
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: 13, width: 180 }}
            />
          </div>
          {filtered.map(u => <UserRow key={u.id} user={u} onAction={onAction} />)}
        </div>
        <SystemMetrics />
      </div>
    </div>
  );
}

// ── DEV VIEW ────────────────────────────────────────────────────────
function DevView() {
  const [logs] = useState([
    { ts: Date.now() - 2000, level: 'INFO', msg: 'Server started on port 3001' },
    { ts: Date.now() - 5000, level: 'INFO', msg: 'Security scan completed — 0 issues' },
    { ts: Date.now() - 12000, level: 'WARN', msg: 'CORS origin is wildcard in dev mode' },
    { ts: Date.now() - 34000, level: 'INFO', msg: 'WebSocket client connected: abc123' },
    { ts: Date.now() - 60000, level: 'INFO', msg: 'JWT issued for user: cameron_fox' },
  ]);

  const levelColor = { INFO: '#60a5fa', WARN: '#eab308', ERROR: '#ef4444', DEBUG: '#94a3b8' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="API Routes" value="38" icon={<Globe size={18} />} color="#3b82f6" sub="+2 today" />
        <StatCard label="WebSocket Clients" value="12" icon={<Activity size={18} />} color="#22c55e" />
        <StatCard label="DB Collections" value="6" icon={<Database size={18} />} color="#8b5cf6" />
        <StatCard label="Env Variables" value="14" icon={<Key size={18} />} color="#f97316" sub="All secure" />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
          <Cpu size={14} style={{ marginRight: 6 }} />Server Logs (Live)
        </h4>
        <div style={{ fontFamily: 'monospace', fontSize: 12, maxHeight: 300, overflowY: 'auto' }}>
          {logs.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{new Date(l.ts).toLocaleTimeString()}</span>
              <span style={{ color: levelColor[l.level] || '#94a3b8', flexShrink: 0, minWidth: 44 }}>{l.level}</span>
              <span style={{ color: 'var(--text-2)' }}>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MODERATOR VIEW ──────────────────────────────────────────────────
function ModeratorView({ users, onAction }) {
  const regular = users.filter(u => u.role === 'user');
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Users to Review" value={regular.length} icon={<Users size={18} />} color="#f97316" />
        <StatCard label="Active Users" value={regular.filter(u => u.status === 'active').length} icon={<CheckCircle2 size={18} />} color="#22c55e" />
        <StatCard label="Flagged" value={0} icon={<AlertTriangle size={18} />} color="#eab308" />
        <StatCard label="Reports Today" value={2} icon={<Bell size={18} />} color="#3b82f6" />
      </div>
      <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Regular Users</h4>
      {regular.map(u => <UserRow key={u.id} user={u} onAction={onAction} />)}
    </div>
  );
}

// ── USER VIEW ───────────────────────────────────────────────────────
function UserView({ currentUser }) {
  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: 20, marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--accent-subtle)', margin: '0 auto 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          {currentUser?.username?.[0]?.toUpperCase() || '👤'}
        </div>
        <h3 style={{ margin: '0 0 4px', color: 'var(--text-1)' }}>{currentUser?.username || 'User'}</h3>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{currentUser?.email || ''}</div>
        <div style={{ marginTop: 8, padding: '4px 12px', borderRadius: 20, display: 'inline-block', fontSize: 12, fontWeight: 600, background: '#3b82f622', color: '#3b82f6' }}>
          👤 Standard User
        </div>
      </div>

      {[
        { label: 'Account Status', value: 'Active', color: '#22c55e' },
        { label: 'Plan', value: 'Free', color: '#94a3b8' },
        { label: 'Member Since', value: 'Today', color: 'var(--text-2)' },
        { label: '2FA', value: 'Not enabled', color: '#eab308', action: 'Enable' },
      ].map(item => (
        <div key={item.label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{item.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: item.color }}>{item.value}</span>
            {item.action && (
              <button style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}>
                {item.action}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main AdminDashboard ─────────────────────────────────────────────
export default function AdminDashboard({ currentUser }) {
  const [users, setUsers] = useState(MOCK_USERS);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    const role = currentUser?.role || 'user';
    if (role === 'admin') setActiveTab('admin');
    else if (role === 'dev') setActiveTab('dev');
    else if (role === 'moderator') setActiveTab('moderator');
    else setActiveTab('user');
  }, [currentUser]);

  const handleAction = (action, user) => {
    if (action === 'suspend') {
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u
      ));
    }
  };

  const role = currentUser?.role || 'user';
  const rc = ROLE_CONFIG[role] || ROLE_CONFIG.user;

  const availableTabs = {
    admin: ['admin', 'dev', 'moderator', 'user'],
    dev: ['dev', 'user'],
    moderator: ['moderator', 'user'],
    user: ['user'],
  }[role] || ['user'];

  const tabConfig = {
    admin:     { icon: '👑', label: 'Admin Panel' },
    dev:       { icon: '⚙️', label: 'Dev Tools' },
    moderator: { icon: '🛡️', label: 'Moderation' },
    user:      { icon: '👤', label: 'My Account' },
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${rc.color}22`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20,
        }}>{rc.icon}</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>
            {rc.label} Dashboard
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
            {currentUser?.username || 'Guest'} · {rc.label}
          </p>
        </div>
      </div>

      {/* Tabs */}
      {availableTabs.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {availableTabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '8px 14px', borderRadius: '8px 8px 0 0', border: 'none',
              background: activeTab === t ? 'var(--accent)' : 'transparent',
              color: activeTab === t ? '#fff' : 'var(--text-2)',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}>
              {tabConfig[t]?.icon} {tabConfig[t]?.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'admin' && <AdminView users={users} onAction={handleAction} />}
      {activeTab === 'dev' && <DevView />}
      {activeTab === 'moderator' && <ModeratorView users={users} onAction={handleAction} />}
      {activeTab === 'user' && <UserView currentUser={currentUser} />}
    </div>
  );
}

const iconBtnStyle = {
  width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)',
};
