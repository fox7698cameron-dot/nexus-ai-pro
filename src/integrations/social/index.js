// src/integrations/social/index.js
// Social platform connector factory — TikTok, Instagram, Facebook, Twitch,
// Discord, Lemon8, Reddit, RedGIFs, YouTube, Twitter
// All tokens stored encrypted; no plaintext secrets in memory longer than needed
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { encrypt, decrypt } from '../../services/crypto.service.js';

// Shared OAuth2 helper — no credentials hardcoded, all from env
async function oauthTokenExchange(tokenUrl, params, credentials) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (credentials) {
    headers.Authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
  }
  const res = await fetch(tokenUrl, { method: 'POST', headers, body: new URLSearchParams(params) });
  if (!res.ok) throw new Error(`OAuth exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ─── TikTok ────────────────────────────────────────────────────────────────
export class TikTokConnector {
  getAuthUrl(redirectUri, state) {
    const cid = process.env.TIKTOK_CLIENT_KEY;
    if (!cid) throw new Error('TIKTOK_CLIENT_KEY not configured');
    return `https://www.tiktok.com/auth/authorize/?client_key=${cid}&scope=user.info.basic,video.list,user.info.stats&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async exchangeCode(code, redirectUri) {
    const data = await oauthTokenExchange(
      'https://open.tiktokapis.com/v2/oauth/token/',
      { client_key: process.env.TIKTOK_CLIENT_KEY, client_secret: process.env.TIKTOK_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: redirectUri },
    );
    return { accessTokenEnc: encrypt(data.access_token), refreshTokenEnc: encrypt(data.refresh_token), openId: data.open_id, expiresIn: data.expires_in };
  }

  async getUserInfo(accessTokenEnc) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`TikTok user info failed: ${res.status}`);
    return res.json();
  }

  async getVideoList(accessTokenEnc, openId) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,create_time,share_count,view_count,like_count,comment_count', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_count: 20 }),
    });
    if (!res.ok) throw new Error(`TikTok video list failed: ${res.status}`);
    return res.json();
  }
}

// ─── Instagram / Meta ──────────────────────────────────────────────────────
export class InstagramConnector {
  getAuthUrl(redirectUri, state) {
    const appId = process.env.INSTAGRAM_APP_ID;
    if (!appId) throw new Error('INSTAGRAM_APP_ID not configured');
    return `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code&state=${state}`;
  }

  async exchangeCode(code, redirectUri) {
    const data = await oauthTokenExchange(
      'https://api.instagram.com/oauth/access_token',
      { client_id: process.env.INSTAGRAM_APP_ID, client_secret: process.env.INSTAGRAM_APP_SECRET, grant_type: 'authorization_code', redirect_uri: redirectUri, code },
    );
    const longRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${data.access_token}`);
    const long = await longRes.json();
    return { accessTokenEnc: encrypt(long.access_token ?? data.access_token), userId: data.user_id, tokenType: long.token_type };
  }

  async getInsights(accessTokenEnc, userId) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`https://graph.instagram.com/${userId}?fields=id,username,followers_count,media_count,account_type&access_token=${token}`);
    if (!res.ok) throw new Error(`Instagram insights failed: ${res.status}`);
    return res.json();
  }
}

// ─── Facebook ──────────────────────────────────────────────────────────────
export class FacebookConnector {
  getAuthUrl(redirectUri, state) {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) throw new Error('FACEBOOK_APP_ID not configured');
    const scopes = 'pages_show_list,pages_read_engagement,instagram_manage_insights,public_profile';
    return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}`;
  }

  async exchangeCode(code, redirectUri) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const res = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    if (!res.ok) throw new Error(`Facebook token exchange failed: ${res.status}`);
    const data = await res.json();
    return { accessTokenEnc: encrypt(data.access_token), expiresIn: data.expires_in };
  }

  async getPageInsights(accessTokenEnc, pageId) {
    const token = decrypt(accessTokenEnc);
    const metrics = 'page_impressions,page_reach,page_fans,page_video_views';
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/insights?metric=${metrics}&period=day&access_token=${token}`);
    if (!res.ok) throw new Error(`Facebook insights failed: ${res.status}`);
    return res.json();
  }
}

// ─── Twitch ────────────────────────────────────────────────────────────────
export class TwitchConnector {
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) throw new Error('TWITCH_CLIENT_ID not configured');
    return `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=analytics:read:games+channel:read:subscriptions+user:read:follows&state=${state}`;
  }

  async exchangeCode(code, redirectUri) {
    const data = await oauthTokenExchange(
      'https://id.twitch.tv/oauth2/token',
      { client_id: process.env.TWITCH_CLIENT_ID, client_secret: process.env.TWITCH_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: redirectUri },
    );
    return { accessTokenEnc: encrypt(data.access_token), refreshTokenEnc: encrypt(data.refresh_token), expiresIn: data.expires_in };
  }

  async getChannelAnalytics(accessTokenEnc, broadcasterId) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`https://api.twitch.tv/helix/analytics/games?broadcaster_id=${broadcasterId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Client-Id': process.env.TWITCH_CLIENT_ID },
    });
    if (!res.ok) throw new Error(`Twitch analytics failed: ${res.status}`);
    return res.json();
  }
}

// ─── Discord ───────────────────────────────────────────────────────────────
export class DiscordConnector {
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) throw new Error('DISCORD_CLIENT_ID not configured');
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify+guilds+guilds.members.read&state=${state}`;
  }

  async exchangeCode(code, redirectUri) {
    const data = await oauthTokenExchange(
      'https://discord.com/api/oauth2/token',
      { client_id: process.env.DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: redirectUri },
      `${process.env.DISCORD_CLIENT_ID}:${process.env.DISCORD_CLIENT_SECRET}`,
    );
    return { accessTokenEnc: encrypt(data.access_token), refreshTokenEnc: encrypt(data.refresh_token) };
  }

  async getGuildInsights(accessTokenEnc, guildId) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Discord guild insights failed: ${res.status}`);
    return res.json();
  }
}

// ─── Reddit ────────────────────────────────────────────────────────────────
export class RedditConnector {
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.REDDIT_CLIENT_ID;
    if (!clientId) throw new Error('REDDIT_CLIENT_ID not configured');
    const scopes = 'identity,mysubreddits,read,history';
    return `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&duration=permanent&scope=${scopes}`;
  }

  async exchangeCode(code, redirectUri) {
    const data = await oauthTokenExchange(
      'https://www.reddit.com/api/v1/access_token',
      { grant_type: 'authorization_code', code, redirect_uri: redirectUri },
      `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`,
    );
    return { accessTokenEnc: encrypt(data.access_token), refreshTokenEnc: encrypt(data.refresh_token) };
  }

  async getSubredditStats(accessTokenEnc, subreddit) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`https://oauth.reddit.com/r/${subreddit}/about.json`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/3.0' },
    });
    if (!res.ok) throw new Error(`Reddit subreddit stats failed: ${res.status}`);
    return res.json();
  }
}

export const tiktokConnector = new TikTokConnector();
export const instagramConnector = new InstagramConnector();
export const facebookConnector = new FacebookConnector();
export const twitchConnector = new TwitchConnector();
export const discordConnector = new DiscordConnector();
export const redditConnector = new RedditConnector();
