/**
 * src/connectors/GameConnectors.js
 * Nexus AI Pro — Game Platform Connectors
 * Epic Games/Unreal Engine, Sony PlayStation, Microsoft Xbox, Ubisoft Connect
 * Achievement tracking, game progress, real-time project tracking for game dev.
 * All credentials from environment variables — never hard-coded.
 * Date: 2026-08-11
 */

// ─── Platform Registry ────────────────────────────────────────────────────────
export const GAME_PLATFORMS = {
  EPIC:     { id: 'epic',     name: 'Epic Games',      icon: '🎮', color: '#2d2d2d' },
  UNREAL:   { id: 'unreal',   name: 'Unreal Engine',   icon: '🔷', color: '#0d7dff' },
  PSN:      { id: 'psn',      name: 'PlayStation',     icon: '🎮', color: '#003791' },
  XBOX:     { id: 'xbox',     name: 'Xbox / Microsoft', icon: '🟩', color: '#107c10' },
  UBISOFT:  { id: 'ubisoft',  name: 'Ubisoft Connect', icon: '🔷', color: '#0070d1' },
  STEAM:    { id: 'steam',    name: 'Steam',            icon: '🎮', color: '#1b2838' },
  GOG:      { id: 'gog',      name: 'GOG Galaxy',       icon: '⭐', color: '#5c2d91' },
  ITCH:     { id: 'itch',     name: 'itch.io',          icon: '🎯', color: '#fa5c5c' },
  NINTENDO: { id: 'nintendo', name: 'Nintendo',         icon: '🔴', color: '#e4000f' },
};

// ─── Base Connector ───────────────────────────────────────────────────────────
class GameConnectorBase {
  constructor(platformId) {
    this.platformId = platformId;
    this.platform   = GAME_PLATFORMS[platformId.toUpperCase()] ?? { id: platformId, name: platformId };
  }

