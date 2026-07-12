// src/dashboards/ModeratorDashboard.jsx
// 2026-07-12 | Role: moderator — content review, reports, user flags, audit log, platform analytics

import React, { useState, useEffect, useCallback } from 'react';
import AnalyticsDashboard from '../analytics/AnalyticsDashboard.jsx';
import SecurityDashboard from '../security/SecurityDashboard.jsx';

const CATEGORIES = ['hate_speech', 'spam', 'misinformation', 'nsfw', 'harassment', 'copyright'];

const MOCK_REPORTS = [
  { id: 'r1', platform: 'TikTok', category: 'hate_speech', content: 'User posted content containing hateful language targeting a group...', reporter: 'auto-filter', createdAt: Date.now() - 180000, status: 'pending', severity: 'high' },
  { id: 'r2', platform: 'Reddit', category: 'spam', content: 'Multiple identical posts promoting off-platform products...', reporter: 'u/vigilant_user', createdAt: Date.now() - 420000, status: 'pending', severity: 'medium' },
  { id: 'r3', platform: 'Discord', category: 'harassment', content: 'Series of messages targeting a specific member with personal attacks...', reporter: 'community-bot', createdAt: Date.now() - 900000, status: 'under_review', severity: 'high' },
  { id: 'r4', platform: 'Instagram', category: 'misinformation', content: 'Post making false health claims without citations...', reporter: 'u/fact_checker', createdAt: Date.now() - 1800000, status: 'pending', severity: 'medium' },
  { id: 'r5', platform: 'Twitch', category: 'nsfw', content: 'Stream content inappropriately categorized as family-friendly...', reporter: 'auto-filter', createdAt: Date.now() - 3600000, status: 'resolved', severity: 'high', resolution: 'removed' },
  { id: 'r6', platform: 'Facebook', category: 'copyright', content: 'Music playing in background without proper licensing...', reporter: 'rights-bot', createdAt: Date.now() - 7200000, status: 'resolved', severity: 'low', resolution: 'muted' },
];

const AUDIT_LOG = [
  { id: 'a1', action: 'content_removed', target: 'post#8812', mod: 'mod_alex', at: Date.now() - 60000, reason: 'Hate speech violation' },
  { id: 'a2', action: 'user_warned', target: 'user#5543', mod: 'mod_alex', at: Date.now() - 3600000, reason: 'Spam activity' },
  { id: 'a3', action: 'report_dismissed', target: 'r-441', mod: 'mod_sam', at: Date.now() - 7200000, reason: 'False positive' },
  { id: 'a4', action: 'user_suspended', target: 'user#1122', mod: 'mod_alex', at: Date.now() - 86400000, reason: 'Repeated violations', duration: '7d' },
];

