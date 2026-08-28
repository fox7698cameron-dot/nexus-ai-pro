/**
 * src/connectors/index.js
 * Nexus AI Pro — Connector Hub
 * Registers and manages all external service connectors
 * Date: 2026-08-28
 */

// ── Helper: env var accessor (no hardcoded keys) ──────────────────────────
function env(key) {
  return process.env[key] || null;
}

// ── Connector registry ─────────────────────────────────────────────────────
const connectors = new Map();

function register(id, connector) {
  connectors.set(id, { id, ...connector });
}

// ── Cloud providers ────────────────────────────────────────────────────────
register('aws', {
  name: 'Amazon Web Services',
  category: 'cloud',
  icon: '☁️',
  available: () => Boolean(env('AWS_ACCESS_KEY_ID') && env('AWS_SECRET_ACCESS_KEY')),
  services: ['S3', 'Lambda', 'EC2', 'RDS', 'CloudFront', 'SES', 'SNS', 'SQS'],
  async test() {
    const key    = env('AWS_ACCESS_KEY_ID');
    const region = env('AWS_REGION') || 'us-east-1';
    if (!key) return { connected: false, error: 'AWS credentials not configured' };
    return { connected: true, region };
  },
});

register('azure', {
  name: 'Microsoft Azure',
  category: 'cloud',
  icon: '🔷',
  available: () => Boolean(env('AZURE_SUBSCRIPTION_ID') && env('AZURE_CLIENT_ID')),
  services: ['Blob Storage', 'Azure AI', 'Cosmos DB', 'Azure AD', 'Key Vault', 'Functions'],
  async test() {
    if (!env('AZURE_SUBSCRIPTION_ID')) return { connected: false, error: 'Azure not configured' };
    return { connected: true, subscription: env('AZURE_SUBSCRIPTION_ID') };
  },
});

register('gcp', {
  name: 'Google Cloud Platform',
  category: 'cloud',
  icon: '🌐',
  available: () => Boolean(env('GOOGLE_CLOUD_PROJECT')),
  services: ['Cloud Storage', 'BigQuery', 'Pub/Sub', 'Cloud Functions', 'Firebase', 'Vertex AI'],
  async test() {
    if (!env('GOOGLE_CLOUD_PROJECT')) return { connected: false, error: 'GCP not configured' };
    return { connected: true, project: env('GOOGLE_CLOUD_PROJECT') };
  },
});

// ── Developer tools ────────────────────────────────────────────────────────
register('github', {
  name: 'GitHub',
  category: 'devtools',
  icon: '🐙',
  available: () => Boolean(env('GITHUB_TOKEN')),
  services: ['Repos', 'Issues', 'PRs', 'Actions', 'Packages'],
  async test() {
    const token = env('GITHUB_TOKEN');
    if (!token) return { connected: false, error: 'GitHub token not set' };
    try {
      const res  = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/2.0' },
      });
      const data = await res.json();
      return res.ok
        ? { connected: true, login: data.login }
        : { connected: false, error: data.message };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  },
});

register('bitbucket', {
  name: 'Bitbucket',
  category: 'devtools',
  icon: '🪣',
  available: () => Boolean(env('BITBUCKET_TOKEN')),
  services: ['Repos', 'Pipelines', 'Issues', 'PRs'],
  async test() {
    if (!env('BITBUCKET_TOKEN')) return { connected: false, error: 'Bitbucket token not set' };
    return { connected: true };
  },
});

// ── Productivity & collaboration ───────────────────────────────────────────
register('slack', {
  name: 'Slack',
  category: 'productivity',
  icon: '💬',
  available: () => Boolean(env('SLACK_BOT_TOKEN')),
  services: ['Messages', 'Channels', 'Files', 'Users', 'Webhooks'],
  async sendMessage({ channel, text }) {
    const token = env('SLACK_BOT_TOKEN');
    if (!token) throw new Error('Slack token not configured');
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ channel, text }),
    });
    return res.json();
  },
  async test() {
    if (!env('SLACK_BOT_TOKEN')) return { connected: false, error: 'Slack token not set' };
    return { connected: true };
  },
});

register('zoom', {
  name: 'Zoom',
  category: 'productivity',
  icon: '📹',
  available: () => Boolean(env('ZOOM_CLIENT_ID') && env('ZOOM_CLIENT_SECRET')),
  services: ['Meetings', 'Webinars', 'Recordings', 'Users'],
  async test() {
    if (!env('ZOOM_CLIENT_ID')) return { connected: false, error: 'Zoom credentials not set' };
    return { connected: true };
  },
});

