/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Moderator Dashboard — Content moderation, reports, community management
 * Date: 2026-08-09
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Shield, Flag, Eye, CheckCircle, XCircle, Clock, User, AlertTriangle, BarChart3, MessageSquare, Trash2, ChevronDown, RefreshCw } from 'lucide-react';

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0c 0%, #0d1117 100%)',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  iconBox: {
    width: '48px', height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(245,158,11,0.3)',
  },
  title: { fontSize: '1.6rem', fontWeight: 700 },
  subtitle: { fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '14px',
    marginBottom: '28px',
  },
  statCard: (color) => ({
    background: '#13131a',
    border: `1px solid ${color}33`,
    borderRadius: '12px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  }),
  statVal: { fontSize: '1.8rem', fontWeight: 700 },
  statLabel: { fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: (active) => ({
    padding: '8px 18px',
    borderRadius: '8px',
    border: '1px solid',
    borderColor: active ? '#f59e0b' : '#2a2a35',
    background: active ? 'rgba(245,158,11,0.12)' : '#13131a',
    color: active ? '#f59e0b' : '#9ca3af',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.2s',
  }),
  reportCard: {
    background: '#13131a',
    border: '1px solid #2a2a35',
    borderRadius: '12px',
    padding: '18px',
    marginBottom: '12px',
  },
  reportHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' },
  reportAvatar: {
    width: '38px', height: '38px',
    borderRadius: '10px',
    background: '#1e1e28',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  reportMeta: { flex: 1 },
  reportTitle: { fontWeight: 600, fontSize: '0.95rem', marginBottom: '3px' },
  reportSub: { fontSize: '0.8rem', color: '#6b7280' },
  badge: (color) => ({
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 600,
    background: `${color}22`,
    color,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }),
  reportBody: { fontSize: '0.875rem', color: '#9ca3af', lineHeight: 1.6, marginBottom: '14px' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btn: (variant) => {
    const styles = {
      approve: { background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981' },
      reject: { background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444' },
      warn: { background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', color: '#f59e0b' },
      delete: { background: 'rgba(239,68,68,0.05)', border: '1px solid #374151', color: '#6b7280' },
    };
    return {
      ...styles[variant],
      padding: '6px 14px',
      borderRadius: '7px',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      transition: 'opacity 0.2s',
    };
  },
  section: { marginBottom: '28px' },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  emptyState: { textAlign: 'center', color: '#6b7280', padding: '40px 0', fontSize: '0.9rem' },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px',
    background: '#1e1e28', border: '1px solid #2a2a35',
    borderRadius: '8px', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem',
  },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_REPORTS = [
  {
    id: '1', type: 'spam', severity: 'medium', status: 'pending',
    reporter: 'user_alpha', reportee: 'user_beta',
    content: 'User is posting repetitive promotional links in the community.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    category: 'Content',
  },
  {
    id: '2', type: 'harassment', severity: 'high', status: 'pending',
    reporter: 'user_gamma', reportee: 'user_delta',
    content: 'User sent threatening messages and is engaged in targeted harassment.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    category: 'Behavior',
  },
  {
    id: '3', type: 'misinformation', severity: 'low', status: 'resolved',
    reporter: 'user_epsilon', reportee: 'user_zeta',
    content: 'Post contains factually inaccurate health claims without citations.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    category: 'Content',
  },
  {
    id: '4', type: 'inappropriate', severity: 'medium', status: 'pending',
    reporter: 'user_eta', reportee: 'user_theta',
    content: 'Profile picture violates community guidelines regarding adult content.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    category: 'Profile',
  },
];

const SEVERITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModeratorDashboard() {
  const { authFetch, user, logout } = useAuth();
  const [tab, setTab] = useState('pending');
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [stats, setStats] = useState({ pending: 2, resolved: 12, actionsToday: 5, queueSize: 4 });
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/moderation/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? MOCK_REPORTS);
        setStats(data.stats ?? stats);
      }
    } catch {
      // Falls back to mock data already set
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleAction = (reportId, action) => {
    setReports(prev => prev.map(r =>
      r.id === reportId ? { ...r, status: action === 'approve' ? 'dismissed' : 'resolved', action } : r
    ));
    setStats(prev => ({ ...prev, actionsToday: prev.actionsToday + 1, pending: Math.max(0, prev.pending - 1) }));
  };

  const filtered = reports.filter(r =>
    tab === 'all' ? true : tab === 'pending' ? r.status === 'pending' : r.status !== 'pending'
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.titleRow}>
          <div style={S.iconBox}><Shield size={22} color="#fff" /></div>
          <div>
            <div style={S.title}>Moderator Dashboard</div>
            <div style={S.subtitle}>Community safety &amp; content moderation</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={S.refreshBtn} onClick={fetchReports} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            onClick={logout}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid #374151',
              background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={S.stats}>
        {[
          { label: 'Pending Reports', val: stats.pending, color: '#f59e0b', icon: <Flag size={16} /> },
          { label: 'Resolved Today', val: stats.resolved, color: '#10b981', icon: <CheckCircle size={16} /> },
          { label: 'Actions Today', val: stats.actionsToday, color: '#3b82f6', icon: <Eye size={16} /> },
          { label: 'Queue Size', val: stats.queueSize, color: '#8b5cf6', icon: <Clock size={16} /> },
        ].map(({ label, val, color, icon }) => (
          <div key={label} style={S.statCard(color)}>
            <div style={{ color, display: 'flex', alignItems: 'center', gap: '6px' }}>{icon}</div>
            <div style={{ ...S.statVal, color }}>{val}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {['pending', 'resolved', 'all'].map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'pending' && stats.pending > 0 && (
              <span style={{
                marginLeft: '6px', background: '#ef4444', color: '#fff',
                borderRadius: '10px', padding: '1px 6px', fontSize: '0.65rem',
              }}>{stats.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Report Queue */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          <AlertTriangle size={16} color="#f59e0b" />
          Report Queue
          {loading && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Loading...</span>}
        </div>

        {filtered.length === 0 ? (
          <div style={S.emptyState}>
            <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
            <div>No {tab !== 'all' ? tab : ''} reports</div>
          </div>
        ) : (
          filtered.map(report => (
            <div key={report.id} style={{
              ...S.reportCard,
              borderLeft: `3px solid ${SEVERITY_COLORS[report.severity] ?? '#6b7280'}`,
            }}>
              <div style={S.reportHeader}>
                <div style={S.reportAvatar}><Flag size={16} color="#f59e0b" /></div>
                <div style={S.reportMeta}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={S.reportTitle}>{report.category} — {report.type}</span>
                    <span style={S.badge(SEVERITY_COLORS[report.severity])}>{report.severity}</span>
                    <span style={S.badge(report.status === 'pending' ? '#f59e0b' : '#10b981')}>
                      {report.status}
                    </span>
                  </div>
                  <div style={S.reportSub}>
                    Reported by <strong>{report.reporter}</strong> against <strong>{report.reportee}</strong>
                    {' · '}{new Date(report.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={S.reportBody}>{report.content}</div>

              {report.status === 'pending' && (
                <div style={S.actions}>
                  <button style={S.btn('approve')} onClick={() => handleAction(report.id, 'approve')}>
                    <CheckCircle size={13} /> Dismiss
                  </button>
                  <button style={S.btn('warn')} onClick={() => handleAction(report.id, 'warn')}>
                    <AlertTriangle size={13} /> Warn User
                  </button>
                  <button style={S.btn('reject')} onClick={() => handleAction(report.id, 'resolve')}>
                    <XCircle size={13} /> Take Action
                  </button>
                  <button style={S.btn('delete')} onClick={() => handleAction(report.id, 'delete')}>
                    <Trash2 size={13} /> Remove Content
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Community Stats */}
      <div style={S.section}>
        <div style={S.sectionTitle}><BarChart3 size={16} color="#3b82f6" /> Community Overview</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}>
          {[
            { label: 'Active Users (24h)', val: '1,284', trend: '+12%', up: true },
            { label: 'Posts Today', val: '3,891', trend: '+7%', up: true },
            { label: 'Reports This Week', val: '47', trend: '-8%', up: false },
            { label: 'Avg Response Time', val: '14 min', trend: '-5 min', up: false },
          ].map(({ label, val, trend, up }) => (
            <div key={label} style={{
              background: '#13131a', border: '1px solid #2a2a35',
              borderRadius: '12px', padding: '18px',
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>{val}</div>
              <div style={{ fontSize: '0.75rem', color: up ? '#10b981' : '#f59e0b' }}>{trend} vs last period</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}
