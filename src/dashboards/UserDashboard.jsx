/**
 * src/dashboards/UserDashboard.jsx
 * Standard user dashboard with analytics summary, projects, and account health
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Quick stat card ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = '#6366f1' }) {
  return (
    <div style={{
      background:   '#1f2937',
      border:       `1px solid #374151`,
      borderRadius: 12,
      padding:      '16px 20px',
      display:      'flex',
      alignItems:   'center',
      gap:          14,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Activity feed item ───────────────────────────────────────────────────────

function ActivityItem({ icon, text, time, type = 'info' }) {
  const colors = { info: '#6366f1', success: '#22c55e', warning: '#f59e0b', error: '#ef4444' };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #1f2937' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${colors[type]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#e5e7eb' }}>{text}</div>
        <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{time}</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function UserDashboard({ onNavigate }) {
  const [user,          setUser]          = useState(null);
  const [stats,         setStats]         = useState(null);
  const [activities,    setActivities]    = useState([]);
  const [subscription,  setSubscription]  = useState(null);
  const [accountHealth, setAccountHealth] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');

  const token = (() => { try { return localStorage.getItem('nexus:accessToken'); } catch { return null; } })();

  const apiFetch = useCallback(async (path) => {
    const res = await fetch(`/api${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Load user profile
        const u = await apiFetch('/auth/me').catch(() => null);
        if (cancelled) return;
        if (u) {
          setUser(u);
          setSubscription({ tier: 'pro', nextBillingDate: '2026-09-30', amount: 9.99 });
          setStats({ messages: 1_247, projects: 5, achievements: 18, filesUploaded: 34 });
          setAccountHealth({ securityScore: 87, mfaEnabled: u.mfa?.enabled ?? false, activeSessions: 2, biometricEnrolled: u.biometric?.enrolled ?? false });
          setActivities([
            { icon: '💬', text: 'New chat session started', time: '2 minutes ago',   type: 'info'    },
            { icon: '🚀', text: 'Project "Void Runner" build succeeded', time: '1 hour ago', type: 'success' },
            { icon: '🔒', text: 'Login from new device detected', time: '3 hours ago', type: 'warning' },
            { icon: '💳', text: 'Pro subscription renewed', time: '2 days ago',    type: 'success' },
            { icon: '🏆', text: 'Achievement unlocked: Speed Coder', time: '3 days ago', type: 'info'    },
          ]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [apiFetch]);

  // ─── Styles ────────────────────────────────────────────────────────────────

  const s = {
    root:    { fontFamily: 'Inter,sans-serif', color: '#e5e7eb', minHeight: '100vh', background: '#0a0a0c', padding: '24px 20px', boxSizing: 'border-box' },
    header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
    title:   { fontSize: 22, fontWeight: 700, color: '#f9fafb' },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 14, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 },
    grid2:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 },
    card:    { background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 },
    btn:     (primary) => ({
      padding: primary ? '10px 18px' : '8px 14px',
      background: primary ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#1f2937',
      border: primary ? 'none' : '1px solid #374151',
      borderRadius: 8, color: primary ? '#fff' : '#e5e7eb',
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
    }),
    badge:   (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 20, fontSize: 11, color }),
  };

  if (loading) {
    return (
      <div style={{ ...s.root, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⟳</div>
          Loading your dashboard…
        </div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>
            {user ? `👋 Hey, ${user.username}!` : 'My Dashboard'}
          </h1>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            {user ? `${user.email} · ${user.role}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btn(false)} onClick={() => onNavigate?.('analytics')}>📊 Analytics</button>
          <button style={s.btn(true)} onClick={() => onNavigate?.('chat')}>💬 New Chat</button>
        </div>
      </div>

      {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20 }}>⚠️ {error}</div>}

      {/* Quick stats */}
      {stats && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Overview</div>
          <div style={s.grid2}>
            <StatCard icon="💬" label="Messages Sent"   value={stats.messages.toLocaleString()} color="#6366f1" />
            <StatCard icon="📁" label="Active Projects" value={stats.projects}                  color="#8b5cf6" />
            <StatCard icon="🏆" label="Achievements"    value={stats.achievements}               color="#f59e0b" />
            <StatCard icon="📎" label="Files Uploaded"  value={stats.filesUploaded}              color="#22c55e" />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Subscription */}
        {subscription && (
          <div style={s.card}>
            <div style={s.sectionTitle}>Subscription</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: 16 }}>⭐ {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Next billing: {subscription.nextBillingDate}</div>
              </div>
              <div style={{ fontWeight: 700, color: '#6366f1', fontSize: 18 }}>${subscription.amount}<span style={{ fontSize: 11, color: '#6b7280' }}>/mo</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btn(true), flex: 1 }} onClick={() => onNavigate?.('upgrade')}>⬆️ Upgrade</button>
              <button style={{ ...s.btn(false), flex: 1 }} onClick={() => onNavigate?.('billing')}>📄 Billing</button>
            </div>
          </div>
        )}

        {/* Account health */}
        {accountHealth && (
          <div style={s.card}>
            <div style={s.sectionTitle}>Account Security</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>Security Score</span>
                <span style={{ fontWeight: 700, color: accountHealth.securityScore >= 80 ? '#22c55e' : '#f59e0b' }}>
                  {accountHealth.securityScore}/100
                </span>
              </div>
              <div style={{ height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${accountHealth.securityScore}%`, background: accountHealth.securityScore >= 80 ? '#22c55e' : '#f59e0b', borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '2FA / MFA',         ok: accountHealth.mfaEnabled,        icon: '🔐' },
                { label: 'Biometrics',         ok: accountHealth.biometricEnrolled, icon: '👆' },
                { label: 'Active sessions',    ok: true,                            icon: '📱', note: `${accountHealth.activeSessions} device(s)` },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span>{item.icon}</span>
                  <span style={{ flex: 1, color: '#d1d5db' }}>{item.label}</span>
                  <span style={s.badge(item.ok ? '#22c55e' : '#f59e0b')}>
                    {item.note ?? (item.ok ? '✓ Active' : '⚠ Off')}
                  </span>
                </div>
              ))}
            </div>
            <button style={{ ...s.btn(false), width: '100%', marginTop: 14 }} onClick={() => onNavigate?.('security')}>
              🛡️ Security Settings
            </button>
          </div>
        )}

        {/* Recent activity */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Recent Activity</div>
          {activities.map((a, i) => (
            <ActivityItem key={i} {...a} />
          ))}
        </div>

        {/* Quick actions */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '💬', label: 'New Chat',       nav: 'chat'      },
              { icon: '📁', label: 'New Project',    nav: 'projects'  },
              { icon: '📊', label: 'Analytics',      nav: 'analytics' },
              { icon: '🎮', label: 'Game Dev',       nav: 'gamedev'   },
              { icon: '🔒', label: 'Security',       nav: 'security'  },
              { icon: '⚙️', label: 'Settings',       nav: 'settings'  },
            ].map(action => (
              <button
                key={action.nav}
                style={{ ...s.btn(false), display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: '10px 8px' }}
                onClick={() => onNavigate?.(action.nav)}
              >
                <span>{action.icon}</span>
                <span style={{ fontSize: 12 }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
