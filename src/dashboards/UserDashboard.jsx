// src/dashboards/UserDashboard.jsx
// Nexus AI Pro - User Dashboard
// Role: user — profile, subscription, analytics overview, projects, settings
// Date: 2026-08-01

import React, { useState, useEffect, useCallback } from 'react';

const API = '/api';

export default function UserDashboard({ token, user }) {
  const [subscription, setSubscription] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, analRes, projRes] = await Promise.all([
        fetch(`${API}/payments/subscription`, { headers }),
        fetch(`${API}/analytics/summary`, { headers }),
        fetch(`${API}/projects`, { headers })
      ]);
      if (subRes.ok) setSubscription(await subRes.json());
      if (analRes.ok) setAnalytics(await analRes.json());
      if (projRes.ok) setProjects((await projRes.json()).projects || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const PLAN_COLOR = { free: '#64748b', pro: '#6366f1', enterprise: '#a855f7' };
  const planColor = PLAN_COLOR[subscription?.plan] || '#64748b';

  const TABS = ['overview', 'analytics', 'projects', 'profile'];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: '#1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>
          {user?.username?.[0]?.toUpperCase() || '👤'}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            Welcome, {user?.username || 'User'}
          </h1>
          <div style={{ color: '#64748b', fontSize: 13 }}>{user?.email}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: `${planColor}22`, border: `1px solid ${planColor}`,
            borderRadius: 8, padding: '4px 12px', color: planColor, fontSize: 12, fontWeight: 700
          }}>
            {subscription?.plan?.toUpperCase() || 'FREE'} Plan
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 12 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#6366f1' : 'none', border: `1px solid ${tab === t ? '#6366f1' : '#1e293b'}`,
            borderRadius: 8, padding: '6px 14px', color: tab === t ? '#fff' : '#64748b',
            cursor: 'pointer', fontSize: 12, textTransform: 'capitalize', fontWeight: tab === t ? 700 : 400
          }}>{t}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Subscription</div>
              <div style={{ color: planColor, fontSize: 22, fontWeight: 800 }}>{subscription?.plan?.toUpperCase() || 'FREE'}</div>
              {subscription?.currentPeriodEnd && (
                <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                  Renews: {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                </div>
              )}
              <a href="/checkout" style={{ display: 'block', marginTop: 10, color: '#818cf8', fontSize: 12, textDecoration: 'none' }}>
                {subscription?.plan === 'free' ? '⬆ Upgrade Plan' : '⚙ Manage Plan'}
              </a>
            </div>
            <div style={{ flex: '1 1 200px', background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Total Social Views</div>
              <div style={{ color: '#4ade80', fontSize: 22, fontWeight: 800 }}>
                {analytics?.aggregate?.totalViews?.toLocaleString() || '—'}
              </div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>Today across all platforms</div>
            </div>
            <div style={{ flex: '1 1 200px', background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Active Projects</div>
              <div style={{ color: '#a855f7', fontSize: 22, fontWeight: 800 }}>
                {projects.filter(p => p.status === 'active').length}
              </div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>of {projects.length} total</div>
            </div>
          </div>

          {/* MFA status nudge */}
          <div style={{
            background: '#0d1a2e', border: '1px solid #1e40af', borderRadius: 10,
            padding: 14, display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#93c5fd', fontWeight: 700, fontSize: 13 }}>Security tip</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Enable two-factor authentication for extra account security</div>
            </div>
            <a href="/settings/mfa" style={{ color: '#6366f1', fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>Setup →</a>
          </div>
        </div>
      )}

      {/* Analytics overview */}
      {tab === 'analytics' && analytics && (
        <div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {Object.entries(analytics.platforms || {}).slice(0, 6).map(([key, p]) => {
              const today = p.today || {};
              const primary = today.views ?? today.viewers ?? today.members ?? 0;
              return (
                <div key={key} style={{
                  flex: '1 1 140px', background: '#111827', borderRadius: 12,
                  padding: 14, border: '1px solid #1e293b', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>
                    {['tiktok','instagram','facebook','twitch','discord','lemon8','reddit','redgifs'].includes(key)
                      ? { tiktok:'🎵',instagram:'📸',facebook:'👥',twitch:'🎮',discord:'💬',lemon8:'🍋',reddit:'🤖',redgifs:'🎞️' }[key]
                      : '📊'}
                  </div>
                  <div style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: '#4ade80', fontSize: 18, fontWeight: 800 }}>
                    {primary >= 1000 ? `${(primary/1000).toFixed(1)}K` : primary}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 10 }}>views today</div>
                </div>
              );
            })}
          </div>
          <a href="/analytics" style={{ color: '#818cf8', fontSize: 13, textDecoration: 'none' }}>
            View full analytics dashboard →
          </a>
        </div>
      )}

      {/* Projects */}
      {tab === 'projects' && (
        <div>
          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>
              No projects yet. <a href="/projects" style={{ color: '#818cf8' }}>Create your first one →</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.slice(0, 10).map(p => (
                <div key={p.id} style={{ background: '#111827', borderRadius: 10, padding: 14, border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{p.type === 'game_dev' ? '🎮' : p.type === 'ar_vr_3d' ? '🥽' : p.type === 'app_dev' ? '📱' : '💻'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ background: '#1e293b', borderRadius: 4, height: 4, marginTop: 6 }}>
                      <div style={{ width: `${p.progress}%`, height: '100%', background: '#6366f1', borderRadius: 4 }} />
                    </div>
                  </div>
                  <span style={{ color: '#64748b', fontSize: 12 }}>{p.progress}%</span>
                </div>
              ))}
              <a href="/projects" style={{ color: '#818cf8', fontSize: 13, textDecoration: 'none', marginTop: 4 }}>
                View all projects →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Profile */}
      {tab === 'profile' && user && (
        <div style={{ maxWidth: 420 }}>
          <div style={{ background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Profile</h3>
            {[
              { label: 'Username', val: user.username },
              { label: 'Email', val: user.email },
              { label: 'Role', val: user.role },
              { label: 'Language', val: user.language || 'en' },
              { label: 'MFA', val: user.mfaEnabled ? '✓ Enabled' : '✗ Disabled' },
              { label: 'Biometric', val: user.biometricEnabled ? '✓ Enabled' : '✗ Disabled' },
              { label: 'Member since', val: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' }
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0f172a' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{String(val)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="/settings/mfa" style={{ display: 'block', background: '#111827', border: '1px solid #1e293b', borderRadius: 10, padding: 14, color: '#818cf8', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              🔐 Manage Two-Factor Authentication
            </a>
          </div>
          <div style={{ marginTop: 8 }}>
            <a href="/checkout" style={{ display: 'block', background: '#111827', border: '1px solid #1e293b', borderRadius: 10, padding: 14, color: '#818cf8', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              💳 Manage Subscription
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
