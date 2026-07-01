// ================================================
// NEXUS AI PRO - Connectors Dashboard
// File: src/components/ConnectorsDashboard.jsx
// Updated: 2026-07-01
// Connectors: Azure, AWS, Google Cloud, Adobe,
//             Slack, Zoom, GitHub, Bitbucket
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link, Link2Off, RefreshCw, CheckCircle, XCircle,
  Loader2, ChevronRight, AlertTriangle, Upload,
  MessageSquare, Video, GitBranch, Cloud, Plus,
  Settings, Zap, Database,
} from 'lucide-react';

const CONNECTORS = [
  {
    id: 'azure',
    label: 'Microsoft Azure',
    logo: '☁️',
    category: 'Cloud Storage',
    color: 'from-blue-500 to-cyan-500',
    features: ['Blob Storage', 'Identity', 'Resource Management'],
    envKeys: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_STORAGE_ACCOUNT'],
  },
  {
    id: 'aws',
    label: 'Amazon AWS',
    logo: '🟠',
    category: 'Cloud Storage',
    color: 'from-orange-400 to-yellow-500',
    features: ['S3', 'Lambda', 'Presigned URLs'],
    envKeys: ['AWS_REGION', 'AWS_ACCESS_KEY_ID'],
  },
  {
    id: 'google_cloud',
    label: 'Google Cloud',
    logo: '🔵',
    category: 'Cloud',
    color: 'from-blue-400 to-indigo-500',
    features: ['GCS', 'Vertex AI', 'Cloud Run'],
    envKeys: ['GCP_PROJECT_ID', 'GOOGLE_APPLICATION_CREDENTIALS'],
  },
  {
    id: 'adobe',
    label: 'Adobe Creative',
    logo: '🔴',
    category: 'Creative',
    color: 'from-red-500 to-pink-500',
    features: ['Creative Cloud', 'Document API'],
    envKeys: ['ADOBE_CLIENT_ID'],
  },
  {
    id: 'slack',
    label: 'Slack',
    logo: '💬',
    category: 'Messaging',
    color: 'from-purple-500 to-pink-500',
    features: ['Send Messages', 'Channel Management', 'Webhooks'],
    envKeys: ['SLACK_BOT_TOKEN'],
  },
  {
    id: 'zoom',
    label: 'Zoom',
    logo: '📹',
    category: 'Video',
    color: 'from-blue-600 to-blue-400',
    features: ['Create Meetings', 'Webhooks'],
    envKeys: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID'],
  },
  {
    id: 'github',
    label: 'GitHub',
    logo: '🐙',
    category: 'Dev',
    color: 'from-gray-700 to-gray-500',
    features: ['Repos', 'Commits', 'Issues', 'PRs'],
    envKeys: ['GITHUB_TOKEN'],
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket',
    logo: '🪣',
    category: 'Dev',
    color: 'from-blue-700 to-indigo-600',
    features: ['Repos', 'Pipelines'],
    envKeys: ['BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD'],
  },
];

const STATUS_ICON = {
  ok:         { Icon: CheckCircle, color: 'text-green-500' },
  error:      { Icon: XCircle,     color: 'text-red-500' },
  checking:   { Icon: Loader2,     color: 'text-blue-400', spin: true },
  unchecked:  { Icon: AlertTriangle, color: 'text-gray-300 dark:text-gray-600' },
};

