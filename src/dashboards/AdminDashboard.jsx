// src/dashboards/AdminDashboard.jsx
// Nexus AI Pro — Admin Dashboard (superadmin + admin roles)
// Date: 2026-08-18

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Users, ShieldCheck, BarChart3, Database, Server,
  AlertTriangle, CheckCircle, Clock, TrendingUp, Activity,
  Settings, GitBranch, CreditCard, Globe, Loader2,
  UserCheck, UserX, RefreshCw, Zap, Eye
} from 'lucide-react';

const SecurityDashboard  = lazy(() => import('../security/SecurityDashboard.jsx'));
const AnalyticsDashboard = lazy(() => import('../analytics/AnalyticsDashboard.jsx'));

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = '#6366f1', trend }) {
  return (
    <div style={{
      background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)',
      borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ background: `${color}22`, borderRadius: 8, padding: 8, display: 'flex' }}>
          <Icon size={18} color={color} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600,
            color: trend >= 0 ? '#10b981' : '#ef4444' }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── User Table (placeholder — replace with real API data) ───────────────────
function UserManagement({ apiBase }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real user list from admin API
    fetch(`${apiBase}/api/auth/admin/users`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${sessionStorage.getItem('nexus:accessToken') || ''}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setUsers(data.users || []); setLoading(false); })
      .catch(() => {
        // Demo data when API not yet available
        setUsers([
          { id: '1', username: 'alice', email: 'alice@example.com', role: 'admin',    createdAt: '2026-08-01', status: 'active' },
          { id: '2', username: 'bob',   email: 'bob@example.com',   role: 'dev',      createdAt: '2026-08-05', status: 'active' },
          { id: '3', username: 'carol', email: 'carol@example.com', role: 'moderator',createdAt: '2026-08-10', status: 'active' },
          { id: '4', username: 'dan',   email: 'dan@example.com',   role: 'user',     createdAt: '2026-08-12', status: 'suspended' },
        ]);
        setLoading(false);
      });
  }, [apiBase]);

  const ROLE_COLORS = { superadmin: '#7c3aed', admin: '#6366f1', dev: '#0891b2', moderator: '#d97706', user: '#374151', guest: '#4b5563' };

  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #27272a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} /> User Management
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{users.length} total</span>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 size={18} className="spin" /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #27272a)' }}>
                {['User', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem',
                    fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border, #27272a)' }}>
                  <td style={{ padding: '12px 16px', color: '#e5e7eb', fontWeight: 500 }}>{u.username}</td>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '0.85rem' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: 9999,
                      background: `${ROLE_COLORS[u.role] || '#374151'}33`, color: ROLE_COLORS[u.role] || '#9ca3af',
                      textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '0.8rem' }}>{u.createdAt}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px', borderRadius: 9999,
                      background: u.status === 'active' ? '#10b98122' : '#ef444422',
                      color: u.status === 'active' ? '#10b981' : '#ef4444' }}>{u.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button title="View" style={{ background: 'none', border: '1px solid #374151', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#9ca3af' }}><Eye size={12} /></button>
                      <button title="Suspend" style={{ background: 'none', border: '1px solid #374151', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#f59e0b' }}><UserX size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── System Health Panel ──────────────────────────────────────────────────────
function SystemHealth() {
  const services = [
    { name: 'API Server',     status: 'healthy', latency: '24ms'  },
    { name: 'Auth Service',   status: 'healthy', latency: '12ms'  },
    { name: 'Analytics DB',   status: 'healthy', latency: '45ms'  },
    { name: 'Stripe Gateway', status: 'healthy', latency: '180ms' },
    { name: 'Redis Cache',    status: 'healthy', latency: '3ms'   },
    { name: 'Storage',        status: 'healthy', latency: '55ms'  },
  ];

  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #27272a)' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} /> System Health
        </h3>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {services.map(s => (
          <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: '#0000001a', borderRadius: 8, border: '1px solid #ffffff08' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%',
                background: s.status === 'healthy' ? '#10b981' : s.status === 'degraded' ? '#f59e0b' : '#ef4444' }} />
              <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>{s.name}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{s.latency}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Connector Status Panel ───────────────────────────────────────────────────
function ConnectorStatus() {
  const connectors = [
    { name: 'Azure',     icon: '☁️',  status: 'connected'    },
    { name: 'AWS',       icon: '🔶',  status: 'connected'    },
    { name: 'Google',    icon: '🔵',  status: 'connected'    },
    { name: 'GitHub',    icon: '🐙',  status: 'connected'    },
    { name: 'Slack',     icon: '💬',  status: 'disconnected' },
    { name: 'Adobe',     icon: '🔴',  status: 'disconnected' },
    { name: 'Zoom',      icon: '📹',  status: 'disconnected' },
    { name: 'Bitbucket', icon: '🪣',  status: 'disconnected' },
  ];

  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #27272a)' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={16} /> Enterprise Connectors
        </h3>
      </div>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {connectors.map(c => (
          <div key={c.name} style={{
            padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.status === 'connected' ? '#10b98140' : '#27272a'}`,
            background: c.status === 'connected' ? '#10b98110' : 'transparent',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>{c.icon}</span>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e5e7eb' }}>{c.name}</div>
              <div style={{ fontSize: '0.65rem', color: c.status === 'connected' ? '#10b981' : '#4b5563' }}>
                {c.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
const TABS = ['overview', 'users', 'security', 'analytics', 'connectors'];

export default function AdminDashboard({ apiBase = '', session }) {
  const [tab, setTab] = useState('overview');
  const role = session?.role || 'admin';

  const stats = [
    { icon: Users,      label: 'Total Users',       value: '1,284',  trend: 12,  color: '#6366f1' },
    { icon: Activity,   label: 'Active Today',       value: '342',    trend: 5,   color: '#10b981' },
    { icon: ShieldCheck,label: 'Security Score',     value: '94/100', trend: 2,   color: '#3b82f6' },
    { icon: CreditCard, label: 'MRR',                value: '$8,421', trend: 18,  color: '#8b5cf6' },
    { icon: TrendingUp, label: 'Churn Rate',         value: '1.2%',   trend: -0.3,color: '#f59e0b' },
    { icon: Server,     label: 'Uptime',             value: '99.98%', trend: 0,   color: '#06b6d4' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #09090b)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #27272a', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0 }}>
        <div style={{ padding: '16px 0', marginRight: 24 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {role === 'superadmin' ? '👑 Super Admin' : '⚙️ Admin'} Dashboard
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '16px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize',
              color: tab === t ? '#6366f1' : '#6b7280',
              borderBottom: `2px solid ${tab === t ? '#6366f1' : 'transparent'}`,
              transition: 'all 0.15s'
            }}>{t}</button>
          ))}
        </nav>
        <button onClick={() => window.location.reload()} style={{
          background: 'none', border: '1px solid #374151', borderRadius: 6, padding: '6px 12px',
          color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4
        }}><RefreshCw size={12} /> Refresh</button>
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {stats.map(s => <StatCard key={s.label} {...s} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SystemHealth />
              <ConnectorStatus />
            </div>
            <UserManagement apiBase={apiBase} />
          </div>
        )}

        {tab === 'users' && <UserManagement apiBase={apiBase} />}

        {tab === 'security' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 size={24} className="spin" /></div>}>
            <SecurityDashboard apiBase={apiBase} />
          </Suspense>
        )}

        {tab === 'analytics' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 size={24} className="spin" /></div>}>
            <AnalyticsDashboard apiBase={apiBase} />
          </Suspense>
        )}

        {tab === 'connectors' && <ConnectorStatus />}
      </div>
    </div>
  );
}