const SEVERITY_COLORS = {
  high: { text: '#fca5a5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  medium: { text: '#fcd34d', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  low: { text: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  under_review: '#3b82f6',
  resolved: '#10b981',
};

function RelativeTime({ ts }) {
  const diff = Date.now() - ts;
  if (diff < 60000) return <span>{Math.round(diff / 1000)}s ago</span>;
  if (diff < 3600000) return <span>{Math.round(diff / 60000)}m ago</span>;
  if (diff < 86400000) return <span>{Math.round(diff / 3600000)}h ago</span>;
  return <span>{Math.round(diff / 86400000)}d ago</span>;
}

function QueuePanel({ user }) {
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);

  const act = useCallback((id, action) => {
    setReports(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'resolved', resolution: action, resolvedBy: user?.username, resolvedAt: Date.now() } : r
    ));
    setSelected(null);
  }, [user]);

  const visible = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const counts = reports.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* List */}
      <div style={{ width: 340, borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #222', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['pending', 'under_review', 'resolved', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '4px 10px',
                background: filter === s ? '#1e1e1e' : 'transparent',
                border: `1px solid ${filter === s ? '#444' : '#222'}`,
                borderRadius: 6,
                color: filter === s ? '#fff' : '#666',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {s.replace('_', ' ')} {counts[s] ? `(${counts[s]})` : ''}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visible.length === 0 && <div style={{ padding: 20, color: '#555', fontSize: '0.85rem', textAlign: 'center' }}>No reports</div>}
          {visible.map(r => {
            const sev = SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.low;
            return (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #1a1a1a',
                  cursor: 'pointer',
                  background: selected?.id === r.id ? '#161616' : 'transparent',
                  borderLeft: `3px solid ${sev.border}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>{r.platform}</span>
                  <span style={{ fontSize: '0.72rem', color: STATUS_COLORS[r.status] }}>{r.status.replace('_', ' ')}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.content}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ padding: '1px 6px', background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 4, fontSize: '0.68rem', color: sev.text }}>
                    {r.severity}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#555' }}>{r.category.replace('_', ' ')}</span>
                  <span style={{ fontSize: '0.7rem', color: '#555', marginLeft: 'auto' }}><RelativeTime ts={r.createdAt} /></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', gap: 8 }}>
            <span style={{ fontSize: '2rem' }}>📋</span>
            <p style={{ fontSize: '0.9rem' }}>Select a report to review</p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Report #{selected.id}</h2>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  {selected.platform} · Reported by {selected.reporter} · <RelativeTime ts={selected.createdAt} />
                </div>
              </div>
              <span style={{ padding: '4px 10px', background: STATUS_COLORS[selected.status] + '22', border: `1px solid ${STATUS_COLORS[selected.status]}55`, borderRadius: 6, fontSize: '0.78rem', color: STATUS_COLORS[selected.status] }}>
                {selected.status.replace('_', ' ')}
              </span>
            </div>

            <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reported Content</div>
              <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.6 }}>{selected.content}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: 4 }}>CATEGORY</div>
                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>{selected.category.replace('_', ' ')}</div>
              </div>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: 4 }}>SEVERITY</div>
                <div style={{ fontSize: '0.9rem', color: SEVERITY_COLORS[selected.severity]?.text }}>{selected.severity}</div>
              </div>
            </div>

            {selected.status !== 'resolved' && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['remove', 'warn_user', 'suspend_user', 'mute', 'dismiss'].map(action => {
                  const styles = {
                    remove: { bg: '#ef4444', label: '🗑 Remove Content' },
                    warn_user: { bg: '#f59e0b', label: '⚠️ Warn User' },
                    suspend_user: { bg: '#8b5cf6', label: '🔒 Suspend User' },
                    mute: { bg: '#3b82f6', label: '🔇 Mute' },
                    dismiss: { bg: '#333', label: '✓ Dismiss' },
                  }[action];
                  return (
                    <button
                      key={action}
                      onClick={() => act(selected.id, action)}
                      style={{
                        padding: '8px 16px',
                        background: styles.bg,
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {styles.label}
                    </button>
                  );
                })}
              </div>
            )}

            {selected.status === 'resolved' && (
              <div style={{ padding: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: '0.85rem', color: '#10b981' }}>
                ✓ Resolved: {selected.resolution} {selected.resolvedBy ? `by ${selected.resolvedBy}` : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditPanel() {
  const actionColors = {
    content_removed: '#ef4444',
    user_warned: '#f59e0b',
    report_dismissed: '#6b7280',
    user_suspended: '#8b5cf6',
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Audit Log</h2>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 20 }}>Tamper-evident log of moderator actions.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {AUDIT_LOG.map(entry => (
          <div key={entry.id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 16px', borderLeft: `3px solid ${actionColors[entry.action] || '#444'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ddd' }}>{entry.action.replace(/_/g, ' ')}</span>
              <span style={{ fontSize: '0.75rem', color: '#555' }}><RelativeTime ts={entry.at} /></span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>
              Target: <span style={{ color: '#aaa' }}>{entry.target}</span> · By: <span style={{ color: '#aaa' }}>{entry.mod}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>{entry.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'queue', label: 'Report Queue', icon: '📋' },
  { key: 'analytics', label: 'Platform Analytics', icon: '📊' },
  { key: 'audit', label: 'Audit Log', icon: '🗒️' },
  { key: 'security', label: 'Security', icon: '🛡️' },
];

const navStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  background: '#111111',
  borderBottom: '1px solid #222222',
  height: 52,
  flexShrink: 0,
  gap: 8,
};

const tabBtnStyle = (active) => ({
  padding: '7px 14px',
  background: active ? '#1e1e1e' : 'transparent',
  border: active ? '1px solid #333' : '1px solid transparent',
  borderRadius: 8,
  color: active ? '#ffffff' : '#888888',
  fontSize: '0.82rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
});

export default function ModeratorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <nav style={navStyle}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={tabBtnStyle(activeTab === tab.key)}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: '0.82rem', color: '#888' }}>{user?.username || user?.email}</span>
          <span style={{ padding: '3px 8px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, fontSize: '0.68rem', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.5px' }}>MOD</span>
          <button
            onClick={onLogout}
            style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#888', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'queue' && <QueuePanel user={user} />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'audit' && <AuditPanel />}
        {activeTab === 'security' && <SecurityDashboard />}
      </div>
    </div>
  );
}