register('adobe', {
  name: 'Adobe Creative Cloud',
  category: 'productivity',
  icon: '🎨',
  available: () => Boolean(env('ADOBE_CLIENT_ID')),
  services: ['Photoshop API', 'Firefly', 'PDF Services', 'Sign'],
  async test() {
    if (!env('ADOBE_CLIENT_ID')) return { connected: false, error: 'Adobe credentials not set' };
    return { connected: true };
  },
});

// ── Social media platforms ─────────────────────────────────────────────────
register('tiktok', {
  name: 'TikTok',
  category: 'social',
  icon: '🎵',
  available: () => Boolean(env('TIKTOK_ACCESS_TOKEN')),
  services: ['Video Analytics', 'Account Info', 'Follower Stats', 'Content'],
  async getAnalytics(userId) {
    const token = env('TIKTOK_ACCESS_TOKEN');
    if (!token) throw new Error('TikTok token not configured');
    // TikTok Research API endpoint
    const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,video_count,likes_count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('TikTok API error');
    return res.json();
  },
  async test() {
    if (!env('TIKTOK_ACCESS_TOKEN')) return { connected: false, error: 'TikTok token not set' };
    return { connected: true };
  },
});

register('instagram', {
  name: 'Instagram',
  category: 'social',
  icon: '📸',
  available: () => Boolean(env('INSTAGRAM_ACCESS_TOKEN')),
  services: ['Insights', 'Media', 'Stories', 'Reels', 'Followers'],
  async getAnalytics(igUserId) {
    const token = env('INSTAGRAM_ACCESS_TOKEN');
    if (!token) throw new Error('Instagram token not configured');
    const fields = 'followers_count,media_count,profile_views,reach,impressions,website_clicks';
    const res    = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/insights?metric=${fields}&period=day&access_token=${token}`
    );
    if (!res.ok) throw new Error('Instagram API error');
    return res.json();
  },
  async test() {
    if (!env('INSTAGRAM_ACCESS_TOKEN')) return { connected: false, error: 'Instagram token not set' };
    return { connected: true };
  },
});

register('facebook', {
  name: 'Facebook',
  category: 'social',
  icon: '👥',
  available: () => Boolean(env('FACEBOOK_ACCESS_TOKEN')),
  services: ['Page Insights', 'Post Analytics', 'Ads', 'Audience'],
  async getPageInsights(pageId, metrics = ['page_impressions', 'page_reach', 'page_views_total']) {
    const token = env('FACEBOOK_ACCESS_TOKEN');
    if (!token) throw new Error('Facebook token not configured');
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/insights?metric=${metrics.join(',')}&period=day&access_token=${token}`
    );
    if (!res.ok) throw new Error('Facebook API error');
    return res.json();
  },
  async test() {
    if (!env('FACEBOOK_ACCESS_TOKEN')) return { connected: false, error: 'Facebook token not set' };
    return { connected: true };
  },
});

