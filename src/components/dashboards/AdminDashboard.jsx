// src/components/dashboards/AdminDashboard.jsx
// Admin dashboard — user management, audit log, system stats, gift cards
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import React, { useState, useEffect } from 'react';
import { Users, Activity, ShieldCheck, CreditCard, Globe, RefreshCw, Gift, Cpu, Clock } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color = '#6366F1' }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.iconWrap, background: `${color}22`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={styles.statLabel}>{label}</p>
        <p style={styles.statValue}>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [giftCardForm, setGiftCardForm] = useState({ plan: 'pro', durationDays: 30, count: 1 });
  const [generatedCards, setGeneratedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const token = () => localStorage.getItem('accessToken');

  const fetchStats = async () => {
    const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setStats(await res.json());
    setLoading(false);
  };

  const fetchAuditLog = async () => {
    const res = await fetch('/api/admin/audit-log?limit=50', { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setAuditLog(await res.json());
  };

  const generateGiftCards = async () => {
    const res = await fetch('/api/admin/gift-cards/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(giftCardForm),
    });
    if (res.ok) setGeneratedCards((await res.json()).cards);
  };

  useEffect(() => {
    fetchStats();
    fetchAuditLog();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><ShieldCheck size={22} style={{ marginRight: 8 }} />Admin Dashboard</h1>
        <div style={styles.userBadge}>
          {user?.email} <span style={styles.roleBadge}>Admin</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview', 'audit', 'gift-cards'].map(t => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'audit' ? 'Audit Log' : 'Gift Cards'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        loading ? <div style={styles.loading}><RefreshCw size={20} /> Loading…</div> :
        <div style={styles.statsGrid}>
          <StatCard label="Security Score" value={`${stats?.securityScore ?? '—'}/100`} icon={ShieldCheck} color="#10B981" />
          <StatCard label="Open Alerts" value={stats?.openAlerts ?? 0} icon={Activity} color="#EF4444" />
          <StatCard label="Audit Events" value={stats?.auditEventCount ?? 0} icon={Clock} color="#6366F1" />
          <StatCard label="Uptime" value={`${Math.floor((stats?.uptime ?? 0) / 60)}m`} icon={Cpu} color="#F59E0B" />
          <StatCard label="Node Version" value={stats?.nodeVersion} icon={Globe} color="#06B6D4" />
          <StatCard label="Platform" value={stats?.platform} icon={Cpu} color="#8B5CF6" />
          <StatCard label="Heap Used" value={stats?.memoryUsage ? `${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(0)}MB` : '—'} icon={Cpu} color="#F97316" />
          <StatCard label="Last Scan" value={stats?.lastScanTime ? new Date(stats.lastScanTime).toLocaleTimeString() : 'Never'} icon={ShieldCheck} color="#EC4899" />
        </div>
      )}

      {tab === 'audit' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Audit Events</h2>
          <div style={styles.auditList}>
            {auditLog.map(e => (
              <div key={e.id} style={styles.auditRow}>
                <span style={{ ...styles.auditResult, color: e.result === 'success' ? '#10B981' : '#EF4444' }}>
                  {e.result === 'success' ? '✓' : '✕'}
                </span>
                <span style={styles.auditEvent}>{e.event}</span>
                <span style={styles.auditMeta}>{e.ip ?? '—'}</span>
                <span style={styles.auditTime}>{new Date(e.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
            {auditLog.length === 0 && <p style={styles.empty}>No audit events recorded yet</p>}
          </div>
        </div>
      )}

      {tab === 'gift-cards' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}><Gift size={16} /> Generate Gift Cards</h2>
          <div style={styles.giftForm}>
            <select style={styles.input} value={giftCardForm.plan} onChange={e => setGiftCardForm(f => ({ ...f, plan: e.target.value }))}>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <input style={styles.input} type="number" min={1} max={365} value={giftCardForm.durationDays} onChange={e => setGiftCardForm(f => ({ ...f, durationDays: parseInt(e.target.value) }))} placeholder="Duration (days)" />
            <input style={styles.input} type="number" min={1} max={100} value={giftCardForm.count} onChange={e => setGiftCardForm(f => ({ ...f, count: parseInt(e.target.value) }))} placeholder="Count" />
            <button style={styles.btnPrimary} onClick={generateGiftCards}>Generate</button>
          </div>
          {generatedCards.length > 0 && (
            <div style={styles.cardsList}>
              {generatedCards.map((c, i) => (
                <div key={i} style={styles.giftCard}>
                  <code style={styles.giftCode}>{c.code}</code>
                  <span style={styles.giftMeta}>{c.plan} · {c.durationDays}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 24, color: '#E2E8F0', minHeight: '100vh', background: '#0F0F23' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center' },
  userBadge: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B' },
  roleBadge: { background: '#EF444420', color: '#EF4444', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, background: '#1E293B', borderRadius: 10, padding: 4, width: 'fit-content' },
  tab: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: 13 },
  tabActive: { background: '#334155', color: '#E2E8F0', fontWeight: 600 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  statCard: { background: '#1E293B', borderRadius: 12, padding: 16, border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 12 },
  iconWrap: { padding: 10, borderRadius: 8 },
  statLabel: { fontSize: 11, color: '#64748B', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontSize: 18, fontWeight: 700, margin: 0 },
  section: { background: '#1E293B', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 },
  auditList: { display: 'flex', flexDirection: 'column', gap: 4 },
  auditRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#0F172A', borderRadius: 8, fontSize: 13 },
  auditResult: { fontWeight: 700, width: 16 },
  auditEvent: { flex: 1, fontFamily: 'monospace', fontSize: 12 },
  auditMeta: { color: '#64748B', fontSize: 12, width: 120 },
  auditTime: { color: '#334155', fontSize: 11, width: 80, textAlign: 'right' },
  giftForm: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  input: { padding: '8px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#E2E8F0', fontSize: 13 },
  btnPrimary: { padding: '8px 20px', background: '#6366F1', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  cardsList: { display: 'flex', flexDirection: 'column', gap: 8 },
  giftCard: { display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', background: '#0F172A', borderRadius: 8, border: '1px solid #334155' },
  giftCode: { fontFamily: 'monospace', color: '#10B981', fontSize: 16, letterSpacing: 2 },
  giftMeta: { fontSize: 12, color: '#64748B' },
  loading: { display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', padding: 48 },
  empty: { color: '#64748B', fontSize: 13, padding: 16, textAlign: 'center' },
};
