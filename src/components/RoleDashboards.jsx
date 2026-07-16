// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/components/RoleDashboards.jsx — 2026-07-16

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function StatCard({ label, value, icon, color = '#3b82f6', trend }) {
  return (
    <div style={{ background: '#111827', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f2937' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      {trend && <div style={{ fontSize: 11, color: trend >= 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>
        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last week
      </div>}
    </div>
  );
}

function UserRow({ user, onAction }) {
  const roleColors = { admin: '#ef4444', developer: '#8b5cf6', moderator: '#f59e0b', user: '#3b82f6' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1f2937' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `linear-gradient(135deg, ${roleColors[user.role] || '#6b7280'}, ${roleColors[user.role] || '#374151'}88)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>
        {user.username?.[0]?.toUpperCase() || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.username || user.email}
        </div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>{user.email}</div>
      </div>
      <span style={{
        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
        background: `${roleColors[user.role] || '#6b7280'}22`,
        color: roleColors[user.role] || '#6b7280',
        border: `1px solid ${roleColors[user.role] || '#6b7280'}44`,
        textTransform: 'capitalize',
      }}>
        {user.role}
      </span>
      <div style={{ fontSize: 11, color: user.active ? '#22c55e' : '#ef4444' }}>
        {user.active ? '● Online' : '○ Offline'}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onAction('edit', user)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #374151', background: '#1f2937', color: '#9ca3af', cursor: 'pointer', fontSize: 11 }}>Edit</button>
        <button onClick={() => onAction('suspend', user)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #7f1d1d', background: '#450a0a', color: '#fca5a5', cursor: 'pointer', fontSize: 11 }}>Suspend</button>
      </div>
    </div>
  );
}

function AuditLog({ entries }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 10px', borderRadius: 6, background: '#111827', fontSize: 12 }}>
          <span style={{ color: '#4b5563', flexShrink: 0 }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
          <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>[{e.event}]</span>
          <span style={{ color: '#6b7280', flex: 1 }}>{e.message || JSON.stringify(e.details || {})}</span>
        </div>
      ))}
      {entries.length === 0 && <div style={{ color: '#4b5563', padding: 16, textAlign: 'center', fontSize: 13 }}>No audit events</div>}
    </div>
  );
}

const MOCK_USERS = [
  { id: 'u1', username: 'CamFox 🦊', email: 'cam@nexusai.pro', role: 'admin', active: true, plan: 'enterprise' },
  { id: 'u2', username: 'Dev_Alpha', email: 'alpha@dev.com', role: 'developer', active: true, plan: 'pro' },
  { id: 'u3', username: 'Mod_Beta 🛡️', email: 'beta@mod.com', role: 'moderator', active: false, plan: 'pro' },
  { id: 'u4', username: 'User_Gamma', email: 'gamma@user.com', role: 'user', active: true, plan: 'free' },
  { id: 'u5', username: 'User_Delta 🚀', email: 'delta@user.com', role: 'user', active: true, plan: 'pro' },
];

const MOCK_AUDIT = [
  { timestamp: Date.now() - 60000, event: 'USER_LOGIN', message: 'admin logged in from 192.168.1.1' },
  { timestamp: Date.now() - 120000, event: 'SECURITY_SCAN', message: 'Full vulnerability scan completed - 0 issues' },
  { timestamp: Date.now() - 300000, event: 'KEY_ROTATION', message: 'Encryption keys rotated successfully' },
  { timestamp: Date.now() - 600000, event: 'USER_REGISTER', message: 'New user registered: User_Delta' },
  { timestamp: Date.now() - 900000, event: 'PAYMENT', message: 'Subscription upgraded: pro plan' },
];

