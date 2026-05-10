// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, RefreshCw, Copy, Webhook, CheckCircle, XCircle, Loader2,
  GitBranch, AlertCircle, Server, Cpu, HardDrive, Terminal,
  ExternalLink, Plus, Trash2, Play, Globe, Activity, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const API = async (path, opts = {}) => {
  const token = sessionStorage.getItem('nexus:token');
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

function maskKey(key = '') {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
}

function maskUrl(url = '') {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname.slice(0, 3)}***${u.pathname.slice(0, 8)}...`;
  } catch { return '***'; }
}

function StatusBadge({ status }) {
  const map = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    fail: 'bg-red-500/20 text-red-400 border-red-500/30',
    running: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    connected: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    disconnected: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-cyan-400" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const INTEGRATIONS = [
  { id: 'github', name: 'GitHub', icon: '⬡' },
  { id: 'bitbucket', name: 'Bitbucket', icon: '⬡' },
  { id: 'slack', name: 'Slack', icon: '⬡' },
  { id: 'azure', name: 'Azure', icon: '⬡' },
  { id: 'aws', name: 'AWS', icon: '⬡' },
  { id: 'google', name: 'Google Cloud', icon: '⬡' },
];

export default function DevDashboard() {
  const { user: me } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [usageStats, setUsageStats] = useState(null);
  const [webhooks, setWebhooks] = useState([]);
  const [newWebhook, setNewWebhook] = useState({ url: '', events: '' });
  const [addingWebhook, setAddingWebhook] = useState(false);
  const [integrations, setIntegrations] = useState({});
  const [builds, setBuilds] = useState([]);
  const [errors, setErrors] = useState([]);
  const [expandedError, setExpandedError] = useState(null);
  const [envInfo, setEnvInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyRegenOk, setKeyRegenOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dev] = await Promise.all([
        API('/api/dev/info').catch(() => ({})),
      ]);
      setApiKey(dev.apiKey ?? '');
      setUsageStats(dev.usage ?? null);
      setWebhooks(dev.webhooks ?? []);
      setIntegrations(dev.integrations ?? {});
      setBuilds(dev.builds ?? []);
      setErrors(dev.recentErrors ?? []);
      setEnvInfo(dev.envInfo ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const regenKey = async () => {
    if (!confirm('Regenerate API key? The old key will stop working immediately.')) return;
    const data = await API('/api/dev/api-key/regenerate', { method: 'POST' }).catch(() => ({}));
    if (data.apiKey) {
      setApiKey(data.apiKey);
      setKeyRegenOk(true);
      setTimeout(() => setKeyRegenOk(false), 3000);
    }
  };

  const copyKey = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addWebhook = async () => {
    if (!newWebhook.url) return;
    const events = newWebhook.events.split(',').map((e) => e.trim()).filter(Boolean);
    const data = await API('/api/dev/webhooks', { method: 'POST', body: JSON.stringify({ url: newWebhook.url, events }) }).catch(() => null);
    if (data) {
      setWebhooks((prev) => [...prev, data]);
      setNewWebhook({ url: '', events: '' });
      setAddingWebhook(false);
    }
  };

  const removeWebhook = async (id) => {
    await API(`/api/dev/webhooks/${id}`, { method: 'DELETE' }).catch(() => {});
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const testWebhook = async (id) => {
    await API(`/api/dev/webhooks/${id}/test`, { method: 'POST' }).catch(() => {});
  };

  const connectIntegration = async (id) => {
    window.open(`/api/integrations/${id}/connect`, '_blank', 'width=600,height=700');
  };

  const miniChart = (data = []) => {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * 200},${60 - (v / max) * 55}`).join(' ');
    return (
      <svg viewBox="0 0 200 60" className="w-full h-16" preserveAspectRatio="none">
        <polyline fill="none" stroke="#22d3ee" strokeWidth="2" points={pts} />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Developer Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Welcome, <span className="text-cyan-400">{me?.username ?? me?.email}</span></p>
        </div>
        <div className="flex gap-3">
          <span className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${usageStats ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'}`}>
            <Activity size={14} /> {usageStats ? 'API Online' : 'Loading...'}
          </span>
          <a href="/docs" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm flex items-center gap-1.5 hover:bg-cyan-500/20 transition">
            <ExternalLink size={14} /> Docs
          </a>
        </div>
      </header>

      {/* API Key Management */}
      <Section title="API Key Management" icon={Key}>
        <div className="p-5 rounded-xl border border-white/10 bg-white/3 space-y-4">
          <p className="text-xs text-gray-500">Full key shown only at creation. Stored server-side — never transmitted in responses.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <code className="flex-1 min-w-0 font-mono text-sm text-cyan-300 bg-black/30 border border-white/10 rounded-lg px-4 py-3 overflow-x-auto">
              {loading ? '••••••••••••••••' : (apiKey ? maskKey(apiKey) : 'No key generated')}
            </code>
            <button onClick={copyKey} className="px-4 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm flex items-center gap-2 hover:bg-cyan-500/20 transition whitespace-nowrap">
              {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
            </button>
            <button onClick={regenKey} className="px-4 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm flex items-center gap-2 hover:bg-orange-500/20 transition whitespace-nowrap">
              <RefreshCw size={14} /> Regenerate
              {keyRegenOk && <CheckCircle size={14} className="text-green-400" />}
            </button>
          </div>
        </div>
      </Section>

      {/* API Usage Stats */}
      <Section title="API Usage Stats" icon={Activity}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Requests Today', value: usageStats?.today ?? '—', accent: 'cyan' },
            { label: 'Requests This Month', value: usageStats?.month ?? '—', accent: 'blue' },
            { label: 'Avg Latency', value: usageStats?.avgLatency ? `${usageStats.avgLatency}ms` : '—', accent: 'cyan' },
          ].map(({ label, value, accent }) => (
            <div key={label} className={`p-5 rounded-xl border border-${accent}-500/20 bg-${accent}-500/5`}>
              <div className={`text-sm text-${accent}-400 mb-1`}>{label}</div>
              <div className="text-2xl font-bold text-white">{value}</div>
            </div>
          ))}
        </div>
        {usageStats?.errorRate !== undefined && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <div>
              <p className="text-sm text-red-400 font-medium">Error Rate</p>
              <p className="text-white text-lg font-bold">{usageStats.errorRate}%</p>
            </div>
          </div>
        )}
        {usageStats?.history && (
          <div className="mt-4 p-4 rounded-xl border border-white/10 bg-white/3">
            <p className="text-xs text-gray-500 mb-2">Requests (last 7 days)</p>
            {miniChart(usageStats.history)}
          </div>
        )}
      </Section>

      {/* Webhook Configuration */}
      <Section title="Webhook Configuration" icon={Webhook}>
        <div className="space-y-3 mb-4">
          {webhooks.length === 0 && !addingWebhook && (
            <p className="text-gray-500 text-sm">No webhooks configured.</p>
          )}
          {webhooks.map((w) => (
            <div key={w.id} className="p-4 rounded-xl border border-white/10 bg-white/3 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <p className="text-sm font-mono text-gray-300">{maskUrl(w.url)}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {(w.events ?? []).map((ev) => (
                    <span key={ev} className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{ev}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={w.status ?? 'inactive'} />
                <button onClick={() => testWebhook(w.id)} className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition">
                  <Play size={14} />
                </button>
                <button onClick={() => removeWebhook(w.id)} className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {addingWebhook && (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
              <input value={newWebhook.url} onChange={(e) => setNewWebhook((p) => ({ ...p, url: e.target.value }))} placeholder="https://your-server.com/webhook" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
              <input value={newWebhook.events} onChange={(e) => setNewWebhook((p) => ({ ...p, events: e.target.value }))} placeholder="Events (comma separated): push, pr, deploy" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
              <div className="flex gap-2">
                <button onClick={addWebhook} className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 transition">Add</button>
                <button onClick={() => setAddingWebhook(false)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition">Cancel</button>
              </div>
            </div>
          )}
        </div>
        {!addingWebhook && (
          <button onClick={() => setAddingWebhook(true)} className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm flex items-center gap-2 hover:bg-cyan-500/20 transition">
            <Plus size={14} /> Add Webhook
          </button>
        )}
      </Section>

      {/* Connected Integrations */}
      <Section title="Connected Integrations" icon={Globe}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {INTEGRATIONS.map((intg) => {
            const connected = integrations[intg.id] === true;
            return (
              <div key={intg.id} className={`p-4 rounded-xl border flex items-center justify-between ${connected ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-white/10 bg-white/3'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{intg.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{intg.name}</p>
                    <StatusBadge status={connected ? 'connected' : 'disconnected'} />
                  </div>
                </div>
                <button onClick={() => connectIntegration(intg.id)} className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition">
                  {connected ? 'Manage' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Build Pipeline Status */}
      <Section title="Build Pipeline Status" icon={GitBranch}>
        <div className="space-y-2">
          {builds.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent builds.</p>
          ) : builds.slice(0, 10).map((b, i) => (
            <div key={i} className="p-3 rounded-xl border border-white/10 bg-white/3 flex items-center gap-4">
              <StatusBadge status={b.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{b.name ?? `Build #${b.id}`}</p>
                <p className="text-xs text-gray-500">{b.branch} · {b.commit?.slice(0, 8)}</p>
              </div>
              <div className="text-xs text-gray-500 shrink-0 flex items-center gap-1">
                <Clock size={12} /> {b.duration ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Error Log */}
      <Section title="Error Log" icon={AlertCircle}>
        <div className="space-y-2">
          {errors.length === 0 ? (
            <div className="p-6 rounded-xl border border-white/10 text-center text-gray-500">No recent errors</div>
          ) : errors.slice(0, 20).map((err, i) => (
            <div key={i} className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
              <button onClick={() => setExpandedError(expandedError === i ? null : i)} className="w-full p-4 flex items-start gap-3 text-left hover:bg-red-500/10 transition">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-300 font-medium truncate">{err.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(err.timestamp).toLocaleString()}</p>
                </div>
              </button>
              {expandedError === i && err.stack && (
                <pre className="px-4 pb-4 text-xs text-gray-400 font-mono whitespace-pre-wrap overflow-x-auto border-t border-red-500/20 pt-3">
                  {err.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Environment Info */}
      <Section title="Environment Info" icon={Terminal}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Node Version', value: envInfo?.nodeVersion ?? '—', icon: Server },
            { label: 'Platform', value: envInfo?.platform ?? '—', icon: Cpu },
            { label: 'Memory', value: envInfo?.memory ?? '—', icon: HardDrive },
            { label: 'Environment', value: envInfo?.env ?? '—', icon: Terminal },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-4 rounded-xl border border-white/10 bg-white/3">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-cyan-400" />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <p className="text-sm font-mono text-white">{value}</p>
            </div>
          ))}
        </div>
        {envInfo?.envKeys?.length > 0 && (
          <div className="p-4 rounded-xl border border-white/10 bg-white/3">
            <p className="text-xs text-gray-400 mb-3">Environment Variables Present (keys only)</p>
            <div className="flex flex-wrap gap-2">
              {envInfo.envKeys.map((k) => (
                <span key={k} className="px-2 py-1 text-xs rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">{k}</span>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
