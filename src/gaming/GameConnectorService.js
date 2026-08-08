/**
 * src/gaming/GameConnectorService.js
 * Nexus AI Pro — Game engine & platform connectors
 * Connectors: Unreal Engine (Epic), Sony PlayStation, Microsoft Xbox,
 *             Ubisoft Connect, Steam, Unity Cloud Build
 * Features: achievement tracking, game progress, real-time stats
 * Date: 2026-08-08
 * © 2025-2026 Cameron Fox. All rights reserved.
 *
 * All credentials read from environment variables only.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ── API base URLs ─────────────────────────────────────────────────────
const API = Object.freeze({
  EPIC_CATALOG: 'https://catalog-public-service-prod06.ol.epicgames.com/catalog/api',
  EPIC_ACCOUNTS: 'https://account-public-service-prod.ol.epicgames.com/account/api',
  EPIC_STATS: 'https://stats-v2-service-prod.ol.epicgames.com/v2/client',
  EPIC_ACHIEVEMENTS: 'https://achievements-public-service-prod.ol.epicgames.com',
  PSRPC: 'https://m.np.playstation.com/api',                  // PSN Mobile API
  XBOX_LIVE: 'https://xboxlive.com',
  XBOX_STATS: 'https://userstats.xboxlive.com',
  UBISOFT: 'https://public-ubiservices.ubi.com',
  STEAM_API: 'https://api.steampowered.com',
  UNITY_CLOUD: 'https://build-api.cloud.unity3d.com/api/v1',
});

// ── Authenticated fetch (no retry) ─────────────────────────────────────
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${opts._platform || 'API'}] ${res.status} ${url}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── Achievement normalizer ─────────────────────────────────────────────

function normalizeAchievement(platform, raw) {
  return {
    platform,
    id: raw.id || raw.achievementId || raw.achievement_id || uuidv4(),
    name: raw.name || raw.displayName || raw.label || 'Unknown',
    description: raw.description || raw.flavorText || '',
    unlocked: raw.unlocked ?? raw.earned ?? raw.completed ?? false,
    unlockedAt: raw.unlockedAt || raw.earnedDateTime || null,
    rarity: raw.rarity || raw.rarityPercent || null,
    points: raw.xp || raw.gamerscore || raw.points || 0,
    icon: raw.icon || raw.iconUrl || raw.image || null,
  };
}

// ── Epic Games / Unreal Engine ─────────────────────────────────────────

async function epicGetAccessToken() {
  const clientId = process.env.EPIC_CLIENT_ID;
  const clientSecret = process.env.EPIC_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('EPIC_CLIENT_ID / EPIC_CLIENT_SECRET not set');

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await apiFetch(`${API.EPIC_ACCOUNTS}/oauth/token`, {
    method: 'POST',
    _platform: 'Epic',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  return res.access_token;
}

async function fetchEpicStats(accountId) {
  const token = await epicGetAccessToken();
  const data = await apiFetch(`${API.EPIC_STATS}/${accountId}/bulk/stats`, {
    _platform: 'Epic',
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

async function fetchEpicAchievements(accountId, sandboxId) {
  const token = await epicGetAccessToken();
  const data = await apiFetch(
    `${API.EPIC_ACHIEVEMENTS}/v1/client/achievements/${sandboxId}/players/${accountId}`,
    { _platform: 'Epic', headers: { Authorization: `Bearer ${token}` } }
  );
  return (data.achievements || []).map((a) => normalizeAchievement('epic', a));
}

// ── PlayStation Network ────────────────────────────────────────────────

async function fetchPSNTrophies(accountId, accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const trophies = await apiFetch(
    `${API.PSRPC}/trophy/v1/users/${accountId}/trophyGroups?npServiceName=trophy2`,
    { _platform: 'PSN', headers }
  );
  return (trophies.trophyGroups || []).flatMap((g) =>
    (g.trophies || []).map((t) => normalizeAchievement('psn', t))
  );
}

async function fetchPSNGameList(accountId, accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return apiFetch(
    `${API.PSRPC}/gamelist/v2/users/${accountId}/titles?limit=100`,
    { _platform: 'PSN', headers }
  );
}

// ── Microsoft Xbox Live ────────────────────────────────────────────────

async function fetchXboxAchievements(xuid, accessToken) {
  const headers = {
    Authorization: `XBL3.0 x=${accessToken}`,
    'x-xbl-contract-version': '2',
    Accept: 'application/json',
  };
  const data = await apiFetch(
    `https://achievements.xboxlive.com/users/xuid(${xuid})/achievements`,
    { _platform: 'Xbox', headers }
  );
  return (data.achievements || []).map((a) =>
    normalizeAchievement('xbox', {
      id: a.id,
      name: a.name,
      description: a.description,
      unlocked: a.progressState === 'Achieved',
      unlockedAt: a.progression?.timeUnlocked,
      gamerscore: a.rewards?.[0]?.value || 0,
    })
  );
}

async function fetchXboxStats(xuid, titleId, accessToken) {
  const headers = {
    Authorization: `XBL3.0 x=${accessToken}`,
    'x-xbl-contract-version': '2',
    Accept: 'application/json',
  };
  return apiFetch(
    `${API.XBOX_STATS}/users/xuid(${xuid})/titles/${titleId}/stats`,
    { _platform: 'Xbox', headers }
  );
}

// ── Ubisoft Connect ────────────────────────────────────────────────────

async function fetchUbisoftProfile(userId, ticket) {
  const headers = {
    'Ubi-AppId': process.env.UBISOFT_APP_ID || 'afb4b43c-f1f7-41b7-bcef-a635d8c83822',
    Authorization: `Ubi_v1 t=${ticket}`,
    'Content-Type': 'application/json',
  };
  const profile = await apiFetch(
    `${API.UBISOFT}/v3/profiles?userId=${userId}`,
    { _platform: 'Ubisoft', headers }
  );
  const activities = await apiFetch(
    `${API.UBISOFT}/v1/activities?userId=${userId}&limit=50`,
    { _platform: 'Ubisoft', headers }
  );
  return { profile: profile.profiles?.[0], activities: activities.activities || [] };
}

async function fetchUbisoftAchievements(userId, ticket, productId) {
  const headers = {
    'Ubi-AppId': process.env.UBISOFT_APP_ID || 'afb4b43c-f1f7-41b7-bcef-a635d8c83822',
    Authorization: `Ubi_v1 t=${ticket}`,
  };
  const data = await apiFetch(
    `${API.UBISOFT}/v1/users/${userId}/achievements?productId=${productId}`,
    { _platform: 'Ubisoft', headers }
  );
  return (data.achievements || []).map((a) => normalizeAchievement('ubisoft', a));
}

// ── Steam ──────────────────────────────────────────────────────────────

async function fetchSteamAchievements(steamId, appId) {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error('STEAM_API_KEY not set');
  const data = await apiFetch(
    `${API.STEAM_API}/ISteamUserStats/GetPlayerAchievements/v1/?key=${key}&steamid=${steamId}&appid=${appId}`
  );
  return (data.playerstats?.achievements || []).map((a) =>
    normalizeAchievement('steam', {
      id: a.apiname,
      name: a.apiname,
      unlocked: a.achieved === 1,
      unlockedAt: a.unlocktime ? new Date(a.unlocktime * 1000).toISOString() : null,
    })
  );
}

async function fetchSteamRecentGames(steamId) {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error('STEAM_API_KEY not set');
  return apiFetch(
    `${API.STEAM_API}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${key}&steamid=${steamId}`
  );
}

// ── Unity Cloud Build ──────────────────────────────────────────────────

async function fetchUnityBuildStatus(orgId, projectId) {
  const apiKey = process.env.UNITY_CLOUD_API_KEY;
  if (!apiKey) throw new Error('UNITY_CLOUD_API_KEY not set');
  const headers = { Authorization: `Basic ${Buffer.from(`:${apiKey}`).toString('base64')}` };
  const builds = await apiFetch(
    `${API.UNITY_CLOUD}/orgs/${orgId}/projects/${projectId}/buildtargets/_all/builds?per_page=20`,
    { _platform: 'Unity', headers }
  );
  return builds;
}

// ── GameConnectorService ───────────────────────────────────────────────

export class GameConnectorService {
  constructor() {
    /** In-memory achievement cache: `${platform}:${userId}` → { data, ts } */
    this._cache = new Map();
    this._cacheTTL = 120_000; // 2 min
    /** Progress tracking (local game saves) */
    this._progress = new Map(); // `${userId}:${gameId}` → progress
    /** Real-time polling intervals */
    this._intervals = new Map();
  }

  // ── Achievements ───────────────────────────────────────────────────

  async getAchievements(platform, opts) {
    const cacheKey = `${platform}:${opts.userId || opts.accountId || '0'}`;
    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this._cacheTTL) return cached.data;

    let data;
    switch (platform) {
      case 'epic':
        data = await fetchEpicAchievements(opts.accountId, opts.sandboxId);
        break;
      case 'psn':
        data = await fetchPSNTrophies(opts.accountId, opts.accessToken);
        break;
      case 'xbox':
        data = await fetchXboxAchievements(opts.xuid, opts.accessToken);
        break;
      case 'ubisoft':
        data = await fetchUbisoftAchievements(opts.userId, opts.ticket, opts.productId);
        break;
      case 'steam':
        data = await fetchSteamAchievements(opts.steamId, opts.appId);
        break;
      default:
        throw new Error(`Unknown gaming platform: ${platform}`);
    }

    this._cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  }

  // ── Game progress ────────────────────────────────────────────────────

  saveProgress(userId, gameId, progress) {
    const key = `${userId}:${gameId}`;
    const existing = this._progress.get(key) || {};
    const updated = {
      ...existing,
      ...progress,
      gameId,
      userId,
      updatedAt: new Date().toISOString(),
    };
    this._progress.set(key, updated);
    return updated;
  }

  getProgress(userId, gameId) {
    return this._progress.get(`${userId}:${gameId}`) || null;
  }

  listProgress(userId) {
    const results = [];
    for (const [key, val] of this._progress.entries()) {
      if (key.startsWith(`${userId}:`)) results.push(val);
    }
    return results;
  }

  // ── Platform stats ────────────────────────────────────────────────────

  async getPlatformStats(platform, opts) {
    switch (platform) {
      case 'epic':   return fetchEpicStats(opts.accountId);
      case 'psn':    return fetchPSNGameList(opts.accountId, opts.accessToken);
      case 'xbox':   return fetchXboxStats(opts.xuid, opts.titleId, opts.accessToken);
      case 'ubisoft': return fetchUbisoftProfile(opts.userId, opts.ticket);
      case 'steam':  return fetchSteamRecentGames(opts.steamId);
      case 'unity':  return fetchUnityBuildStatus(opts.orgId, opts.projectId);
      default:       throw new Error(`Unknown platform: ${platform}`);
    }
  }

  // ── Achievement leaderboard ───────────────────────────────────────────

  buildLeaderboard(achievementArrays) {
    const scores = {};
    for (const arr of achievementArrays) {
      for (const a of arr) {
        const userId = a.userId || 'unknown';
        scores[userId] = (scores[userId] || 0) + (a.unlocked ? a.points || 10 : 0);
      }
    }
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([userId, score], i) => ({ rank: i + 1, userId, score }));
  }

  // ── Real-time polling ─────────────────────────────────────────────────

  startPolling(userId, platform, opts, intervalMs = 60_000, emitFn) {
    const key = `${userId}:${platform}`;
    if (this._intervals.has(key)) return;
    const id = setInterval(async () => {
      try {
        const data = await this.getAchievements(platform, opts);
        if (emitFn) emitFn('gaming:achievements', { userId, platform, data });
      } catch (err) {
        if (emitFn) emitFn('gaming:error', { userId, platform, error: err.message });
      }
    }, intervalMs);
    this._intervals.set(key, id);
  }

  stopPolling(userId, platform) {
    const key = `${userId}:${platform}`;
    const id = this._intervals.get(key);
    if (id) { clearInterval(id); this._intervals.delete(key); }
  }
}

export default GameConnectorService;