function ConnectorCard({ connector, status, onCheck, onAction }) {
  const { Icon, color, spin } = STATUS_ICON[status?.state || 'unchecked'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Card header */}
      <div className={`h-1 bg-gradient-to-r ${connector.color}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gray-50 dark:bg-gray-700">
              {connector.logo}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{connector.label}</p>
              <p className="text-xs text-gray-400">{connector.category}</p>
            </div>
          </div>
          <Icon size={18} className={`${color} flex-shrink-0 ${spin ? 'animate-spin' : ''}`} />
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {connector.features.map(f => (
            <span key={f} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 rounded-full">{f}</span>
          ))}
        </div>

        {status?.message && (
          <p className={`text-xs mt-2 ${status.state === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {status.message}
          </p>
        )}

        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button onClick={() => onCheck(connector.id)} disabled={status?.state === 'checking'}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={status?.state === 'checking' ? 'animate-spin' : ''} /> Check
          </button>
          <button onClick={() => onAction(connector)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Settings size={11} /> Configure
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionPanel({ connector, onClose }) {
  const [subAction, setSubAction] = useState('');
  const [params, setParams] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = () => localStorage.getItem('nexus_access_token');

  const ACTIONS = {
    azure: [
      { id: 'upload',    label: 'Upload to Blob',  params: ['container', 'blobName', 'data'] },
    ],
    aws: [
      { id: 'upload',    label: 'Upload to S3',    params: ['bucket', 'key', 'contentType'] },
      { id: 'presign',   label: 'Get Presigned URL',params: ['bucket', 'key', 'expiresIn'] },
    ],
    slack: [
      { id: 'message',   label: 'Send Message',    params: ['channel', 'text'] },
    ],
    zoom: [
      { id: 'meeting',   label: 'Create Meeting',  params: ['topic', 'duration'] },
    ],
    github: [
      { id: 'repos',     label: 'List Repos',      params: ['username'] },
    ],
    bitbucket: [
      { id: 'repos',     label: 'List Repos',      params: [] },
    ],
  };

  const actions = ACTIONS[connector.id] || [];

  const runAction = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/connectors/${connector.id}/${subAction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(params),
      });
      const d = await res.json();
      setResult({ ok: res.ok, data: d });
    } catch (err) {
      setResult({ ok: false, data: { error: err.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">{connector.label} Actions</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600"><XCircle size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {actions.length === 0 ? (
            <p className="text-sm text-gray-400">No actions available — configure via environment variables in <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env</code>.</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Action</label>
                <select value={subAction} onChange={e => { setSubAction(e.target.value); setParams({}); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select action…</option>
                  {actions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              {subAction && (actions.find(a => a.id === subAction)?.params || []).map(param => (
                <div key={param}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 capitalize">{param}</label>
                  <input value={params[param] || ''} onChange={e => setParams(p => ({ ...p, [param]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={param} />
                </div>
              ))}
              {subAction && (
                <button onClick={runAction} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Run
                </button>
              )}
            </>
          )}

          {result && (
            <div className={`p-3 rounded-lg text-xs font-mono overflow-auto max-h-48 ${result.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'}`}>
              {JSON.stringify(result.data, null, 2)}
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Required environment variables:</p>
            <div className="flex flex-wrap gap-1">
              {connector.envKeys.map(k => (
                <code key={k} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 rounded">{k}</code>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectorsDashboard() {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeConnector, setActiveConnector] = useState(null);
  const [filter, setFilter] = useState('all');

  const token = () => localStorage.getItem('nexus_access_token');

  const checkAll = useCallback(async () => {
    setLoading(true);
    setStatuses(CONNECTORS.reduce((acc, c) => ({ ...acc, [c.id]: { state: 'checking' } }), {}));
    try {
      const res = await fetch('/api/connectors', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        const next = {};
        (data.connectors || []).forEach(c => { next[c.id] = { state: c.ok ? 'ok' : 'error', message: c.message }; });
        setStatuses(next);
      }
    } catch {}
    setLoading(false);
  }, []);

  const checkOne = useCallback(async (id) => {
    setStatuses(p => ({ ...p, [id]: { state: 'checking' } }));
    try {
      const res = await fetch(`/api/connectors/${id}/status`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setStatuses(p => ({ ...p, [id]: { state: data.ok ? 'ok' : 'error', message: data.message } }));
      }
    } catch {
      setStatuses(p => ({ ...p, [id]: { state: 'error', message: 'Request failed' } }));
    }
  }, []);

  useEffect(() => { checkAll(); }, [checkAll]);

  const categories = [...new Set(CONNECTORS.map(c => c.category))];
  const filtered = filter === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.category === filter);
  const healthyCount = Object.values(statuses).filter(s => s.state === 'ok').length;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Cloud size={20} className="text-indigo-500" /> Connectors
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {healthyCount}/{CONNECTORS.length} healthy · Azure, AWS, Google, Adobe, Slack, Zoom, GitHub, Bitbucket
          </p>
        </div>
        <button onClick={checkAll} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Check All
        </button>
      </div>

      {/* Health summary bar */}
      <div className="px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${CONNECTORS.length > 0 ? (healthyCount / CONNECTORS.length) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">{healthyCount} / {CONNECTORS.length} OK</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
        {['all', ...categories].map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
          {filtered.map(connector => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              status={statuses[connector.id]}
              onCheck={checkOne}
              onAction={c => setActiveConnector(c)}
            />
          ))}
        </div>
      </div>

      {activeConnector && (
        <ActionPanel connector={activeConnector} onClose={() => setActiveConnector(null)} />
      )}
    </div>
  );
}
