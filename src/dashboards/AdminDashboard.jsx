/**
 * @fileoverview AdminDashboard - Platform Administration Console
 * @author Cameron Fox <fox7698cameron@gmail.com>
 * @copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 * @date 2026-08-30
 *
 * Provides user management, role assignment, system health, revenue metrics,
 * content moderation, connector status, system logs, feature flags, ban list,
 * API usage, database/cache status, and build/deploy tracking.
 * All data sourced from /api/admin/* endpoints.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  TrendingUp,
  AlertTriangle,
  PlugZap,
  FileText,
  ToggleLeft,
  ToggleRight,
  Ban,
  BarChart2,
  Database,
  Layers,
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Edit2,
  AlertCircle,
  Zap,
  Activity,
  Server,
  CreditCard,
  Package,
  Globe,
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
  accentHover: '#818cf8',
  textPrimary: '#f1f1f3',
  textSecondary: '#8b8b9a',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');
const fmt = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0));
const fmtCurrency = (n) => `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const downloadBlob = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

async function apiFetch(path, opts = {}) {
  const res = await fetch(`/api/admin${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// UI atoms
// ---------------------------------------------------------------------------
const Card = ({ title, icon: Icon, children, action, style = {}, noPad }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', ...style }}>
    {(title || action) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: noPad ? '16px 20px 0' : '16px 20px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={16} color={T.accent} />}
          <span style={{ color: T.textPrimary, fontWeight: 600, fontSize: 14 }}>{title}</span>
        </div>
        {action}
      </div>
    )}
    <div style={{ padding: noPad ? 0 : '16px 20px' }}>{children}</div>
  </div>
);

const Badge = ({ label, color }) => (
  <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
    {label}
  </span>
);

const Btn = ({ children, onClick, disabled, variant = 'primary', icon: Icon, small, danger }) => {
  const base = danger
    ? { background: T.critical + '20', color: T.critical, border: `1px solid ${T.critical}44` }
    : variant === 'ghost'
    ? { background: 'transparent', color: T.textSecondary, border: `1px solid ${T.border}` }
    : { background: T.accent, color: '#fff', border: 'none' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: small ? '5px 10px' : '8px 16px', borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...base }}
    >
      {Icon && <Icon size={small ? 12 : 14} />}
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, style = {} }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{ background: T.surfaceElevated, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary, padding: '7px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', ...style }}
  />
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{ background: T.surfaceElevated, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary, padding: '7px 12px', fontSize: 13, outline: 'none', cursor: 'pointer' }}
  >
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const StatusDot = ({ ok, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? T.success : T.critical, boxShadow: `0 0 6px ${ok ? T.success : T.critical}88` }} />
    {label && <span style={{ fontSize: 12, color: ok ? T.success : T.critical }}>{label}</span>}
  </div>
);

const ProgressBar = ({ value, max = 100, color = T.accent }) => (
  <div style={{ background: T.border, borderRadius: 99, height: 5, overflow: 'hidden', width: '100%' }}>
    <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '24px 28px', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px #00000066' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.textPrimary, marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// NAVIGATION TABS
// ---------------------------------------------------------------------------
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'moderation', label: 'Moderation', icon: Shield },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'connectors', label: 'Connectors', icon: PlugZap },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'features', label: 'Features', icon: ToggleLeft },
  { id: 'bans', label: 'Bans', icon: Ban },
  { id: 'api', label: 'API Usage', icon: BarChart2 },
  { id: 'infra', label: 'Infra', icon: Server },
];

// ---------------------------------------------------------------------------
// OVERVIEW panel
// ---------------------------------------------------------------------------
const OverviewPanel = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch('/overview').then(setData).catch(() => {});
  }, []);

  const stats = [
    { label: 'Total Users', value: fmt(data?.totalUsers), icon: Users, color: T.accent },
    { label: 'Active Now', value: fmt(data?.activeNow), icon: Activity, color: T.success },
    { label: 'MRR', value: fmtCurrency(data?.mrr), icon: CreditCard, color: T.success },
    { label: 'API Calls (24h)', value: fmt(data?.apiCalls24h), icon: Zap, color: T.warning },
    { label: 'Errors (1h)', value: fmt(data?.errors1h), icon: AlertCircle, color: data?.errors1h > 50 ? T.critical : T.textPrimary },
    { label: 'Uptime', value: `${data?.uptimePct ?? 0}%`, icon: CheckCircle, color: (data?.uptimePct ?? 0) >= 99.9 ? T.success : T.warning },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon size={14} color={color} />
            <span style={{ fontSize: 12, color: T.textSecondary }}>{label}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color }}>{value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SYSTEM HEALTH
// ---------------------------------------------------------------------------
const SystemHealthCard = () => {
  const [health, setHealth] = useState(null);

  const load = useCallback(() => {
    apiFetch('/system-health').then(setHealth).catch(() => {});
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const services = health?.services ?? [];

  return (
    <Card title="System Health" icon={Activity} action={<Btn onClick={load} icon={RefreshCw} variant="ghost" small>Refresh</Btn>}>
      {services.length === 0 ? (
        <p style={{ color: T.textSecondary, fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {services.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusDot ok={s.status === 'healthy'} />
                <span style={{ fontSize: 13, color: T.textPrimary }}>{s.name}</span>
              </div>
              <div style={{ display: 'flex', align: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: T.textSecondary }}>{s.latency != null ? `${s.latency}ms` : ''}</span>
                <Badge label={s.status} color={s.status === 'healthy' ? T.success : s.status === 'degraded' ? T.warning : T.critical} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// USER MANAGEMENT
// ---------------------------------------------------------------------------
const ROLES = ['user', 'pro', 'admin', 'moderator', 'superadmin'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { user, newRole }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: PAGE_SIZE,
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      });
      const d = await apiFetch(`/users?${params}`);
      setUsers(d.users ?? []);
      setTotal(d.total ?? 0);
    } catch {}
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await apiFetch(`/users/${modal.user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: modal.newRole }),
      });
      setUsers((us) => us.map((u) => u.id === modal.user.id ? { ...u, role: modal.newRole } : u));
      setModal(null);
    } catch {}
    setSaving(false);
  };

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title="Change User Role"
      >
        {modal && (
          <>
            <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 14 }}>
              Change role for <strong style={{ color: T.textPrimary }}>{modal.user.email}</strong>
            </p>
            <Select
              value={modal.newRole}
              onChange={(v) => setModal((m) => ({ ...m, newRole: v }))}
              options={ROLES.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <Btn onClick={() => setModal(null)} variant="ghost">Cancel</Btn>
              <Btn onClick={changeRole} disabled={saving || modal.newRole === modal.user.role}>
                {saving ? 'Saving…' : 'Confirm'}
              </Btn>
            </div>
          </>
        )}
      </Modal>

      <Card title="User Management" icon={Users} noPad>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email…" style={{ maxWidth: 260 }} />
          <Select
            value={roleFilter}
            onChange={(v) => { setRoleFilter(v); setPage(1); }}
            options={[{ value: 'all', label: 'All Roles' }, ...ROLES.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))]}
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Plan', 'Joined', 'Actions'].map((h) => (
                  <th key={h} style={{ color: T.textSecondary, textAlign: 'left', padding: '10px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: T.textSecondary }}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: T.textSecondary }}>No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: '10px 16px', color: T.textPrimary, fontWeight: 500 }}>{u.name ?? '—'}</td>
                  <td style={{ padding: '10px 16px', color: T.textSecondary, fontFamily: 'monospace', fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <Badge label={u.role} color={u.role === 'admin' || u.role === 'superadmin' ? T.accent : u.role === 'moderator' ? T.warning : T.textSecondary} />
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <Badge label={u.plan ?? 'free'} color={u.plan === 'enterprise' ? T.accent : u.plan === 'pro' ? T.success : T.textSecondary} />
                  </td>
                  <td style={{ padding: '10px 16px', color: T.textSecondary, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <Btn
                      onClick={() => setModal({ user: u, newRole: u.role })}
                      variant="ghost"
                      icon={Edit2}
                      small
                    >
                      Role
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 12, color: T.textSecondary }}>Page {page} of {pages} ({total} users)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} variant="ghost" icon={ChevronLeft} small>Prev</Btn>
              <Btn onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} variant="ghost" icon={ChevronRight} small>Next</Btn>
            </div>
          </div>
        )}
      </Card>
    </>
  );
};

// ---------------------------------------------------------------------------
// REVENUE METRICS
// ---------------------------------------------------------------------------
const RevenuePanel = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch('/revenue').then(setData).catch(() => {});
  }, []);

  const subs = data?.subscriptions ?? {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'MRR', value: fmtCurrency(data?.mrr), color: T.success },
          { label: 'ARR', value: fmtCurrency(data?.arr), color: T.success },
          { label: 'New Subs (30d)', value: fmt(data?.newSubs30d), color: T.accent },
          { label: 'Churn Rate', value: `${data?.churnPct ?? 0}%`, color: (data?.churnPct ?? 0) > 5 ? T.critical : T.textPrimary },
          { label: 'ARPU', value: fmtCurrency(data?.arpu), color: T.textPrimary },
          { label: 'LTV', value: fmtCurrency(data?.ltv), color: T.textPrimary },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value ?? '—'}</div>
          </div>
        ))}
      </div>
      <Card title="Subscription Tiers" icon={Package}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(subs).map(([tier, count]) => (
            <div key={tier}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: T.textPrimary, textTransform: 'capitalize' }}>{tier}</span>
                <span style={{ color: T.textSecondary }}>{fmt(count)} users</span>
              </div>
              <ProgressBar value={count} max={data?.totalUsers ?? 1} color={T.accent} />
            </div>
          ))}
          {Object.keys(subs).length === 0 && <p style={{ color: T.textSecondary, fontSize: 13 }}>No subscription data.</p>}
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CONTENT MODERATION QUEUE
// ---------------------------------------------------------------------------
const ModerationQueue = () => {
  const [items, setItems] = useState([]);
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    apiFetch('/moderation').then((d) => setItems(d.items ?? [])).catch(() => {});
  }, []);

  const action = async (id, verdict) => {
    setActioning(id);
    try {
      await apiFetch(`/moderation/${id}`, { method: 'PATCH', body: JSON.stringify({ verdict }) });
      setItems((its) => its.filter((i) => i.id !== id));
    } catch {}
    setActioning(null);
  };

  return (
    <Card title="Content Moderation Queue" icon={Shield}>
      {items.length === 0 ? (
        <p style={{ color: T.success, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={14} /> Queue is clear.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
          {items.map((it) => (
            <div key={it.id} style={{ background: T.surfaceElevated, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Badge label={it.type} color={T.warning} />
                <span style={{ fontSize: 11, color: T.textSecondary }}>{fmtDate(it.reportedAt)}</span>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: T.textPrimary }}>{it.content}</p>
              <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 10 }}>
                Reported by {it.reportedBy} · Content by {it.contentAuthor}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => action(it.id, 'approve')} disabled={actioning === it.id} variant="ghost" icon={CheckCircle} small>Approve</Btn>
                <Btn onClick={() => action(it.id, 'remove')} disabled={actioning === it.id} danger icon={Trash2} small>Remove</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// CONNECTOR STATUS
// ---------------------------------------------------------------------------
const ConnectorStatus = () => {
  const [connectors, setConnectors] = useState([]);

  const load = useCallback(() => {
    apiFetch('/connectors').then((d) => setConnectors(d.connectors ?? [])).catch(() => {});
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  return (
    <Card title="Platform Connectors" icon={PlugZap} action={<Btn onClick={load} icon={RefreshCw} variant="ghost" small>Refresh</Btn>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {connectors.length === 0 ? (
          <p style={{ color: T.textSecondary, fontSize: 13 }}>No connectors configured.</p>
        ) : connectors.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusDot ok={c.status === 'connected'} />
              <div>
                <div style={{ fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.textSecondary }}>{c.type}</div>
              </div>
            </div>
            <div style={{ display: 'flex', align: 'center', gap: 8 }}>
              {c.latency != null && <span style={{ fontSize: 11, color: T.textSecondary }}>{c.latency}ms</span>}
              <Badge label={c.status} color={c.status === 'connected' ? T.success : c.status === 'degraded' ? T.warning : T.critical} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// SYSTEM LOGS
// ---------------------------------------------------------------------------
const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 25;
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE, ...(level !== 'all' && { level }), ...(search && { search }) });
      const d = await apiFetch(`/logs?${params}`);
      setLogs(d.logs ?? []);
      setTotal(d.total ?? 0);
    } catch {}
    setLoading(false);
  }, [page, level, search]);

  useEffect(() => { load(); }, [load]);

  const levelColor = (l) => ({ error: T.critical, warn: T.warning, info: T.low, debug: T.textSecondary }[l] ?? T.textSecondary);
  const pages = Math.ceil(total / PAGE_SIZE);

  const exportLogs = () => {
    const rows = logs.map((l) => `${l.timestamp}\t${l.level}\t${l.service}\t${l.message}`).join('\n');
    downloadBlob(rows, 'system-logs.txt', 'text/plain');
  };

  return (
    <Card title="System Logs" icon={FileText} noPad action={<Btn onClick={exportLogs} icon={Download} variant="ghost" small>Export</Btn>}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs…" style={{ maxWidth: 240 }} />
        <Select value={level} onChange={(v) => { setLevel(v); setPage(1); }} options={[
          { value: 'all', label: 'All Levels' },
          { value: 'error', label: 'Error' },
          { value: 'warn', label: 'Warn' },
          { value: 'info', label: 'Info' },
          { value: 'debug', label: 'Debug' },
        ]} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Time', 'Level', 'Service', 'Message'].map((h) => (
                <th key={h} style={{ color: T.textSecondary, textAlign: 'left', padding: '8px 14px', borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: T.textSecondary }}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: T.textSecondary }}>No log entries.</td></tr>
            ) : logs.map((l, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}15` }}>
                <td style={{ padding: '7px 14px', color: T.textSecondary, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>{fmtDate(l.timestamp)}</td>
                <td style={{ padding: '7px 14px' }}><Badge label={l.level} color={levelColor(l.level)} /></td>
                <td style={{ padding: '7px 14px', color: T.textSecondary }}>{l.service}</td>
                <td style={{ padding: '7px 14px', color: T.textPrimary }}>{l.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 12, color: T.textSecondary }}>Page {page} of {pages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} variant="ghost" icon={ChevronLeft} small>Prev</Btn>
            <Btn onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} variant="ghost" icon={ChevronRight} small>Next</Btn>
          </div>
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// FEATURE FLAGS
// ---------------------------------------------------------------------------
const TIERS = ['free', 'pro', 'enterprise', 'admin'];

const FeatureFlags = () => {
  const [flags, setFlags] = useState([]);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    apiFetch('/feature-flags').then((d) => setFlags(d.flags ?? [])).catch(() => {});
  }, []);

  const toggleTier = async (flagId, tier) => {
    const key = `${flagId}:${tier}`;
    setToggling(key);
    try {
      const flag = flags.find((f) => f.id === flagId);
      const enabled = !(flag?.tiers ?? []).includes(tier);
      await apiFetch(`/feature-flags/${flagId}`, {
        method: 'PATCH',
        body: JSON.stringify({ tier, enabled }),
      });
      setFlags((fs) =>
        fs.map((f) =>
          f.id === flagId
            ? { ...f, tiers: enabled ? [...(f.tiers ?? []), tier] : (f.tiers ?? []).filter((t) => t !== tier) }
            : f
        )
      );
    } catch {}
    setToggling(null);
  };

  return (
    <Card title="Feature Flags" icon={ToggleLeft} noPad>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Feature', 'Description', ...TIERS].map((h) => (
                <th key={h} style={{ color: T.textSecondary, textAlign: 'left', padding: '10px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 500, textTransform: 'capitalize' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flags.length === 0 ? (
              <tr><td colSpan={TIERS.length + 2} style={{ textAlign: 'center', padding: 20, color: T.textSecondary }}>No feature flags configured.</td></tr>
            ) : flags.map((f) => (
              <tr key={f.id} style={{ borderBottom: `1px solid ${T.border}22` }}>
                <td style={{ padding: '10px 16px', color: T.textPrimary, fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>{f.key}</td>
                <td style={{ padding: '10px 16px', color: T.textSecondary, fontSize: 12 }}>{f.description}</td>
                {TIERS.map((tier) => {
                  const on = (f.tiers ?? []).includes(tier);
                  const key = `${f.id}:${tier}`;
                  return (
                    <td key={tier} style={{ padding: '10px 16px' }}>
                      <button
                        onClick={() => toggleTier(f.id, tier)}
                        disabled={toggling === key}
                        title={`${on ? 'Disable' : 'Enable'} for ${tier}`}
                        style={{ background: 'none', border: 'none', cursor: toggling === key ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {on
                          ? <ToggleRight size={22} color={T.success} />
                          : <ToggleLeft size={22} color={T.border} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// BAN LIST
// ---------------------------------------------------------------------------
const BanList = () => {
  const [bans, setBans] = useState([]);
  const [removing, setRemoving] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/bans').then((d) => setBans(d.bans ?? [])).catch(() => {});
  }, []);

  const unban = async (id) => {
    setRemoving(id);
    try {
      await apiFetch(`/bans/${id}`, { method: 'DELETE' });
      setBans((bs) => bs.filter((b) => b.id !== id));
    } catch {}
    setRemoving(null);
  };

  const filtered = bans.filter((b) =>
    !search || b.identifier?.toLowerCase().includes(search.toLowerCase()) || b.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card title="Banned Users / IPs" icon={Ban}>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by user, IP, or reason…" style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <p style={{ color: T.textSecondary, fontSize: 13, textAlign: 'center' }}>No active bans.</p>
        ) : filtered.map((b) => (
          <div key={b.id} style={{ background: T.surfaceElevated, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.critical}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Badge label={b.type} color={T.critical} />
                <span style={{ fontSize: 13, color: T.textPrimary, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.identifier}</span>
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>
                {b.reason && <span>{b.reason} · </span>}
                Banned {fmtDate(b.bannedAt)}
                {b.expiresAt && ` · Expires ${fmtDate(b.expiresAt)}`}
              </div>
            </div>
            <Btn onClick={() => unban(b.id)} disabled={removing === b.id} variant="ghost" icon={XCircle} small>
              {removing === b.id ? 'Removing…' : 'Unban'}
            </Btn>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// API USAGE METRICS
// ---------------------------------------------------------------------------
const APIUsagePanel = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch('/api-usage').then(setData).catch(() => {});
  }, []);

  const endpoints = data?.topEndpoints ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Calls (24h)', value: fmt(data?.total24h) },
          { label: 'Error Rate', value: `${data?.errorRate ?? 0}%`, color: (data?.errorRate ?? 0) > 1 ? T.critical : T.success },
          { label: 'Avg Latency', value: `${data?.avgLatencyMs ?? 0}ms`, color: (data?.avgLatencyMs ?? 0) > 500 ? T.warning : T.success },
          { label: 'Rate-Limited', value: fmt(data?.rateLimited24h), color: data?.rateLimited24h > 100 ? T.warning : T.textPrimary },
        ].map(({ label, value, color = T.textPrimary }) => (
          <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value ?? '—'}</div>
          </div>
        ))}
      </div>
      <Card title="Top Endpoints" icon={BarChart2}>
        {endpoints.length === 0 ? (
          <p style={{ color: T.textSecondary, fontSize: 13 }}>No endpoint data.</p>
        ) : endpoints.map((e, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: T.textPrimary, fontFamily: 'monospace' }}>{e.method} {e.path}</span>
              <span style={{ color: T.textSecondary }}>{fmt(e.count)} calls</span>
            </div>
            <ProgressBar value={e.count} max={endpoints[0]?.count ?? 1} />
          </div>
        ))}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// INFRA PANEL (DB, Redis, Build/Deploy)
// ---------------------------------------------------------------------------
const InfraPanel = () => {
  const [infra, setInfra] = useState(null);

  const load = useCallback(() => {
    apiFetch('/infra').then(setInfra).catch(() => {});
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const db = infra?.database ?? {};
  const redis = infra?.redis ?? {};
  const deploy = infra?.deploy ?? {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Database */}
      <Card title="Database" icon={Database} action={<Btn onClick={load} icon={RefreshCw} variant="ghost" small>Refresh</Btn>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Status</span>
            <StatusDot ok={db.status === 'healthy'} label={db.status ?? 'unknown'} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Active Connections</span>
            <span style={{ color: T.textPrimary }}>{db.activeConnections ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Query Latency</span>
            <span style={{ color: T.textPrimary }}>{db.latencyMs != null ? `${db.latencyMs}ms` : '—'}</span>
          </div>
          {db.poolSize != null && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: T.textSecondary }}>Connection Pool</span>
                <span style={{ color: T.textPrimary }}>{db.activeConnections}/{db.poolSize}</span>
              </div>
              <ProgressBar value={db.activeConnections} max={db.poolSize} color={db.activeConnections / db.poolSize > 0.8 ? T.warning : T.success} />
            </div>
          )}
        </div>
      </Card>

      {/* Redis */}
      <Card title="Redis Cache" icon={Layers}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Status</span>
            <StatusDot ok={redis.status === 'healthy'} label={redis.status ?? 'unknown'} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Memory Used</span>
            <span style={{ color: T.textPrimary }}>{redis.usedMemory ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Hit Rate</span>
            <span style={{ color: (redis.hitRate ?? 0) < 80 ? T.warning : T.success }}>{redis.hitRate != null ? `${redis.hitRate}%` : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Connected Clients</span>
            <span style={{ color: T.textPrimary }}>{redis.connectedClients ?? '—'}</span>
          </div>
        </div>
      </Card>

      {/* Build/Deploy */}
      <Card title="Build & Deploy" icon={GitBranch}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Last Deploy</span>
            <span style={{ color: T.textPrimary }}>{fmtDate(deploy.lastDeployAt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Branch</span>
            <span style={{ color: T.textPrimary, fontFamily: 'monospace' }}>{deploy.branch ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Commit</span>
            <span style={{ color: T.textPrimary, fontFamily: 'monospace' }}>{deploy.commitSha?.slice(0, 8) ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textSecondary }}>Build Status</span>
            <Badge label={deploy.buildStatus ?? 'unknown'} color={deploy.buildStatus === 'success' ? T.success : deploy.buildStatus === 'failed' ? T.critical : T.warning} />
          </div>
          {deploy.buildStatus === 'failed' && deploy.buildError && (
            <div style={{ background: T.critical + '15', border: `1px solid ${T.critical}33`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: T.critical }}>
              {deploy.buildError}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ROOT
// ---------------------------------------------------------------------------

/**
 * AdminDashboard
 *
 * Platform administration console with tabbed navigation.
 * All data sourced from /api/admin/* endpoints.
 *
 * @component
 * @returns {JSX.Element}
 */
const AdminDashboard = () => {
  const [tab, setTab] = useState('overview');

  const renderTab = () => {
    switch (tab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <OverviewPanel />
            <SystemHealthCard />
          </div>
        );
      case 'users':
        return <UserManagement />;
      case 'moderation':
        return <ModerationQueue />;
      case 'revenue':
        return <RevenuePanel />;
      case 'connectors':
        return <ConnectorStatus />;
      case 'logs':
        return <SystemLogs />;
      case 'features':
        return <FeatureFlags />;
      case 'bans':
        return <BanList />;
      case 'api':
        return <APIUsagePanel />;
      case 'infra':
        return <InfraPanel />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        background: T.bg,
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: T.textPrimary,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <LayoutDashboard size={22} color={T.accent} />
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Admin Console</h1>
          <p style={{ margin: 0, fontSize: 12, color: T.textSecondary }}>Platform management & monitoring</p>
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          overflowX: 'auto',
          padding: '0 16px',
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === id ? `2px solid ${T.accent}` : '2px solid transparent',
              color: tab === id ? T.accent : T.textSecondary,
              fontSize: 13,
              fontWeight: tab === id ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 20px', maxWidth: 1400, margin: '0 auto' }}>
        {renderTab()}
      </div>
    </div>
  );
};

export default AdminDashboard;
