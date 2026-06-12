// src/components/EnterpriseConnectors.jsx
// 2026-06-12 | Enterprise integrations: Azure, AWS, GCP, GitHub, Slack, Zoom, Adobe, Epic, Sony, Xbox, Ubisoft
import React, { useState, useEffect } from 'react';
import {
  Plug, CheckCircle, XCircle, Plus, Trash2, Settings,
  ChevronRight, Cloud, Code, MessageSquare, Gamepad2,
  Database, RefreshCw, ExternalLink
} from 'lucide-react';

const CATEGORY_ICONS = {
  cloud: Cloud,
  devtools: Code,
  communication: MessageSquare,
  gaming: Gamepad2,
  creative: Settings,
  storage: Database,
  cache: Database
};

const CATEGORY_LABELS = {
  cloud: 'Cloud Providers',
  devtools: 'Developer Tools',
  communication: 'Communication',
  gaming: 'Game Platforms',
  creative: 'Creative Tools',
  storage: 'Storage',
  cache: 'Cache / Database'
};

function ConnectorCard({ connector, connected, onConnect, onDisconnect }) {
  const [showConfig, setShowConfig] = useState(false);
  const [creds, setCreds] = useState({});
  const CategoryIcon = CATEGORY_ICONS[connector.category] || Plug;

  function handleConnect() {
    onConnect(connector.id, creds);
    setShowConfig(false);
    setCreds({});
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition hover:border-gray-700">
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
          <CategoryIcon size={16} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{connector.name}</p>
          <p className="text-xs text-gray-500 capitalize">{connector.category}</p>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle size={12} />
              <span>Connected</span>
            </div>
            <button
              onClick={() => onDisconnect(connector.id)}
              className="p-1 text-gray-600 hover:text-red-400 transition"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfig(s => !s)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-2 py-1 transition"
          >
            <Plus size={11} /> Connect
          </button>
        )}
      </div>

      {showConfig && !connected && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          <p className="text-xs text-gray-400">
            Enter credentials for {connector.name}. These are transmitted securely and never stored in plaintext.
          </p>
          <div className="space-y-2">
            {getCredentialFields(connector.id).map(field => (
              <input
                key={field.key}
                type={field.secret ? 'password' : 'text'}
                placeholder={field.label}
                value={creds[field.key] || ''}
                onChange={e => setCreds(c => ({ ...c, [field.key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConnect}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-lg font-medium transition"
            >
              Connect
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getCredentialFields(connectorId) {
  const fields = {
    azure: [{ key: 'tenantId', label: 'Tenant ID' }, { key: 'clientId', label: 'Client ID' }, { key: 'clientSecret', label: 'Client Secret', secret: true }],
    aws: [{ key: 'accessKeyId', label: 'Access Key ID' }, { key: 'secretAccessKey', label: 'Secret Access Key', secret: true }, { key: 'region', label: 'Region (e.g. us-east-1)' }],
    gcp: [{ key: 'projectId', label: 'Project ID' }, { key: 'serviceAccountKey', label: 'Service Account JSON', secret: true }],
    github: [{ key: 'token', label: 'Personal Access Token', secret: true }, { key: 'org', label: 'Organization (optional)' }],
    bitbucket: [{ key: 'username', label: 'Username' }, { key: 'appPassword', label: 'App Password', secret: true }],
    slack: [{ key: 'webhookUrl', label: 'Webhook URL', secret: true }, { key: 'botToken', label: 'Bot Token', secret: true }],
    zoom: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'apiSecret', label: 'API Secret', secret: true }],
    discord: [{ key: 'botToken', label: 'Bot Token', secret: true }, { key: 'guildId', label: 'Server (Guild) ID' }],
    adobe: [{ key: 'clientId', label: 'Client ID' }, { key: 'clientSecret', label: 'Client Secret', secret: true }],
    epic_games: [{ key: 'clientId', label: 'Epic Games Client ID' }, { key: 'clientSecret', label: 'Client Secret', secret: true }],
    sony_psn: [{ key: 'clientId', label: 'PSN Client ID' }, { key: 'clientSecret', label: 'Client Secret', secret: true }],
    microsoft_xbox: [{ key: 'clientId', label: 'Azure App Client ID' }, { key: 'clientSecret', label: 'Client Secret', secret: true }],
    ubisoft_connect: [{ key: 'appId', label: 'Ubisoft App ID' }, { key: 'apiKey', label: 'API Key', secret: true }],
    steam: [{ key: 'apiKey', label: 'Steam Web API Key', secret: true }],
    azure_blob: [{ key: 'connectionString', label: 'Connection String', secret: true }, { key: 'containerName', label: 'Container Name' }],
    aws_s3: [{ key: 'accessKeyId', label: 'Access Key ID' }, { key: 'secretAccessKey', label: 'Secret Key', secret: true }, { key: 'bucket', label: 'Bucket Name' }],
    redis: [{ key: 'url', label: 'Redis URL (redis://...)', secret: true }]
  };
  return fields[connectorId] || [{ key: 'apiKey', label: 'API Key', secret: true }];
}

export default function EnterpriseConnectors({ token }) {
  const [available, setAvailable] = useState([]);
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    async function load() {
      const [avRes, conRes] = await Promise.all([
        fetch('/api/integrations/available', { headers }),
        fetch('/api/integrations/connected', { headers })
      ]);
      if (avRes.ok) setAvailable((await avRes.json()).connectors || []);
      if (conRes.ok) setConnected((await conRes.json()).connections || []);
      setLoading(false);
    }
    load();
  }, [token]);

  async function connect(connectorId, credentials) {
    const res = await fetch('/api/integrations/connect', {
      method: 'POST',
      headers,
      body: JSON.stringify({ connectorId, credentials })
    });
    if (res.ok) {
      const info = available.find(c => c.id === connectorId);
      setConnected(prev => [...prev, { connectorId, connectorName: info?.name, status: 'connected', connectedAt: Date.now() }]);
    }
  }

  async function disconnect(connectorId) {
    await fetch(`/api/integrations/${connectorId}`, { method: 'DELETE', headers });
    setConnected(prev => prev.filter(c => c.connectorId !== connectorId));
  }

  const categories = ['all', ...new Set(available.map(c => c.category))];
  const filtered = activeCategory === 'all' ? available : available.filter(c => c.category === activeCategory);
  const connectedIds = new Set(connected.map(c => c.connectorId));

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plug size={18} className="text-blue-400" />
            <div>
              <h1 className="font-bold">Integrations</h1>
              <p className="text-xs text-gray-400">
                {connected.length} of {available.length} connected
              </p>
            </div>
          </div>
          {loading && <RefreshCw size={14} className="animate-spin text-gray-500" />}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 p-4 overflow-x-auto border-b border-gray-800">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition capitalize ${
              activeCategory === cat
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {cat === 'all' ? `All (${available.length})` : `${CATEGORY_LABELS[cat] || cat} (${available.filter(c => c.category === cat).length})`}
          </button>
        ))}
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(connector => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            connected={connectedIds.has(connector.id)}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        ))}
      </div>
    </div>
  );
}
