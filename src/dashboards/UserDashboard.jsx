/**
 * @fileoverview UserDashboard - Standard User Home Dashboard
 * @author Cameron Fox <fox7698cameron@gmail.com>
 * @copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 * @date 2026-08-30
 *
 * Personalised home screen showing welcome, quick stats, activity feed,
 * subscription details, social analytics summary, game progress, quick
 * actions, notifications, and account health.
 * All data sourced from /api/user/* endpoints.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  FolderOpen,
  Trophy,
  Bell,
  BellOff,
  Shield,
  Lock,
  Unlock,
  Activity,
  TrendingUp,
  Zap,
  Star,
  ArrowUp,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  BarChart2,
  Gamepad2,
  CreditCard,
  Users,
  Settings,
  Eye,
  ExternalLink,
  Flame,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
const T = {
  bg: '#0a0a0c',
  surface: '#111116',
  surfaceElevated: '#18181f',
  border: '#26262f',
  accent: '#6366f1',
  accentLight: '#818cf8',
  textPrimary: '#f1f1f3',
  textSecondary: '#8b8b9a',
  critical: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  purple: '#a855f7',
  pink: '#ec4899',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0));
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
};

async function apiFetch(path, opts = {}) {
  const res = await fetch(`/api/user${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// UI atoms
// ---------------------------------------------------------------------------
const Card = ({ children, style = {}, glass }) => (
  <div
    style={{
      background: glass ? 'rgba(99,102,241,0.06)' : T.surface,
      border: `1px solid ${glass ? 'rgba(99,102,241,0.2)' : T.border}`,
      borderRadius: 14,
      padding: '18px 20px',
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    {Icon && <Icon size={16} color={T.accent} />}
    <span style={{ color: T.textPrimary, fontWeight: 600, fontSize: 14 }}>{children}</span>
  </div>
);

const Badge = ({ label, color = T.textSecondary }) => (
  <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
    {label}
  </span>
);

const ProgressBar = ({ value, max = 100, color = T.accent, thin }) => (
  <div style={{ background: T.border, borderRadius: 99, height: thin ? 4 : 6, overflow: 'hidden', width: '100%' }}>
    <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
  </div>
);

const Btn = ({ children, onClick, variant = 'primary', icon: Icon, small, full }) => {
  const styles = {
    primary: { background: T.accent, color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: T.textSecondary, border: `1px solid ${T.border}` },
    outline: { background: T.accent + '15', color: T.accent, border: `1px solid ${T.accent}44` },
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: small ? '6px 12px' : '9px 18px',
        borderRadius: 9,
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: 'pointer',
        width: full ? '100%' : undefined,
        ...styles[variant],
      }}
    >
      {Icon && <Icon size={small ? 13 : 15} />}
      {children}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Welcome header
// ---------------------------------------------------------------------------
const WelcomeHeader = ({ user }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const initial = (user?.name ?? user?.email ?? '?')[0].toUpperCase();

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${T.accent}22 0%, ${T.purple}11 100%)`,
        border: `1px solid ${T.accent}33`,
        borderRadius: 16,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            style={{ width: 56, height: 56, borderRadius: '50%', border: `2px solid ${T.accent}` }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.accent}, ${T.purple})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
        )}
        <div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 2 }}>{greeting},</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
            {user?.name ?? 'Welcome back'}
          </h2>
          <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
            {user?.email} · <Badge label={user?.plan ?? 'free'} color={user?.plan === 'enterprise' ? T.accent : user?.plan === 'pro' ? T.success : T.textSecondary} />
          </div>
        </div>
      </div>
      <Btn variant="outline" icon={Settings} small>Account Settings</Btn>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Quick stats
// ---------------------------------------------------------------------------
const QuickStats = ({ stats }) => {
  const items = [
    { label: 'Messages Sent', value: fmt(stats?.messagesSent), icon: MessageSquare, color: T.accent },
    { label: 'Projects', value: fmt(stats?.projects), icon: FolderOpen, color: T.purple },
    { label: 'Achievements', value: fmt(stats?.achievements), icon: Trophy, color: '#f59e0b' },
    { label: 'Streak', value: `${stats?.streakDays ?? 0}d`, icon: Flame, color: '#f97316' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
      {items.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} color={color} />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{value ?? '—'}</div>
          <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>{label}</div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------
const activityIcon = (type) => {
  const map = {
    message: MessageSquare,
    project: FolderOpen,
    achievement: Trophy,
    login: Lock,
    subscription: CreditCard,
    social: Users,
    game: Gamepad2,
  };
  return map[type] ?? Activity;
};

const ActivityFeed = ({ activities = [] }) => (
  <Card>
    <SectionTitle icon={Activity}>Recent Activity</SectionTitle>
    {activities.length === 0 ? (
      <p style={{ color: T.textSecondary, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No recent activity.</p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {activities.slice(0, 12).map((a, i) => {
          const Icon = activityIcon(a.type);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 0',
                borderBottom: i < activities.length - 1 ? `1px solid ${T.border}22` : 'none',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: T.accent + '18',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={14} color={T.accent} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.textPrimary }}>{a.description}</div>
                {a.detail && <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.detail}</div>}
              </div>
              <div style={{ fontSize: 11, color: T.textSecondary, whiteSpace: 'nowrap' }}>{fmtDate(a.timestamp)}</div>
            </div>
          );
        })}
      </div>
    )}
  </Card>
);

// ---------------------------------------------------------------------------
// Subscription panel
// ---------------------------------------------------------------------------
const SubscriptionPanel = ({ sub }) => {
  const usagePct = sub?.usage != null && sub?.limit != null
    ? Math.round((sub.usage / sub.limit) * 100)
    : null;

  return (
    <Card>
      <SectionTitle icon={CreditCard}>My Subscription</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge label={sub?.plan ?? 'Free'} color={sub?.plan === 'enterprise' ? T.accent : sub?.plan === 'pro' ? T.success : T.textSecondary} />
            {sub?.renewsAt && (
              <span style={{ fontSize: 11, color: T.textSecondary }}>
                <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                Renews {fmtDate(sub.renewsAt)}
              </span>
            )}
          </div>
          {sub?.price != null && (
            <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginTop: 6 }}>
              ${sub.price}<span style={{ fontSize: 12, color: T.textSecondary }}>/mo</span>
            </div>
          )}
        </div>
        <Btn variant="outline" icon={ArrowUp} small>Upgrade</Btn>
      </div>

      {usagePct != null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: T.textSecondary }}>{sub.usageLabel ?? 'Usage'}</span>
            <span style={{ color: usagePct > 90 ? T.critical : usagePct > 75 ? T.warning : T.textPrimary }}>
              {fmt(sub.usage)} / {fmt(sub.limit)} ({usagePct}%)
            </span>
          </div>
          <ProgressBar value={sub.usage} max={sub.limit} color={usagePct > 90 ? T.critical : usagePct > 75 ? T.warning : T.accent} />
        </div>
      )}

      {sub?.features?.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sub.features.map((f) => (
            <span key={f} style={{ fontSize: 11, color: T.success, background: T.success + '15', border: `1px solid ${T.success}33`, borderRadius: 6, padding: '2px 8px' }}>
              <CheckCircle size={10} style={{ display: 'inline', marginRight: 3 }} />
              {f}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Social analytics summary
// ---------------------------------------------------------------------------
const SocialAnalyticsSummary = ({ analytics }) => {
  const metrics = [
    { label: 'Total Followers', value: fmt(analytics?.followers), icon: Users, color: T.accent },
    { label: 'Impressions (7d)', value: fmt(analytics?.impressions7d), icon: Eye, color: T.purple },
    { label: 'Engagement', value: analytics?.engagementRate != null ? `${analytics.engagementRate}%` : '—', icon: TrendingUp, color: T.success },
    { label: 'Posts (30d)', value: fmt(analytics?.posts30d), icon: MessageSquare, color: T.warning },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionTitle icon={BarChart2}>Social Analytics</SectionTitle>
        <Btn variant="ghost" icon={ExternalLink} small>Full Report</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: T.surfaceElevated, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon size={13} color={color} />
              <span style={{ fontSize: 11, color: T.textSecondary }}>{label}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Game progress
// ---------------------------------------------------------------------------
const GameProgress = ({ game }) => {
  const xpPct = game?.xp != null && game?.xpForNextLevel != null
    ? Math.round((game.xp / game.xpForNextLevel) * 100)
    : 0;

  return (
    <Card>
      <SectionTitle icon={Gamepad2}>Game Progress</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${T.purple}, ${T.accent})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {game?.level ?? 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.textPrimary, fontWeight: 600, fontSize: 14 }}>Level {game?.level ?? 1}</div>
          <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
            {fmt(game?.xp ?? 0)} / {fmt(game?.xpForNextLevel ?? 1000)} XP
          </div>
          <ProgressBar value={xpPct} color={T.purple} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Rank', value: game?.rank ?? '—', icon: Star },
          { label: 'Achievements', value: fmt(game?.achievements), icon: Trophy },
          { label: 'Streak', value: `${game?.streakDays ?? 0}d`, icon: Flame },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={{ background: T.surfaceElevated, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <Icon size={16} color={T.accent} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{value}</div>
            <div style={{ fontSize: 10, color: T.textSecondary }}>{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------
const QuickActions = () => {
  const actions = [
    { label: 'New Chat', icon: MessageSquare, color: T.accent, href: '#/chat/new' },
    { label: 'New Project', icon: Plus, color: T.purple, href: '#/projects/new' },
    { label: 'Analytics', icon: BarChart2, color: T.success, href: '#/analytics' },
    { label: 'Game Hub', icon: Gamepad2, color: '#f97316', href: '#/game' },
  ];

  return (
    <Card>
      <SectionTitle icon={Zap}>Quick Actions</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {actions.map(({ label, icon: Icon, color, href }) => (
          <a
            key={label}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: color + '14',
              border: `1px solid ${color}33`,
              borderRadius: 10,
              padding: '12px 14px',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} color={color} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{label}</span>
          </a>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Notification center
// ---------------------------------------------------------------------------
const NotificationCenter = ({ notifications = [], onMarkRead }) => {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} color={T.accent} />
          <span style={{ color: T.textPrimary, fontWeight: 600, fontSize: 14 }}>Notifications</span>
          {unread > 0 && (
            <div style={{ background: T.critical, color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
              {unread}
            </div>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={onMarkRead}
            style={{ background: 'none', border: 'none', color: T.accent, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
          >
            Mark all read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <BellOff size={24} color={T.textSecondary} style={{ marginBottom: 8 }} />
          <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 300, overflowY: 'auto' }}>
          {notifications.slice(0, 10).map((n, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 0',
                borderBottom: i < notifications.length - 1 ? `1px solid ${T.border}22` : 'none',
                opacity: n.read ? 0.6 : 1,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? T.border : T.accent, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.textPrimary, fontWeight: n.read ? 400 : 500 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 1 }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 3 }}>{fmtDate(n.timestamp)}</div>
              </div>
              {n.type === 'warning' && <AlertTriangle size={14} color={T.warning} />}
              {n.type === 'success' && <CheckCircle size={14} color={T.success} />}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Account health
// ---------------------------------------------------------------------------
const AccountHealth = ({ security }) => {
  const score = security?.score ?? 0;
  const scoreColor = score >= 80 ? T.success : score >= 60 ? T.warning : T.critical;

  const checks = [
    { label: '2FA Enabled', ok: security?.mfaEnabled, fix: 'Enable 2FA' },
    { label: 'Strong Password', ok: security?.strongPassword, fix: 'Update Password' },
    { label: 'Recent Login Check', ok: security?.loginCheckPassed, fix: 'Review Logins' },
    { label: 'Email Verified', ok: security?.emailVerified, fix: 'Verify Email' },
  ];

  return (
    <Card>
      <SectionTitle icon={Shield}>Account Health</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg width="64" height="64">
            <circle cx="32" cy="32" r="26" fill="none" stroke={T.border} strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - score / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill={scoreColor} fontSize="13" fontWeight="700">{score}</text>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.textPrimary, fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Security Score</div>
          <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 8 }}>
            {security?.activeSessions ?? 0} active session{security?.activeSessions !== 1 ? 's' : ''}
          </div>
          <Badge
            label={score >= 80 ? 'Secure' : score >= 60 ? 'Fair' : 'At Risk'}
            color={scoreColor}
          />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map(({ label, ok, fix }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {ok ? <CheckCircle size={14} color={T.success} /> : <AlertTriangle size={14} color={T.warning} />}
              <span style={{ fontSize: 13, color: ok ? T.textPrimary : T.textSecondary }}>{label}</span>
            </div>
            {!ok && (
              <button style={{ background: 'none', border: 'none', color: T.accent, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                {fix} →
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

/**
 * UserDashboard
 *
 * Standard user home dashboard. Fetches all data from /api/user/* endpoints.
 * Displays welcome header, quick stats, activity, subscription, analytics,
 * game progress, quick actions, notifications, and account health.
 *
 * @component
 * @returns {JSX.Element}
 */
