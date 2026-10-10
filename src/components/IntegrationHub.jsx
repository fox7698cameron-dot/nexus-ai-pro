/**
 * IntegrationHub.jsx
 * Connectors and plugins for: Azure, Adobe, AWS, Google Workspace,
 * Slack, Zoom, GitHub, Bitbucket — plus Redis health and Blob storage
 * status. All OAuth flows and API calls are proxied through the server;
 * no client-side secrets.
 * Updated: 2026-10-10
 */
import React, { useState, useEffect, useCallback } from 'react';

// ── Integration catalog ───────────────────────────────────────────────────────
const INTEGRATIONS = {
  azure: {
    name: 'Microsoft Azure',
    icon: '☁️',
    category: 'cloud',
    description: 'Azure AI, Blob Storage, Active Directory',
    authFlow: 'oauth2',
    scopes: ['openid', 'profile', 'offline_access', 'https://graph.microsoft.com/.default'],
    features: ['Azure OpenAI', 'Blob Storage', 'AD SSO', 'Key Vault'],
    color: '#0078D4',
  },
  adobe: {
    name: 'Adobe Creative Cloud',
    icon: '🎨',
    category: 'creative',
    description: 'Adobe Firefly, Creative SDK, Acrobat API',
    authFlow: 'oauth2',
    scopes: ['openid', 'creative_sdk'],
    features: ['Firefly AI', 'PDF API', 'Asset Library', 'Fonts'],
    color: '#FA0F00',
  },
  aws: {
    name: 'Amazon Web Services',
    icon: '🟠',
    category: 'cloud',
    description: 'S3, Lambda, Bedrock, CloudFront',
    authFlow: 'iam_role',
    scopes: [],
    features: ['S3 Storage', 'Bedrock AI', 'Lambda', 'CloudFront CDN'],
    color: '#FF9900',
  },
  google: {
    name: 'Google Workspace',
    icon: '🔵',
    category: 'workspace',
    description: 'Drive, Gmail, Vertex AI, Analytics',
    authFlow: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/gmail.readonly'],
    features: ['Google Drive', 'Gmail', 'Vertex AI', 'Analytics'],
    color: '#4285F4',
  },
  slack: {
    name: 'Slack',
    icon: '💬',
    category: 'communication',
    description: 'Notifications, bots, slash commands',
    authFlow: 'oauth2',
    scopes: ['chat:write', 'channels:read', 'commands'],
    features: ['Notifications', 'Bot messages', 'Slash commands', 'Webhooks'],
    color: '#4A154B',
  },
  zoom: {
    name: 'Zoom',
    icon: '📹',
    category: 'communication',
    description: 'Meeting scheduling, recordings, transcripts',
    authFlow: 'oauth2',
    scopes: ['meeting:read', 'recording:read'],
    features: ['Schedule meetings', 'Recordings', 'Transcripts', 'Webinars'],
    color: '#2D8CFF',
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    category: 'devops',
    description: 'Repos, Issues, Actions, Projects',
    authFlow: 'oauth2',
    scopes: ['repo', 'read:org', 'workflow'],
    features: ['Repos', 'Issues/PRs', 'Actions CI', 'Projects'],
    color: '#333',
  },
  bitbucket: {
    name: 'Bitbucket',
    icon: '🪣',
    category: 'devops',
    description: 'Repos, Pipelines, Jira integration',
    authFlow: 'oauth2',
    scopes: ['repository', 'pullrequest', 'pipeline'],
    features: ['Repos', 'Pipelines', 'Jira link', 'Deployments'],
    color: '#0052CC',
  },
  redis: {
    name: 'Redis',
    icon: '🔴',
    category: 'infrastructure',
    description: 'Caching, session store, pub/sub',
    authFlow: 'url',
    scopes: [],
    features: ['Cache', 'Sessions', 'Pub/Sub', 'Rate limiting'],
    color: '#DC382D',
  },
  blob: {
    name: 'Blob Storage',
    icon: '📦',
    category: 'infrastructure',
    description: 'File storage for assets, uploads, exports',
    authFlow: 'api_key',
    scopes: [],
    features: ['File upload', 'CDN delivery', 'Signed URLs', 'Lifecycle rules'],
    color: '#007FFF',
  },
};

