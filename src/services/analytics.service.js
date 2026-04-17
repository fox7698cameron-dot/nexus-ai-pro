// nexus-ai-pro/src/services/analytics.service.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Social analytics aggregator: TikTok, Instagram, Facebook, Twitch, Discord,
// Lemon8, Reddit, RedGifs — OAuth tokens stored encrypted, never hardcoded

const PLATFORM_CONFIGS = {
  tiktok: {
    label: 'TikTok',
    baseUrl: 'https://open.tiktokapis.com/v2',
    scopes: ['user.info.basic', 'video.list', 'video.insights'],
    icon: '🎵',
  },
  instagram: {
    label: 'Instagram',
    baseUrl: 'https://graph.instagram.com/v21.0',
    scopes: ['instagram_basic', 'instagram_manage_insights'],
    icon: '📷',
  },
  facebook: {
    label: 'Facebook',
    baseUrl: 'https://graph.facebook.com/v21.0',
    scopes: ['pages_read_engagement', 'read_insights'],
    icon: '👥',
  },
  twitch: {
    label: 'Twitch',
    baseUrl: 'https://api.twitch.tv/helix',
    scopes: ['channel:read:subscriptions', 'analytics:read:games'],
    icon: '🎮',
  },
  discord: {
    label: 'Discord',
    baseUrl: 'https://discord.com/api/v10',
    scopes: ['guilds', 'guilds.members.read'],
    icon: '💬',
  },
  lemon8: {
    label: 'Lemon8',
    baseUrl: 'https://api.lemon8-app.com/v1',
    scopes: ['profile', 'posts'],
    icon: '🍋',
  },
  reddit: {
    label: 'Reddit',
    baseUrl: 'https://oauth.reddit.com',
    scopes: ['identity', 'read', 'history'],
    icon: '🤖',
  },
  redgifs: {
    label: 'RedGifs',
    baseUrl: 'https://api.redgifs.com/v2',
    scopes: ['read'],
    icon: '🎬',
  },
};

function getPlatformConfig(platform) {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) throw new Error(`Unsupported platform: ${platform}`);
  return config;
}

function getClientEnv(platform) {
  const upper = platform.toUpperCase();
  const id = process.env[`${upper}_CLIENT_ID`];
  const secret = process.env[`${upper}_CLIENT_SECRET`];
  if (!id || !secret) throw new Error(`${upper}_CLIENT_ID and ${upper}_CLIENT_SECRET env vars required`);
  return { id, secret };
}

// ── OAuth helpers ─────────────────────────────────────────────
export function getOAuthRedirectUrl(platform, redirectUri, state) {
  const { baseUrl, scopes } = getPlatformConfig(platform);
  const { id } = getClientEnv(platform);

  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    response_type: 'code',
    state,
  });

  // Each platform has a slightly different auth endpoint
  const authUrls = {
    tiktok:    'https://www.tiktok.com/v2/auth/authorize',
    instagram: 'https://api.instagram.com/oauth/authorize',
    facebook:  'https://www.facebook.com/v21.0/dialog/oauth',
    twitch:    'https://id.twitch.tv/oauth2/authorize',
    discord:   'https://discord.com/api/oauth2/authorize',
    lemon8:    'https://account.lemon8-app.com/oauth/authorize',
    reddit:    'https://www.reddit.com/api/v1/authorize',
    redgifs:   'https://auth.redgifs.com/oauth/authorize',
  };

  return `${authUrls[platform]}?${params}`;
}

