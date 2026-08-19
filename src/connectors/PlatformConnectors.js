/**
 * @file PlatformConnectors.js
 * @description Platform Connector Registry — Azure, Adobe, AWS, Google, Slack, Zoom,
 *   GitHub, Bitbucket, Unreal, Epic Games, Sony, Microsoft, Ubisoft + Crypto / AI connectors
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 * @security API keys/tokens are NEVER hard-coded. All credentials are read from
 *   server-side environment variables or returned by an authenticated /api/connectors
 *   endpoint. This client-side registry holds only metadata.
 */

// ─── Connector Registry ────────────────────────────────────────────────────────

export const CONNECTOR_REGISTRY = {
  // ── Cloud Providers ────────────────────────────────────────────────────────
  azure: {
    id: 'azure',
    name: 'Microsoft Azure',
    icon: '☁️',
    color: '#0078d4',
    category: 'cloud',
    authType: 'oauth2',
    scopes: ['https://management.azure.com/.default'],
    endpoints: {
      auth: 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize',
      token: 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token',
      base: 'https://management.azure.com'
    },
    features: ['Storage (Blob)', 'Azure OpenAI', 'Functions', 'Cosmos DB', 'DevOps'],
    description: 'Microsoft Azure cloud services including AI, storage, and DevOps.'
  },

  aws: {
    id: 'aws',
    name: 'Amazon Web Services',
    icon: '🟡',
    color: '#ff9900',
    category: 'cloud',
    authType: 'api_key',
    envKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    features: ['S3 Storage', 'Lambda', 'Bedrock AI', 'RDS', 'CloudFront'],
    description: 'AWS services including S3 blob storage, Lambda, and Bedrock AI models.'
  },

  google: {
    id: 'google',
    name: 'Google Cloud',
    icon: '🔵',
    color: '#4285f4',
    category: 'cloud',
    authType: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    endpoints: {
      auth: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
      base: 'https://www.googleapis.com'
    },
    features: ['Firebase', 'Vertex AI (Gemini)', 'Cloud Run', 'BigQuery', 'GCS Buckets'],
    description: 'Google Cloud Platform services including Vertex AI and Firebase.'
  },

  // ── Productivity / Collab ──────────────────────────────────────────────────
  slack: {
    id: 'slack',
    name: 'Slack',
    icon: '💬',
    color: '#4a154b',
    category: 'productivity',
    authType: 'oauth2',
    scopes: ['chat:write', 'channels:read', 'users:read', 'files:write'],
    endpoints: {
      auth: 'https://slack.com/oauth/v2/authorize',
      token: 'https://slack.com/api/oauth.v2.access',
      base: 'https://slack.com/api'
    },
    features: ['Channel messaging', 'File uploads', 'Slash commands', 'Webhooks'],
    description: 'Send notifications, messages, and files to Slack channels.'
  },

  zoom: {
    id: 'zoom',
    name: 'Zoom',
    icon: '📹',
    color: '#2d8cff',
    category: 'productivity',
    authType: 'oauth2',
    scopes: ['meeting:write', 'recording:read', 'user:read'],
    endpoints: {
      auth: 'https://zoom.us/oauth/authorize',
      token: 'https://zoom.us/oauth/token',
      base: 'https://api.zoom.us/v2'
    },
    features: ['Create meetings', 'Recording access', 'Webinars', 'Users'],
    description: 'Zoom meeting management and video conferencing integration.'
  },

  // ── Code / Dev ─────────────────────────────────────────────────────────────
  github: {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    color: '#6e40c9',
    category: 'devtools',
    authType: 'oauth2',
    scopes: ['repo', 'read:user', 'workflow', 'read:org'],
    endpoints: {
      auth: 'https://github.com/login/oauth/authorize',
      token: 'https://github.com/login/oauth/access_token',
      base: 'https://api.github.com'
    },
    features: ['Repos', 'Pull Requests', 'Actions CI', 'Issues', 'Webhooks'],
    description: 'GitHub repository management, CI/CD, and code review.'
  },

  bitbucket: {
    id: 'bitbucket',
    name: 'Bitbucket',
    icon: '🪣',
    color: '#0052cc',
    category: 'devtools',
    authType: 'oauth2',
    scopes: ['repository', 'pullrequest', 'pipeline'],
    endpoints: {
      auth: 'https://bitbucket.org/site/oauth2/authorize',
      token: 'https://bitbucket.org/site/oauth2/access_token',
      base: 'https://api.bitbucket.org/2.0'
    },
    features: ['Repos', 'Pipelines CI/CD', 'Pull Requests', 'Jira Integration'],
    description: 'Bitbucket repository management and Pipelines CI/CD.'
  },

  // ── Creative ───────────────────────────────────────────────────────────────
  adobe: {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    icon: '🎨',
    color: '#fa0f00',
    category: 'creative',
    authType: 'oauth2',
    scopes: ['openid', 'AdobeID', 'creative_sdk'],
    endpoints: {
      auth: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
      token: 'https://ims-na1.adobelogin.com/ims/token/v3',
      base: 'https://cc-api-storage.adobe.io'
    },
    features: ['Asset Library', 'Firefly AI', 'Express', 'Fonts', 'Stock'],
    description: 'Adobe Creative Cloud assets, Firefly AI generation, and Fonts.'
  },

  // ── Game Platforms ─────────────────────────────────────────────────────────
  unreal: {
    id: 'unreal',
    name: 'Unreal Engine',
    icon: '🔷',
    color: '#1d7fb4',
    category: 'gamedev',
    authType: 'api_key',
    envKeys: ['UNREAL_API_KEY', 'UNREAL_PROJECT_ID'],
    features: ['Build status', 'Asset streaming', 'Pixel Streaming', 'MetaHuman'],
    description: 'Unreal Engine 5 build pipeline and project status integration.'
  },

  epic: {
    id: 'epic',
    name: 'Epic Games Store',
    icon: '🎯',
    color: '#2563eb',
    category: 'gamedev',
    authType: 'oauth2',
    scopes: ['basic_profile', 'game_data'],
    endpoints: {
      auth: 'https://www.epicgames.com/id/authorize',
      token: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
      base: 'https://api.epicgames.dev'
    },
    features: ['Store listings', 'Achievements', 'Player stats', 'DLC management'],
    description: 'Epic Games Store product management and achievement tracking.'
  },

  sony: {
    id: 'sony',
    name: 'PlayStation Network',
    icon: '🎮',
    color: '#003791',
    category: 'gamedev',
    authType: 'oauth2',
    scopes: ['psn:s2s'],
    endpoints: {
      auth: 'https://ca.account.sony.com/api/authz/v3/oauth/authorize',
      token: 'https://ca.account.sony.com/api/authz/v3/oauth/token',
      base: 'https://m.np.playstation.com/api'
    },
    features: ['Trophy sync', 'Player activity', 'Game sessions', 'DLC'],
    description: 'PlayStation Network integration for trophies and player data.'
  },

  xbox: {
    id: 'xbox',
    name: 'Xbox / Microsoft Store',
    icon: '🟢',
    color: '#107c10',
    category: 'gamedev',
    authType: 'oauth2',
    scopes: ['Xboxlive.signin', 'Xboxlive.offline_access'],
    endpoints: {
      auth: 'https://login.live.com/oauth20_authorize.srf',
      token: 'https://login.live.com/oauth20_token.srf',
      base: 'https://xsts.auth.xboxlive.com'
    },
    features: ['Achievement sync', 'Game clips', 'Game Pass status', 'Player stats'],
    description: 'Xbox Live integration for achievements and player statistics.'
  },

  ubisoft: {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    icon: '🦁',
    color: '#0070d1',
    category: 'gamedev',
    authType: 'api_key',
    envKeys: ['UBISOFT_APP_ID', 'UBISOFT_APP_SECRET'],
    features: ['Player stats', 'Challenges', 'Inventory', 'Game data'],
    description: 'Ubisoft Connect player statistics and challenge management.'
  },

  // ── Data / Cache ───────────────────────────────────────────────────────────
  redis: {
    id: 'redis',
    name: 'Redis',
    icon: '🔴',
    color: '#d82c20',
    category: 'infrastructure',
    authType: 'connection_string',
    envKeys: ['REDIS_URL'],
    features: ['Session cache', 'Rate limiting', 'Pub/Sub', 'Leaderboards'],
    description: 'Redis for session caching, rate limiting, and real-time pub/sub.'
  },

  blob: {
    id: 'blob',
    name: 'Blob Storage',
    icon: '🗂️',
    color: '#6366f1',
    category: 'infrastructure',
    authType: 'api_key',
    envKeys: ['BLOB_STORAGE_URL', 'BLOB_ACCESS_KEY'],
    features: ['File uploads', 'Media storage', 'CDN delivery', 'Access control'],
    description: 'Object / blob storage for user files, media, and assets.'
  }
};

