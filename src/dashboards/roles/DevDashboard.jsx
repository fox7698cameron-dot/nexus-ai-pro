// Date: 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, RefreshCw, Copy, Eye, EyeOff, ExternalLink, AlertTriangle,
  CheckCircle, Code, Globe, Webhook, Zap, FileCode, ToggleLeft, ToggleRight,
  Plus, Trash2, Clock, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_KEYS = [
  { id: 'key_live_001', name: 'Production', key: 'nxp_live_sk_xxxxxxxxxxxxxxxx', created: new Date(2026, 1, 15), lastUsed: new Date(2026, 6, 20), calls: 48392 },
  { id: 'key_live_002', name: 'Mobile App', key: 'nxp_live_sk_yyyyyyyyyyyyyyyy', created: new Date(2026, 3, 5), lastUsed: new Date(2026, 6, 19), calls: 12043 },
  { id: 'key_test_001', name: 'Testing', key: 'nxp_test_sk_zzzzzzzzzzzzzzzz', created: new Date(2026, 5, 1), lastUsed: new Date(2026, 6, 18), calls: 3021 },
];

const USAGE_DATA = Array.from({ length: 14 }, (_, i) => ({
  date: format(new Date(2026, 6, 7 + i), 'MMM d'),
  calls: 2000 + Math.round(Math.random() * 4000),
  errors: Math.round(Math.random() * 80),
}));

const WEBHOOKS = [
  { id: 'wh_001', url: 'https://myapp.io/webhooks/nexus', events: ['payment.succeeded', 'subscription.updated'], active: true },
  { id: 'wh_002', url: 'https://ci.example.com/hooks/deploy', events: ['api.key.created'], active: false },
];

const ERRORS = [
  { id: 'e1', code: 429, message: 'Rate limit exceeded', endpoint: '/api/chat', time: new Date(2026, 6, 20, 14, 32) },
  { id: 'e2', code: 401, message: 'Invalid API key', endpoint: '/api/generate/image', time: new Date(2026, 6, 20, 11, 5) },
  { id: 'e3', code: 500, message: 'Model timeout', endpoint: '/api/chat', time: new Date(2026, 6, 19, 23, 51) },
];

const SDK_LINKS = [
  { lang: 'JavaScript / TypeScript', url: '#', icon: '⚡' },
  { lang: 'Python', url: '#', icon: '🐍' },
  { lang: 'Go', url: '#', icon: '🔵' },
  { lang: 'Ruby', url: '#', icon: '💎' },
  { lang: 'PHP', url: '#', icon: '🐘' },
  { lang: 'Java', url: '#', icon: '☕' },
];

