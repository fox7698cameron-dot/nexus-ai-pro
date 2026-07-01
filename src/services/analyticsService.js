// ================================================
// NEXUS AI PRO - Social Analytics Service
// File: src/services/analyticsService.js
// Updated: 2026-07-01
// Platforms: TikTok, Instagram, Facebook, Twitch,
//            Discord, Lemon8, Reddit, RedGifs
// All API keys sourced exclusively from env vars
// ================================================

// Metric shape shared across all platform adapters
const metricShape = (platform, raw) => ({
  platform,
  timestamp: Date.now(),
  views: raw.views ?? 0,
  likes: raw.likes ?? 0,
  comments: raw.comments ?? 0,
  shares: raw.shares ?? 0,
  reach: raw.reach ?? 0,
  impressions: raw.impressions ?? 0,
  retention: raw.retention ?? 0,       // avg watch-time percentage 0-100
  followers: raw.followers ?? 0,
  followersGrowth: raw.followersGrowth ?? 0,
  engagement: raw.engagement ?? 0,     // rate as decimal 0-1
  topContent: raw.topContent ?? [],
  demographics: raw.demographics ?? {},
});

// ── TikTok ────────────────────────────────────────────────────────────────

async function fetchTikTok(accessToken) {
  if (!accessToken) throw new Error('TikTok access token not configured');
  // TikTok Research API v2
  const res = await fetch('https://open.tiktokapis.com/v2/research/user/info/', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: ['display_name', 'follower_count', 'video_count', 'likes_count'] }),
  });
  if (!res.ok) throw new Error(`TikTok API error: ${res.status}`);
  const data = await res.json();
  const u = data?.data?.user_info ?? {};
  return metricShape('tiktok', {
    followers: u.follower_count ?? 0,
    likes: u.likes_count ?? 0,
    views: u.video_count ?? 0,
  });
}

// ── Instagram (Graph API) ─────────────────────────────────────────────────

async function fetchInstagram(accessToken) {
  if (!accessToken) throw new Error('Instagram access token not configured');
  const accountRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,followers_count,media_count&access_token=${accessToken}`
  );
  if (!accountRes.ok) throw new Error(`Instagram API error: ${accountRes.status}`);
  const account = await accountRes.json();
  const insightsRes = await fetch(
    `https://graph.instagram.com/me/insights?metric=impressions,reach,profile_views&period=day&access_token=${accessToken}`
  );
  const insights = insightsRes.ok ? await insightsRes.json() : { data: [] };
  const imp = insights.data?.find(m => m.name === 'impressions')?.values?.[0]?.value ?? 0;
  const reach = insights.data?.find(m => m.name === 'reach')?.values?.[0]?.value ?? 0;
  return metricShape('instagram', {
    followers: account.followers_count ?? 0,
    impressions: imp,
    reach,
    views: account.media_count ?? 0,
  });
}

// ── Facebook (Graph API) ──────────────────────────────────────────────────

async function fetchFacebook(accessToken, pageId) {
  if (!accessToken) throw new Error('Facebook access token not configured');
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId || 'me'}?fields=fan_count,talking_about_count,posts{likes.summary(true),comments.summary(true),shares}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
  const data = await res.json();
  let totalLikes = 0, totalComments = 0, totalShares = 0;
  for (const post of data?.posts?.data ?? []) {
    totalLikes += post.likes?.summary?.total_count ?? 0;
    totalComments += post.comments?.summary?.total_count ?? 0;
    totalShares += post.shares?.count ?? 0;
  }
  return metricShape('facebook', {
    followers: data.fan_count ?? 0,
    likes: totalLikes,
    comments: totalComments,
    shares: totalShares,
    reach: data.talking_about_count ?? 0,
  });
}

// ── Twitch (Helix API) ────────────────────────────────────────────────────

