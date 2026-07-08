// src/dashboards/ConnectorsDashboard.jsx
// Date: 2026-07-08
// Integration connectors UI: Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plug, CheckCircle, XCircle, RefreshCw, Plus, Trash2,
  Cloud, Globe, MessageSquare, Video, GitBranch, Database,
  Zap, Activity, AlertCircle, ChevronRight, Server
} from 'lucide-react';

const INTEGRATION_META = {
  azure: { name: 'Azure', emoji: '☁️', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700', desc: 'Active Directory, Blob Storage, Functions, Key Vault' },
  aws: { name: 'AWS', emoji: '🔶', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700', desc: 'S3, Lambda, Cognito, CloudFront, RDS' },
  google: { name: 'Google Cloud', emoji: '🌈', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700', desc: 'Analytics, Cloud Storage, Firebase, Workspace' },
  slack: { name: 'Slack', emoji: '💬', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700', desc: 'Channels, messages, workflows, bots' },
  zoom: { name: 'Zoom', emoji: '📹', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700', desc: 'Meetings, webinars, recordings' },
  github: { name: 'GitHub', emoji: '🐙', color: 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600', desc: 'Repos, PRs, issues, Actions, GitHub Actions' },
  bitbucket: { name: 'Bitbucket', emoji: '🪣', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700', desc: 'Repos, PRs, Pipelines, Jira integration' },
  adobe: { name: 'Adobe', emoji: '🎨', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700', desc: 'Creative Cloud, Adobe Sign, Analytics, AEM' }
};

function IntegrationCard({ id, connected, status, onConnect, onDisconnect, loading }) {
  const meta = INTEGRATION_META[id] || { name: id, emoji: '🔌', color: '' };
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border p-4 transition-colors ${meta.color}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{meta.name}</h3>
            {connected ? (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle size={10} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <XCircle size={10} /> Not connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{meta.desc}</p>
        </div>
        <div className="flex items-center gap-1">
          {connected ? (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600 text-gray-500"
              >
                <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
              <button
                onClick={() => onDisconnect(id)}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={() => onConnect(id)}
              disabled={loading}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1"
            >
              <Plus size={12} /> Connect
            </button>
          )}
        </div>
      </div>

      {connected && expanded && status && (
        <div className="mt-3 pt-3 border-t border-white/30 dark:border-gray-600">
          {status.services ? (
            <div className="space-y-1">
              {status.services.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-300">{s.name}</span>
                  <span className={`font-medium ${s.status === 'operational' ? 'text-green-600' : 'text-yellow-600'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(status).filter(([k]) => !['connected', 'lastSync'].includes(k)).slice(0, 6).map(([k, v]) => (
                <div key={k}>
                  <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}: </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConnectorsDashboard({ token }) {
  const [connections, setConnections] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadConnections = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch('/api/connectors', { headers });
      if (r.ok) {
        const d = await r.json();
        setConnections(d.connections || []);
      }
    } catch {
      setError('Failed to load connectors');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadStatus = useCallback(async (integration) => {
    if (!token) return;
    try {
      const r = await fetch(`/api/connectors/${integration}/status`, { headers });
      if (r.ok) {
        const status = await r.json();
        setStatuses(prev => ({ ...prev, [integration]: status }));
      }
    } catch {}
  }, [token]);

  const connect = useCallback(async (integration) => {
    if (!token) return;
    setActionLoading(integration);
    try {
      const r = await fetch('/api/connectors/connect', {
        method: 'POST',
        headers,
        body: JSON.stringify({ integration, config: {} })
      });
      if (r.ok) {
        await loadConnections();
        await loadStatus(integration);
      }
    } catch {
      setError(`Failed to connect ${integration}`);
    } finally {
      setActionLoading(null);
    }
  }, [token, loadConnections, loadStatus]);

  const disconnect = useCallback(async (integration) => {
    if (!token) return;
    setActionLoading(integration);
    try {
      const r = await fetch(`/api/connectors/${integration}`, { method: 'DELETE', headers });
      if (r.ok) {
        setConnections(prev => prev.filter(c => c.integration !== integration));
        setStatuses(prev => { const n = { ...prev }; delete n[integration]; return n; });
      }
    } catch {
      setError(`Failed to disconnect ${integration}`);
    } finally {
      setActionLoading(null);
    }
  }, [token]);

  useEffect(() => { loadConnections(); }, [loadConnections]);
  useEffect(() => {
    for (const conn of connections) {
      if (!statuses[conn.integration]) loadStatus(conn.integration);
    }
  }, [connections]);

  const connectedSet = new Set(connections.map(c => c.integration));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plug size={24} className="text-blue-500" /> Integrations
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {connections.length} of {Object.keys(INTEGRATION_META).length} connected
          </p>
        </div>
        <button onClick={loadConnections} disabled={loading} className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {!token && (
        <div className="text-center py-12 text-gray-400">
          <Plug size={48} className="mx-auto mb-3 opacity-30" />
          <p>Sign in to manage integrations</p>
        </div>
      )}

      {token && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.keys(INTEGRATION_META).map(id => (
            <IntegrationCard
              key={id}
              id={id}
              connected={connectedSet.has(id)}
              status={statuses[id]}
              onConnect={connect}
              onDisconnect={disconnect}
              loading={actionLoading === id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