export default function DevDashboard() {
  const [tab, setTab] = useState('keys');
  const [keys, setKeys] = useState(MOCK_KEYS);
  const [revealedKey, setRevealedKey] = useState(null);
  const [copied, setCopied] = useState(null);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [webhooks, setWebhooks] = useState(WEBHOOKS);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);

  const maskKey = (key) => key.replace(/(?<=.{12}).(?=.{4})/g, '•');

  const copyKey = (id, key) => {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const revokeKey = (id) => setKeys((prev) => prev.filter((k) => k.id !== id));

  const generateKey = () => {
    if (!newKeyName.trim()) return;
    setGeneratingKey(true);
    setTimeout(() => {
      const prefix = sandboxMode ? 'nxp_test_sk_' : 'nxp_live_sk_';
      const randSuffix = Array.from({ length: 16 }, () => Math.random().toString(36)[2]).join('');
      setKeys((prev) => [...prev, {
        id: `key_${Date.now()}`,
        name: newKeyName.trim(),
        key: prefix + randSuffix,
        created: new Date(),
        lastUsed: null,
        calls: 0,
      }]);
      setNewKeyName('');
      setGeneratingKey(false);
    }, 800);
  };

  const toggleWebhook = (id) => {
    setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, active: !w.active } : w));
  };

  const tabs = [
    { id: 'keys', label: 'API Keys' },
    { id: 'usage', label: 'Usage' },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'errors', label: 'Error Log' },
    { id: 'sdk', label: 'SDKs & Docs' },
    { id: 'spec', label: 'OpenAPI Spec' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code size={20} className="text-cyan-400" />
          <h1 className="text-lg font-bold">Developer Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Mode:</span>
          <button
            onClick={() => setSandboxMode((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
              sandboxMode
                ? 'border-amber-600 bg-amber-950 text-amber-300'
                : 'border-green-700 bg-green-950 text-green-300'
            }`}
          >
            {sandboxMode ? <><ToggleLeft size={15} /> Sandbox</> : <><ToggleRight size={15} /> Live</>}
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-cyan-700 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* ── API Keys ── */}
        {tab === 'keys' && (
          <>
            {/* Rate limit status */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
              <Zap size={18} className="text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-300">Rate Limit Status</p>
                <p className="text-xs text-gray-500">5,000 req/day — used 2,341 today</p>
              </div>
              <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '46.8%' }} />
              </div>
              <span className="text-sm text-gray-400">46.8%</span>
            </div>

            {/* Key list */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-semibold">API Keys</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name..."
                    className="bg-gray-800 border border-gray-700 text-sm text-gray-100 placeholder-gray-600 rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500 w-32"
                  />
                  <button
                    onClick={generateKey}
                    disabled={!newKeyName.trim() || generatingKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    {generatingKey ? 'Generating…' : 'New Key'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-800">
                {keys.map((k) => (
                  <div key={k.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Key size={14} className="text-gray-500" />
                        <span className="font-medium text-gray-200 text-sm">{k.name}</span>
                        {k.key.includes('test') && (
                          <span className="text-xs text-amber-400 bg-amber-950 border border-amber-800 rounded px-1.5 py-0.5">test</span>
                        )}
                      </div>
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={12} /> Revoke
                      </button>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 font-mono text-xs text-gray-400">
                      <span className="flex-1 truncate">
                        {revealedKey === k.id ? k.key : maskKey(k.key)}
                      </span>
                      <button onClick={() => setRevealedKey(revealedKey === k.id ? null : k.id)} className="text-gray-500 hover:text-gray-300">
                        {revealedKey === k.id ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => copyKey(k.id, k.key)} className="text-gray-500 hover:text-gray-300">
                        {copied === k.id ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-600">
                      <span>Created {format(k.created, 'MMM d, yyyy')}</span>
                      <span>Last used {k.lastUsed ? format(k.lastUsed, 'MMM d') : 'never'}</span>
                      <span>{k.calls.toLocaleString()} calls</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Usage ── */}
        {tab === 'usage' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="font-semibold mb-1 text-sm text-gray-400">API Calls (Last 14 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={USAGE_DATA}>
                  <defs>
                    <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="calls" stroke="#06b6d4" fill="url(#callGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="font-semibold mb-1 text-sm text-gray-400">Errors (Last 14 Days)</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={USAGE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                  <Bar dataKey="errors" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Webhooks ── */}
        {tab === 'webhooks' && (
          <div className="space-y-3">
            {webhooks.map((w) => (
              <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Webhook size={15} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-200 font-mono">{w.url}</span>
                  </div>
                  <button onClick={() => toggleWebhook(w.id)} className={w.active ? 'text-green-400' : 'text-gray-600'}>
                    {w.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {w.events.map((ev) => (
                    <span key={ev} className="text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded px-2 py-0.5 font-mono">{ev}</span>
                  ))}
                </div>
              </div>
            ))}
            <button className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              <Plus size={15} /> Add Webhook Endpoint
            </button>
          </div>
        )}

        {/* ── Error Log ── */}
        {tab === 'errors' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-800">
              {ERRORS.map((e) => (
                <div key={e.id} className="p-4 flex items-start gap-3 hover:bg-gray-800/30 transition-colors">
                  <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${
                    e.code >= 500 ? 'text-red-400 bg-red-950' : e.code === 429 ? 'text-amber-400 bg-amber-950' : 'text-blue-400 bg-blue-950'
                  }`}>{e.code}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">{e.message}</p>
                    <p className="text-xs text-gray-600 font-mono mt-0.5">{e.endpoint}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock size={11} />
                    {format(e.time, 'HH:mm, MMM d')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SDKs & Docs ── */}
        {tab === 'sdk' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SDK_LINKS.map((s) => (
              <a
                key={s.lang}
                href={s.url}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:border-gray-700 hover:bg-gray-800/50 transition-all group"
              >
                <span className="text-xl">{s.icon}</span>
                <span className="text-sm font-medium text-gray-300 flex-1">{s.lang}</span>
                <ExternalLink size={13} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </a>
            ))}
          </div>
        )}

        {/* ── OpenAPI Spec ── */}
        {tab === 'spec' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileCode size={18} className="text-cyan-400" />
              <h3 className="font-semibold">OpenAPI Specification</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              The full OpenAPI 3.1 spec for Nexus AI Pro API. Import into Postman, Insomnia, or any OpenAPI client.
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 font-mono text-xs text-gray-400 mb-4 max-h-64 overflow-y-auto">
              {`openapi: 3.1.0
info:
  title: Nexus AI Pro API
  version: 2.0.0
  description: Military-grade AI platform API
servers:
  - url: https://api.nexusai.pro/v2
    description: Production
  - url: https://sandbox.nexusai.pro/v2
    description: Sandbox
paths:
  /chat:
    post:
      summary: Send chat message
      ...
  /generate/image:
    post:
      summary: Generate image
      ...
  /payments/plans:
    get:
      summary: List subscription plans
      ...`}
            </div>
            <div className="flex gap-3">
              <a href="/api/openapi.json" className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors">
                <FileCode size={14} /> Download JSON
              </a>
              <a href="/api/openapi.yaml" className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors">
                <FileCode size={14} /> Download YAML
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
