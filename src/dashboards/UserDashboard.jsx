// src/dashboards/UserDashboard.jsx
// Nexus AI Pro — End-User Dashboard
// Date: 2026-08-18

import React, { useState, lazy, Suspense } from 'react';
import {
  MessageSquare, Code, Image, Video, Gamepad2, Smartphone,
  CreditCard, GitBranch, Star, Clock, Zap, Loader2,
  TrendingUp, Award, Target, Calendar
} from 'lucide-react';

const ProjectTracker = lazy(() => import('../projects/ProjectTracker.jsx'));
const StripeCheckout = lazy(() => import('../payments/StripeCheckout.jsx'));

// ─── Welcome Banner ───────────────────────────────────────────────────────────
function WelcomeBanner({ session }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = session?.username || session?.email?.split('@')[0] || 'there';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
      borderRadius: 16, padding: '24px 28px', color: '#fff', marginBottom: 0
    }}>
      <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: 4 }}>{greeting},</div>
      <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{displayName} 👋</h2>
      <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
        Here's your Nexus AI Pro workspace. What would you like to do today?
      </p>
    </div>
  );
}

// ─── Quick Action Cards ───────────────────────────────────────────────────────
function QuickActions({ onToolSelect }) {
  const actions = [
    { icon: MessageSquare, label: 'Chat with AI',   sub: '40+ models',        color: '#6366f1', tool: 'chat' },
    { icon: Code,          label: 'Generate Code',  sub: 'Any language',      color: '#0891b2', tool: 'code' },
    { icon: Image,         label: 'Create Image',   sub: 'AI art generation', color: '#ec4899', tool: 'image' },
    { icon: Gamepad2,      label: 'Game Dev',       sub: 'Unity, UE5, Godot', color: '#10b981', tool: 'gamedev' },
    { icon: Smartphone,    label: 'App Dev',        sub: 'iOS, Android, Web', color: '#f59e0b', tool: 'appdev' },
    { icon: GitBranch,     label: 'My Projects',    sub: 'Track progress',    color: '#8b5cf6', tool: 'projects' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
      {actions.map(a => (
        <button key={a.tool} onClick={() => onToolSelect?.(a.tool)} style={{
          background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)',
          borderRadius: 12, padding: '18px 16px', cursor: 'pointer', textAlign: 'left',
          transition: 'border-color 0.15s, transform 0.1s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border, #27272a)'; e.currentTarget.style.transform = ''; }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${a.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <a.icon size={18} color={a.color} />
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e5e7eb', marginBottom: 2 }}>{a.label}</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{a.sub}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Usage Summary ────────────────────────────────────────────────────────────
function UsageSummary({ session }) {
  const plan = session?.plan || 'free';
  const PLAN_LIMITS = { free: 5, pro: Infinity, enterprise: Infinity };
  const used = 3;
  const limit = PLAN_LIMITS[plan];

  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrendingUp size={14} /> Usage — {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Chats Today', value: `${used}${limit === Infinity ? '' : `/${limit}`}`, icon: MessageSquare },
          { label: 'Projects',    value: '2',  icon: GitBranch },
          { label: 'Images',      value: '5',  icon: Image     },
        ].map(s => (
          <div key={s.label} style={{ padding: '12px', background: '#ffffff08', borderRadius: 8, textAlign: 'center' }}>
            <s.icon size={14} color="#6b7280" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>
      {plan === 'free' && (
        <div style={{ padding: '10px 12px', background: '#6366f110', border: '1px solid #6366f140',
          borderRadius: 8, fontSize: '0.8rem', color: '#a5b4fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🚀 Upgrade to Pro for unlimited chats + all models</span>
          <Zap size={14} color="#818cf8" />
        </div>
      )}
    </div>
  );
}

// ─── Recent Activity ──────────────────────────────────────────────────────────
function RecentActivity() {
  const items = [
    { icon: MessageSquare, label: 'Chat with Claude Sonnet 5',     time: '2 min ago',   color: '#6366f1' },
    { icon: Code,          label: 'Generated: React hook template', time: '1 hr ago',    color: '#0891b2' },
    { icon: Image,         label: 'Created: Pixel art character',   time: '3 hrs ago',   color: '#ec4899' },
    { icon: GitBranch,     label: 'Updated project: Mobile App',    time: 'Yesterday',   color: '#8b5cf6' },
  ];

  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #27272a' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} /> Recent Activity
        </h3>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ padding: '12px 18px', borderBottom: i < items.length - 1 ? '1px solid #27272a22' : 'none',
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <item.icon size={14} color={item.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6b7280', flexShrink: 0 }}>{item.time}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main User Dashboard ──────────────────────────────────────────────────────
const TABS = ['home', 'projects', 'billing'];

export default function UserDashboard({ apiBase = '', session, onToolSelect }) {
  const [tab, setTab] = useState('home');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #09090b)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #27272a', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ padding: '16px 0', marginRight: 24 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc' }}>🏠 My Workspace</span>
        </div>
        <nav style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '16px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize',
              color: tab === t ? '#818cf8' : '#6b7280',
              borderBottom: `2px solid ${tab === t ? '#818cf8' : 'transparent'}`,
              transition: 'all 0.15s'
            }}>{t === 'billing' ? 'Plans & Billing' : t === 'home' ? 'Overview' : t}</button>
          ))}
        </nav>
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === 'home' && (
          <>
            <WelcomeBanner session={session} />
            <QuickActions onToolSelect={onToolSelect} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <UsageSummary session={session} />
              <RecentActivity />
            </div>
          </>
        )}
        {tab === 'projects' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 size={24} className="spin" /></div>}>
            <ProjectTracker apiBase={apiBase} />
          </Suspense>
        )}
        {tab === 'billing' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 size={24} className="spin" /></div>}>
            <StripeCheckout apiBase={apiBase} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
