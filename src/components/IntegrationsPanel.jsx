/* IntegrationsPanel.jsx
 * Nexus AI Pro - Platform Connectors & Integrations
 * Date: 2026-10-27
 * Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket, Redis, Blob, etc.
 */

import React, { useState, useCallback } from 'react';
import {
  Cloud, Database, GitBranch, MessageSquare, Video,
  Globe, Server, HardDrive, Link, Check, X, RefreshCw,
  Settings, Plus, Trash2, Eye, EyeOff, ExternalLink,
  Lock, Key, Shield, AlertTriangle, ChevronDown, ChevronRight
} from 'lucide-react';

// ── i18n ───────────────────────────────────────────────────────────────────────
const I18N = {
  en: { connect: 'Connect', disconnect: 'Disconnect', connected: 'Connected', disconnected: 'Disconnected', configure: 'Configure', test: 'Test Connection', save: 'Save', cancel: 'Cancel', envNote: 'Configure via environment variables — never paste secrets directly', status: 'Status', integrations: 'Integrations & Connectors' },
  es: { connect: 'Conectar', disconnect: 'Desconectar', connected: 'Conectado', disconnected: 'Desconectado', configure: 'Configurar', test: 'Probar Conexión', save: 'Guardar', cancel: 'Cancelar', envNote: 'Configure mediante variables de entorno — nunca pegue secretos directamente', status: 'Estado', integrations: 'Integraciones y Conectores' },
  fr: { connect: 'Connecter', disconnect: 'Déconnecter', connected: 'Connecté', disconnected: 'Déconnecté', configure: 'Configurer', test: 'Tester la Connexion', save: 'Enregistrer', cancel: 'Annuler', envNote: 'Configurez via les variables d\'environnement — ne collez jamais de secrets directement', status: 'Statut', integrations: 'Intégrations et Connecteurs' },
};

