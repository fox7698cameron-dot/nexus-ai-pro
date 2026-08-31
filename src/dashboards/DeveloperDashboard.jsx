// File: src/dashboards/DeveloperDashboard.jsx | Created: 2026-08-31 | Nexus AI Pro
// Developer-only dashboard: API explorer, webhooks, build pipelines, repository connections
// Role: developer | admin

import React, { useState, useEffect } from 'react';
import {
  Code, GitBranch, Webhook, Key, AlertCircle, CheckCircle,
  RefreshCw, Eye, EyeOff, Copy, Terminal, Server, Activity,
  Cpu, Database, Globe, ChevronDown, ChevronRight, Download,
  Package, Zap, BarChart3
} from 'lucide-react';

// File header
const FILE_META = { file: 'DeveloperDashboard.jsx', created: '2026-08-31', version: '1.0.0' };

// ─────────────────────────────────────────
// Mock API endpoints catalog
// ─────────────────────────────────────────

const API_ENDPOINTS = [
  { method: 'POST', path: '/api/auth/register',          auth: false, desc: 'Register new user account' },
  { method: 'POST', path: '/api/auth/login',             auth: false, desc: 'Authenticate and get tokens' },
  { method: 'POST', path: '/api/auth/refresh',           auth: false, desc: 'Refresh access token' },
  { method: 'POST', path: '/api/auth/mfa/setup',         auth: true,  desc: 'Setup MFA (TOTP/SMS/email)' },
  { method: 'GET',  path: '/api/analytics/social',       auth: true,  desc: 'All platform analytics summary' },
  { method: 'GET',  path: '/api/analytics/social/:plat', auth: true,  desc: 'Single platform metrics' },
  { method: 'GET',  path: '/api/projects',               auth: true,  desc: 'List user projects' },
  { method: 'POST', path: '/api/projects',               auth: true,  desc: 'Create project' },
  { method: 'GET',  path: '/api/security/dashboard',     auth: true,  desc: 'Security overview' },
  { method: 'POST', path: '/api/security/scan',          auth: true,  desc: 'Trigger security scan' },
  { method: 'GET',  path: '/api/payments/tiers',         auth: false, desc: 'List subscription tiers' },
  { method: 'POST', path: '/api/payments/checkout',      auth: true,  desc: 'Create Stripe checkout session' },
  { method: 'GET',  path: '/api/health',                 auth: false, desc: 'Server health check' }
];

const METHOD_COLORS = {
  GET:    'bg-green-900/40 text-green-300 border border-green-700',
  POST:   'bg-blue-900/40 text-blue-300 border border-blue-700',
  PUT:    'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  PATCH:  'bg-orange-900/40 text-orange-300 border border-orange-700',
  DELETE: 'bg-red-900/40 text-red-300 border border-red-700'
};

// ─────────────────────────────────────────
// Mock rate limit & error stats
// ─────────────────────────────────────────

