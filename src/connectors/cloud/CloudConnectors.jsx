// Date: 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, Plus, AlertTriangle, Loader2,
  ExternalLink, GitBranch, GitPullRequest, Clock, Folder,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Service definitions ──────────────────────────────────────────────────────
const SERVICES = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    icon: '🟠',
    description: 'S3, IAM, Lambda and more',
    fields: [
      { key: 'roleArn', label: 'IAM Role ARN', placeholder: 'arn:aws:iam::123456789012:role/NexusRole', type: 'text' },
      { key: 'region', label: 'Default Region', placeholder: 'us-east-1', type: 'text' },
    ],
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    icon: '🔵',
    description: 'Blob storage, VMs, Cognitive Services',
    fields: [
      { key: 'subscriptionId', label: 'Subscription ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text' },
      { key: 'resourceGroup', label: 'Resource Group', placeholder: 'my-resource-group', type: 'text' },
    ],
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    icon: '🌈',
    description: 'GCS, BigQuery, Cloud Functions',
    fields: [
      { key: 'projectId', label: 'Project ID', placeholder: 'my-gcp-project-123', type: 'text' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    shortName: 'GitHub',
    icon: '🐙',
    description: 'Repos, PRs, Actions',
    fields: [
      { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxx', type: 'password', sensitive: true },
      { key: 'org', label: 'Organization (optional)', placeholder: 'my-org', type: 'text' },
    ],
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    shortName: 'Bitbucket',
    icon: '🪣',
    description: 'Repos, Pipelines, PRs',
    fields: [
      { key: 'username', label: 'Username', placeholder: 'myusername', type: 'text' },
      { key: 'appPassword', label: 'App Password', placeholder: 'ATBBxxxxxxxxxx', type: 'password', sensitive: true },
      { key: 'workspace', label: 'Workspace', placeholder: 'my-workspace', type: 'text' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    shortName: 'Slack',
    icon: '💬',
    description: 'Messages, channels, notifications',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-xxxxxxxxxxxx', type: 'password', sensitive: true },
      { key: 'defaultChannel', label: 'Default Channel', placeholder: '#general', type: 'text' },
    ],
  },
  {
    id: 'zoom',
    name: 'Zoom',
    shortName: 'Zoom',
    icon: '📹',
    description: 'Meeting scheduling & integration',
    fields: [
      { key: 'accountId', label: 'Account ID', placeholder: 'AbcDef1234', type: 'text' },
      { key: 'clientId', label: 'Client ID', placeholder: 'xxxxxxxxxxxx', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'xxxxxxxxxxxx', type: 'password', sensitive: true },
    ],
  },
  {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    shortName: 'Adobe CC',
    icon: '🎨',
    description: 'Creative assets, project sync',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx', type: 'password', sensitive: true },
      { key: 'orgId', label: 'Organization ID', placeholder: 'my-org@AdobeOrg', type: 'text' },
    ],
  },
];

// ─── ConnectorCard ────────────────────────────────────────────────────────────
function ConnectorCard({ service, status, onConnect, onDisconnect, onCheckStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({});
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const isConnected = status?.connected;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await onConnect(service.id, formData);
      setExpanded(false);
      setFormData({});
    } finally {
      setConnecting(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try { await onCheckStatus(service.id); }
    finally { setChecking(false); }
  };

  return (
    <div className={`bg-gray-900 border rounded-2xl p-5 transition-all ${isConnected ? 'border-green-800' : 'border-gray-800'}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{service.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-200">{service.name}</h3>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-950 border border-green-800 rounded-full px-2 py-0.5">
                <CheckCircle size={10} /> Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
          {status?.lastSync && (
            <p className="text-xs text-gray-700 mt-1 flex items-center gap-1">
              <Clock size={10} />
              Last sync {formatDistanceToNow(new Date(status.lastSync), { addSuffix: true })}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {isConnected ? (
          <>
            <button
              onClick={handleCheck}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors"
            >
              {checking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Check Status
            </button>
            <button
              onClick={() => onDisconnect(service.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900 text-red-400 hover:bg-red-950 rounded-lg text-xs transition-colors"
            >
              <XCircle size={12} /> Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-700 hover:bg-violet-600 text-white rounded-lg text-xs transition-colors"
          >
            <Plus size={12} /> Connect
          </button>
        )}
      </div>

      {/* Expand form */}
      {expanded && !isConnected && (
        <div className="mt-4 border-t border-gray-800 pt-4 space-y-3">
          {service.fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={formData[f.key] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
              {f.sensitive && <p className="text-xs text-gray-700 mt-0.5">Stored encrypted server-side. Never exposed to frontend.</p>}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(false)}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {connecting && <Loader2 size={13} className="animate-spin" />}
              Save & Connect
            </button>
          </div>
        </div>
      )}

      {/* GitHub-specific extras when connected */}
      {service.id === 'github' && isConnected && status?.repos && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-500 mb-2">Recent Repositories</p>
          <div className="space-y-1">
            {status.repos.slice(0, 3).map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-xs text-gray-400">
                <GitBranch size={11} />
                <span className="flex-1 font-mono truncate">{r.full_name}</span>
                {r.open_prs > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <GitPullRequest size={10} /> {r.open_prs}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AWS-specific extras */}
      {service.id === 'aws' && isConnected && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-500 mb-2">S3 Bucket Browser</p>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-600 flex items-center gap-2">
            <Folder size={12} />
            Bucket list loads on demand via /api/connectors/cloud/aws/buckets
          </div>
        </div>
      )}

      {/* Slack-specific: send message test */}
      {service.id === 'slack' && isConnected && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-500 mb-2">Quick Message</p>
          <SlackMessageSender />
        </div>
      )}
    </div>
  );
}

function SlackMessageSender() {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await fetch('/api/connectors/cloud/slack/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg }),
      });
      setSent(true);
      setMsg('');
      setTimeout(() => setSent(false), 2000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Send test message..."
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 outline-none"
      />
      <button
        onClick={send}
        disabled={sending || !msg.trim()}
        className="px-2.5 py-1.5 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-green-200 text-xs rounded-lg transition-colors flex items-center gap-1"
      >
        {sending ? <Loader2 size={11} className="animate-spin" /> : sent ? <CheckCircle size={11} /> : 'Send'}
      </button>
    </div>
  );
}

// ─── Main CloudConnectors ─────────────────────────────────────────────────────
export default function CloudConnectors() {
  const [statuses, setStatuses] = useState({});
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async (serviceId) => {
    try {
      const res = await fetch(`/api/connectors/cloud/${serviceId}/status`);
      const data = await res.json();
      setStatuses((prev) => ({ ...prev, [serviceId]: data }));
    } catch {
      // ignore individual status failures
    }
  }, []);

  useEffect(() => {
    SERVICES.forEach((s) => fetchStatus(s.id));
  }, [fetchStatus]);

  const handleConnect = async (serviceId, credentials) => {
    try {
      const res = await fetch(`/api/connectors/cloud/${serviceId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Connection failed');
      setStatuses((prev) => ({ ...prev, [serviceId]: { connected: true, lastSync: Date.now() } }));
    } catch (err) {
      setError(`Failed to connect ${serviceId}: ${err.message}`);
      throw err;
    }
  };

  const handleDisconnect = async (serviceId) => {
    try {
      await fetch(`/api/connectors/cloud/${serviceId}/disconnect`, { method: 'DELETE' });
      setStatuses((prev) => ({ ...prev, [serviceId]: { connected: false } }));
    } catch (err) {
      setError(`Failed to disconnect: ${err.message}`);
    }
  };

  const handleCheckStatus = async (serviceId) => {
    await fetchStatus(serviceId);
  };

  const connectedCount = Object.values(statuses).filter((s) => s?.connected).length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Cloud & Dev Connectors
          </h1>
          <p className="text-gray-400 text-sm">
            Connect your cloud platforms and development tools. All credentials are encrypted server-side and never stored in localStorage.
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <CheckCircle size={14} className="text-green-400" />
            <span className="text-gray-400">{connectedCount} of {SERVICES.length} services connected</span>
          </div>
        </div>

        {/* Security notice */}
        <div className="bg-gray-900 border border-green-900 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-300">Credential Security</p>
            <p className="text-xs text-gray-500 mt-0.5">
              All service credentials are encrypted with AES-256-GCM before storage. They are never sent to the browser or logged. Connections use short-lived tokens where possible.
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle size={14} />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-400 text-xs">Dismiss</button>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {SERVICES.map((service) => (
            <ConnectorCard
              key={service.id}
              service={service}
              status={statuses[service.id]}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onCheckStatus={handleCheckStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