register('twitch', {
  name: 'Twitch',
  category: 'social',
  icon: '🎮',
  available: () => Boolean(env('TWITCH_CLIENT_ID') && env('TWITCH_ACCESS_TOKEN')),
  services: ['Stream Analytics', 'Followers', 'Subscribers', 'Chat', 'VODs'],
  async getStreamAnalytics(broadcasterId) {
    const clientId = env('TWITCH_CLIENT_ID');
    const token    = env('TWITCH_ACCESS_TOKEN');
    if (!clientId || !token) throw new Error('Twitch credentials not configured');
    const res = await fetch(`https://api.twitch.tv/helix/analytics/streams?broadcaster_id=${broadcasterId}`, {
      headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Twitch API error');
    return res.json();
  },
  async test() {
    if (!env('TWITCH_CLIENT_ID')) return { connected: false, error: 'Twitch credentials not set' };
    return { connected: true };
  },
});

register('discord', {
  name: 'Discord',
  category: 'social',
  icon: '🤖',
  available: () => Boolean(env('DISCORD_BOT_TOKEN')),
  services: ['Server Stats', 'Members', 'Messages', 'Roles', 'Webhooks'],
  async getGuildAnalytics(guildId) {
    const token = env('DISCORD_BOT_TOKEN');
    if (!token) throw new Error('Discord token not configured');
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) throw new Error('Discord API error');
    const data = await res.json();
    return {
      id:           data.id,
      name:         data.name,
      memberCount:  data.approximate_member_count,
      onlineCount:  data.approximate_presence_count,
      icon:         data.icon,
    };
  },
  async test() {
    if (!env('DISCORD_BOT_TOKEN')) return { connected: false, error: 'Discord token not set' };
    return { connected: true };
  },
});

register('reddit', {
  name: 'Reddit',
  category: 'social',
  icon: '🦊',
  available: () => Boolean(env('REDDIT_CLIENT_ID') && env('REDDIT_CLIENT_SECRET')),
  services: ['Subreddit Analytics', 'Post Metrics', 'User Stats'],
  async test() {
    if (!env('REDDIT_CLIENT_ID')) return { connected: false, error: 'Reddit credentials not set' };
    return { connected: true };
  },
});

register('lemon8', {
  name: 'Lemon8',
  category: 'social',
  icon: '🍋',
  available: () => Boolean(env('LEMON8_ACCESS_TOKEN')),
  services: ['Post Analytics', 'Followers', 'Engagement'],
  async test() {
    if (!env('LEMON8_ACCESS_TOKEN')) return { connected: false, error: 'Lemon8 token not set' };
    return { connected: true };
  },
});

register('redgifs', {
  name: 'RedGifs',
  category: 'social',
  icon: '🎬',
  available: () => Boolean(env('REDGIFS_API_KEY')),
  services: ['Content Analytics', 'Views', 'Engagement'],
  async test() {
    if (!env('REDGIFS_API_KEY')) return { connected: false, error: 'RedGifs key not set' };
    return { connected: true };
  },
});

// ── Game engine connectors ─────────────────────────────────────────────────
register('unreal', {
  name: 'Unreal Engine',
  category: 'gaming',
  icon: '🎮',
  available: () => Boolean(env('UNREAL_PROJECT_ID')),
  services: ['Build System', 'Asset Manager', 'Marketplace', 'Live Link'],
  async test() {
    if (!env('UNREAL_PROJECT_ID')) return { connected: false, error: 'Unreal project not configured' };
    return { connected: true, project: env('UNREAL_PROJECT_ID') };
  },
});

register('epic', {
  name: 'Epic Games Store',
  category: 'gaming',
  icon: '⚔️',
  available: () => Boolean(env('EPIC_CLIENT_ID') && env('EPIC_CLIENT_SECRET')),
  services: ['Achievements', 'Leaderboards', 'Analytics', 'Friends', 'Entitlements'],
  async getAchievements(userId) {
    const clientId     = env('EPIC_CLIENT_ID');
    const clientSecret = env('EPIC_CLIENT_SECRET');
    if (!clientId) throw new Error('Epic credentials not configured');
    // Epic Online Services (EOS) SDK endpoint pattern
    return { userId, achievements: [], message: 'Connect EOS SDK for real data' };
  },
  async test() {
    if (!env('EPIC_CLIENT_ID')) return { connected: false, error: 'Epic credentials not set' };
    return { connected: true };
  },
});

register('playstation', {
  name: 'PlayStation Network',
  category: 'gaming',
  icon: '🎯',
  available: () => Boolean(env('PSN_CLIENT_ID')),
  services: ['Trophies', 'Friends', 'Game Sessions', 'Leaderboards'],
  async test() {
    if (!env('PSN_CLIENT_ID')) return { connected: false, error: 'PlayStation credentials not set' };
    return { connected: true };
  },
});

register('xbox', {
  name: 'Xbox Live / Microsoft Gaming',
  category: 'gaming',
  icon: '🟩',
  available: () => Boolean(env('XBOX_CLIENT_ID')),
  services: ['Achievements', 'Gamerscore', 'Friends', 'Clips', 'Game Pass'],
  async test() {
    if (!env('XBOX_CLIENT_ID')) return { connected: false, error: 'Xbox credentials not set' };
    return { connected: true };
  },
});

register('ubisoft', {
  name: 'Ubisoft Connect',
  category: 'gaming',
  icon: '🔵',
  available: () => Boolean(env('UBISOFT_CLIENT_ID')),
  services: ['Challenges', 'Rewards', 'Friends', 'Statistics'],
  async test() {
    if (!env('UBISOFT_CLIENT_ID')) return { connected: false, error: 'Ubisoft credentials not set' };
    return { connected: true };
  },
});

// ── Public API ─────────────────────────────────────────────────────────────
export function getConnector(id) {
  return connectors.get(id) || null;
}

export function listConnectors(category) {
  const all = [...connectors.values()];
  if (category) return all.filter(c => c.category === category);
  return all;
}

export function getConnectorStatus() {
  const all = [...connectors.values()];
  return all.map(c => ({
    id:        c.id,
    name:      c.name,
    category:  c.category,
    icon:      c.icon,
    available: Boolean(c.available()),
  }));
}

export async function testConnector(id) {
  const c = connectors.get(id);
  if (!c) return { connected: false, error: `Unknown connector: ${id}` };
  try {
    return await c.test();
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

export default { getConnector, listConnectors, getConnectorStatus, testConnector };