// ─── Category Groups ───────────────────────────────────────────────────────────

export const CONNECTOR_CATEGORIES = {
  cloud:          { label: '☁️ Cloud',         color: '#3b82f6' },
  productivity:   { label: '💼 Productivity',  color: '#10b981' },
  devtools:       { label: '⚙️ Dev Tools',     color: '#8b5cf6' },
  creative:       { label: '🎨 Creative',      color: '#f97316' },
  gamedev:        { label: '🎮 Game Dev',      color: '#f59e0b' },
  infrastructure: { label: '🏗️ Infrastructure', color: '#64748b' }
};

// ─── Auth URL Builder ─────────────────────────────────────────────────────────

/**
 * Build the OAuth2 authorization URL for a given connector.
 * Redirect URI and client ID are provided by the server — never hard-coded here.
 *
 * @param {string} connectorId
 * @param {{ clientId: string, redirectUri: string, state: string }} serverParams
 * @returns {string} Authorization URL
 */
export function buildAuthUrl(connectorId, serverParams) {
  const connector = CONNECTOR_REGISTRY[connectorId];
  if (!connector) throw new Error(`Unknown connector: ${connectorId}`);
  if (connector.authType !== 'oauth2') throw new Error(`${connectorId} uses ${connector.authType}, not OAuth2`);

  const { auth } = connector.endpoints;
  const params = new URLSearchParams({
    client_id: serverParams.clientId,
    redirect_uri: serverParams.redirectUri,
    response_type: 'code',
    scope: connector.scopes.join(' '),
    state: serverParams.state,
    access_type: 'offline'
  });

  return `${auth}?${params}`;
}

// ─── Server-side connector helpers (Node.js safe-guard exports) ───────────────

/**
 * Return a connector's env key names (for server-side validation only).
 * Never returns actual key values — those live in process.env on the server.
 */
export function getRequiredEnvKeys(connectorId) {
  const connector = CONNECTOR_REGISTRY[connectorId];
  if (!connector) return [];
  return connector.envKeys || [];
}

/**
 * Retrieve grouped connectors for display.
 * @returns {{ category: string, connectors: object[] }[]}
 */
export function getConnectorsByCategory() {
  const groups = {};
  for (const [id, c] of Object.entries(CONNECTOR_REGISTRY)) {
    if (!groups[c.category]) groups[c.category] = [];
    groups[c.category].push({ ...c, id });
  }
  return Object.entries(groups).map(([category, connectors]) => ({
    category,
    ...CONNECTOR_CATEGORIES[category],
    connectors
  }));
}

export default CONNECTOR_REGISTRY;