export function AdminDashboard() {
  const { t } = useTranslation();
  const [users, setUsers] = useState(MOCK_USERS);
  const [audit, setAudit] = useState(MOCK_AUDIT);
  const [tab, setTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState({ uptime: '99.98%', latency: '12ms', memory: '42%', cpu: '18%' });

  const loadData = useCallback(async () => {
    try {
      const [usersRes, auditRes, healthRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` } }),
        fetch('/api/admin/audit', { headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` } }),
        fetch('/api/admin/health', { headers: { Authorization: `Bearer ${localStorage.getItem('nexus:token')}` } }),
      ]);
      if (usersRes.ok) { const d = await usersRes.json(); if (d.users?.length) setUsers(d.users); }
      if (auditRes.ok) { const d = await auditRes.json(); if (d.entries?.length) setAudit(d.entries); }
      if (healthRes.ok) { const d = await healthRes.json(); setSystemHealth(d); }
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUserAction = (action, user) => {
    if (action === 'suspend') {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: false } : u));
    }
  };

  const totalRevenue = users.filter(u => u.plan === 'pro').length * 9.99 + users.filter(u => u.plan === 'enterprise').length * 14.99;

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0c', padding: 20, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👑</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#ef4444' }}>Admin Dashboard</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Full system control and user management</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #1f2937', paddingBottom: 0 }}>
        {['overview', 'users', 'system', 'audit'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} style={{
            padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 13,
            background: 'none', color: tab === t2 ? '#ef4444' : '#6b7280',
            borderBottom: tab === t2 ? '2px solid #ef4444' : '2px solid transparent',
            marginBottom: -1, textTransform: 'capitalize',
          }}>
            {{ overview: '📊', users: '👥', system: '⚙️', audit: '📋' }[t2]} {t2}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Users" value={users.length} icon="👥" color="#3b82f6" trend={12} />
            <StatCard label="Active Sessions" value={users.filter(u => u.active).length} icon="🟢" color="#22c55e" trend={5} />
            <StatCard label="Monthly Revenue" value={`$${totalRevenue.toFixed(2)}`} icon="💰" color="#22c55e" trend={8} />
            <StatCard label="Pro+ Subscribers" value={users.filter(u => u.plan !== 'free').length} icon="⭐" color="#f59e0b" trend={15} />
            <StatCard label="System Uptime" value={systemHealth.uptime} icon="✅" color="#22c55e" />
            <StatCard label="API Latency" value={systemHealth.latency} icon="⚡" color="#3b82f6" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#e5e7eb' }}>User Distribution by Role</div>
              {Object.entries(
                users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
              ).map(([role, count]) => {
                const colors = { admin: '#ef4444', developer: '#8b5cf6', moderator: '#f59e0b', user: '#3b82f6' };
                const pct = (count / users.length) * 100;
                return (
                  <div key={role} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 3 }}>
                      <span style={{ textTransform: 'capitalize' }}>{role}</span><span>{count}</span>
                    </div>
                    <div style={{ height: 6, background: '#1f2937', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: colors[role] || '#6b7280', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#e5e7eb' }}>Plan Distribution</div>
              {['free', 'pro', 'enterprise'].map(plan => {
                const count = users.filter(u => u.plan === plan).length;
                const pct = (count / users.length) * 100;
                const colors = { free: '#6b7280', pro: '#3b82f6', enterprise: '#8b5cf6' };
                return (
                  <div key={plan} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 3 }}>
                      <span style={{ textTransform: 'capitalize' }}>{plan}</span><span>{count}</span>
                    </div>
                    <div style={{ height: 6, background: '#1f2937', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: colors[plan], borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#e5e7eb' }}>All Users ({users.length})</div>
          {users.map(u => <UserRow key={u.id} user={u} onAction={handleUserAction} />)}
        </div>
      )}

      {tab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'CPU', value: systemHealth.cpu, color: '#3b82f6' },
            { label: 'Memory', value: systemHealth.memory, color: '#8b5cf6' },
            { label: 'Uptime', value: systemHealth.uptime, color: '#22c55e' },
            { label: 'Latency', value: systemHealth.latency, color: '#22c55e' },
          ].map(m => (
            <div key={m.label} style={{ background: '#111827', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f2937' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#e5e7eb' }}>Audit Log</div>
          <AuditLog entries={audit} />
        </div>
      )}
    </div>
  );
}

export function DeveloperDashboard() {
  const [tab, setTab] = useState('api');
  const [apiUsage, setApiUsage] = useState({ requests: 12840, errors: 23, latency: '18ms', quota: 85 });

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0c', padding: 20, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚙️</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#8b5cf6' }}>Developer Dashboard</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>API access, webhooks, and integrations</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #1f2937' }}>
        {['api', 'webhooks', 'connectors', 'logs'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} style={{
            padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 13,
            background: 'none', color: tab === t2 ? '#8b5cf6' : '#6b7280',
            borderBottom: tab === t2 ? '2px solid #8b5cf6' : '2px solid transparent',
            marginBottom: -1, textTransform: 'capitalize',
          }}>
            {{ api: '🔑', webhooks: '🪝', connectors: '🔌', logs: '📋' }[t2]} {t2}
          </button>
        ))}
      </div>

      {tab === 'api' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="API Requests" value={apiUsage.requests.toLocaleString()} icon="📡" color="#8b5cf6" trend={22} />
            <StatCard label="Error Rate" value={`${((apiUsage.errors / apiUsage.requests) * 100).toFixed(2)}%`} icon="⚠️" color="#f59e0b" trend={-5} />
            <StatCard label="Avg Latency" value={apiUsage.latency} icon="⚡" color="#22c55e" />
            <StatCard label="Quota Used" value={`${apiUsage.quota}%`} icon="📊" color={apiUsage.quota > 80 ? '#ef4444' : '#22c55e'} />
          </div>

          <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#e5e7eb' }}>API Endpoints</div>
            {[
              { method: 'POST', path: '/api/chat', desc: 'Send message to AI model', auth: true },
              { method: 'GET', path: '/api/analytics/:platform', desc: 'Get social metrics', auth: true },
              { method: 'POST', path: '/api/projects', desc: 'Create project', auth: true },
              { method: 'GET', path: '/api/security/status', desc: 'Security status', auth: true },
              { method: 'POST', path: '/api/payments/subscribe', desc: 'Subscribe to plan', auth: true },
              { method: 'GET', path: '/api/health', desc: 'Health check', auth: false },
            ].map((ep, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, flexShrink: 0,
                  background: ep.method === 'POST' ? '#1a3a1a' : '#0c1a3a',
                  color: ep.method === 'POST' ? '#22c55e' : '#60a5fa',
                  border: `1px solid ${ep.method === 'POST' ? '#22c55e' : '#3b82f6'}44`,
                }}>{ep.method}</span>
                <code style={{ fontSize: 12, color: '#e5e7eb', flex: 1 }}>{ep.path}</code>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{ep.desc}</span>
                {ep.auth && <span style={{ fontSize: 10, color: '#f59e0b' }}>🔒</span>}
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #374151' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Your API Key (never share this)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <code style={{ flex: 1, background: '#0a0a0c', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#9ca3af', border: '1px solid #1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                nxp_••••••••••••••••••••••••••••••••
              </code>
              <button style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #374151', background: '#1f2937', color: '#9ca3af', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                🔄 Rotate
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#4b5563', marginTop: 8 }}>Keys are stored encrypted. They are never logged or exposed in responses.</p>
          </div>
        </div>
      )}

      {tab === 'connectors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {[
            { name: 'GitHub', icon: '🐙', color: '#fff', desc: 'Repo integration, PR tracking' },
            { name: 'Bitbucket', icon: '🪣', color: '#0052cc', desc: 'Git repos and pipelines' },
            { name: 'Slack', icon: '💼', color: '#4a154b', desc: 'Team notifications' },
            { name: 'Zoom', icon: '🎥', color: '#2d8cff', desc: 'Meeting integration' },
            { name: 'Azure DevOps', icon: '☁️', color: '#0078d4', desc: 'CI/CD pipelines' },
            { name: 'AWS', icon: '🌩️', color: '#ff9900', desc: 'Cloud deployment' },
            { name: 'Google Cloud', icon: '🌐', color: '#4285f4', desc: 'GCP integration' },
            { name: 'Adobe Creative', icon: '🎨', color: '#ff0000', desc: 'Design assets' },
          ].map(c => (
            <div key={c.name} style={{ background: '#111827', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f2937', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c.desc}</div>
              </div>
              <button style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #374151', background: '#1f2937', color: '#9ca3af', cursor: 'pointer', fontSize: 11 }}>
                Connect
              </button>
            </div>
          ))}
        </div>
      )}

      {(tab === 'webhooks' || tab === 'logs') && (
        <div style={{ background: '#111827', borderRadius: 10, padding: 20, border: '1px solid #1f2937', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{tab === 'webhooks' ? '🪝' : '📋'}</div>
          <div style={{ fontSize: 14 }}>{tab === 'webhooks' ? 'Configure webhooks for real-time event notifications' : 'Real-time API request logs'}</div>
          <button style={{ marginTop: 16, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Configure
          </button>
        </div>
      )}
    </div>
  );
}

export function ModeratorDashboard() {
  const [reports, setReports] = useState([
    { id: 'r1', type: 'content', user: 'User_Gamma', reason: 'Inappropriate content', status: 'pending', timestamp: Date.now() - 300000 },
    { id: 'r2', type: 'spam', user: 'User_Delta', reason: 'Spam messages', status: 'reviewed', timestamp: Date.now() - 900000 },
    { id: 'r3', type: 'abuse', user: 'unknown_user', reason: 'Abusive behavior', status: 'pending', timestamp: Date.now() - 1800000 },
  ]);

  const handleReport = (id, action) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'resolved' : 'dismissed' } : r));
  };

  const pending = reports.filter(r => r.status === 'pending').length;

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0c', padding: 20, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#f59e0b' }}>Moderator Dashboard</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Content moderation and community management</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Pending Reports" value={pending} icon="⚠️" color={pending > 0 ? '#ef4444' : '#22c55e'} />
        <StatCard label="Resolved Today" value={reports.filter(r => r.status === 'resolved').length} icon="✅" color="#22c55e" />
        <StatCard label="Total Reports" value={reports.length} icon="📋" color="#3b82f6" />
      </div>

      <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#e5e7eb' }}>Content Reports</div>
        {reports.map(r => {
          const statusColors = { pending: '#f59e0b', reviewed: '#3b82f6', resolved: '#22c55e', dismissed: '#6b7280' };
          return (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #1f2937' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      background: '#1f2937', color: '#9ca3af',
                    }}>{r.type}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>{r.user}</span>
                    <span style={{ fontSize: 11, color: statusColors[r.status] }}>● {r.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{r.reason}</div>
                  <div style={{ fontSize: 10, color: '#4b5563', marginTop: 3 }}>{new Date(r.timestamp).toLocaleString()}</div>
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleReport(r.id, 'approve')} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#000', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Resolve
                    </button>
                    <button onClick={() => handleReport(r.id, 'dismiss')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #374151', background: '#1f2937', color: '#6b7280', cursor: 'pointer', fontSize: 11 }}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UserDashboard({ user }) {
  const { t } = useTranslation();
  const planColors = { free: '#6b7280', pro: '#3b82f6', enterprise: '#8b5cf6' };
  const plan = user?.plan || 'free';

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0c', padding: 20, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        }}>
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{user?.username || user?.email || 'User'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{
              padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              background: `${planColors[plan]}22`, color: planColors[plan],
              border: `1px solid ${planColors[plan]}44`,
            }}>{plan.toUpperCase()}</span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{user?.role ? `${user.role} account` : ''}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Chats Today" value="12" icon="💬" color="#3b82f6" />
        <StatCard label="Projects" value="3" icon="🎮" color="#8b5cf6" />
        <StatCard label="API Calls" value="284" icon="📡" color="#22c55e" />
        <StatCard label="Storage Used" value="24MB" icon="💾" color="#f59e0b" />
      </div>

      <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid #1f2937', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#e5e7eb' }}>Account Settings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Biometric Auth', value: 'Enabled', icon: '🔐' },
            { label: '2FA', value: 'TOTP Active', icon: '📱' },
            { label: 'Language', value: 'English', icon: '🌐' },
            { label: 'Notifications', value: 'On', icon: '🔔' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
              <span style={{ fontSize: 13, color: '#e5e7eb' }}>{s.icon} {s.label}</span>
              <span style={{ fontSize: 12, color: '#22c55e' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
