// src/analytics/SocialAnalyticsService.js
// Nexus AI Pro — Social Media Analytics Service
// Updated: 2026-08-05
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord,
//            Lemon8, Reddit, RedGIFs
// Provides: views, likes, reach, retention, engagement, real-time metrics.
// NO hardcoded tokens — all keys read from process.env.

import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// PLATFORM REGISTRY
// ---------------------------------------------------------------------------
export const SocialPlatform = Object.freeze({
  TIKTOK:    'TIKTOK',
  INSTAGRAM: 'INSTAGRAM',
  FACEBOOK:  'FACEBOOK',
  TWITCH:    'TWITCH',
  DISCORD:   'DISCORD',
  LEMON8:    'LEMON8',
  REDDIT:    'REDDIT',
  REDGIFS:   'REDGIFS',
});

// ---------------------------------------------------------------------------
// METRIC ENUM
// ---------------------------------------------------------------------------
export const MetricType = Object.freeze({
  VIEWS:       'VIEWS',
  LIKES:       'LIKES',
  REACH:       'REACH',
  IMPRESSIONS: 'IMPRESSIONS',
  ENGAGEMENT:  'ENGAGEMENT',
  FOLLOWERS:   'FOLLOWERS',
  SHARES:      'SHARES',
  COMMENTS:    'COMMENTS',
  RETENTION:   'RETENTION',   // Average view retention %
  WATCH_TIME:  'WATCH_TIME',  // Seconds
  CLICK_RATE:  'CLICK_RATE',
  LIVE_VIEWERS:'LIVE_VIEWERS',
});

// ---------------------------------------------------------------------------
// BASE PLATFORM ADAPTER
// ---------------------------------------------------------------------------
class PlatformAdapter {
  constructor(platform, accessTokenEnvKey) {
    this.platform         = platform;
    this._accessTokenKey  = accessTokenEnvKey;
  }

  get accessToken() {
    const token = process.env[this._accessTokenKey];
    if (!token) throw new Error(`${this._accessTokenKey} environment variable not set.`);
    return token;
  }

  async _fetchJson(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`${this.platform} API error ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  /** Override in each adapter */
  async fetchAccountMetrics(_accountId) { throw new Error('Not implemented'); }
  async fetchPostMetrics(_postId)       { throw new Error('Not implemented'); }
  async fetchAudienceInsights(_accountId) { throw new Error('Not implemented'); }
}

// ---------------------------------------------------------------------------
// TIKTOK ADAPTER
// ---------------------------------------------------------------------------
class TikTokAdapter extends PlatformAdapter {
  constructor() { super(SocialPlatform.TIKTOK, 'TIKTOK_ACCESS_TOKEN'); }

  async fetchAccountMetrics(accountId) {
    const data = await this._fetchJson(
      `https://open.tiktokapis.com/v2/video/list/?fields=id,title,view_count,like_count,comment_count,share_count,play_count`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    return this._normalizeAccount(data, accountId);
  }

  async fetchPostMetrics(videoId) {
    const data = await this._fetchJson(
      `https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,share_count,comment_count,average_time_watched,full_video_watched_rate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: JSON.stringify({ filters: { video_ids: [videoId] } }),
      }
    );
    return this._normalizePost(data?.data?.videos?.[0] ?? {});
  }

  _normalizeAccount(data, accountId) {
    const videos = data?.data?.videos ?? [];
    return {
      platform: this.platform,
      accountId,
      totalViews:    videos.reduce((s, v) => s + (v.view_count  ?? 0), 0),
      totalLikes:    videos.reduce((s, v) => s + (v.like_count  ?? 0), 0),
      totalShares:   videos.reduce((s, v) => s + (v.share_count ?? 0), 0),
      totalComments: videos.reduce((s, v) => s + (v.comment_count ?? 0), 0),
      postCount:     videos.length,
      fetchedAt:     new Date().toISOString(),
    };
  }

  _normalizePost(v) {
    return {
      platform:        this.platform,
      postId:          v.id,
      views:           v.view_count           ?? 0,
      likes:           v.like_count           ?? 0,
      shares:          v.share_count          ?? 0,
      comments:        v.comment_count        ?? 0,
      retentionPct:    (v.full_video_watched_rate ?? 0) * 100,
      avgWatchSec:     v.average_time_watched  ?? 0,
      fetchedAt:       new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// INSTAGRAM ADAPTER (Graph API)
// ---------------------------------------------------------------------------
class InstagramAdapter extends PlatformAdapter {
  constructor() { super(SocialPlatform.INSTAGRAM, 'INSTAGRAM_ACCESS_TOKEN'); }

  async fetchAccountMetrics(igUserId) {
    const fields = 'followers_count,media_count,profile_views,reach,impressions';
    const data   = await this._fetchJson(
      `https://graph.instagram.com/${igUserId}/insights?metric=${fields}&period=lifetime&access_token=${this.accessToken}`
    );
    return this._normalize(data, igUserId);
  }

