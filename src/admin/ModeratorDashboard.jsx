/**
 * File: src/admin/ModeratorDashboard.jsx
 * Purpose: Moderator dashboard — content moderation queue, user report management,
 *          flag/ban/warn actions, content removal workflow, moderation history,
 *          real-time flagged-content alerts, appeal handling, and bulk tools.
 *          Role: moderator. Cannot access admin-only features (users, security policies).
 * Date: 2026-08-22
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 25;
const WS_RECONNECT_MS = 3000;

const ACTION_LABELS = {
  flag: 'Flag',
  warn: 'Warn User',
  ban: 'Ban User',
  remove: 'Remove Content',
  dismiss: 'Dismiss',
};

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#6b7280',
};

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
function useModApi(token) {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api';
  return useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers ?? {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`API ${res.status}: ${text}`);
      }
      return res.json();
    },
    [base, token],
  );
}

// ---------------------------------------------------------------------------
// WebSocket for real-time flagged-content alerts
// ---------------------------------------------------------------------------
function useModSocket(token, onAlert) {
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const wsBase = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:3001';
    const ws = new WebSocket(`${wsBase}/mod/alerts?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      try { onAlert(JSON.parse(evt.data)); } catch { /* ignore */ }
    };
    ws.onclose = () => {
      if (!mountedRef.current) return;
      timerRef.current = setTimeout(connect, WS_RECONNECT_MS);
    };
    ws.onerror = () => ws.close();
  }, [token, onAlert]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
}

