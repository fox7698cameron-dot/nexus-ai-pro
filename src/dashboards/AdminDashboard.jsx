// src/dashboards/AdminDashboard.jsx
// Nexus AI Pro - Admin Dashboard
// Role: admin — full system visibility, user management, gift cards, audit logs
// Responsive; real-time metrics
// Date: 2026-08-01

import React, { useState, useEffect, useCallback } from 'react';

const API = '/api';

function StatCard({ label, value, icon, color = '#6366f1' }) {
  return (
    <div style={{
      flex: '1 1 160px', background: '#111827', borderRadius: 12,
      padding: '16px 20px', border: '1px solid #1e293b'
    }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ color, fontSize: 28, fontWeight: 800 }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = { admin: '#ef4444', dev: '#a855f7', moderator: '#3b82f6', user: '#22c55e' };
  return (
    <span style={{
      background: `${colors[role] || '#64748b'}22`, color: colors[role] || '#64748b',
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700
    }}>{role}</span>
  );
}

function UserRow({ user, onChangeRole, onDeactivate }) {
  const [newRole, setNewRole] = useState(user.role);
  return (
    <tr style={{ borderBottom: '1px solid #1e293b' }}>
      <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>
        {user.username}
        {!user.active && <span style={{ marginLeft: 6, color: '#ef4444', fontSize: 10 }}>SUSPENDED</span>}
      </td>
      <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12 }}>{user.email}</td>
      <td style={{ padding: '10px 12px' }}><RoleBadge role={user.role} /></td>
      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>
        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
      </td>
      <td style={{ padding: '10px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', padding: '3px 8px', fontSize: 12 }}
        >
          {['admin','dev','moderator','user'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={() => onChangeRole(user.id, newRole)} style={actionBtn('#6366f1')}>Set</button>
        {user.active && (
          <button onClick={() => onDeactivate(user.id)} style={actionBtn('#ef4444')}>Suspend</button>
        )}
      </td>
    </tr>
  );
}

function AuditRow({ log }) {
  const color = log.event?.includes('ERROR') || log.event?.includes('THREAT') ? '#ef4444' : '#64748b';
  return (
    <tr style={{ borderBottom: '1px solid #0f172a' }}>
      <td style={{ padding: '6px 10px', color: '#475569', fontSize: 10 }}>
        {new Date(log.timestamp).toLocaleTimeString()}
      </td>
      <td style={{ padding: '6px 10px', color, fontSize: 12, fontFamily: 'monospace' }}>{log.event}</td>
      <td style={{ padding: '6px 10px', color: '#475569', fontSize: 11, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {JSON.stringify(log.details)}
      </td>
    </tr>
  );
}

export default function AdminDashboard({ token }) {
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [security, setSecurity] = useState(null);
  const [giftAmount, setGiftAmount] = useState(999);
  const [giftCount, setGiftCount] = useState(1);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, secRes, auditRes] = await Promise.all([
        fetch(`${API}/admin/users`, { headers }),
        fetch(`${API}/security/status`, { headers }),
        fetch(`${API}/security/audit?limit=50`, { headers })
      ]);
      if (usersRes.ok) setUsers((await usersRes.json()).users || []);
      if (secRes.ok) setSecurity(await secRes.json());
      if (auditRes.ok) setAudit((await auditRes.json()).logs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const changeRole = async (userId, role) => {
    const res = await fetch(`${API}/admin/users/${userId}/role`, { method: 'PUT', headers, body: JSON.stringify({ role }) });
    if (res.ok) { fetchAll(); setInfo('Role updated'); }
  };

  const deactivate = async (userId) => {
    if (!window.confirm('Suspend this user?')) return;
    const res = await fetch(`${API}/admin/users/${userId}/deactivate`, { method: 'POST', headers });
    if (res.ok) { fetchAll(); setInfo('User suspended'); }
  };

  const generateGiftCards = async () => {
    const res = await fetch(`${API}/admin/gift-cards`, {
      method: 'POST', headers, body: JSON.stringify({ amount: giftAmount, currency: 'usd', count: giftCount })
    });
    const data = await res.json();
    if (res.ok) { setGeneratedCards(data.cards || []); setInfo(`${giftCount} gift card(s) created`); }
    else setError(data.error);
  };

  const TABS = ['overview', 'users', 'audit', 'gift-cards'];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>🛡️</span>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Admin Dashboard</h1>
        <span style={{ background: '#ef44441a', border: '1px solid #ef4444', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#ef4444', fontWeight: 700 }}>ADMIN</span>
      </div>

      {error && <div style={{ background: '#2d0d0d', border: '1px solid #ef4444', borderRadius: 8, padding: 10, marginBottom: 14, color: '#f87171', fontSize: 13 }}>{error}</div>}
      {info && <div style={{ background: '#0d2e1a', border: '1px solid #22c55e', borderRadius: 8, padding: 10, marginBottom: 14, color: '#4ade80', fontSize: 13 }}>{info}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 12 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#6366f1' : 'none', border: `1px solid ${tab === t ? '#6366f1' : '#1e293b'}`,
            borderRadius: 8, padding: '6px 14px', color: tab === t ? '#fff' : '#64748b',
            cursor: 'pointer', fontSize: 12, textTransform: 'capitalize', fontWeight: tab === t ? 700 : 400
          }}>{t.replace('-', ' ')}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Total Users" value={users.length} icon="👥" color="#6366f1" />
            <StatCard label="Active Users" value={users.filter(u => u.active).length} icon="🟢" color="#22c55e" />
            <StatCard label="Admins" value={users.filter(u => u.role === 'admin').length} icon="🛡️" color="#ef4444" />
            <StatCard label="Threats Blocked" value={security?.threatsBlocked || 0} icon="🚫" color="#f59e0b" />
            <StatCard label="Audit Entries" value={security?.auditLogSize || 0} icon="📋" color="#3b82f6" />
          </div>
          <div style={{ background: '#111827', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Security Status</h3>
            {security && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { label: 'Encryption', val: security.algorithm?.toUpperCase() || 'AES-256-GCM', ok: true },
                  { label: 'Status', val: security.status || 'secure', ok: security.status === 'secure' },
                  { label: 'Last Scan', val: security.lastScan ? new Date(security.lastScan).toLocaleTimeString() : '—', ok: true },
                  { label: 'Patches Applied', val: security.patchesApplied || 0, ok: true }
                ].map(({ label, val, ok }) => (
                  <div key={label} style={{ flex: '1 1 130px', background: '#0f172a', borderRadius: 8, padding: 10, border: `1px solid ${ok ? '#22c55e22' : '#ef444422'}` }}>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{label}</div>
                    <div style={{ color: ok ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 14 }}>{String(val)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Username', 'Email', 'Role', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => <UserRow key={u.id} user={u} onChangeRole={changeRole} onDeactivate={deactivate} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === 'audit' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Time', 'Event', 'Details'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audit.map((l, i) => <AuditRow key={l.id || i} log={l} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Gift Cards Tab */}
      {tab === 'gift-cards' && (
        <div>
          <div style={{ background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1e293b', maxWidth: 420 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Generate Gift Cards</h3>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Amount (cents)</label>
            <input
              type="number" value={giftAmount} onChange={e => setGiftAmount(Number(e.target.value))}
              style={inputStyle} placeholder="e.g. 999 = $9.99" min={1}
            />
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, margin: '10px 0 4px' }}>Quantity (max 100)</label>
            <input
              type="number" value={giftCount} onChange={e => setGiftCount(Number(e.target.value))}
              style={inputStyle} min={1} max={100}
            />
            <button onClick={generateGiftCards} style={{ ...actionBtn('#6366f1'), width: '100%', padding: '10px 0', marginTop: 12, fontSize: 14, fontWeight: 700 }}>
              Generate Cards
            </button>
          </div>
          {generatedCards.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ color: '#94a3b8', fontSize: 14, marginBottom: 8 }}>Generated Codes:</h4>
              {generatedCards.map(c => (
                <div key={c.code} style={{
                  background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
                  padding: '8px 14px', marginBottom: 6, fontFamily: 'monospace', fontSize: 15,
                  color: '#4ade80', letterSpacing: 2
                }}>
                  {c.code} <span style={{ color: '#64748b', fontSize: 11 }}>— ${(c.amount / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const actionBtn = (color) => ({
  background: `${color}22`, border: `1px solid ${color}`, borderRadius: 6,
  padding: '3px 10px', color, cursor: 'pointer', fontSize: 11, fontWeight: 700
});

const inputStyle = {
  width: '100%', background: '#0f172a', border: '1px solid #1e293b',
  borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13,
  boxSizing: 'border-box'
};
