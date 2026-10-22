// Nexus AI Pro - Platform Connectors | Date: 2026-10-22
// Cloud service, collaboration, and development platform integrations

/**
 * All credentials must come from environment variables or user-provided config.
 * Never hardcode API keys, tokens, or secrets here.
 */

export const CONNECTOR_CATALOG = [
  // Cloud Infrastructure
  { id: 'aws', name: 'Amazon Web Services', category: 'cloud', icon: '☁️', configKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'] },
  { id: 'azure', name: 'Microsoft Azure', category: 'cloud', icon: '🔷', configKeys: ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'] },
  { id: 'gcp', name: 'Google Cloud Platform', category: 'cloud', icon: '🌐', configKeys: ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS'] },
  { id: 'adobe', name: 'Adobe Creative Cloud', category: 'creative', icon: '🅰', configKeys: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'] },

  // Collaboration
  { id: 'slack', name: 'Slack', category: 'collaboration', icon: '💬', configKeys: ['SLACK_BOT_TOKEN', 'SLACK_WEBHOOK_URL'] },
  { id: 'zoom', name: 'Zoom', category: 'collaboration', icon: '📹', configKeys: ['ZOOM_API_KEY', 'ZOOM_API_SECRET'] },
  { id: 'discord', name: 'Discord', category: 'collaboration', icon: '🎮', configKeys: ['DISCORD_BOT_TOKEN'] },

  // Code & Repos
  { id: 'github', name: 'GitHub', category: 'devops', icon: '🐙', configKeys: ['GITHUB_TOKEN'] },
  { id: 'bitbucket', name: 'Bitbucket', category: 'devops', icon: '🪣', configKeys: ['BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD'] },
  { id: 'gitlab', name: 'GitLab', category: 'devops', icon: '🦊', configKeys: ['GITLAB_TOKEN'] },

  // Data
  { id: 'redis', name: 'Redis', category: 'data', icon: '🔴', configKeys: ['REDIS_URL'] },
  { id: 'postgresql', name: 'PostgreSQL', category: 'data', icon: '🐘', configKeys: ['DATABASE_URL'] },
  { id: 'mongodb', name: 'MongoDB', category: 'data', icon: '🍃', configKeys: ['MONGODB_URI'] },
  { id: 'azureblob', name: 'Azure Blob Storage', category: 'data', icon: '📦', configKeys: ['AZURE_STORAGE_CONNECTION_STRING'] },
  { id: 's3', name: 'AWS S3', category: 'data', icon: '🗃', configKeys: ['AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID'] },

  // Game Platforms
  { id: 'steam', name: 'Steam / Steamworks', category: 'gaming', icon: '🎮', configKeys: ['STEAM_API_KEY', 'STEAM_APP_ID'] },
  { id: 'epic', name: 'Epic Games / Unreal', category: 'gaming', icon: '⚡', configKeys: ['EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET'] },
  { id: 'psn', name: 'PlayStation Network', category: 'gaming', icon: '🕹', configKeys: ['PSN_CLIENT_ID', 'PSN_CLIENT_SECRET'] },
  { id: 'xbox', name: 'Xbox / Microsoft Game Dev', category: 'gaming', icon: '🟢', configKeys: ['XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET', 'XBOX_TENANT_ID'] },
  { id: 'ubisoft', name: 'Ubisoft Connect', category: 'gaming', icon: '🎲', configKeys: ['UBISOFT_APP_ID', 'UBISOFT_API_KEY'] },

  // Social Media
  { id: 'tiktok', name: 'TikTok', category: 'social', icon: '🎵', configKeys: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'] },
  { id: 'instagram', name: 'Instagram / Meta', category: 'social', icon: '📸', configKeys: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'] },
  { id: 'facebook', name: 'Facebook / Meta', category: 'social', icon: '👍', configKeys: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'] },
  { id: 'twitch', name: 'Twitch', category: 'social', icon: '📺', configKeys: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'] },
  { id: 'reddit', name: 'Reddit', category: 'social', icon: '🤖', configKeys: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'] },
  { id: 'youtube', name: 'YouTube', category: 'social', icon: '▶️', configKeys: ['YOUTUBE_API_KEY'] },
];

/**
 * Check which connectors have their environment variables configured.
 * Returns map of connectorId -> boolean.
 */
export function getConnectorStatus(envVars = {}) {
  const status = {};
  for (const connector of CONNECTOR_CATALOG) {
    status[connector.id] = connector.configKeys.every(
      key => Boolean(envVars[key] || process.env?.[key])
    );
  }
  return status;
}

/**
 * Build a secure fetch wrapper for a given connector.
 * Credentials are pulled from environment — never from arguments.
 */
export function buildConnectorClient(connectorId) {
  const connector = CONNECTOR_CATALOG.find(c => c.id === connectorId);
  if (!connector) throw new Error(`Unknown connector: ${connectorId}`);

  return {
    id: connector.id,
    name: connector.name,
    isConfigured: connector.configKeys.every(k => Boolean(process.env[k])),

    async request(endpoint, options = {}) {
      const baseHeaders = { 'Content-Type': 'application/json' };

      // Attach auth headers per connector type
      switch (connectorId) {
        case 'slack':
          baseHeaders['Authorization'] = `Bearer ${process.env.SLACK_BOT_TOKEN}`;
          break;
        case 'github':
          baseHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
          baseHeaders['Accept'] = 'application/vnd.github.v3+json';
          break;
        case 'gitlab':
          baseHeaders['PRIVATE-TOKEN'] = process.env.GITLAB_TOKEN;
          break;
        case 'bitbucket': {
          const creds = Buffer.from(
            `${process.env.BITBUCKET_USERNAME}:${process.env.BITBUCKET_APP_PASSWORD}`
          ).toString('base64');
          baseHeaders['Authorization'] = `Basic ${creds}`;
          break;
        }
        case 'youtube':
          endpoint = endpoint.includes('?')
            ? `${endpoint}&key=${process.env.YOUTUBE_API_KEY}`
            : `${endpoint}?key=${process.env.YOUTUBE_API_KEY}`;
          break;
      }

      const res = await fetch(endpoint, {
        ...options,
        headers: { ...baseHeaders, ...(options.headers || {}) },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${connector.name} API error ${res.status}: ${body.slice(0, 200)}`);
      }

      const ct = res.headers.get('content-type') || '';
      return ct.includes('json') ? res.json() : res.text();
    },
  };
}

export default CONNECTOR_CATALOG;
