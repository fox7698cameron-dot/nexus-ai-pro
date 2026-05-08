// src/connectors/gameEngines.js
// Nexus AI Pro - Game Engine & Platform Connectors
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

// Game engine enumeration
export const GAME_ENGINE = Object.freeze({
  UNREAL: 'unreal',
  UNITY: 'unity',
  GODOT: 'godot',
  GAMEMAKER: 'gamemaker',
  CUSTOM: 'custom',
});

// Platform enumeration
export const GAME_PLATFORM = Object.freeze({
  EPIC: 'epic',
  SONY_PSN: 'sony_psn',
  MICROSOFT_XBOX: 'microsoft_xbox',
  UBISOFT: 'ubisoft',
  STEAM: 'steam',
  NINTENDO: 'nintendo',
  ITCH: 'itch',
});

// Achievement rarity enumeration
export const ACHIEVEMENT_RARITY = Object.freeze({
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
});

// ─── Epic Games / Unreal connector ───────────────────────────────────────────
class EpicGamesConnector {
  constructor() {
    this.clientId = process.env.EPIC_CLIENT_ID;
    this.clientSecret = process.env.EPIC_CLIENT_SECRET;
    this.deploymentId = process.env.EPIC_DEPLOYMENT_ID;
    this.baseUrl = 'https://api.epicgames.dev';
  }