const CATEGORIES = {
  cloud:          { label: 'Cloud',          icon: '☁️'  },
  workspace:      { label: 'Workspace',       icon: '🏢'  },
  communication:  { label: 'Communication',  icon: '💬'  },
  devops:         { label: 'DevOps',          icon: '🔧'  },
  creative:       { label: 'Creative',        icon: '🎨'  },
  infrastructure: { label: 'Infrastructure', icon: '⚙️'  },
};

// ── Integration status display ────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    connected:    { label: '● Connected',     cls: 'text-green-400 bg-green-900/20 border-green-800' },
    pending:      { label: '⏳ Pending',       cls: 'text-yellow-400 bg-yellow-900/20 border-yellow-800' },
    disconnected: { label: '○ Not connected', cls: 'text-gray-500  bg-gray-800 border-gray-700' },
    error:        { label: '✗ Error',          cls: 'text-red-400  bg-red-900/20 border-red-800'  },
  };
  const s = map[status] || map.disconnected;
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
}

// ── Integration card ──────────────────────────────────────────────────────────
function IntegrationCard({ id, config, status, onConnect, onDisconnect, onConfigure }) {
  const connected = status === 'connected';
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="font-semibold text-white text-sm">{config.name}</div>
            <div className="text-xs text-gray-400">{CATEGORIES[config.category]?.label}</div>
          </div>
        </div>
        <StatusBadge status={status || 'disconnected'} />
      </div>

      <p className="text-xs text-gray-400">{config.description}</p>

      <div className="flex flex-wrap gap-1">
        {config.features.map(f => (
          <span key={f} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{f}</span>
        ))}
      </div>

      <div className="flex gap-2 mt-auto">
        {connected ? (
          <>
            <button
              onClick={() => onConfigure?.(id)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 transition-colors"
            >
              Configure
            </button>
            <button
              onClick={() => onDisconnect(id)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-red-800 text-red-400 hover:border-red-600 transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(id)}
            className="flex-1 text-xs py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            style={{ backgroundColor: connected ? undefined : config.color + '33' }}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ── Redis health widget ───────────────────────────────────────────────────────
function RedisHealthWidget({ health }) {
  if (!health) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-sm text-gray-400">
        Redis not connected — add <code className="text-xs bg-gray-700 px-1 rounded">REDIS_URL</code> to .env
      </div>
    );
  }
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
      {[
        { label: 'Status',      val: health.status,               ok: health.status === 'ok' },
        { label: 'Memory',      val: health.usedMemory,           ok: true },
        { label: 'Connections', val: health.connectedClients,     ok: true },
        { label: 'Uptime',      val: health.uptimeSeconds + 's',  ok: true },
      ].map(({ label, val, ok }) => (
        <div key={label} className="bg-gray-700 rounded-lg p-2 text-center">
          <div className={`font-semibold ${ok ? 'text-green-400' : 'text-red-400'}`}>{val}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Configuration modal ───────────────────────────────────────────────────────
function ConfigureModal({ id, config, onClose, onSave }) {
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);

  const fieldDefs = {
    azure:     [{ key: 'tenant_id', label: 'Tenant ID', type: 'text' }, { key: 'client_id', label: 'Client ID', type: 'text' }],
    aws:       [{ key: 'region', label: 'AWS Region', type: 'text' }, { key: 'role_arn', label: 'IAM Role ARN', type: 'text' }],
    github:    [{ key: 'org', label: 'Organization', type: 'text' }, { key: 'default_repo', label: 'Default Repo', type: 'text' }],
    bitbucket: [{ key: 'workspace', label: 'Workspace', type: 'text' }],
    redis:     [{ key: 'url', label: 'Redis URL', type: 'url', placeholder: 'redis://localhost:6379' }],
    blob:      [{ key: 'bucket', label: 'Bucket Name', type: 'text' }, { key: 'region', label: 'Region', type: 'text' }],
    slack:     [{ key: 'default_channel', label: 'Default Channel', type: 'text', placeholder: '#general' }],
    zoom:      [{ key: 'account_id', label: 'Account ID', type: 'text' }],
    google:    [{ key: 'project_id', label: 'GCP Project ID', type: 'text' }],
    adobe:     [{ key: 'organization_id', label: 'Organization ID', type: 'text' }],
  }[id] || [];

  async function save() {
    setLoading(true);
    try {
      const resp = await fetch(`/api/integrations/${id}/configure`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus:token') ?? ''}`,
        },
        body: JSON.stringify(fields),
      });
      if (!resp.ok) throw new Error('Save failed');
      onSave(id, fields);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-white">{config.icon} Configure {config.name}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex flex-col gap-3">
          {fieldDefs.map(f => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder || ''}
                value={fields[f.key] || ''}
                onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
          {fieldDefs.length === 0 && (
            <p className="text-xs text-gray-400">This integration is configured via OAuth. No additional fields needed.</p>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function IntegrationHub() {
  const [statuses, setStatuses]   = useState({});
  const [redisHealth, setRedisHealth] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [configuring, setConfiguring]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [notice, setNotice]       = useState('');

  // Load integration statuses from server
  useEffect(() => {
    fetch('/api/integrations/status', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:token') ?? ''}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStatuses(d.statuses || {}))
      .catch(() => {});

    fetch('/api/integrations/redis/health', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:token') ?? ''}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setRedisHealth(d))
      .catch(() => {});
  }, []);

  async function handleConnect(id) {
    const cfg = INTEGRATIONS[id];
    if (cfg.authFlow === 'oauth2') {
      // Server returns an OAuth authorization URL
      setLoading(true);
      try {
        const resp = await fetch(`/api/integrations/${id}/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('nexus:token') ?? ''}`,
          },
        });
        const data = await resp.json();
        if (data.authUrl) {
          window.open(data.authUrl, '_blank', 'noopener,noreferrer');
          setNotice(`OAuth window opened for ${cfg.name}. Complete authorization then return here.`);
        } else if (data.connected) {
          setStatuses(p => ({ ...p, [id]: 'connected' }));
        }
      } catch (err) {
        setNotice(`Failed to connect ${cfg.name}: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Show configure modal for URL/API key-based integrations
      setConfiguring(id);
    }
  }

  async function handleDisconnect(id) {
    try {
      await fetch(`/api/integrations/${id}/disconnect`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus:token') ?? ''}` },
      });
      setStatuses(p => ({ ...p, [id]: 'disconnected' }));
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = Object.entries(INTEGRATIONS).filter(
    ([, cfg]) => activeCategory === 'all' || cfg.category === activeCategory
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 min-h-screen text-white">
      <div>
        <h2 className="text-xl font-bold">Integration Hub</h2>
        <p className="text-xs text-gray-400">Connect cloud services, DevOps tools, and infrastructure</p>
      </div>

      {notice && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-3 text-sm text-blue-300 flex justify-between items-center">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-blue-400 hover:text-white ml-4">×</button>
        </div>
      )}

      {/* Redis health */}
      <div>
        <div className="text-sm font-semibold text-gray-300 mb-2">🔴 Redis Health</div>
        <RedisHealthWidget health={redisHealth} />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            activeCategory === 'all' ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          All
        </button>
        {Object.entries(CATEGORIES).map(([id, cat]) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              activeCategory === id ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(([id, cfg]) => (
          <IntegrationCard
            key={id}
            id={id}
            config={cfg}
            status={statuses[id] || 'disconnected'}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onConfigure={setConfiguring}
          />
        ))}
      </div>

      {/* Configure modal */}
      {configuring && (
        <ConfigureModal
          id={configuring}
          config={INTEGRATIONS[configuring]}
          onClose={() => setConfiguring(null)}
          onSave={(id) => { setStatuses(p => ({ ...p, [id]: 'connected' })); }}
        />
      )}

      <div className="text-xs text-gray-600">
        OAuth tokens stored server-side, encrypted at rest. API keys never logged.
        Connections scoped by role — admin access required for infrastructure connectors.
      </div>
    </div>
  );
}