// ── Integration definitions ────────────────────────────────────────────────────
const INTEGRATIONS = [
  {
    id: 'azure',
    name: 'Microsoft Azure',
    category: 'cloud',
    description: 'Azure AI Services, Blob Storage, Cognitive Services',
    icon: '☁️',
    color: 'blue',
    envVars: ['AZURE_SUBSCRIPTION_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
    docs: 'https://docs.microsoft.com/azure',
    features: ['Blob Storage', 'Cognitive Services', 'Azure AI', 'Key Vault', 'App Service'],
  },
  {
    id: 'aws',
    name: 'Amazon Web Services',
    category: 'cloud',
    description: 'S3, Lambda, Bedrock AI, SES, CloudFront',
    icon: '🟠',
    color: 'orange',
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'],
    docs: 'https://docs.aws.amazon.com',
    features: ['S3 Storage', 'Lambda', 'Bedrock AI', 'SES Email', 'CloudFront CDN'],
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    category: 'cloud',
    description: 'GCS, Firebase, Vertex AI, Translation API',
    icon: '🔵',
    color: 'sky',
    envVars: ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_PROJECT_ID', 'GOOGLE_CLOUD_BUCKET'],
    docs: 'https://cloud.google.com/docs',
    features: ['Cloud Storage', 'Firebase', 'Vertex AI', 'Translate API', 'BigQuery'],
  },
  {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    category: 'creative',
    description: 'Adobe Firefly, Photoshop API, Express',
    icon: '🎨',
    color: 'red',
    envVars: ['ADOBE_API_KEY', 'ADOBE_CLIENT_SECRET', 'ADOBE_ORGANIZATION_ID'],
    docs: 'https://developer.adobe.com',
    features: ['Firefly AI', 'Photoshop API', 'Express', 'PDF Services', 'Stock API'],
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Send notifications, manage channels, bot integration',
    icon: '💬',
    color: 'purple',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_APP_TOKEN'],
    docs: 'https://api.slack.com',
    features: ['Notifications', 'Bot Commands', 'File Uploads', 'Channel Management'],
  },
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'communication',
    description: 'Video meetings, webinars, collaboration',
    icon: '📹',
    color: 'blue',
    envVars: ['ZOOM_API_KEY', 'ZOOM_API_SECRET', 'ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
    docs: 'https://developers.zoom.us',
    features: ['Meetings', 'Webinars', 'Recordings', 'Transcription'],
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'devops',
    description: 'Repository management, CI/CD, Issues, PRs',
    icon: '⚫',
    color: 'gray',
    envVars: ['GITHUB_TOKEN', 'GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY'],
    docs: 'https://docs.github.com',
    features: ['Repos', 'Issues', 'PRs', 'Actions CI/CD', 'GitHub Copilot'],
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    category: 'devops',
    description: 'Source control, Pipelines, Jira integration',
    icon: '🟦',
    color: 'blue',
    envVars: ['BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD', 'BITBUCKET_WORKSPACE'],
    docs: 'https://developer.atlassian.com/bitbucket',
    features: ['Repos', 'Pipelines', 'Jira Sync', 'Pull Requests', 'Code Insights'],
  },
  {
    id: 'redis',
    name: 'Redis / Upstash',
    category: 'database',
    description: 'Caching, session storage, pub/sub, real-time data',
    icon: '🔴',
    color: 'red',
    envVars: ['REDIS_URL', 'REDIS_PASSWORD', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    docs: 'https://redis.io/docs',
    features: ['Key-Value Cache', 'Session Store', 'Pub/Sub', 'Rate Limiting', 'Leaderboards'],
  },
  {
    id: 'blobstorage',
    name: 'Blob Storage',
    category: 'storage',
    description: 'Vercel Blob, Cloudflare R2, or Azure Blob for file storage',
    icon: '📦',
    color: 'indigo',
    envVars: ['BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_URL', 'CF_R2_ACCESS_KEY', 'CF_R2_SECRET_KEY'],
    docs: 'https://vercel.com/docs/storage/vercel-blob',
    features: ['File Upload', 'CDN Delivery', 'Public/Private URLs', 'Large File Support'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    description: 'Subscriptions, one-time payments, invoicing',
    icon: '💳',
    color: 'violet',
    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
    docs: 'https://stripe.com/docs',
    features: ['Subscriptions', 'One-time Payments', 'Invoices', 'Connect', 'Crypto'],
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'community',
    description: 'Community server, OAuth2 auth, webhooks, bots',
    icon: '🎮',
    color: 'indigo',
    envVars: ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_GUILD_ID'],
    docs: 'https://discord.com/developers/docs',
    features: ['Bot Commands', 'OAuth2 Login', 'Webhooks', 'Voice/Video', 'Analytics'],
  },
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: Globe },
  { key: 'cloud', label: 'Cloud', icon: Cloud },
  { key: 'devops', label: 'DevOps', icon: GitBranch },
  { key: 'database', label: 'Database', icon: Database },
  { key: 'communication', label: 'Comms', icon: MessageSquare },
  { key: 'storage', label: 'Storage', icon: HardDrive },
  { key: 'payments', label: 'Payments', icon: Lock },
  { key: 'creative', label: 'Creative', icon: Globe },
  { key: 'community', label: 'Community', icon: MessageSquare },
];

// ── Integration card ───────────────────────────────────────────────────────────

function IntegrationCard({ integration, connected, onConnect, onDisconnect, t }) {
  const [expanded, setExpanded] = useState(false);
  const [showVars, setShowVars] = useState(false);

  const colorMap = {
    blue: 'border-blue-700 bg-blue-900/20',
    orange: 'border-orange-700 bg-orange-900/20',
    sky: 'border-sky-700 bg-sky-900/20',
    red: 'border-red-700 bg-red-900/20',
    purple: 'border-purple-700 bg-purple-900/20',
    gray: 'border-gray-600 bg-gray-800/40',
    indigo: 'border-indigo-700 bg-indigo-900/20',
    violet: 'border-violet-700 bg-violet-900/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[integration.color] || 'border-gray-700 bg-gray-800/40'} transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">{integration.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-100 truncate">{integration.name}</h3>
              {connected ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/40 border border-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0">
                  <Check size={10} /> {t.connected}
                </span>
              ) : (
                <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full flex-shrink-0">
                  {t.disconnected}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{integration.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {connected ? (
            <button
              onClick={() => onDisconnect(integration.id)}
              className="text-xs px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              {t.disconnect}
            </button>
          ) : (
            <button
              onClick={() => onConnect(integration.id)}
              className="text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {t.connect}
            </button>
          )}
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-gray-700/50 pt-3">
          {/* Features */}
          <div>
            <div className="text-xs text-gray-500 mb-1.5">Features</div>
            <div className="flex flex-wrap gap-1">
              {integration.features.map(f => (
                <span key={f} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{f}</span>
              ))}
            </div>
          </div>

          {/* Env vars note */}
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Key size={12} className="text-yellow-400" />
              <span className="text-xs text-yellow-400 font-medium">Environment Variables</span>
              <button
                onClick={() => setShowVars(p => !p)}
                className="ml-auto text-xs text-gray-400 hover:text-gray-200"
              >
                {showVars ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <p className="text-xs text-yellow-300/70 mb-2">{t.envNote}</p>
            {showVars && (
              <div className="space-y-1">
                {integration.envVars.map(v => (
                  <div key={v} className="font-mono text-xs bg-gray-900 rounded px-2 py-1 text-gray-300">
                    {v}=<span className="text-gray-500">your_value_here</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Docs link */}
          <a
            href="#"
            onClick={e => e.preventDefault()}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink size={11} /> Documentation (configure apiBase URL in props)
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IntegrationsPanel({ darkMode = true, lang = 'en', connectedIds = [] }) {
  const t = I18N[lang] || I18N.en;
  const [connected, setConnected] = useState(new Set(connectedIds));
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const handleConnect = useCallback((id) => {
    setConnected(prev => new Set([...prev, id]));
  }, []);

  const handleDisconnect = useCallback((id) => {
    setConnected(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  const filtered = INTEGRATIONS.filter(i => {
    const matchCat = filter === 'all' || i.category === filter;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className={`${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-4">
        <Link size={20} className="text-blue-400" />
        <h2 className="text-lg font-bold">{t.integrations}</h2>
        <span className="ml-auto text-xs text-gray-500">{connected.size} connected</span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search integrations…"
        className="w-full mb-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />

      {/* Category tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filter === cat.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            connected={connected.has(integration.id)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            t={t}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No integrations match your search</p>
        )}
      </div>
    </div>
  );
}