// ── Fetch helpers (raw platform API, tokens decrypted at route layer) ──
async function platformGet(platform, endpoint, accessToken, extraHeaders = {}) {
  const { baseUrl } = getPlatformConfig(platform);
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...extraHeaders };

  if (platform === 'twitch') {
    const { id } = getClientEnv('twitch');
    headers['Client-Id'] = id;
  }

  const res = await fetch(`${baseUrl}${endpoint}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${platform} API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── Metric fetchers per platform ──────────────────────────────
async function fetchTikTokMetrics(accessToken) {
  const profile = await platformGet('tiktok', '/user/info/', accessToken, {
    fields: 'follower_count,following_count,video_count,likes_count',
  });
  return {
    followers: profile.data?.user?.follower_count ?? 0,
    following: profile.data?.user?.following_count ?? 0,
    posts: profile.data?.user?.video_count ?? 0,
    likes: profile.data?.user?.likes_count ?? 0,
  };
}

async function fetchInstagramMetrics(accessToken) {
  const user = await platformGet('instagram', '/me', accessToken, {});
  const insights = await platformGet(
    'instagram',
    `/me/insights?metric=impressions,reach,profile_views&period=day`,
    accessToken
  );
  return {
    followers: user.followers_count ?? 0,
    reach: insights.data?.find(m => m.name === 'reach')?.values?.[0]?.value ?? 0,
    impressions: insights.data?.find(m => m.name === 'impressions')?.values?.[0]?.value ?? 0,
  };
}

async function fetchFacebookMetrics(accessToken, pageId) {
  const page = await platformGet('facebook', `/${pageId}?fields=fan_count,followers_count`, accessToken);
  const insights = await platformGet(
    'facebook',
    `/${pageId}/insights?metric=page_impressions,page_reach,page_views_total&period=day`,
    accessToken
  );
  return {
    followers: page.followers_count ?? 0,
    fans: page.fan_count ?? 0,
    impressions: insights.data?.[0]?.values?.[0]?.value ?? 0,
    reach: insights.data?.[1]?.values?.[0]?.value ?? 0,
  };
}

async function fetchTwitchMetrics(accessToken, broadcasterId) {
  const channel = await platformGet('twitch', `/channels?broadcaster_id=${broadcasterId}`, accessToken);
  const followers = await platformGet('twitch', `/channels/followers?broadcaster_id=${broadcasterId}`, accessToken);
  const stream = await platformGet('twitch', `/streams?user_id=${broadcasterId}`, accessToken);
  return {
    followers: followers.total ?? 0,
    views: channel.data?.[0]?.view_count ?? 0,
    isLive: stream.data?.length > 0,
    currentViewers: stream.data?.[0]?.viewer_count ?? 0,
    gameName: stream.data?.[0]?.game_name ?? null,
  };
}

async function fetchDiscordMetrics(accessToken, guildId) {
  const guild = await platformGet('discord', `/guilds/${guildId}?with_counts=true`, accessToken);
  return {
    members: guild.member_count ?? 0,
    onlineMembers: guild.approximate_presence_count ?? 0,
    name: guild.name,
  };
}

async function fetchRedditMetrics(accessToken, subreddit) {
  const about = await platformGet('reddit', `/r/${subreddit}/about`, accessToken, {
    'User-Agent': 'NexusAIPro/2.1.0',
  });
  return {
    subscribers: about.data?.subscribers ?? 0,
    activeUsers: about.data?.active_user_count ?? 0,
    posts: about.data?.public_traffic ?? 0,
  };
}

// ── Unified aggregator ────────────────────────────────────────
export async function fetchPlatformMetrics(platform, accessToken, extra = {}) {
  switch (platform) {
    case 'tiktok':    return fetchTikTokMetrics(accessToken);
    case 'instagram': return fetchInstagramMetrics(accessToken);
    case 'facebook':  return fetchFacebookMetrics(accessToken, extra.pageId);
    case 'twitch':    return fetchTwitchMetrics(accessToken, extra.broadcasterId);
    case 'discord':   return fetchDiscordMetrics(accessToken, extra.guildId);
    case 'reddit':    return fetchRedditMetrics(accessToken, extra.subreddit);
    case 'lemon8':
    case 'redgifs':
      return { note: `${platform} — real-time API in beta; polling interval 6h` };
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

// ── Engagement rate ───────────────────────────────────────────
export function calcEngagementRate({ likes = 0, comments = 0, shares = 0, followers = 1 }) {
  if (followers <= 0) return 0;
  return Number(((likes + comments + shares) / followers * 100).toFixed(4));
}

// ── Retention curve helper ────────────────────────────────────
export function buildRetentionCurve(viewData) {
  // viewData: array of { second, viewers } from platform insight API
  if (!Array.isArray(viewData) || viewData.length === 0) return [];
  const maxViewers = viewData[0]?.viewers ?? 1;
  return viewData.map(({ second, viewers }) => ({
    second,
    viewers,
    pct: Number((viewers / maxViewers * 100).toFixed(2)),
  }));
}

export const PLATFORM_CONFIGS_PUBLIC = Object.fromEntries(
  Object.entries(PLATFORM_CONFIGS).map(([k, v]) => [k, { label: v.label, icon: v.icon, scopes: v.scopes }])
);