const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [game, setGame] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, dashData] = await Promise.all([
        apiFetch('/profile'),
        apiFetch('/dashboard'),
      ]);
      setUser(profile);
      setStats(dashData.stats);
      setActivities(dashData.activities ?? []);
      setSubscription(dashData.subscription);
      setAnalytics(dashData.analytics);
      setGame(dashData.game);
      setNotifications(dashData.notifications ?? []);
      setSecurity(dashData.security);
    } catch (e) {
      console.error('UserDashboard load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Subscribe to live updates from global socket
  useEffect(() => {
    const ws = window.nexusSocket;
    if (!ws) return;
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data ?? event);
        if (msg.type === 'notification:new') {
          setNotifications((ns) => [msg.notification, ...ns]);
        }
        if (msg.type === 'stats:update') {
          setStats((s) => ({ ...s, ...msg.data }));
        }
        if (msg.type === 'activity:new') {
          setActivities((a) => [msg.activity, ...a].slice(0, 50));
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    } catch {}
  }, []);

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} color={T.accent} style={{ marginBottom: 12 }} />
          <p style={{ color: T.textSecondary, fontSize: 14 }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: T.bg,
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: T.textPrimary,
        padding: '24px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 24 }}>
          <WelcomeHeader user={user} />
        </div>

        {/* Quick stats */}
        <div style={{ marginBottom: 24 }}>
          <QuickStats stats={stats} />
        </div>

        {/* Main grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ActivityFeed activities={activities} />
            <SocialAnalyticsSummary analytics={analytics} />
          </div>

          {/* Middle column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SubscriptionPanel sub={subscription} />
            <GameProgress game={game} />
            <QuickActions />
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <NotificationCenter notifications={notifications} onMarkRead={markAllRead} />
            <AccountHealth security={security} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
