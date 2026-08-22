/**
 * File: src/admin/DevDashboard.jsx
 * Purpose: Developer dashboard — API key management, webhook configuration, SDK docs,
 *          API usage analytics, feature flags, A/B tests, log streaming, and integration
 *          status. Role: developer. Cannot manage users or security policies.
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
const LOG_MAX_LINES = 200;
const LOG_POLL_MS   = 2000;

// ---------------------------------------------------------------------------
// API helper — scoped to the authenticated developer's app
// ---------------------------------------------------------------------------
function useDevApi(token) {
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
// Helpers
// ---------------------------------------------------------------------------
function maskKey(key) {
  if (!key || key.length < 10) return '••••••••';
  return `${key.slice(0, 6)}${'•'.repeat(key.length - 10)}${key.slice(-4)}`;
}

function ago(iso) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// API Key Management
// ---------------------------------------------------------------------------
function ApiKeys({ api }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState('read');
  const [revealed, setRevealed] = useState({}); // { [id]: true } to show full key once
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState(null); // shown once after generation

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/dev/api-keys');
      setKeys(data.keys ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!newKeyName.trim()) { alert('Key name is required.'); return; }
    setCreating(true);
    try {
      const data = await api('/dev/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName.trim(), scopes: newKeyScopes }),
      });
      setFreshKey(data.key); // full key returned once
      setNewKeyName('');
      await load();
    } catch (e) {
      alert(`Failed: ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await api(`/dev/api-keys/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) { alert(e.message); }
  };

  const rotate = async (id) => {
    if (!confirm('Rotate this key? The old value will stop working immediately.')) return;
    try {
      const data = await api(`/dev/api-keys/${id}/rotate`, { method: 'POST' });
      setFreshKey(data.key);
      await load();
    } catch (e) { alert(e.message); }
  };

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>API Key Management</h2>

      {freshKey && (
        <div style={styles.freshKeyBox}>
          <strong>New key (copy now — shown once):</strong>
          <code style={{ display: 'block', wordBreak: 'break-all', margin: '6px 0' }}>{freshKey}</code>
          <button style={styles.btnSm} onClick={() => { navigator.clipboard?.writeText(freshKey); }}>Copy</button>
          <button style={{ ...styles.btnSm, marginLeft: 8 }} onClick={() => setFreshKey(null)}>Dismiss</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input style={styles.input} placeholder="Key name (e.g. production-web)"
          value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
        <select style={styles.input} value={newKeyScopes}
          onChange={(e) => setNewKeyScopes(e.target.value)}>
          {['read', 'read,write', 'read,write,admin'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button style={styles.btn} onClick={generate} disabled={creating}>
          {creating ? 'Generating…' : '+ Generate Key'}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Name', 'Key', 'Scopes', 'Last Used', 'Created', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} style={styles.tr}>
                <td style={styles.td}>{k.name}</td>
                <td style={styles.td}>
                  <code>{revealed[k.id] ? k.maskedKey : maskKey(k.maskedKey)}</code>
                  <button style={{ ...styles.btnSm, marginLeft: 6 }}
                    onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}>
                    {revealed[k.id] ? 'Hide' : 'Show'}
                  </button>
                </td>
                <td style={styles.td}>{k.scopes}</td>
                <td style={styles.td}>{ago(k.lastUsedAt)}</td>
                <td style={styles.td}>{ago(k.createdAt)}</td>
                <td style={styles.td}>
                  <button style={styles.btnSm} onClick={() => rotate(k.id)}>Rotate</button>
                  <button style={{ ...styles.btnSm, background: '#ef4444' }} onClick={() => revoke(k.id)}>Revoke</button>
                </td>
              </tr>
            ))}
            {!loading && keys.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center' }}>No keys yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Webhook Configuration
// ---------------------------------------------------------------------------
function Webhooks({ api }) {
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ url: '', events: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/dev/webhooks');
      setHooks(data.webhooks ?? []);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.url.trim()) { alert('URL is required.'); return; }
    setSaving(true);
    try {
      await api('/dev/webhooks', { method: 'POST', body: JSON.stringify(form) });
      setForm({ url: '', events: '', description: '' });
      await load();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api(`/dev/webhooks/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) { alert(e.message); }
  };

  const test = async (id) => {
    try {
      const r = await api(`/dev/webhooks/${id}/test`, { method: 'POST' });
      alert(`Test sent — status: ${r.status}`);
    } catch (e) { alert(e.message); }
  };

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Webhook Configuration</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input style={styles.input} placeholder="Endpoint URL" value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <input style={styles.input} placeholder="Events (e.g. user.created,order.paid)"
          value={form.events} onChange={(e) => setForm({ ...form, events: e.target.value })} />
        <input style={styles.input} placeholder="Description"
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button style={styles.btn} onClick={create} disabled={saving}>
          {saving ? 'Saving…' : '+ Add Webhook'}
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['URL', 'Events', 'Description', 'Status', 'Last Fired', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hooks.map((h) => (
              <tr key={h.id} style={styles.tr}>
                <td style={{ ...styles.td, maxWidth: 240 }}>
                  <span title={h.url} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.url}
                  </span>
                </td>
                <td style={styles.td}><code style={{ fontSize: 11 }}>{h.events}</code></td>
                <td style={styles.td}>{h.description ?? '—'}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: h.active ? '#22c55e' : '#6b7280' }}>
                    {h.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>{ago(h.lastFiredAt)}</td>
                <td style={styles.td}>
                  <button style={styles.btnSm} onClick={() => test(h.id)}>Test</button>
                  <button style={{ ...styles.btnSm, background: '#ef4444' }} onClick={() => remove(h.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && hooks.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center' }}>No webhooks</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// API Usage Analytics
// ---------------------------------------------------------------------------
function ApiAnalytics({ api }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('24h');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/dev/analytics?range=${range}`);
      setStats(data);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [api, range]);

  useEffect(() => { load(); }, [load]);

  const Metric = ({ label, value, sub, color }) => (
    <div style={styles.metricCard}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? '#e2e8f0' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>API Usage Analytics</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['1h', '24h', '7d', '30d'].map((r) => (
            <button key={r}
              style={{ ...styles.btnOutline, ...(range === r ? { background: '#334155', color: '#f1f5f9' } : {}) }}
              onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
          <button style={styles.btnOutline} onClick={load}>Refresh</button>
        </div>
      </div>
      {loading && <p style={styles.muted}>Loading…</p>}
      {stats && (
        <>
          <div style={styles.grid}>
            <Metric label="Total Requests" value={stats.totalRequests?.toLocaleString()} />
            <Metric label="Requests / sec" value={stats.rps?.toFixed(2)} />
            <Metric label="Error Rate" value={`${(stats.errorRate ?? 0).toFixed(2)}%`}
              color={(stats.errorRate ?? 0) > 2 ? '#ef4444' : '#22c55e'} />
            <Metric label="P50 Latency" value={`${stats.p50Latency ?? '—'}ms`} />
            <Metric label="P99 Latency" value={`${stats.p99Latency ?? '—'}ms`}
              color={(stats.p99Latency ?? 0) > 500 ? '#f59e0b' : undefined} />
            <Metric label="4xx Errors" value={stats.errors4xx?.toLocaleString()} color="#f59e0b" />
            <Metric label="5xx Errors" value={stats.errors5xx?.toLocaleString()} color="#ef4444" />
            <Metric label="Bandwidth" value={`${((stats.bandwidthBytes ?? 0) / 1_048_576).toFixed(1)} MB`} />
          </div>

          {stats.topEndpoints && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>Top Endpoints</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['Endpoint', 'Calls', 'Avg Latency (ms)', 'Error Rate'].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topEndpoints.map((e, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}><code>{e.path}</code></td>
                        <td style={styles.td}>{e.calls?.toLocaleString()}</td>
                        <td style={styles.td}>{e.avgLatency}</td>
                        <td style={styles.td}>{e.errorRate?.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Feature Flag Management
// ---------------------------------------------------------------------------
function FeatureFlags({ api }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newFlag, setNewFlag] = useState({ key: '', description: '', enabled: false, rollout: 100 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/dev/feature-flags');
      setFlags(data.flags ?? []);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (key, enabled) => {
    try {
      await api(`/dev/feature-flags/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      await load();
    } catch (e) { alert(e.message); }
  };

  const updateRollout = async (key, rollout) => {
    try {
      await api(`/dev/feature-flags/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ rollout: Number(rollout) }),
      });
      await load();
    } catch (e) { alert(e.message); }
  };

  const create = async () => {
    if (!newFlag.key.trim()) { alert('Flag key is required.'); return; }
    try {
      await api('/dev/feature-flags', { method: 'POST', body: JSON.stringify(newFlag) });
      setNewFlag({ key: '', description: '', enabled: false, rollout: 100 });
      await load();
    } catch (e) { alert(e.message); }
  };

  const remove = async (key) => {
    if (!confirm(`Delete flag "${key}"?`)) return;
    try {
      await api(`/dev/feature-flags/${key}`, { method: 'DELETE' });
      await load();
    } catch (e) { alert(e.message); }
  };

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Feature Flags</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={styles.input} placeholder="Flag key (e.g. new-checkout)"
          value={newFlag.key} onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })} />
        <input style={styles.input} placeholder="Description"
          value={newFlag.description} onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <input type="checkbox" checked={newFlag.enabled}
            onChange={(e) => setNewFlag({ ...newFlag, enabled: e.target.checked })} />
          Enabled
        </label>
        <input style={{ ...styles.input, width: 90 }} type="number" min={0} max={100}
          placeholder="Rollout %" value={newFlag.rollout}
          onChange={(e) => setNewFlag({ ...newFlag, rollout: e.target.value })} />
        <button style={styles.btn} onClick={create}>+ Add Flag</button>
      </div>
      {loading && <p style={styles.muted}>Loading…</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {flags.map((f) => (
          <div key={f.key} style={styles.flagRow}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontFamily: 'monospace' }}>{f.key}</strong>
              {f.description && <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 13 }}>{f.description}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <input type="checkbox" checked={!!f.enabled}
                  onChange={(e) => toggle(f.key, e.target.checked)} />
                {f.enabled ? <span style={{ color: '#22c55e' }}>Enabled</span> : <span style={{ color: '#6b7280' }}>Disabled</span>}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <span style={styles.muted}>Rollout:</span>
                <input type="number" min={0} max={100}
                  style={{ ...styles.input, width: 70, padding: '4px 8px' }}
                  value={f.rollout ?? 100}
                  onChange={(e) => updateRollout(f.key, e.target.value)} />%
              </div>
              <button style={{ ...styles.btnSm, background: '#ef4444' }} onClick={() => remove(f.key)}>Delete</button>
            </div>
          </div>
        ))}
        {!loading && flags.length === 0 && <p style={styles.muted}>No feature flags defined.</p>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// A/B Test Configuration
// ---------------------------------------------------------------------------
function ABTests({ api }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', variants: '', trafficSplit: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/dev/ab-tests');
      setTests(data.tests ?? []);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) { alert('Test name required.'); return; }
    try {
      await api('/dev/ab-tests', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', variants: '', trafficSplit: '' });
      await load();
    } catch (e) { alert(e.message); }
  };

  const stop = async (id) => {
    try {
      await api(`/dev/ab-tests/${id}/stop`, { method: 'POST' });
      await load();
    } catch (e) { alert(e.message); }
  };

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>A/B Test Configuration</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input style={styles.input} placeholder="Test name"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input style={styles.input} placeholder="Variants (e.g. control,variant-a)"
          value={form.variants} onChange={(e) => setForm({ ...form, variants: e.target.value })} />
        <input style={styles.input} placeholder="Traffic split (e.g. 50,50)"
          value={form.trafficSplit} onChange={(e) => setForm({ ...form, trafficSplit: e.target.value })} />
        <button style={styles.btn} onClick={create}>+ Create Test</button>
      </div>
      {loading && <p style={styles.muted}>Loading…</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Name', 'Variants', 'Traffic Split', 'Status', 'Started', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id} style={styles.tr}>
                <td style={styles.td}>{t.name}</td>
                <td style={styles.td}><code>{t.variants}</code></td>
                <td style={styles.td}>{t.trafficSplit}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: t.status === 'running' ? '#22c55e' : '#6b7280' }}>
                    {t.status}
                  </span>
                </td>
                <td style={styles.td}>{ago(t.startedAt)}</td>
                <td style={styles.td}>
                  {t.status === 'running' && (
                    <button style={{ ...styles.btnSm, background: '#ef4444' }} onClick={() => stop(t.id)}>Stop</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && tests.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center' }}>No tests</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Log Streaming (filtered to own app)
// ---------------------------------------------------------------------------
function LogStream({ api }) {
  const [lines, setLines] = useState([]);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState('');
  const [level, setLevel] = useState('');
  const intervalRef = useRef(null);
  const endRef = useRef(null);
  const cursorRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ limit: 50 });
      if (filter) qs.set('filter', filter);
      if (level) qs.set('level', level);
      if (cursorRef.current) qs.set('cursor', cursorRef.current);
      const data = await api(`/dev/logs/stream?${qs}`);
      if (data.logs?.length) {
        cursorRef.current = data.cursor;
        setLines((prev) => [...prev, ...data.logs].slice(-LOG_MAX_LINES));
      }
    } catch { /* ignore */ }
  }, [api, filter, level]);

  const start = () => {
    setRunning(true);
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, LOG_POLL_MS);
  };

  const stop = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  const levelColor = (l) => ({
    error: '#ef4444', warn: '#f59e0b', info: '#60a5fa', debug: '#94a3b8',
  }[l?.toLowerCase()] ?? '#e2e8f0');

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Log Stream (your app)</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={styles.input} placeholder="Filter text…"
            value={filter} onChange={(e) => setFilter(e.target.value)} />
          <select style={styles.input} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option>
            {['error', 'warn', 'info', 'debug'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          {running
            ? <button style={{ ...styles.btn, background: '#ef4444' }} onClick={stop}>Stop</button>
            : <button style={styles.btn} onClick={start}>Stream</button>
          }
          <button style={styles.btnOutline} onClick={() => { setLines([]); cursorRef.current = null; }}>Clear</button>
        </div>
      </div>
      <div style={styles.logBox}>
        {lines.length === 0 && <span style={styles.muted}>No logs yet. Press Stream to begin.</span>}
        {lines.map((line, i) => (
          <div key={i} style={{ color: levelColor(line.level), fontSize: 12, lineHeight: 1.6, fontFamily: 'monospace' }}>
            <span style={{ color: '#64748b', marginRight: 8 }}>{line.ts}</span>
            <span style={{ marginRight: 8, fontWeight: 700 }}>[{(line.level ?? 'info').toUpperCase()}]</span>
            {line.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Integration Status
// ---------------------------------------------------------------------------
function IntegrationStatus({ api }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/dev/integrations');
      setIntegrations(data.integrations ?? []);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const statusColor = (s) => ({
    connected: '#22c55e',
    degraded: '#f59e0b',
    disconnected: '#ef4444',
    unconfigured: '#6b7280',
  }[s] ?? '#6b7280');

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Integration Status</h2>
        <button style={styles.btnOutline} onClick={load}>Refresh</button>
      </div>
      {loading && <p style={styles.muted}>Loading…</p>}
      <div style={styles.grid}>
        {integrations.map((intg) => (
          <div key={intg.name} style={styles.intgCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{intg.name}</strong>
              <span style={{ ...styles.badge, background: statusColor(intg.status) }}>{intg.status}</span>
            </div>
            {intg.latencyMs != null && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Latency: {intg.latencyMs}ms
              </div>
            )}
            {intg.lastChecked && (
              <div style={{ fontSize: 11, color: '#64748b' }}>Checked {ago(intg.lastChecked)}</div>
            )}
          </div>
        ))}
        {!loading && integrations.length === 0 && (
          <p style={styles.muted}>No integrations configured.</p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SDK Docs Quick Access
// ---------------------------------------------------------------------------
const SDK_LINKS = [
  { label: 'REST API Reference',     href: '/docs/api' },
  { label: 'JavaScript / Node SDK',  href: '/docs/sdk/js' },
  { label: 'Python SDK',             href: '/docs/sdk/python' },
  { label: 'Go SDK',                 href: '/docs/sdk/go' },
  { label: 'Java SDK',               href: '/docs/sdk/java' },
  { label: 'Webhooks Guide',         href: '/docs/webhooks' },
  { label: 'Authentication',         href: '/docs/auth' },
  { label: 'Rate Limiting',          href: '/docs/rate-limiting' },
  { label: 'Error Codes',            href: '/docs/errors' },
  { label: 'Changelog',              href: '/docs/changelog' },
];

function SdkDocs() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>SDK Documentation</h2>
      <div style={styles.grid}>
        {SDK_LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" style={styles.docCard}>
            {l.label} →
          </a>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
const TABS = ['API Keys', 'Webhooks', 'Analytics', 'Feature Flags', 'A/B Tests', 'Logs', 'Integrations', 'SDK Docs'];

// ---------------------------------------------------------------------------
// Main DevDashboard
// ---------------------------------------------------------------------------
export default function DevDashboard({ developerToken }) {
  const [tab, setTab] = useState('API Keys');

  if (!developerToken) {
    return (
      <div style={{ ...styles.root, color: '#ef4444', padding: 40 }}>
        Developer JWT required.
      </div>
    );
  }

  const api = useDevApi(developerToken);

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Nexus AI Pro — Developer Dashboard</h1>
          <span style={{ ...styles.roleBadge, background: '#2563eb' }}>DEVELOPER</span>
        </div>
      </header>

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
        {tab === 'API Keys'     && <ApiKeys api={api} />}
        {tab === 'Webhooks'     && <Webhooks api={api} />}
        {tab === 'Analytics'    && <ApiAnalytics api={api} />}
        {tab === 'Feature Flags'&& <FeatureFlags api={api} />}
        {tab === 'A/B Tests'    && <ABTests api={api} />}
        {tab === 'Logs'         && <LogStream api={api} />}
        {tab === 'Integrations' && <IntegrationStatus api={api} />}
        {tab === 'SDK Docs'     && <SdkDocs />}
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
    background: '#2563eb',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
  },
  metricCard: {
    background: '#0f172a',
    borderRadius: 8,
    padding: 14,
    border: '1px solid #334155',
  },
  intgCard: {
    background: '#0f172a',
    borderRadius: 8,
    padding: 14,
    border: '1px solid #334155',
  },
  docCard: {
    background: '#0f172a',
    borderRadius: 8,
    padding: 14,
    border: '1px solid #334155',
    color: '#60a5fa',
    textDecoration: 'none',
    fontSize: 13,
    display: 'block',
  },
  flagRow: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  cardLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  logBox: {
    background: '#020617',
    border: '1px solid #1e293b',
    borderRadius: 6,
    padding: 12,
    height: 320,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  freshKeyBox: {
    background: '#0f2a1f',
    border: '1px solid #22c55e',
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
    color: '#86efac',
  },
  error: { color: '#ef4444', fontSize: 13 },
  muted: { color: '#64748b', fontSize: 13 },
};
