/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * src/dashboards/RoleDashboards.jsx
 * Separate dashboard views for: admin, developer, moderator, user.
 * Each role sees only the controls/data appropriate to their level.
 * Date: 2026-08-29
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthSystem.jsx';
import { t } from '../i18n/index.js';
import AnalyticsDashboard from '../analytics/AnalyticsDashboard.jsx';

// ── Shared stat card ───────────────────────────────────────────────────────
function KpiCard({ label, value, emoji, color = '#3B82F6', sub }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${color}33`, borderRadius: 12,
      padding: '18px 22px', flex: '1 1 180px', minWidth: 180,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{emoji}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Nav sidebar ────────────────────────────────────────────────────────────
function Sidebar({ role, activeTab, onTab }) {
  const ROLE_TABS = {
    admin: [
      { id: 'overview',  label: 'Overview',      emoji: '📊' },
      { id: 'analytics', label: 'Analytics',     emoji: '📈' },
      { id: 'security',  label: 'Security',      emoji: '🔒' },
      { id: 'projects',  label: 'Projects',      emoji: '🗂' },
      { id: 'gaming',    label: 'Gaming',        emoji: '🎮' },
      { id: 'users',     label: 'Users',         emoji: '👥' },
      { id: 'billing',   label: 'Billing',       emoji: '💳' },
      { id: 'system',    label: 'System',        emoji: '⚙️' },
    ],
    developer: [
      { id: 'overview',  label: 'Overview',      emoji: '📊' },
      { id: 'analytics', label: 'Analytics',     emoji: '📈' },
      { id: 'security',  label: 'Security',      emoji: '🔒' },
      { id: 'projects',  label: 'Projects',      emoji: '🗂' },
      { id: 'gaming',    label: 'Gaming',        emoji: '🎮' },
      { id: 'billing',   label: 'Billing',       emoji: '💳' },
    ],
    moderator: [
      { id: 'overview',  label: 'Overview',      emoji: '📊' },
      { id: 'analytics', label: 'Analytics',     emoji: '📈' },
      { id: 'users',     label: 'Users',         emoji: '👥' },
      { id: 'billing',   label: 'Billing',       emoji: '💳' },
    ],
    user: [
      { id: 'overview',  label: 'My Dashboard',  emoji: '🏠' },
      { id: 'analytics', label: 'Analytics',     emoji: '📈' },
      { id: 'projects',  label: 'My Projects',   emoji: '🗂' },
      { id: 'gaming',    label: 'My Games',      emoji: '🎮' },
      { id: 'billing',   label: 'Billing',       emoji: '💳' },
    ],
  };

  const tabs = ROLE_TABS[role] ?? ROLE_TABS.user;

  return (
    <nav style={{
      width: 220, flexShrink: 0, background: '#1e1b4b', minHeight: '100vh',
      padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ padding: '0 10px 20px', borderBottom: '1px solid #312e81' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>🔮 Nexus AI</div>
        <div style={{ fontSize: 11, color: '#818cf8', marginTop: 2 }}>Pro Platform</div>
      </div>

      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onTab(tab.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%',
            background: activeTab === tab.id ? '#3730a3' : 'transparent',
            color: activeTab === tab.id ? '#fff' : '#c7d2fe',
            fontWeight: activeTab === tab.id ? 700 : 400,
            fontSize: 14, transition: 'background 0.15s',
          }}>
          <span>{tab.emoji}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Admin overview ─────────────────────────────────────────────────────────
function AdminOverview() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800 }}>👑 Admin Dashboard</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total Users"     value="—"  emoji="👥" color="#3B82F6" sub="Across all roles" />
        <KpiCard label="Active Sessions" value="—"  emoji="🟢" color="#10B981" sub="Right now" />
        <KpiCard label="Revenue MTD"     value="—"  emoji="💰" color="#F59E0B" sub="This month" />
        <KpiCard label="Security Score"  value="—"  emoji="🔒" color="#8B5CF6" sub="/100" />
        <KpiCard label="API Calls 24h"   value="—"  emoji="⚡" color="#EC4899" sub="Last 24 hours" />
        <KpiCard label="Uptime"          value="—"  emoji="📡" color="#06B6D4" sub="30-day average" />
      </div>
      <p style={{ color: '#6B7280', fontSize: 14 }}>
        Signed in as <strong>{user.username}</strong> ({user.role}) · {user.email}
      </p>
    </div>
  );
}

// ── Developer overview ─────────────────────────────────────────────────────
function DeveloperOverview() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800 }}>⚙️ Developer Dashboard</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <KpiCard label="My Projects"  value="—"  emoji="🗂" color="#3B82F6" />
        <KpiCard label="Open Tasks"   value="—"  emoji="📋" color="#F59E0B" />
        <KpiCard label="Commits 7d"   value="—"  emoji="🔀" color="#10B981" />
        <KpiCard label="CI Status"    value="—"  emoji="✅" color="#8B5CF6" />
      </div>
      <p style={{ color: '#6B7280', fontSize: 14 }}>
        Signed in as <strong>{user.username}</strong> ({user.role})
      </p>
    </div>
  );
}

// ── Moderator overview ─────────────────────────────────────────────────────
function ModeratorOverview() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800 }}>🛡 Moderator Dashboard</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Active Users"    value="—"  emoji="👥" color="#3B82F6" />
        <KpiCard label="Reports Queue"   value="—"  emoji="🚩" color="#EF4444" />
        <KpiCard label="Resolved Today"  value="—"  emoji="✅" color="#10B981" />
      </div>
      <p style={{ color: '#6B7280', fontSize: 14 }}>
        Signed in as <strong>{user.username}</strong> ({user.role})
      </p>
    </div>
  );
}

// ── User overview ──────────────────────────────────────────────────────────
function UserOverview() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800 }}>🏠 My Dashboard</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <KpiCard label="My Projects"   value="—"  emoji="🗂" color="#3B82F6" />
        <KpiCard label="Chats"         value="—"  emoji="💬" color="#8B5CF6" />
        <KpiCard label="Achievements"  value="—"  emoji="🏆" color="#F59E0B" />
        <KpiCard label="Plan"          value={user.role === 'user' ? 'Free' : 'Pro'} emoji="⭐" color="#10B981" />
      </div>
      <p style={{ color: '#6B7280', fontSize: 14 }}>
        Welcome back, <strong>{user.username}</strong>! 👋
      </p>
    </div>
  );
}

// ── User management (admin/mod) ────────────────────────────────────────────
function UserManagement() {
  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800 }}>👥 User Management</h2>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          User management table — connect to <code>/api/auth/admin/*</code> endpoints.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['Username', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#6B7280', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ padding: '20px 10px', textAlign: 'center', color: '#9CA3AF' }}>
                No users loaded — authenticate and call /api/auth/admin/list
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Billing panel ──────────────────────────────────────────────────────────
function BillingPanel() {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState([]);
  const [sub,   setSub]   = useState(null);

  useEffect(() => {
    const h = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      fetch('/api/billing/plans', { headers: h }).then(r => r.json()),
      fetch('/api/billing/subscription', { headers: h }).then(r => r.json()),
    ]).then(([p, s]) => { setPlans(p.plans ?? []); setSub(s); }).catch(() => {});
  }, [accessToken]);

  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800 }}>💳 Billing</h2>
      {sub && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 14 }}>
          Current plan: <strong>{sub.planId}</strong> — Status: <strong>{sub.status}</strong>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {plans.map(plan => (
          <div key={plan.id} style={{
            background: '#fff', border: '2px solid #e5e7eb', borderRadius: 12, padding: 20, flex: '1 1 200px', minWidth: 200,
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{plan.badge}</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontWeight: 700, color: '#3B82F6', marginBottom: 12 }}>
              {plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(2)}/mo`}
            </div>
            <ul style={{ padding: '0 0 0 16px', margin: 0, fontSize: 13, color: '#374151' }}>
              {(plan.features ?? []).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            {plan.id !== 'free' && (
              <button onClick={() => alert('Stripe checkout — configure STRIPE_PRICE_PRO in .env')}
                style={{ marginTop: 14, width: '100%', padding: '8px 0', background: '#3B82F6', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                {t('billing.subscribe')}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, padding: 16, background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 8, fontSize: 13 }}>
        <strong>🎁 Gift Card:</strong> Redeem at <code>POST /api/billing/gift-card</code><br/>
        <strong>₿ Crypto:</strong> BTC, ETH, USDC, SOL, LTC via Coinbase Commerce — configure <code>COINBASE_COMMERCE_API_KEY</code><br/>
        <strong>💳 Cards:</strong> Visa, Mastercard, Amex, Discover, Diners, UnionPay via Stripe
      </div>
    </div>
  );
}

// ── System panel (admin only) ──────────────────────────────────────────────
function SystemPanel() {
  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800 }}>⚙️ System</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {[
          { label: 'Redis', status: '⚪ Not connected', note: 'Set REDIS_URL' },
          { label: 'PostgreSQL', status: '⚪ Not connected', note: 'Set DATABASE_URL' },
          { label: 'Stripe',  status: process.env.STRIPE_SECRET_KEY ? '🟢 Configured' : '⚪ Not configured', note: 'Set STRIPE_SECRET_KEY' },
          { label: 'Azure', status: '⚪ Not connected', note: 'Set AZURE_CLIENT_ID etc.' },
          { label: 'AWS',    status: '⚪ Not connected', note: 'Set AWS_ACCESS_KEY_ID etc.' },
          { label: 'Google Cloud', status: '⚪ Not connected', note: 'Set GOOGLE_APPLICATION_CREDENTIALS' },
          { label: 'Slack',  status: '⚪ Not connected', note: 'Set SLACK_WEBHOOK_URL' },
          { label: 'Zoom',   status: '⚪ Not connected', note: 'Set ZOOM_API_KEY' },
          { label: 'GitHub',  status: '⚪ Not connected', note: 'Set GITHUB_TOKEN' },
          { label: 'Bitbucket', status: '⚪ Not connected', note: 'Set BITBUCKET_TOKEN' },
        ].map(item => (
          <div key={item.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>{item.status}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>Env: <code>{item.note}</code></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root dashboard shell ───────────────────────────────────────────────────
export default function RoleDashboard() {
  const { user, logout, accessToken } = useAuth();
  const [activeTab, setActiveTab]     = useState('overview');

  const OVERVIEW_COMPONENTS = {
    admin:     <AdminOverview />,
    developer: <DeveloperOverview />,
    moderator: <ModeratorOverview />,
    user:      <UserOverview />,
  };

  function renderContent() {
    switch (activeTab) {
      case 'overview':  return OVERVIEW_COMPONENTS[user.role] ?? <UserOverview />;
      case 'analytics': return <AnalyticsDashboard token={accessToken} />;
      case 'users':     return <UserManagement />;
      case 'billing':   return <BillingPanel />;
      case 'system':    return user.role === 'admin' ? <SystemPanel /> : null;
      case 'projects':  return <div><h2>🗂 {t('projects.title')}</h2><p style={{ color: '#6B7280' }}>Project dashboard — see /api/projects/*</p></div>;
      case 'gaming':    return <div><h2>🎮 {t('gaming.title')}</h2><p style={{ color: '#6B7280' }}>Game dashboard — see /api/gaming/*</p></div>;
      case 'security':  return <div><h2>🔒 {t('security.title')}</h2><p style={{ color: '#6B7280' }}>Security dashboard — see /api/security/*</p></div>;
      default:          return null;
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Sidebar role={user.role} activeTab={activeTab} onTab={setActiveTab} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            👤 <strong>{user.username}</strong> · {user.role} · {user.email}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={logout}
              style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 14px', background: '#fff',
                cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
              {t('auth.logout')}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 24 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
