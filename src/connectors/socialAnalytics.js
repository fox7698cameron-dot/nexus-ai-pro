// src/connectors/socialAnalytics.js
// Nexus AI Pro - Social Media Analytics Connectors
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

// Platform enumeration
export const SOCIAL_PLATFORM = Object.freeze({
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  DISCORD: 'discord',
  LEMON8: 'lemon8',
  REDDIT: 'reddit',
  REDGIFS: 'redgifs',
});

// Metric type enumeration
export const METRIC_TYPE = Object.freeze({
  LIKES: 'likes',
  VIEWS: 'views',
  REACH: 'reach',
  RETENTION: 'retention',
  FOLLOWERS: 'followers',
  COMMENTS: 'comments',
  SHARES: 'shares',
  IMPRESSIONS: 'impressions',
  ENGAGEMENT_RATE: 'engagement_rate',
  WATCH_TIME: 'watch_time',
  UNIQUE_VIEWERS: 'unique_viewers',
  CLICK_THROUGH: 'click_through_rate',
});

// ─── Base social connector ─────────────────────────────────────────────────────
class BaseSocialConnector {
  constructor(name) { this.name = name; }
  _requireToken(envKey) {
    const v = process.env[envKey];
    if (!v) throw new Error(`${this.name}: ${envKey} not configured`);
    return v;
  }
}

// ─── TikTok ────────────────────────────────────────────────────────────────────
export class TikTokConnector extends BaseSocialConnector {
  constructor() { super('TikTok'); }

  async getAccountMetrics(openId) {
    const token = this._requireToken('TIKTOK_ACCESS_TOKEN');
    const fields = 'followers_count,following_count,likes_count,video_count';
    const res = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    return { platform: SOCIAL_PLATFORM.TIKTOK, ...data };
  }

  async getVideoAnalytics(videoId) {
    const token = this._requireToken('TIKTOK_ACCESS_TOKEN');
    const fields = 'id,like_count,comment_count,share_count,view_count,play_url';
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/query/?fields=${fields}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: { video_ids: [videoId] } }),
      }
    );
    return res.json();
  }

  async getTopVideos() {
    const token = this._requireToken('TIKTOK_ACCESS_TOKEN');
    const fields = 'id,title,like_count,view_count,comment_count,share_count,create_time';
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_count: 20 }),
      }
    );
    return res.json();
  }
}

// ─── Instagram ─────────────────────────────────────────────────────────────────
export class InstagramConnector extends BaseSocialConnector {
  constructor() { super('Instagram'); }

  async getAccountInsights(igAccountId, period = 'day') {
    const token = this._requireToken('INSTAGRAM_ACCESS_TOKEN');
    const metrics = 'impressions,reach,profile_views,follower_count,email_contacts,get_directions_clicks';
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=${metrics}&period=${period}&access_token=${token}`
    );
    return res.json();
  }

  async getMediaMetrics(mediaId) {
    const token = this._requireToken('INSTAGRAM_ACCESS_TOKEN');
    const fields = 'id,like_count,comments_count,impressions,reach,saved,video_views,engagement';
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${fields}&access_token=${token}`
    );
    return res.json();
  }

  async getAudienceDemographics(igAccountId) {
    const token = this._requireToken('INSTAGRAM_ACCESS_TOKEN');
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=audience_city,audience_country,audience_gender_age&period=lifetime&access_token=${token}`
    );
    return res.json();
  }
}

// ─── Facebook ──────────────────────────────────────────────────────────────────
export class FacebookConnector extends BaseSocialConnector {
  constructor() { super('Facebook'); }

  async getPageInsights(pageId, period = 'week') {
    const token = this._requireToken('FACEBOOK_PAGE_TOKEN');
    const metrics = 'page_impressions,page_reach,page_fans,page_views_total,page_post_engagements,page_video_views';
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metrics}&period=${period}&access_token=${token}`
    );
    return res.json();
  }

  async getPostMetrics(postId) {
    const token = this._requireToken('FACEBOOK_PAGE_TOKEN');
    const fields = 'id,message,likes.summary(true),comments.summary(true),shares,reactions.summary(true)';
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${postId}?fields=${fields}&access_token=${token}`
    );
    return res.json();
  }
}

// ─── Twitch ────────────────────────────────────────────────────────────────────
export class TwitchConnector extends BaseSocialConnector {
  constructor() { super('Twitch'); }

  async _headers() {
    const token = this._requireToken('TWITCH_ACCESS_TOKEN');
    const clientId = this._requireToken('TWITCH_CLIENT_ID');
    return { Authorization: `Bearer ${token}`, 'Client-Id': clientId };
  }

  async getChannelInfo(broadcasterId) {
    const headers = await this._headers();
    const res = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`,
      { headers }
    );
    return res.json();
  }

  async getStreamAnalytics(extensionId) {
    const headers = await this._headers();
    const res = await fetch(
      `https://api.twitch.tv/helix/analytics/streams?started_at=2024-01-01T00:00:00Z`,
      { headers }
    );
    return res.json();
  }

  async getFollowers(broadcasterId) {
    const headers = await this._headers();
    const res = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}`,
      { headers }
    );
    return res.json();
  }

  async getSubscribers(broadcasterId) {
    const headers = await this._headers();
    const res = await fetch(
      `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}`,
      { headers }
    );
    return res.json();
  }

  async getStreamMetrics(broadcasterId) {
    const headers = await this._headers();
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${broadcasterId}`,
      { headers }
    );
    return res.json();
  }
}