  async _request(endpoint, options = {}) {
    const res = await fetch(`/api/connectors/game/${this.platformId}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `${this.platform.name} API error: ${res.status}`);
    }
    return res.json();
  }

  async getProfile()             { return this._request('/profile'); }
  async getAchievements(gameId)  { return this._request(`/achievements/${gameId}`); }
  async getGameProgress(gameId)  { return this._request(`/progress/${gameId}`); }
  async getLibrary()             { return this._request('/library'); }
  async getFriends()             { return this._request('/friends'); }
  async getRecentActivity()      { return this._request('/activity'); }
  async getLeaderboard(gameId)   { return this._request(`/leaderboard/${gameId}`); }
}

// ─── Epic Games Connector ─────────────────────────────────────────────────────
export class EpicGamesConnector extends GameConnectorBase {
  constructor() { super('epic'); }

  /** Get Epic Games Launcher library with Unreal Engine projects */
  async getUnrealProjects() { return this._request('/unreal-projects'); }
  /** Get EGS free games */
  async getFreeGames()      { return this._request('/free-games'); }
  /** Get Epic achievements */
  async getAchievements(gameId) { return this._request(`/achievements/${gameId}`); }
  /** Publish Unreal build metadata */
  async publishBuild(projectId, buildMeta) {
    return this._request(`/publish/${projectId}`, { method: 'POST', body: JSON.stringify(buildMeta) });
  }
}

// ─── Sony PlayStation Connector ───────────────────────────────────────────────
export class SonyPSNConnector extends GameConnectorBase {
  constructor() { super('psn'); }
  async getTrophies(gameId)    { return this._request(`/trophies/${gameId}`); }
  async getTrophyGroups()      { return this._request('/trophy-groups'); }
  async getPlayHistory()       { return this._request('/play-history'); }
  async getOnlineFriends()     { return this._request('/friends/online'); }
}

// ─── Microsoft Xbox Connector ─────────────────────────────────────────────────
export class XboxConnector extends GameConnectorBase {
  constructor() { super('xbox'); }
  async getGamerscore()        { return this._request('/gamerscore'); }
  async getGameAchievements(gameId) { return this._request(`/achievements/${gameId}`); }
  async getXboxLiveStatus()    { return this._request('/live-status'); }
  async getGamePass()          { return this._request('/game-pass'); }
}

// ─── Ubisoft Connect Connector ────────────────────────────────────────────────
export class UbisoftConnector extends GameConnectorBase {
  constructor() { super('ubisoft'); }
  async getUnitedChallenge()   { return this._request('/challenges'); }
  async getUbiBucks()          { return this._request('/currency'); }
  async getGameXP(gameId)      { return this._request(`/xp/${gameId}`); }
}

// ─── Achievement Tracker ──────────────────────────────────────────────────────
export class AchievementTracker {
  constructor() {
    this.connectors = {
      epic:    new EpicGamesConnector(),
      psn:     new SonyPSNConnector(),
      xbox:    new XboxConnector(),
      ubisoft: new UbisoftConnector(),
    };
  }

  /** Aggregate achievements across all linked platforms */
  async getAggregatedAchievements(gameId) {
    const results = {};
    await Promise.allSettled(
      Object.entries(this.connectors).map(async ([platform, connector]) => {
        try {
          results[platform] = await connector.getAchievements(gameId);
        } catch {
          results[platform] = { error: true, platform };
        }
      })
    );
    return results;
  }

  /** Aggregate game progress across all linked platforms */
  async getAggregatedProgress(gameId) {
    const results = {};
    await Promise.allSettled(
      Object.entries(this.connectors).map(async ([platform, connector]) => {
        try {
          results[platform] = await connector.getGameProgress(gameId);
        } catch {
          results[platform] = { error: true, platform };
        }
      })
    );
    return results;
  }
}

// ─── Game Dev Project Tracker ─────────────────────────────────────────────────
export class GameDevProjectTracker {
  async getProjects()           { return _api('/api/projects/gamedev'); }
  async getProject(id)          { return _api(`/api/projects/gamedev/${id}`); }
  async createProject(data)     { return _api('/api/projects/gamedev', 'POST', data); }
  async updateProject(id, data) { return _api(`/api/projects/gamedev/${id}`, 'PATCH', data); }
  async deleteProject(id)       { return _api(`/api/projects/gamedev/${id}`, 'DELETE'); }

  async getMilestones(projectId){ return _api(`/api/projects/gamedev/${projectId}/milestones`); }
  async getBuildHistory(projectId){ return _api(`/api/projects/gamedev/${projectId}/builds`); }
  async getAssets(projectId)    { return _api(`/api/projects/gamedev/${projectId}/assets`); }
  async getTeam(projectId)      { return _api(`/api/projects/gamedev/${projectId}/team`); }

  /** Real-time metrics for the game project dashboard */
  async getMetrics(projectId) {
    return _api(`/api/projects/gamedev/${projectId}/metrics`);
  }

  /** AR/VR / 3D project tracking */
  async getARVRProjects()       { return _api('/api/projects/arvr'); }
  async createARVRProject(data) { return _api('/api/projects/arvr', 'POST', data); }
  async updateARVRProject(id, data){ return _api(`/api/projects/arvr/${id}`, 'PATCH', data); }
}

// ─── Engine Plugin Configs ────────────────────────────────────────────────────
export const ENGINE_PLUGINS = {
  unreal: {
    name: 'Unreal Engine',
    versions: ['UE 5.3', 'UE 5.4', 'UE 5.5'],
    features: ['Blueprint', 'C++', 'Nanite', 'Lumen', 'MetaSounds', 'Chaos Physics'],
    setupEndpoint: '/api/connectors/unreal/setup',
  },
  unity: {
    name: 'Unity Engine',
    versions: ['Unity 6', 'Unity 2023 LTS', 'Unity 2022 LTS'],
    features: ['C#', 'DOTS', 'Shader Graph', 'VFX Graph', 'ProBuilder'],
    setupEndpoint: '/api/connectors/unity/setup',
  },
  godot: {
    name: 'Godot Engine',
    versions: ['Godot 4.2', 'Godot 4.3'],
    features: ['GDScript', 'C#', 'VisualShader', 'GDNative'],
    setupEndpoint: '/api/connectors/godot/setup',
  },
};

// ─── Platform Connection Manager ──────────────────────────────────────────────
export class GamePlatformManager {
  /** Get all connected game platforms for the current user */
  async getConnectedPlatforms() {
    return _api('/api/connectors/game/connected');
  }

  /** Initiate OAuth connection to a game platform */
  async connectPlatform(platformId) {
    const res = await _api(`/api/connectors/game/${platformId}/connect`);
    if (res.authUrl) window.location.href = res.authUrl;
    return res;
  }

  /** Disconnect a platform */
  async disconnectPlatform(platformId) {
    return _api(`/api/connectors/game/${platformId}/disconnect`, 'POST');
  }

  /** Get aggregate gaming profile */
  async getGamingProfile() {
    return _api('/api/connectors/game/profile');
  }

  /** Get real-time game metrics for dashboard */
  async getRealTimeMetrics() {
    return _api('/api/connectors/game/realtime-metrics');
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
async function _api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}