  async fetchPostMetrics(mediaId) {
    const fields = 'impressions,reach,likes_count,comments_count,shares,saved,video_views';
    const data   = await this._fetchJson(
      `https://graph.instagram.com/${mediaId}/insights?metric=${fields}&access_token=${this.accessToken}`
    );
    return this._normalizePost(data, mediaId);
  }

  _normalize(data, accountId) {
    const metrics = {};
    for (const item of data?.data ?? []) metrics[item.name] = item.values?.[0]?.value ?? 0;
    return {
      platform:   this.platform,
      accountId,
      reach:      metrics.reach       ?? 0,
      impressions:metrics.impressions ?? 0,
      followers:  metrics.followers_count ?? 0,
      mediaCount: metrics.media_count ?? 0,
      profileViews: metrics.profile_views ?? 0,
      fetchedAt:  new Date().toISOString(),
    };
  }

  _normalizePost(data, postId) {
    const metrics = {};
    for (const item of data?.data ?? []) metrics[item.name] = item.values?.[0]?.value ?? 0;
    return {
      platform:    this.platform,
      postId,
      impressions: metrics.impressions  ?? 0,
      reach:       metrics.reach        ?? 0,
      likes:       metrics.likes_count  ?? 0,
      comments:    metrics.comments_count ?? 0,
      shares:      metrics.shares       ?? 0,
      saved:       metrics.saved        ?? 0,
      videoViews:  metrics.video_views  ?? 0,
      fetchedAt:   new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// FACEBOOK ADAPTER (Graph API)
// ---------------------------------------------------------------------------
class FacebookAdapter extends PlatformAdapter {
  constructor() { super(SocialPlatform.FACEBOOK, 'FACEBOOK_ACCESS_TOKEN'); }

  async fetchAccountMetrics(pageId) {
    const fields = 'fan_count,followers_count';
    const page   = await this._fetchJson(
      `https://graph.facebook.com/v20.0/${pageId}?fields=${fields}&access_token=${this.accessToken}`
    );
    const insights = await this._fetchJson(
      `https://graph.facebook.com/v20.0/${pageId}/insights?metric=page_impressions,page_reach,page_views_total&period=week&access_token=${this.accessToken}`
    );
    return this._normalize(page, insights, pageId);
  }

  _normalize(page, insights, pageId) {
    const metrics = {};
    for (const item of insights?.data ?? []) {
      metrics[item.name] = item.values?.[item.values.length - 1]?.value ?? 0;
    }
    return {
      platform:    this.platform,
      accountId:   pageId,
      fans:        page.fan_count       ?? 0,
      followers:   page.followers_count ?? 0,
      reach:       metrics.page_reach   ?? 0,
      impressions: metrics.page_impressions ?? 0,
      pageViews:   metrics.page_views_total ?? 0,
      fetchedAt:   new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// TWITCH ADAPTER (Helix API)
// ---------------------------------------------------------------------------
class TwitchAdapter extends PlatformAdapter {
  constructor() { super(SocialPlatform.TWITCH, 'TWITCH_ACCESS_TOKEN'); }

  get clientId() {
    const id = process.env.TWITCH_CLIENT_ID;
    if (!id) throw new Error('TWITCH_CLIENT_ID environment variable not set.');
    return id;
  }

  async fetchAccountMetrics(broadcasterId) {
    const [channel, stream, followers] = await Promise.all([
      this._fetchJson(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, this._headers()),
      this._fetchJson(`https://api.twitch.tv/helix/streams?user_id=${broadcasterId}`, this._headers()),
      this._fetchJson(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}`, this._headers()),
    ]);
    return {
      platform:      this.platform,
      accountId:     broadcasterId,
      displayName:   channel?.data?.[0]?.broadcaster_name ?? '',
      liveViewers:   stream?.data?.[0]?.viewer_count ?? 0,
      isLive:        (stream?.data?.length ?? 0) > 0,
      followers:     followers?.total ?? 0,
      game:          channel?.data?.[0]?.game_name ?? '',
      fetchedAt:     new Date().toISOString(),
    };
  }

  _headers() {
    return { headers: { Authorization: `Bearer ${this.accessToken}`, 'Client-Id': this.clientId } };
  }
}

// ---------------------------------------------------------------------------
// DISCORD ADAPTER (Bot API)
// ---------------------------------------------------------------------------
class DiscordAdapter extends PlatformAdapter {
  constructor() { super(SocialPlatform.DISCORD, 'DISCORD_BOT_TOKEN'); }

  async fetchAccountMetrics(guildId) {
    const guild = await this._fetchJson(
      `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
      { headers: { Authorization: `Bot ${this.accessToken}` } }
    );
    return {
      platform:       this.platform,
      accountId:      guildId,
      name:           guild.name                    ?? '',
      memberCount:    guild.approximate_member_count ?? 0,
      onlineCount:    guild.approximate_presence_count ?? 0,
      fetchedAt:      new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// REDDIT ADAPTER
// ---------------------------------------------------------------------------
class RedditAdapter extends PlatformAdapter {
  constructor() { super(SocialPlatform.REDDIT, 'REDDIT_ACCESS_TOKEN'); }

  async fetchAccountMetrics(subredditName) {
    const data = await this._fetchJson(
      `https://oauth.reddit.com/r/${subredditName}/about`,
      { headers: { Authorization: `Bearer ${this.accessToken}`, 'User-Agent': 'NexusAIPro/2.0' } }
    );
    const s = data?.data ?? {};
    return {
      platform:     this.platform,
      accountId:    subredditName,
      subscribers:  s.subscribers    ?? 0,
      activeUsers:  s.accounts_active ?? 0,
      title:        s.title           ?? subredditName,
      fetchedAt:    new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// LEMON8 ADAPTER (placeholder — no public API; web scrape fallback)
// ---------------------------------------------------------------------------
class Lemon8Adapter extends PlatformAdapter {
  constructor() { super(SocialPlatform.LEMON8, 'LEMON8_ACCESS_TOKEN'); }

  async fetchAccountMetrics(accountId) {
    // Lemon8 has no public API; returns placeholder until official API is available
    return {
      platform:   this.platform,
      accountId,
      note:       'Lemon8 public API not yet available — connect via official partner program.',
      fetchedAt:  new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// REDGIFS ADAPTER
// ---------------------------------------------------------------------------
class RedGifsAdapter extends PlatformAdapter {
  constructor() { super(SocialPlatform.REDGIFS, 'REDGIFS_ACCESS_TOKEN'); }

  async fetchPostMetrics(gifId) {
    const data = await this._fetchJson(
      `https://api.redgifs.com/v2/gifs/${gifId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    const g = data?.gif ?? {};
    return {
      platform:  this.platform,
      postId:    gifId,
      views:     g.views  ?? 0,
      likes:     g.likes  ?? 0,
      fetchedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// ANALYTICS AGGREGATOR
// ---------------------------------------------------------------------------
export class SocialAnalyticsService {
  constructor(redisClient = null) {
    this.redis    = redisClient;
    this._adapters = {
      [SocialPlatform.TIKTOK]:    new TikTokAdapter(),
      [SocialPlatform.INSTAGRAM]: new InstagramAdapter(),
      [SocialPlatform.FACEBOOK]:  new FacebookAdapter(),
      [SocialPlatform.TWITCH]:    new TwitchAdapter(),
      [SocialPlatform.DISCORD]:   new DiscordAdapter(),
      [SocialPlatform.REDDIT]:    new RedditAdapter(),
      [SocialPlatform.LEMON8]:    new Lemon8Adapter(),
      [SocialPlatform.REDGIFS]:   new RedGifsAdapter(),
    };
    this._cache    = new Map();  // Fallback in-memory cache
    this._CACHE_TTL = 300;       // 5 min
  }

  /** Fetch metrics for one platform account */
  async getAccountMetrics(platform, accountId) {
    const cacheKey = `analytics:account:${platform}:${accountId}`;
    const cached   = await this._getCache(cacheKey);
    if (cached) return cached;

    const adapter = this._adapters[platform];
    if (!adapter) throw new Error(`Unsupported platform: ${platform}`);

    const metrics = await adapter.fetchAccountMetrics(accountId);
    await this._setCache(cacheKey, metrics, this._CACHE_TTL);
    return metrics;
  }

  /** Fetch post-level metrics */
  async getPostMetrics(platform, postId) {
    const cacheKey = `analytics:post:${platform}:${postId}`;
    const cached   = await this._getCache(cacheKey);
    if (cached) return cached;

    const adapter = this._adapters[platform];
    if (!adapter) throw new Error(`Unsupported platform: ${platform}`);

    const metrics = await adapter.fetchPostMetrics(postId);
    await this._setCache(cacheKey, metrics, this._CACHE_TTL);
    return metrics;
  }

  /** Fetch all connected platforms in parallel */
  async getDashboardSummary(accounts) {
    // accounts = [{ platform, accountId }]
    const results = await Promise.allSettled(
      accounts.map(({ platform, accountId }) => this.getAccountMetrics(platform, accountId))
    );

    const successful = [];
    const failed     = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        successful.push(r.value);
      } else {
        failed.push({ ...accounts[i], error: r.reason?.message });
      }
    });

    return {
      platforms: successful,
      errors:    failed,
      fetchedAt: new Date().toISOString(),
      // Aggregate totals across platforms
      totals: {
        views:     successful.reduce((s, p) => s + (p.totalViews   ?? p.views   ?? 0), 0),
        likes:     successful.reduce((s, p) => s + (p.totalLikes   ?? p.likes   ?? 0), 0),
        followers: successful.reduce((s, p) => s + (p.followers    ?? 0), 0),
        reach:     successful.reduce((s, p) => s + (p.reach        ?? 0), 0),
      },
    };
  }

  // Cache helpers
  async _getCache(key) {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? JSON.parse(raw) : null;
    }
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.exp) { this._cache.delete(key); return null; }
    return entry.value;
  }

  async _setCache(key, value, ttlSec) {
    if (this.redis) {
      await this.redis.setex(key, ttlSec, JSON.stringify(value));
    } else {
      this._cache.set(key, { value, exp: Date.now() + ttlSec * 1000 });
    }
  }
}
