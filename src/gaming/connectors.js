/**
 * src/gaming/connectors.js
 * Nexus AI Pro — Game Dev Platform Connectors
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Connectors: Unreal Engine / Epic Games, Sony PSN, Microsoft Xbox Live,
 *             Ubisoft Connect; Achievement & game progress tracking;
 *             AR/VR/3D project tracking
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ─── Platform definitions ─────────────────────────────────────────────────────

export const GAME_PLATFORMS = Object.freeze({
  EPIC:       'epic',
  EPIC_STORE: 'epic_store',
  SONY:       'sony',
  XBOX:       'xbox',
  UBISOFT:    'ubisoft',
  STEAM:      'steam',
});

// ─── In-memory stores (replace with DB in production) ─────────────────────────

const connections  = new Map(); // `${userId}:${platform}` → connection record
const achievements = new Map(); // userId → achievement[]
const gameProgress = new Map(); // `${userId}:${gameId}` → progress record
const projects     = new Map(); // projectId → project record

// ─── OAuth2 connection helpers ────────────────────────────────────────────────

const PLATFORM_OAUTH = {
  [GAME_PLATFORMS.EPIC]: {
    authUrl:   'https://www.epicgames.com/id/api/redirect',
    tokenUrl:  'https://api.epicgames.dev/epic/oauth/v2/token',
    clientId:  () => process.env.EPIC_CLIENT_ID,
  },
  [GAME_PLATFORMS.SONY]: {
    authUrl:   'https://ca.account.sony.com/api/authz/v3/oauth/authorize',
    tokenUrl:  'https://ca.account.sony.com/api/authz/v3/oauth/token',
    clientId:  () => process.env.SONY_CLIENT_ID,
  },
  [GAME_PLATFORMS.XBOX]: {
    authUrl:   'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
    tokenUrl:  'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    clientId:  () => process.env.XBOX_CLIENT_ID,
  },
  [GAME_PLATFORMS.UBISOFT]: {
    authUrl:   'https://connect.ubisoft.com/oauth/authorize',
    tokenUrl:  'https://public-ubiservices.ubi.com/v3/oauth/token',
    clientId:  () => process.env.UBISOFT_CLIENT_ID,
  },
  [GAME_PLATFORMS.STEAM]: {
    authUrl:   'https://steamcommunity.com/openid/login',
    tokenUrl:  null,
    clientId:  () => process.env.STEAM_API_KEY,
  },
};

export function getOAuthUrl(platform, redirectUri, state) {
  const cfg = PLATFORM_OAUTH[platform];
  if (!cfg) throw Object.assign(new Error(`Unknown platform: ${platform}`), { status: 400 });

  const clientId = cfg.clientId();
  if (!clientId) {
    throw Object.assign(new Error(`${platform} client ID not configured`), { status: 500 });
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid profile achievements',
    state,
  });

  return `${cfg.authUrl}?${params}`;
}

export async function exchangeOAuthCode(platform, code, redirectUri) {
  const cfg = PLATFORM_OAUTH[platform];
  if (!cfg || !cfg.tokenUrl) throw Object.assign(new Error('Token exchange not supported'), { status: 400 });

  const clientId     = cfg.clientId();
  const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) {
    throw Object.assign(new Error(`${platform} credentials not configured`), { status: 500 });
  }

  const response = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw Object.assign(new Error(`Token exchange failed: ${err}`), { status: 502 });
  }

  return response.json();
}

export function saveConnection(userId, platform, tokenData) {
  const key = `${userId}:${platform}`;
  connections.set(key, {
    userId, platform,
    accessToken:  tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt:    Date.now() + (tokenData.expires_in || 3600) * 1000,
    connectedAt:  Date.now(),
  });
  return { connected: true, platform };
}

export function getConnection(userId, platform) {
  return connections.get(`${userId}:${platform}`) || null;
}

export function disconnectPlatform(userId, platform) {
  return connections.delete(`${userId}:${platform}`);
}

export function listConnections(userId) {
  const result = [];
  for (const [key, conn] of connections) {
    if (conn.userId === userId) {
      const { accessToken, refreshToken, ...safe } = conn;
      result.push(safe);
    }
  }
  return result;
}

// ─── Achievement tracking ─────────────────────────────────────────────────────

export function unlockAchievement(userId, achievement) {
  const list = achievements.get(userId) || [];
  const exists = list.some(a => a.id === achievement.id);
  if (exists) return { alreadyUnlocked: true };

  const entry = {
    id:          achievement.id,
    name:        achievement.name,
    description: achievement.description || '',
    platform:    achievement.platform || 'nexus',
    icon:        achievement.icon || '🏆',
    points:      achievement.points || 10,
    rarity:      achievement.rarity || 'common',
    unlockedAt:  Date.now(),
  };

  list.push(entry);
  achievements.set(userId, list);
  return { unlocked: true, achievement: entry };
}

export function getAchievements(userId) {
  return achievements.get(userId) || [];
}

export function getAchievementStats(userId) {
  const list = achievements.get(userId) || [];
  const totalPoints = list.reduce((s, a) => s + (a.points || 0), 0);
  const byRarity = list.reduce((acc, a) => {
    acc[a.rarity] = (acc[a.rarity] || 0) + 1;
    return acc;
  }, {});
  return { total: list.length, totalPoints, byRarity };
}

// ─── Game progress tracking ────────────────────────────────────────────────────

export function updateGameProgress(userId, gameId, progress) {
  const key  = `${userId}:${gameId}`;
  const prev = gameProgress.get(key) || {};
  const updated = {
    ...prev,
    userId,
    gameId,
    ...progress,
    updatedAt: Date.now(),
  };
  gameProgress.set(key, updated);
  return updated;
}

export function getGameProgress(userId, gameId) {
  return gameProgress.get(`${userId}:${gameId}`) || null;
}

export function listGameProgress(userId) {
  const result = [];
  for (const [key, prog] of gameProgress) {
    if (prog.userId === userId) result.push(prog);
  }
  return result;
}

// ─── Project tracking (coding / game dev / AR·VR / 3D) ───────────────────────

export const PROJECT_TYPES = Object.freeze({
  CODING: 'coding',
  GAME:   'game',
  AR_VR:  'ar_vr',
  THREE_D: '3d',
});

export function createProject(userId, data) {
  const id = uuidv4();
  const project = {
    id,
    userId,
    name:        data.name,
    type:        data.type || PROJECT_TYPES.CODING,
    description: data.description || '',
    engine:      data.engine || null,        // unreal, unity, godot…
    platform:    data.platform || null,      // pc, console, mobile, vr…
    status:      'active',
    tags:        data.tags || [],
    metrics: {
      commits:      0,
      linesOfCode:  0,
      testCoverage: 0,
      buildStatus:  'unknown',
      openIssues:   0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects.set(id, project);
  return project;
}

export function updateProject(projectId, userId, updates) {
  const project = projects.get(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (project.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  const SAFE = ['name', 'description', 'status', 'tags', 'metrics', 'engine', 'platform'];
  for (const [k, v] of Object.entries(updates)) {
    if (SAFE.includes(k)) project[k] = v;
  }
  project.updatedAt = Date.now();
  return project;
}

export function getProject(projectId) {
  return projects.get(projectId) || null;
}

export function listProjects(userId, type = null) {
  const result = [];
  for (const p of projects.values()) {
    if (p.userId === userId && (!type || p.type === type)) result.push(p);
  }
  return result.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteProject(projectId, userId) {
  const project = projects.get(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
  if (project.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  projects.delete(projectId);
  return { deleted: true };
}
