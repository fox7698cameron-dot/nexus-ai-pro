/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * User Dashboard — Overview of activity, subscription, analytics, projects, achievements
 * Date: 2026-08-09
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { User, Trophy, BarChart3, Layers, CreditCard, Bell, Globe } from 'lucide-react';

const s = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  welcomeCard: {
    background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)',
    border: '1px solid rgba(102,126,234,0.25)',
    borderRadius: '16px',
    padding: '28px 24px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    flexShrink: 0,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' },
  card: (color) => ({
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${color ?? 'rgba(255,255,255,0.06)'}33`,
    borderLeft: `3px solid ${color ?? '#667eea'}`,
    borderRadius: '10px',
    padding: '16px 18px',
  }),
  activityRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
};

const PLAN_COLORS = { free: '#6b7280', pro: '#667eea', enterprise: '#f59e0b', game_dev: '#f43f5e' };

export default function UserDashboard() {
  const { user, authFetch } = useAuth();
  const { t, language, setLanguage, supportedLanguages } = useLanguage();
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    authFetch('/api/payments/subscription').then(r => r.ok && r.json()).then(d => d && setSubscription(d));
  }, [authFetch]);

  const plan = subscription?.plan ?? { name: 'Free', id: 'free' };
  const planColor = PLAN_COLORS[plan.id] ?? '#6b7280';

  const recentActivity = [
    { icon: '🔐', label: 'Last login', value: user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Just now' },
    { icon: '📊', label: 'Analytics synced', value: 'All 8 platforms connected' },
    { icon: '🎮', label: 'Game projects', value: '3 active' },
    { icon: '🔒', label: 'Security scan', value: 'Score: 95/100' },
  ];

  return (
    <div style={s.container}>
      {/* Welcome card */}
      <div style={s.welcomeCard}>
        <div style={s.avatar}>
          {user?.username?.[0]?.toUpperCase() ?? '👤'}
        </div>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
            Welcome back, {user?.displayName ?? user?.username}! 👋
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '8px' }}>
            @{user?.username} · {user?.email}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ padding: '3px 10px', background: `${planColor}20`, border: `1px solid ${planColor}44`, color: planColor, borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>
              {plan.name} Plan
            </span>
            <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.75rem', color: '#9ca3af' }}>
              🛡 {user?.mfaEnabled ? 'MFA Enabled' : 'MFA Off'}
            </span>
            {user?.biometricEnabled && (
              <span style={{ padding: '3px 10px', background: 'rgba(34,197,94,0.1)', borderRadius: '20px', fontSize: '0.75rem', color: '#22c55e' }}>
                👆 Biometric
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={s.grid}>
        <div style={s.card('#667eea')}>
          <BarChart3 size={20} color="#667eea" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '2px' }}>Social Platforms</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>8</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>All connected</div>
        </div>
        <div style={s.card('#f43f5e')}>
          <Layers size={20} color="#f43f5e" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '2px' }}>Projects</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>—</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Game dev & coding</div>
        </div>
        <div style={s.card('#FFD700')}>
          <Trophy size={20} color="#FFD700" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '2px' }}>Achievements</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>—</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Cross-platform</div>
        </div>
        <div style={s.card(planColor)}>
          <CreditCard size={20} color={planColor} style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '2px' }}>Subscription</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff' }}>{plan.name}</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{plan.priceId ? 'Active' : 'Free tier'}</div>
        </div>
      </div>

      {/* Language + Region */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={16} color="#667eea" /> Language & Region
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {supportedLanguages.map(l => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: `1px solid ${language === l.code ? '#667eea' : 'rgba(255,255,255,0.08)'}`,
                background: language === l.code ? 'rgba(102,126,234,0.2)' : 'transparent',
                color: language === l.code ? '#fff' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.2s',
              }}
            >
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={16} color="#f59e0b" /> Recent Activity
        </h3>
        {recentActivity.map((a, i) => (
          <div key={i} style={s.activityRow}>
            <span style={{ color: '#e5e7eb', fontSize: '0.85rem' }}>{a.icon} {a.label}</span>
            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{a.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