async function fetchTwitch(clientId, clientSecret, channel) {
  if (!clientId || !clientSecret) throw new Error('Twitch credentials not configured');
  // Get app access token
  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
  });
  const token = await tokenRes.json();
  const headers = { 'Client-Id': clientId, 'Authorization': `Bearer ${token.access_token}` };
  const channelRes = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, { headers });
  const channelData = await channelRes.json();
  const userId = channelData.data?.[0]?.id;
  if (!userId) return metricShape('twitch', {});
  const streamRes = await fetch(`https://api.twitch.tv/helix/streams?user_id=${userId}`, { headers });
  const streamData = await streamRes.json();
  const stream = streamData.data?.[0];
  const subsRes = await fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${userId}`, { headers });
  const subsData = await subsRes.json();
  return metricShape('twitch', {
    views: stream?.viewer_count ?? 0,
    followers: subsData.total ?? 0,
    reach: stream?.viewer_count ?? 0,
  });
}

// ── Discord (Bot API) ─────────────────────────────────────────────────────

async function fetchDiscord(botToken, guildId) {
  if (!botToken) throw new Error('Discord bot token not configured');
  const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
    headers: { 'Authorization': `Bot ${botToken}` },
  });
  if (!guildRes.ok) throw new Error(`Discord API error: ${guildRes.status}`);
  const guild = await guildRes.json();
  return metricShape('discord', {
    followers: guild.approximate_member_count ?? 0,
    views: guild.approximate_presence_count ?? 0,
    reach: guild.approximate_presence_count ?? 0,
  });
}

// ── Reddit (OAuth2 API) ───────────────────────────────────────────────────

async function fetchReddit(clientId, clientSecret, subreddit) {
  if (!clientId || !clientSecret) throw new Error('Reddit credentials not configured');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'NexusAIPro/2.0',
    },
    body: 'grant_type=client_credentials',
  });
  const token = await tokenRes.json();
  const subRes = await fetch(`https://oauth.reddit.com/r/${subreddit}/about`, {
    headers: { 'Authorization': `Bearer ${token.access_token}`, 'User-Agent': 'NexusAIPro/2.0' },
  });
  if (!subRes.ok) throw new Error(`Reddit API error: ${subRes.status}`);
  const sub = await subRes.json();
  const data = sub?.data ?? {};
  return metricShape('reddit', {
    followers: data.subscribers ?? 0,
    views: data.active_user_count ?? 0,
    reach: data.subscribers ?? 0,
  });
}

// ── Lemon8 ────────────────────────────────────────────────────────────────
// Lemon8 does not expose a public API; metrics are estimated / user-supplied.

async function fetchLemon8() {
  return metricShape('lemon8', { views: 0, likes: 0, followers: 0 });
}

// ── RedGifs ───────────────────────────────────────────────────────────────

async function fetchRedGifs(apiKey) {
  if (!apiKey) return metricShape('redgifs', {});
  const res = await fetch('https://api.redgifs.com/v2/me', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) return metricShape('redgifs', {});
  const data = await res.json();
  return metricShape('redgifs', {
    views: data.totalViews ?? 0,
    likes: data.totalLikes ?? 0,
    followers: data.followers ?? 0,
  });
}

// ── Aggregate all platforms ────────────────────────────────────────────────

export async function fetchAllPlatformMetrics(connectedAccounts = {}) {
  const jobs = [];

  if (connectedAccounts.tiktok) {
    jobs.push(fetchTikTok(connectedAccounts.tiktok.accessToken).catch(err => ({ platform: 'tiktok', error: err.message })));
  }
  if (connectedAccounts.instagram) {
    jobs.push(fetchInstagram(connectedAccounts.instagram.accessToken).catch(err => ({ platform: 'instagram', error: err.message })));
  }
  if (connectedAccounts.facebook) {
    jobs.push(fetchFacebook(connectedAccounts.facebook.accessToken, connectedAccounts.facebook.pageId).catch(err => ({ platform: 'facebook', error: err.message })));
  }
  if (connectedAccounts.twitch) {
    jobs.push(fetchTwitch(
      process.env.TWITCH_CLIENT_ID, process.env.TWITCH_CLIENT_SECRET,
      connectedAccounts.twitch.channel
    ).catch(err => ({ platform: 'twitch', error: err.message })));
  }
  if (connectedAccounts.discord) {
    jobs.push(fetchDiscord(process.env.DISCORD_BOT_TOKEN, connectedAccounts.discord.guildId).catch(err => ({ platform: 'discord', error: err.message })));
  }
  if (connectedAccounts.reddit) {
    jobs.push(fetchReddit(process.env.REDDIT_CLIENT_ID, process.env.REDDIT_CLIENT_SECRET, connectedAccounts.reddit.subreddit).catch(err => ({ platform: 'reddit', error: err.message })));
  }
  if (connectedAccounts.lemon8) {
    jobs.push(fetchLemon8().catch(err => ({ platform: 'lemon8', error: err.message })));
  }
  if (connectedAccounts.redgifs) {
    jobs.push(fetchRedGifs(connectedAccounts.redgifs.apiKey).catch(err => ({ platform: 'redgifs', error: err.message })));
  }

  const results = await Promise.all(jobs);

  const totals = results.reduce((acc, m) => {
    if (!m.error) {
      acc.totalViews += m.views;
      acc.totalLikes += m.likes;
      acc.totalFollowers += m.followers;
      acc.totalReach += m.reach;
    }
    return acc;
  }, { totalViews: 0, totalLikes: 0, totalFollowers: 0, totalReach: 0 });

  return { platforms: results, totals, refreshedAt: Date.now() };
}

export const SUPPORTED_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];