function useRateLimitStats() {
  const [stats, setStats] = useState({ used: 4230, limit: 10000, resetIn: 3412 });
  useEffect(() => {
    const id = setInterval(() => {
      setStats(s => ({ ...s, used: s.used + Math.floor(Math.random() * 3), resetIn: Math.max(0, s.resetIn - 1) }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return stats;
}

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function ApiKeyCard({ label, keyPreview, showKey, onToggle, onCopy, onRotate }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <code className="text-sm text-green-300 font-mono truncate block">
          {showKey ? keyPreview : '••••••••••••••••••••••••••••••••'}
        </code>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onToggle} className="p-1.5 text-gray-400 hover:text-white" title={showKey ? 'Hide' : 'Show'}>
          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={onCopy} className="p-1.5 text-gray-400 hover:text-white" title="Copy">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={onRotate} className="p-1.5 text-gray-400 hover:text-red-400" title="Rotate">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ErrorRow({ timestamp, endpoint, status, message }) {
  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/50">
      <td className="py-2 px-3 text-xs text-gray-500 font-mono">{timestamp}</td>
      <td className="py-2 px-3 text-xs text-gray-300 font-mono">{endpoint}</td>
      <td className="py-2 px-3">
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${status >= 500 ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
          {status}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-gray-400 truncate max-w-xs">{message}</td>
    </tr>
  );
}

// ─────────────────────────────────────────
// Main component
// ─────────────────────────────────────────

export default function DeveloperDashboard({ userId, userRole }) {
  const [activeTab, setActiveTab] = useState('api');
  const [expandedEndpoint, setExpanded] = useState(null);
  const [shownKeys, setShownKeys] = useState({});
  const [webhooks, setWebhooks] = useState([
    { id: 'wh-1', url: 'https://example.com/webhooks/nexus', events: ['user.created', 'payment.success'], active: true },
    { id: 'wh-2', url: 'https://example.com/webhooks/security', events: ['security.alert'], active: false }
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [copied, setCopied] = useState('');
  const rl = useRateLimitStats();

  const tabs = [
    { key: 'api',       label: '📡 API Explorer' },
    { key: 'keys',      label: '🔑 API Keys' },
    { key: 'webhooks',  label: '🔔 Webhooks' },
    { key: 'builds',    label: '🏗️ Builds' },
    { key: 'errors',    label: '🐛 Errors' },
    { key: 'repos',     label: '🗂️ Repos' }
  ];

  function copyText(text, label) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  function toggleKey(id) {
    setShownKeys(k => ({ ...k, [id]: !k[id] }));
  }

  const sdks = [
    { label: 'JavaScript / Node.js',  icon: '🟨', size: '42 KB', badge: 'v2.1.0' },
    { label: 'Python',                icon: '🐍', size: '38 KB', badge: 'v2.1.0' },
    { label: 'Swift / iOS',           icon: '🍎', size: '51 KB', badge: 'v2.1.0' },
    { label: 'Kotlin / Android',      icon: '🤖', size: '55 KB', badge: 'v2.1.0' },
    { label: 'C++ / Unreal',          icon: '🎮', size: '120 KB', badge: 'v2.0.0' },
    { label: 'C# / Unity',            icon: '🕹️', size: '88 KB', badge: 'v2.0.0' },
    { label: 'Rust',                  icon: '🦀', size: '62 KB', badge: 'v1.8.0' },
    { label: 'Go',                    icon: '🔵', size: '34 KB', badge: 'v2.1.0' }
  ];

  const mockErrors = [
    { timestamp: '16:04:21', endpoint: 'POST /api/chat', status: 500, message: 'AI API rate limit exceeded' },
    { timestamp: '15:58:03', endpoint: 'GET  /api/projects', status: 401, message: 'Token expired' },
    { timestamp: '15:42:17', endpoint: 'POST /api/auth/login', status: 429, message: 'Too many requests' }
  ];

  const buildPipelines = [
    { name: 'main branch CI', platform: 'GitHub Actions', status: 'pass', duration: '3m 12s', commit: 'feat: analytics dashboard' },
    { name: 'iOS Release',    platform: 'Xcode Cloud',    status: 'pass', duration: '8m 44s', commit: 'chore: bump version 2.1.0' },
    { name: 'Android Build',  platform: 'Gradle',         status: 'fail', duration: '5m 02s', commit: 'fix: payment router' },
    { name: 'Docker Push',    platform: 'Docker Hub',     status: 'pass', duration: '1m 55s', commit: 'feat: analytics dashboard' }
  ];

  const repos = [
    { name: 'nexus-ai-pro',        provider: 'GitHub',    status: 'connected', branch: 'main',    lastSync: '5m ago' },
    { name: 'nexus-mobile',        provider: 'GitHub',    status: 'connected', branch: 'develop', lastSync: '12m ago' },
    { name: 'nexus-backend-infra', provider: 'Bitbucket', status: 'disconnected', branch: '-',    lastSync: 'never' }
  ];

  const rlPct = Math.min(100, Math.round((rl.used / rl.limit) * 100));

  return (
    <div className="space-y-6 text-gray-100">
      <div className="flex items-center gap-3">
        <Terminal className="w-6 h-6 text-blue-400" />
        <div>
          <h1 className="text-xl font-bold">Developer Dashboard</h1>
          <p className="text-xs text-gray-500">API explorer, webhooks, builds, and integrations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeTab === t.key ? 'bg-blue-900/60 text-blue-200' : 'text-gray-400 hover:bg-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── API Explorer ── */}
      {activeTab === 'api' && (
        <div className="space-y-3">
          {/* Rate limit banner */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Rate Limit</span>
              <span className={rlPct > 80 ? 'text-red-400' : 'text-green-400'}>{rl.used.toLocaleString()} / {rl.limit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full ${rlPct > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${rlPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Resets in {Math.floor(rl.resetIn / 60)}m {rl.resetIn % 60}s</p>
          </div>

          {/* Endpoints */}
          <div className="space-y-1">
            {API_ENDPOINTS.map((ep, i) => (
              <div key={i} className="bg-gray-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(expandedEndpoint === i ? null : i)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-750">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
                  <code className="text-sm text-gray-200 font-mono flex-1 truncate">{ep.path}</code>
                  {ep.auth && <span className="text-xs text-yellow-500 shrink-0">🔑 Auth</span>}
                  {expandedEndpoint === i ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>
                {expandedEndpoint === i && (
                  <div className="px-4 pb-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mt-3 mb-2">{ep.desc}</p>
                    <div className="bg-gray-900 rounded p-3 font-mono text-xs text-green-300 overflow-x-auto">
                      {`curl -X ${ep.method} https://api.nexusai.pro${ep.path}${ep.auth ? ' \\\n  -H "Authorization: Bearer $TOKEN"' : ''} \\\n  -H "Content-Type: application/json"`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* SDK Downloads */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> SDK Downloads
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {sdks.map((sdk, i) => (
                <div key={i} className="bg-gray-700 rounded-lg p-3 text-center hover:bg-gray-600 cursor-pointer transition-colors">
                  <div className="text-2xl mb-1">{sdk.icon}</div>
                  <p className="text-xs text-gray-300 font-medium">{sdk.label}</p>
                  <p className="text-xs text-gray-500">{sdk.badge} · {sdk.size}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── API Keys ── */}
      {activeTab === 'keys' && (
        <div className="space-y-3">
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-300">Never expose API keys in client-side code or public repos. Store in environment variables.</p>
          </div>
          <ApiKeyCard label="Production API Key"  keyPreview="nxp_live_a3f9b2c1d4e5f6789abc0123456789de" showKey={shownKeys['prod']}  onToggle={() => toggleKey('prod')}  onCopy={() => copyText('nxp_live_...', 'prod')}  onRotate={() => {}} />
          <ApiKeyCard label="Test API Key"         keyPreview="nxp_test_f1e2d3c4b5a6978654321fedcba98765" showKey={shownKeys['test']}  onToggle={() => toggleKey('test')}  onCopy={() => copyText('nxp_test_...', 'test')}  onRotate={() => {}} />
          <ApiKeyCard label="Webhook Signing Key"  keyPreview="whsec_0102030405060708090a0b0c0d0e0f10" showKey={shownKeys['whsec']} onToggle={() => toggleKey('whsec')} onCopy={() => copyText('whsec_...', 'whsec')} onRotate={() => {}} />
          {copied && <p className="text-xs text-green-400 text-center">✓ {copied} copied</p>}
        </div>
      )}

      {/* ── Webhooks ── */}
      {activeTab === 'webhooks' && (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-mono text-blue-300 truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wh.events.map(e => <span key={e} className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{e}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${wh.active ? 'bg-green-400' : 'bg-gray-600'}`} />
                  <button onClick={() => setWebhooks(ws => ws.map(w => w.id === wh.id ? { ...w, active: !w.active } : w))}
                    className="text-xs text-gray-400 hover:text-white">
                    {wh.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-semibold mb-3 text-gray-300">Add Webhook</p>
            <div className="flex gap-2">
              <input value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
                placeholder="https://your-server.com/webhook" />
              <button onClick={() => { if (newWebhookUrl) { setWebhooks(ws => [...ws, { id: `wh-${Date.now()}`, url: newWebhookUrl, events: ['user.created'], active: true }]); setNewWebhookUrl(''); }}}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Builds ── */}
      {activeTab === 'builds' && (
        <div className="space-y-2">
          {buildPipelines.map((b, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
              {b.status === 'pass' ? <CheckCircle className="w-5 h-5 text-green-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{b.name}</p>
                <p className="text-xs text-gray-400">{b.platform} · {b.commit}</p>
              </div>
              <span className="text-xs text-gray-500">{b.duration}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${b.status === 'pass' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Errors ── */}
      {activeTab === 'errors' && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900">
                <th className="text-left py-2 px-3 text-xs text-gray-500">Time</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500">Endpoint</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500">Status</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500">Message</th>
              </tr>
            </thead>
            <tbody>
              {mockErrors.map((e, i) => <ErrorRow key={i} {...e} />)}
            </tbody>
          </table>
          {mockErrors.length === 0 && <p className="text-center py-8 text-gray-500">No recent errors 🎉</p>}
        </div>
      )}

      {/* ── Repos ── */}
      {activeTab === 'repos' && (
        <div className="space-y-2">
          {repos.map((r, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
              <GitBranch className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{r.name}</p>
                <p className="text-xs text-gray-400">{r.provider} · {r.branch !== '-' ? `Branch: ${r.branch}` : 'Not connected'}</p>
              </div>
              <span className="text-xs text-gray-500">{r.lastSync}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'connected' ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                {r.status}
              </span>
            </div>
          ))}
          <div className="text-center pt-2">
            <button className="text-sm text-blue-400 hover:text-blue-300">+ Connect repository</button>
          </div>
        </div>
      )}
    </div>
  );
}