// ---------------------------------------------------------------------------
// Helper: relative time
// ---------------------------------------------------------------------------
function ago(iso) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Confirmation modal
// ---------------------------------------------------------------------------
function ConfirmModal({ title, body, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#94a3b8' }}>{body}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={styles.btnOutline} onClick={onCancel}>Cancel</button>
          <button style={{ ...styles.btn, background: danger ? '#ef4444' : '#7c3aed' }}
            onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moderation Queue
// ---------------------------------------------------------------------------
function ModerationQueue({ api }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null); // { item, action }
  const [noteText, setNoteText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (filterType) qs.set('type', filterType);
      if (filterSeverity) qs.set('severity', filterSeverity);
      const data = await api(`/mod/queue?${qs}`);
      setItems(data.items ?? []);
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, page, filterType, filterSeverity]);

  useEffect(() => { load(); }, [load]);

  const act = async (item, action, note) => {
    try {
      await api(`/mod/content/${item.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, note }),
      });
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (e) {
      alert(`Action failed: ${e.message}`);
    }
  };

  const bulkAct = async (action) => {
    if (selected.size === 0) { alert('Select at least one item.'); return; }
    const ids = Array.from(selected);
    try {
      await api('/mod/content/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ ids, action }),
      });
      setItems((prev) => prev.filter((x) => !selected.has(x.id)));
      setSelected(new Set());
    } catch (e) {
      alert(`Bulk action failed: ${e.message}`);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => prev.size === items.length ? new Set() : new Set(items.map((i) => i.id)));
  };

  return (
    <section style={styles.section}>
      {confirm && (
        <ConfirmModal
          title={`${ACTION_LABELS[confirm.action]} — confirm`}
          body={`You are about to ${confirm.action} content item #${confirm.item.id}. Add a note below.`}
          confirmLabel={ACTION_LABELS[confirm.action]}
          danger={['ban', 'remove'].includes(confirm.action)}
          onConfirm={() => { act(confirm.item, confirm.action, noteText); setConfirm(null); setNoteText(''); }}
          onCancel={() => { setConfirm(null); setNoteText(''); }}
        />
      )}

      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Moderation Queue</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select style={styles.input} value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {['post', 'comment', 'profile', 'message', 'image', 'video'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select style={styles.input} value={filterSeverity}
            onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}>
            <option value="">All Severities</option>
            {['critical', 'high', 'medium', 'low'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button style={styles.btnOutline} onClick={load}>Refresh</button>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={styles.bulkBar}>
          <span style={styles.muted}>{selected.size} selected</span>
          {['dismiss', 'remove', 'flag'].map((a) => (
            <button key={a} style={styles.btnSm} onClick={() => bulkAct(a)}>
              Bulk {ACTION_LABELS[a]}
            </button>
          ))}
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      {confirm && (
        <div style={{ marginBottom: 8 }}>
          <label style={styles.formLabel}>Moderation Note</label>
          <textarea
            style={{ ...styles.input, width: '100%', height: 60, resize: 'vertical' }}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Optional note (logged in history)…"
          />
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>
                <input type="checkbox" checked={selected.size === items.length && items.length > 0}
                  onChange={toggleAll} />
              </th>
              {['Type', 'Content Preview', 'Reported By', 'Reason', 'Severity', 'Age', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={styles.tr}>
                <td style={styles.td}>
                  <input type="checkbox" checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)} />
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: '#334155' }}>{item.contentType}</span>
                </td>
                <td style={{ ...styles.td, maxWidth: 200 }}>
                  <span title={item.contentPreview} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.contentPreview}
                  </span>
                </td>
                <td style={styles.td}>{item.reportedByEmail ?? '—'}</td>
                <td style={styles.td}>{item.reason}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: SEVERITY_COLORS[item.severity] ?? '#6b7280' }}>
                    {item.severity}
                  </span>
                </td>
                <td style={styles.td}>{ago(item.reportedAt)}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {Object.entries(ACTION_LABELS).map(([action, label]) => (
                      <button
                        key={action}
                        style={{
                          ...styles.btnSm,
                          background: action === 'ban' ? '#ef4444'
                            : action === 'remove' ? '#b45309'
                            : '#334155',
                        }}
                        onClick={() => setConfirm({ item, action })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: '#22c55e' }}>
                  Queue is clear.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button style={styles.btnOutline} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
        <span style={styles.muted}>Page {page}</span>
        <button style={styles.btnOutline} disabled={items.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next →</button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// User Reports
// ---------------------------------------------------------------------------
function UserReports({ api }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/mod/user-reports');
      setReports(data.reports ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id, action) => {
    try {
      await api(`/mod/user-reports/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setReports((r) => r.filter((x) => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>User Reports</h2>
        <button style={styles.btnOutline} onClick={load}>Refresh</button>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.muted}>Loading…</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Reporter', 'Reported User', 'Reason', 'Detail', 'Submitted', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} style={styles.tr}>
                <td style={styles.td}>{r.reporterEmail}</td>
                <td style={styles.td}>{r.targetEmail}</td>
                <td style={styles.td}>{r.reason}</td>
                <td style={{ ...styles.td, maxWidth: 220 }}>
                  <span title={r.detail} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.detail}
                  </span>
                </td>
                <td style={styles.td}>{ago(r.submittedAt)}</td>
                <td style={styles.td}>
                  <button style={styles.btnSm} onClick={() => resolve(r.id, 'warn')}>Warn</button>
                  <button style={{ ...styles.btnSm, background: '#ef4444' }} onClick={() => resolve(r.id, 'ban')}>Ban</button>
                  <button style={{ ...styles.btnSm, background: '#334155' }} onClick={() => resolve(r.id, 'dismiss')}>Dismiss</button>
                </td>
              </tr>
            ))}
            {!loading && reports.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center' }}>No reports</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Moderation History
// ---------------------------------------------------------------------------
function ModerationHistory({ api }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (search) qs.set('search', search);
      const data = await api(`/mod/history?${qs}`);
      setHistory(data.history ?? []);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [api, page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Moderation History</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={styles.input} placeholder="Search…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <button style={styles.btnOutline} onClick={load}>Refresh</button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Time', 'Moderator', 'Action', 'Target', 'Content ID', 'Note'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} style={styles.tr}>
                <td style={styles.td}>{new Date(h.createdAt).toLocaleString()}</td>
                <td style={styles.td}>{h.moderatorEmail}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: '#334155' }}>{h.action}</span>
                </td>
                <td style={styles.td}>{h.targetEmail ?? '—'}</td>
                <td style={styles.td}><code>{h.contentId ?? '—'}</code></td>
                <td style={{ ...styles.td, maxWidth: 200, color: '#94a3b8', fontSize: 12 }}>{h.note ?? '—'}</td>
              </tr>
            ))}
            {!loading && history.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center' }}>No history</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button style={styles.btnOutline} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
        <span style={styles.muted}>Page {page}</span>
        <button style={styles.btnOutline} disabled={history.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next →</button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Appeal Management
// ---------------------------------------------------------------------------
function Appeals({ api }) {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState({}); // { [id]: 'approve' | 'deny' }
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/mod/appeals');
      setAppeals(data.appeals ?? []);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id) => {
    const d = decision[id];
    if (!d) { alert('Choose Approve or Deny first.'); return; }
    try {
      await api(`/mod/appeals/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ decision: d, note: notes[id] ?? '' }),
      });
      setAppeals((a) => a.filter((x) => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Appeal Management</h2>
        <button style={styles.btnOutline} onClick={load}>Refresh</button>
      </div>
      {loading && <p style={styles.muted}>Loading…</p>}
      {!loading && appeals.length === 0 && <p style={{ color: '#22c55e' }}>No pending appeals.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {appeals.map((a) => (
          <div key={a.id} style={styles.appealCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <strong>{a.userEmail}</strong>
              <span style={styles.muted}>{ago(a.submittedAt)}</span>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0' }}>
              <strong>Appeal:</strong> {a.appealText}
            </p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0' }}>
              Original action: <span style={styles.badge}>{a.originalAction}</span>
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                style={{ ...styles.btnSm, background: decision[a.id] === 'approve' ? '#22c55e' : '#334155' }}
                onClick={() => setDecision((d) => ({ ...d, [a.id]: 'approve' }))}>
                Approve
              </button>
              <button
                style={{ ...styles.btnSm, background: decision[a.id] === 'deny' ? '#ef4444' : '#334155' }}
                onClick={() => setDecision((d) => ({ ...d, [a.id]: 'deny' }))}>
                Deny
              </button>
              <input
                style={{ ...styles.input, flex: 1, minWidth: 120 }}
                placeholder="Note (optional)…"
                value={notes[a.id] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
              />
              <button style={styles.btn} onClick={() => resolve(a.id)}>Submit</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Real-time alerts banner
// ---------------------------------------------------------------------------
function AlertsBanner({ alerts, onDismiss }) {
  if (alerts.length === 0) return null;
  return (
    <div style={styles.alertsBanner}>
      {alerts.map((a) => (
        <div key={a.id} style={styles.alertItem}>
          <span style={{ ...styles.badge, background: SEVERITY_COLORS[a.severity] ?? '#6b7280', marginRight: 8 }}>
            {a.severity}
          </span>
          {a.message}
          <button style={{ ...styles.btnSm, marginLeft: 8, background: 'none', color: '#94a3b8' }}
            onClick={() => onDismiss(a.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
const TABS = ['Queue', 'User Reports', 'History', 'Appeals'];

// ---------------------------------------------------------------------------
// Main ModeratorDashboard
// ---------------------------------------------------------------------------
export default function ModeratorDashboard({ moderatorToken }) {
  const [tab, setTab] = useState('Queue');
  const [liveAlerts, setLiveAlerts] = useState([]);

  if (!moderatorToken) {
    return (
      <div style={{ ...styles.root, color: '#ef4444', padding: 40 }}>
        Moderator JWT required.
      </div>
    );
  }

  const api = useModApi(moderatorToken);

  const handleAlert = useCallback((msg) => {
    if (msg.type === 'flagged_content') {
      setLiveAlerts((prev) => [{ ...msg.data, id: msg.data.id ?? Date.now() }, ...prev].slice(0, 10));
    }
  }, []);

  useModSocket(moderatorToken, handleAlert);

  const dismissAlert = (id) => setLiveAlerts((a) => a.filter((x) => x.id !== id));

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Nexus AI Pro — Moderator Dashboard</h1>
          <span style={{ ...styles.roleBadge, background: '#d97706' }}>MODERATOR</span>
        </div>
        <span style={styles.muted}>Real-time alerts active</span>
      </header>

      <AlertsBanner alerts={liveAlerts} onDismiss={dismissAlert} />

      <nav style={styles.nav}>
        {TABS.map((t) => (
          <button key={t}
            style={{ ...styles.navBtn, ...(tab === t ? styles.navBtnActive : {}) }}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {tab === 'Queue'        && <ModerationQueue api={api} />}
        {tab === 'User Reports' && <UserReports api={api} />}
        {tab === 'History'      && <ModerationHistory api={api} />}
        {tab === 'Appeals'      && <Appeals api={api} />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------
const styles = {
  root: {
    fontFamily: 'system-ui, sans-serif',
    background: '#0f172a',
    color: '#e2e8f0',
    minHeight: '100vh',
  },
  header: {
    background: '#1e293b',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
  },
  headerTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
  roleBadge: {
    display: 'inline-block',
    background: '#d97706',
    color: '#fff',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    marginLeft: 8,
    letterSpacing: 1,
  },
  nav: {
    display: 'flex',
    gap: 4,
    padding: '8px 24px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    flexWrap: 'wrap',
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  navBtnActive: { background: '#334155', color: '#f1f5f9' },
  main: { padding: 24 },
  section: {
    background: '#1e293b',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    border: '1px solid #334155',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: '1px solid #334155',
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #1e293b', verticalAlign: 'middle' },
  tr: { background: 'transparent' },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    color: '#fff',
    fontWeight: 600,
    background: '#334155',
  },
  btn: {
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    padding: '7px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  btnOutline: {
    background: 'none',
    color: '#94a3b8',
    border: '1px solid #475569',
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  btnSm: {
    background: '#334155',
    color: '#e2e8f0',
    border: 'none',
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    marginRight: 4,
  },
  input: {
    background: '#0f172a',
    border: '1px solid #475569',
    borderRadius: 6,
    color: '#e2e8f0',
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    minWidth: 140,
  },
  formLabel: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: '#1e293b',
    border: '1px solid #475569',
    borderRadius: 10,
    padding: 24,
    width: 400,
    maxWidth: '90vw',
  },
  appealCard: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '14px 16px',
  },
  alertsBanner: {
    background: '#1c1917',
    borderBottom: '1px solid #b45309',
    padding: '6px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    padding: '4px 0',
  },
  bulkBar: {
    background: '#0f172a',
    border: '1px solid #475569',
    borderRadius: 6,
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  error: { color: '#ef4444', fontSize: 13 },
  muted: { color: '#64748b', fontSize: 13 },
};
