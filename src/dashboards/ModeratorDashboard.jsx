// src/dashboards/ModeratorDashboard.jsx
// Nexus AI Pro — Moderator Dashboard
// Date: 2026-08-18

import React, { useState, lazy, Suspense } from 'react';
import {
  Flag, Eye, AlertTriangle, CheckCircle, XCircle,
  Clock, Users, MessageSquare, BarChart3, Shield, Loader2
} from 'lucide-react';

const AnalyticsDashboard = lazy(() => import('../analytics/AnalyticsDashboard.jsx'));
const SecurityDashboard  = lazy(() => import('../security/SecurityDashboard.jsx'));

// ─── Report Queue ─────────────────────────────────────────────────────────────
function ReportQueue() {
  const [reports] = useState([
    { id: 'r1', type: 'spam',       content: 'Repeated promotional messages in chat', user: 'user_abc', ts: '14:32', severity: 'medium' },
    { id: 'r2', type: 'harassment', content: 'Hostile language directed at another user', user: 'user_xyz', ts: '13:55', severity: 'high' },
    { id: 'r3', type: 'misinformation', content: 'False claims about product capabilities', user: 'user_def', ts: '12:10', severity: 'low' },
    { id: 'r4', type: 'spam',       content: 'Duplicate content submission', user: 'user_ghi', ts: '11:48', severity: 'low' },
  ]);

  const SEVERITY = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' };

  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flag size={14} /> Report Queue
        </h3>
        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 9999, background: '#f59e0b22', color: '#f59e0b', fontWeight: 600 }}>
          {reports.length} pending
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {reports.map(r => (
          <div key={r.id} style={{ padding: '12px 18px', borderBottom: '1px solid #27272a22', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEVERITY[r.severity] || '#6b7280', marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e5e7eb', textTransform: 'capitalize' }}>{r.type}</span>
                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{r.ts}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content}</p>
              <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>by {r.user}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button style={{ background: '#10b98120', border: '1px solid #10b98140', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                Dismiss
              </button>
              <button style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                Action
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Moderation Stats ─────────────────────────────────────────────────────────
function ModerationStats() {
  const stats = [
    { label: 'Reviewed Today',   value: 47,   icon: CheckCircle, color: '#10b981' },
    { label: 'Actions Taken',    value: 8,    icon: XCircle,     color: '#ef4444' },
    { label: 'Pending Reports',  value: 4,    icon: Clock,       color: '#f59e0b' },
    { label: 'Active Users',     value: 342,  icon: Users,       color: '#6366f1' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)',
          borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <s.icon size={16} color={s.color} />
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{s.label}</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>{s.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Moderator Dashboard ─────────────────────────────────────────────────
const TABS = ['queue', 'analytics', 'security'];

export default function ModeratorDashboard({ apiBase = '', session }) {
  const [tab, setTab] = useState('queue');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #09090b)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #27272a', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ padding: '16px 0', marginRight: 24 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, background: 'linear-gradient(135deg,#d97706,#b45309)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🛡 Moderator Dashboard</span>
        </div>
        <nav style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '16px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize',
              color: tab === t ? '#d97706' : '#6b7280',
              borderBottom: `2px solid ${tab === t ? '#d97706' : 'transparent'}`,
              transition: 'all 0.15s'
            }}>{t === 'queue' ? 'Report Queue' : t}</button>
          ))}
        </nav>
      </div>

      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {tab === 'queue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ModerationStats />
            <ReportQueue />
          </div>
        )}
        {tab === 'analytics' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 size={24} className="spin" /></div>}>
            <AnalyticsDashboard apiBase={apiBase} />
          </Suspense>
        )}
        {tab === 'security' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 size={24} className="spin" /></div>}>
            <SecurityDashboard apiBase={apiBase} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