  async _getToken() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Epic Games credentials not configured (EPIC_CLIENT_ID, EPIC_CLIENT_SECRET)');
    }
    const creds = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/epic/oauth/v2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token;
  }

  async getPlayerStats(productUserId) {
    const token = await this._getToken();
    const res = await fetch(
      `${this.baseUrl}/stats/v1/${this.deploymentId}/stats/${productUserId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }

  async getAchievements(productUserId) {
    const token = await this._getToken();
    const res = await fetch(
      `${this.baseUrl}/achievements/v1/${this.deploymentId}/players/${productUserId}/achievements`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }

  async getLeaderboard(leaderboardId) {
    const token = await this._getToken();
    const res = await fetch(
      `${this.baseUrl}/leaderboards/v1/${this.deploymentId}/leaderboards/${leaderboardId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }
}

// ─── Sony PlayStation connector ───────────────────────────────────────────────
class SonyPSNConnector {
  constructor() {
    this.clientId = process.env.SONY_PSN_CLIENT_ID;
    this.clientSecret = process.env.SONY_PSN_CLIENT_SECRET;
    this.baseUrl = 'https://m.np.playstation.com/api';
  }

  async getTrophies(psnAccountId) {
    const token = process.env.SONY_PSN_ACCESS_TOKEN;
    if (!token) throw new Error('SONY_PSN_ACCESS_TOKEN not configured');
    const res = await fetch(
      `${this.baseUrl}/trophy/v1/users/${psnAccountId}/trophyTitles`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }

  async getGameProgress(psnAccountId, titleId) {
    const token = process.env.SONY_PSN_ACCESS_TOKEN;
    if (!token) throw new Error('SONY_PSN_ACCESS_TOKEN not configured');
    const res = await fetch(
      `${this.baseUrl}/trophy/v1/users/${psnAccountId}/titles/trophyTitles/${titleId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }
}

// ─── Microsoft Xbox connector ─────────────────────────────────────────────────
class MicrosoftXboxConnector {
  constructor() {
    this.clientId = process.env.XBOX_CLIENT_ID;
    this.clientSecret = process.env.XBOX_CLIENT_SECRET;
    this.baseUrl = 'https://xboxlive.com';
  }

  async getAchievements(xuid, titleId) {
    const token = process.env.XBOX_ACCESS_TOKEN;
    if (!token) throw new Error('XBOX_ACCESS_TOKEN not configured');
    const res = await fetch(
      `https://achievements.xboxlive.com/users/xuid(${xuid})/achievements`,
      {
        headers: {
          Authorization: `XBL3.0 x=${token}`,
          'x-xbl-contract-version': '2',
          Accept: 'application/json',
        },
      }
    );
    return res.json();
  }

  async getGameHistory(xuid) {
    const token = process.env.XBOX_ACCESS_TOKEN;
    if (!token) throw new Error('XBOX_ACCESS_TOKEN not configured');
    const res = await fetch(
      `https://titlehub.xboxlive.com/users/xuid(${xuid})/titles`,
      {
        headers: {
          Authorization: `XBL3.0 x=${token}`,
          'x-xbl-contract-version': '2',
        },
      }
    );
    return res.json();
  }
}

// ─── Ubisoft Connect connector ────────────────────────────────────────────────
class UbisoftConnector {
  constructor() {
    this.appId = process.env.UBISOFT_APP_ID;
    this.baseUrl = 'https://public-ubiservices.ubi.com/v3';
  }

  async getProfile(ubisoftUserId) {
    const token = process.env.UBISOFT_ACCESS_TOKEN;
    if (!token) throw new Error('UBISOFT_ACCESS_TOKEN not configured');
    const res = await fetch(
      `${this.baseUrl}/users/${ubisoftUserId}`,
      { headers: { Authorization: `Ubi_v1 t=${token}`, 'Ubi-AppId': this.appId } }
    );
    return res.json();
  }

  async getAchievements(ubisoftUserId) {
    const token = process.env.UBISOFT_ACCESS_TOKEN;
    if (!token) throw new Error('UBISOFT_ACCESS_TOKEN not configured');
    const res = await fetch(
      `${this.baseUrl}/users/${ubisoftUserId}/achievements`,
      { headers: { Authorization: `Ubi_v1 t=${token}`, 'Ubi-AppId': this.appId } }
    );
    return res.json();
  }
}

// ─── Achievement tracker (platform-agnostic) ──────────────────────────────────
export class AchievementTracker {
  constructor(kvStore) {
    this.store = kvStore;
  }

  async unlockAchievement(userId, achievement) {
    const key = `achievements:${userId}`;
    const existing = (await this.store.get(key)) || [];
    const isDuplicate = existing.some(a => a.id === achievement.id);
    if (isDuplicate) return { alreadyUnlocked: true };

    const entry = {
      ...achievement,
      unlockedAt: Date.now(),
      rarity: achievement.rarity || ACHIEVEMENT_RARITY.COMMON,
    };
    existing.push(entry);
    await this.store.set(key, existing);
    return { ok: true, achievement: entry };
  }

  async getAchievements(userId) {
    return (await this.store.get(`achievements:${userId}`)) || [];
  }

  async trackProgress(userId, projectId, progress) {
    const key = `progress:${userId}:${projectId}`;
    const existing = (await this.store.get(key)) || { milestones: [], history: [] };
    existing.currentProgress = progress.percentage;
    existing.updatedAt = Date.now();
    existing.history.push({ value: progress.percentage, at: Date.now() });
    if (existing.history.length > 100) existing.history = existing.history.slice(-100);
    await this.store.set(key, existing);
    return existing;
  }

  async getProgress(userId, projectId) {
    return (await this.store.get(`progress:${userId}:${projectId}`)) || null;
  }
}

// ─── Connector registry ───────────────────────────────────────────────────────
export class GameEngineConnectorRegistry {
  constructor(kvStore) {
    this.epic = new EpicGamesConnector();
    this.sony = new SonyPSNConnector();
    this.xbox = new MicrosoftXboxConnector();
    this.ubisoft = new UbisoftConnector();
    this.achievements = new AchievementTracker(kvStore);
  }

  getConnector(platform) {
    const connectors = {
      [GAME_PLATFORM.EPIC]: this.epic,
      [GAME_PLATFORM.SONY_PSN]: this.sony,
      [GAME_PLATFORM.MICROSOFT_XBOX]: this.xbox,
      [GAME_PLATFORM.UBISOFT]: this.ubisoft,
    };
    const connector = connectors[platform];
    if (!connector) throw new Error(`Unsupported platform: ${platform}`);
    return connector;
  }
}
