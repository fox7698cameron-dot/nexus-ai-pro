// ConnectorsDashboard - 2026-10-07
import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud, Github, Database, Server, Gamepad2, Globe, Wifi,
  WifiOff, RefreshCw, Settings, CheckCircle, XCircle,
  AlertTriangle, ExternalLink, Lock
} from 'lucide-react';

const CONNECTOR_META = {
  'AWS': { icon: '☁️', category: 'cloud', docs: 'https://docs.aws.amazon.com/', envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'] },
  'Azure': { icon: '🔷', category: 'cloud', docs: 'https://docs.microsoft.com/azure/', envVars: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'] },
  'Google Cloud': { icon: '🌐', category: 'cloud', docs: 'https://cloud.google.com/docs/', envVars: ['GOOGLE_CLOUD_API_KEY', 'GOOGLE_CLOUD_PROJECT_ID'] },
  'Adobe': { icon: '🎨', category: 'cloud', docs: 'https://developer.adobe.com/', envVars: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'] },
  'Slack': { icon: '💬', category: 'collab', docs: 'https://api.slack.com/', envVars: ['SLACK_BOT_TOKEN'] },
  'GitHub': { icon: '🐙', category: 'devtools', docs: 'https://docs.github.com/', envVars: ['GITHUB_TOKEN'] },
  'Bitbucket': { icon: '🪣', category: 'devtools', docs: 'https://developer.atlassian.com/', envVars: ['BITBUCKET_ACCESS_TOKEN'] },
  'Zoom': { icon: '📹', category: 'collab', docs: 'https://marketplace.zoom.us/docs/', envVars: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'] },
  'Epic Games / Unreal': { icon: '🎮', category: 'gaming', docs: 'https://dev.epicgames.com/', envVars: ['EPIC_GAMES_CLIENT_ID', 'EPIC_GAMES_CLIENT_SECRET'] },
  'Sony PlayStation': { icon: '🕹️', category: 'gaming', docs: 'https://develop.playstation.com/', envVars: ['SONY_PSN_NPSSO'] },
  'Microsoft Xbox': { icon: '🎯', category: 'gaming', docs: 'https://developer.microsoft.com/games/', envVars: ['XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET'] },
  'Ubisoft Connect': { icon: '🗡️', category: 'gaming', docs: 'https://developers.ubisoft.com/', envVars: ['UBISOFT_APP_ID', 'UBISOFT_APP_SECRET'] },
  'Redis': { icon: '⚡', category: 'data', docs: 'https://redis.io/docs/', envVars: ['REDIS_URL'] },
  'Blob Storage': { icon: '🗄️', category: 'data', docs: 'https://docs.azure.com/blob/', envVars: ['BLOB_CONNECTION_STRING', 'BLOB_BUCKET'] }
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'devtools', label: 'Dev Tools' },
  { id: 'collab', label: 'Collaboration' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'data', label: 'Data' }
];

function ConnectorCard({ name, status, onRefresh }) {
  const meta = CONNECTOR_META[name] || { icon: '🔌', category: 'other', envVars: [] };
  const [configOpen, setConfigOpen] = useState(false);

  const statusColor = status?.connected
    ? 'text-green-600 bg-green-50 border-green-200'
    : 'text-red-600 bg-red-50 border-red-200';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{name}</h3>
            <span className="text-xs text-gray-400 capitalize">{meta.category}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
          {status?.connected
            ? <><CheckCircle size={11} /> Connected</>
            : <><XCircle size={11} /> Disconnected</>}
        </div>
      </div>

      {status?.lastError && (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span className="break-all">{status.lastError}</span>
        </div>
      )}

      {status?.lastPing && (
        <p className="text-xs text-gray-400">
          Pinged: {new Date(status.lastPing).toLocaleTimeString()}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <RefreshCw size={12} /> Ping
        </button>
        <button
          type="button"
          onClick={() => setConfigOpen(c => !c)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <Settings size={12} /> Config
        </button>
        {meta.docs && (
          <a
            href={meta.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-auto"
          >
            <ExternalLink size={11} /> Docs
          </a>
        )}
      </div>

      {configOpen && (
        <div className="pt-2 border-t border-gray-100 space-y-1.5">
          <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
            <Lock size={11} /> Required env vars:
          </p>
          {meta.envVars.map(v => (
            <code key={v} className="block text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded font-mono">
              {v}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConnectorsDashboard() {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/connectors/status');
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.connectors?.forEach(c => { map[c.name] = c.status; });
        setStatuses(map);
        setLastRefresh(new Date().toISOString());
      }
    } catch {
      // API unavailable - show empty states
    } finally {
      setLoading(false);
    }
  }, []);

  const pingConnector = useCallback(async name => {
    try {
      const res = await fetch(`/api/connectors/ping/${encodeURIComponent(name)}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatuses(s => ({ ...s, [name]: data.status }));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  const connectorNames = Object.keys(CONNECTOR_META);
  const filtered = category === 'all'
    ? connectorNames
    : connectorNames.filter(n => CONNECTOR_META[n]?.category === category);

  const connectedCount = Object.values(statuses).filter(s => s?.connected).length;

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Enterprise Connectors</h1>
          <p className="text-sm text-gray-500">
            {connectedCount} / {connectorNames.length} connected
            {lastRefresh && ` · ${new Date(lastRefresh).toLocaleTimeString()}`}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStatuses}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Pinging…' : 'Ping All'}
        </button>
      </div>

      <div className="flex overflow-x-auto gap-1 bg-white rounded-xl border border-gray-200 p-1">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${category === c.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(name => (
          <ConnectorCard
            key={name}
            name={name}
            status={statuses[name]}
            onRefresh={() => pingConnector(name)}
          />
        ))}
      </div>
    </div>
  );
}