// ─── Discord ───────────────────────────────────────────────────────────────────
export class DiscordConnector extends BaseSocialConnector {
  constructor() { super('Discord'); }

  async getGuildMetrics(guildId) {
    const token = this._requireToken('DISCORD_BOT_TOKEN');
    const [guild, invites] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
        headers: { Authorization: `Bot ${token}` },
      }).then(r => r.json()),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/invites`, {
        headers: { Authorization: `Bot ${token}` },
      }).then(r => r.json()),
    ]);
    return {
      platform: SOCIAL_PLATFORM.DISCORD,
      memberCount: guild.approximate_member_count,
      onlineCount: guild.approximate_presence_count,
      name: guild.name,
      inviteUsage: Array.isArray(invites) ? invites.reduce((sum, inv) => sum + (inv.uses || 0), 0) : 0,
    };
  }

  async sendNotification(channelId, message) {
    const token = this._requireToken('DISCORD_BOT_TOKEN');
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
    return res.json();
  }
}

// ─── Reddit ────────────────────────────────────────────────────────────────────
export class RedditConnector extends BaseSocialConnector {
  constructor() { super('Reddit'); }

  async _getToken() {
    const clientId = this._requireToken('REDDIT_CLIENT_ID');
    const clientSecret = this._requireToken('REDDIT_CLIENT_SECRET');
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NexusAIPro/1.0',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token;
  }

  async getSubredditStats(subreddit) {
    const token = await this._getToken();
    const res = await fetch(`https://oauth.reddit.com/r/${subreddit}/about`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/1.0' },
    });
    const data = await res.json();
    return { platform: SOCIAL_PLATFORM.REDDIT, subreddit, ...data.data };
  }

  async getUserMetrics(username) {
    const token = await this._getToken();
    const res = await fetch(`https://oauth.reddit.com/user/${username}/about`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/1.0' },
    });
    return res.json();
  }
}

// ─── Lemon8 ────────────────────────────────────────────────────────────────────
export class Lemon8Connector extends BaseSocialConnector {
  constructor() { super('Lemon8'); }

  // Lemon8 does not have a public API; returns placeholder data
  async getAccountMetrics(userId) {
    return {
      platform: SOCIAL_PLATFORM.LEMON8,
      message: 'Lemon8 does not have a public API. Connect via TikTok creator studio or manual entry.',
      userId,
      supported: false,
    };
  }
}

// ─── RedGIFs ───────────────────────────────────────────────────────────────────
export class RedGIFsConnector extends BaseSocialConnector {
  constructor() { super('RedGIFs'); }

  async getCreatorStats(username) {
    const res = await fetch(`https://api.redgifs.com/v2/users/${username}/search?order=trending&count=20`);
    const data = await res.json();
    return {
      platform: SOCIAL_PLATFORM.REDGIFS,
      username,
      totalViews: data.gifs?.reduce((sum, g) => sum + (g.views || 0), 0) || 0,
      totalLikes: data.gifs?.reduce((sum, g) => sum + (g.likes || 0), 0) || 0,
      gifCount: data.gifs?.length || 0,
    };
  }
}

// ─── Aggregator ────────────────────────────────────────────────────────────────
export class SocialAnalyticsAggregator {
  constructor() {
    this.connectors = {
      [SOCIAL_PLATFORM.TIKTOK]: new TikTokConnector(),
      [SOCIAL_PLATFORM.INSTAGRAM]: new InstagramConnector(),
      [SOCIAL_PLATFORM.FACEBOOK]: new FacebookConnector(),
      [SOCIAL_PLATFORM.TWITCH]: new TwitchConnector(),
      [SOCIAL_PLATFORM.DISCORD]: new DiscordConnector(),
      [SOCIAL_PLATFORM.LEMON8]: new Lemon8Connector(),
      [SOCIAL_PLATFORM.REDDIT]: new RedditConnector(),
      [SOCIAL_PLATFORM.REDGIFS]: new RedGIFsConnector(),
    };
  }

  getConnector(platform) {
    const c = this.connectors[platform];
    if (!c) throw new Error(`Unsupported platform: ${platform}`);
    return c;
  }

  // Fetch metrics for all configured platforms (skips unconfigured ones)
  async getAggregatedMetrics(platformConfigs) {
    const results = {};
    await Promise.allSettled(
      platformConfigs.map(async ({ platform, params }) => {
        const connector = this.getConnector(platform);
        try {
          results[platform] = { ok: true, data: await connector.getAccountMetrics?.(params) };
        } catch (err) {
          results[platform] = { ok: false, error: err.message };
        }
      })
    );
    return results;
  }
}
