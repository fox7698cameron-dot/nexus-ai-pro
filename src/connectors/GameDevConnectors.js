// src/connectors/GameDevConnectors.js
// Updated: 2026-10-25
// Unreal/Epic, Sony PlayStation, Microsoft Xbox, Ubisoft Connect — achievement & progress tracking

// ─── Achievement schema ───────────────────────────────────────────────────────
export const AchievementStatus = { LOCKED: 'locked', UNLOCKED: 'unlocked', PROGRESS: 'progress' };

// ─── Base platform connector ──────────────────────────────────────────────────
class GamePlatformBase {
  constructor(name) {
    this.name = name;
    this._localAchievements = new Map();
    this._localProgress = new Map();
  }

  get isConfigured() { return false; }

  // Normalize achievement data across platforms
  normalizeAchievement(raw) {
    return {
      id: raw.id || raw.achievementId || raw.trophy_id,
      name: raw.name || raw.title,
      description: raw.description || raw.detail,
      status: raw.unlocked || raw.achieved ? AchievementStatus.UNLOCKED : AchievementStatus.LOCKED,
      unlockedAt: raw.unlock_time || raw.earned_date || null,
      iconUrl: raw.icon || raw.image_url || null,
      rarity: raw.global_unlock_percentage || null,
      platform: this.name
    };
  }
}

// ─── Epic Games / Unreal Engine connector ────────────────────────────────────
export class EpicGamesConnector extends GamePlatformBase {
  constructor() {
    super('epic');
    this._clientId = process.env.EPIC_CLIENT_ID;
    this._clientSecret = process.env.EPIC_CLIENT_SECRET;
    this._deploymentId = process.env.EPIC_DEPLOYMENT_ID;
  }

  get isConfigured() { return !!(this._clientId && this._clientSecret && this._deploymentId); }

  async getAccessToken() {
    if (!this.isConfigured) throw new Error('Epic Games not configured');
    const creds = Buffer.from(`${this._clientId}:${this._clientSecret}`).toString('base64');
    const response = await fetch('https://api.epicgames.dev/epic/oauth/v2/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    if (!response.ok) throw new Error('Epic auth failed');
    return response.json();
  }

  async getPlayerStats(playerId) {
    const { access_token } = await this.getAccessToken();
    const response = await fetch(
      `https://api.epicgames.dev/stats/v1/${this._deploymentId}/accounts/${playerId}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!response.ok) throw new Error('Failed to get Epic player stats');
    return response.json();
  }

  async getAchievements(playerId) {
    const { access_token } = await this.getAccessToken();
    const response = await fetch(
      `https://api.epicgames.dev/achievements/v1/${this._deploymentId}/accounts/${playerId}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!response.ok) throw new Error('Failed to get Epic achievements');
    const data = await response.json();
    return (data.achievements || []).map(a => this.normalizeAchievement(a));
  }

  // Unreal Engine project metrics (via Epic dev portal)
  async getProjectBuildStatus(projectId) {
    const { access_token } = await this.getAccessToken();
    const response = await fetch(
      `https://dev.epicgames.com/portal/api/v1/projects/${projectId}/builds`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!response.ok) return null;
    return response.json();
  }
}

// ─── Sony PlayStation connector ───────────────────────────────────────────────
export class SonyPSNConnector extends GamePlatformBase {
  constructor() {
    super('psn');
    this._clientId = process.env.PSN_CLIENT_ID;
    this._clientSecret = process.env.PSN_CLIENT_SECRET;
  }

  get isConfigured() { return !!(this._clientId && this._clientSecret); }

  async getAccessToken(userCode) {
    if (!this.isConfigured) throw new Error('PSN not configured');
    const response = await fetch('https://ca.account.sony.com/api/authz/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this._clientId,
        client_secret: this._clientSecret,
        grant_type: 'authorization_code',
        code: userCode,
        redirect_uri: process.env.PSN_REDIRECT_URI || 'https://nexusai.pro/auth/psn/callback'
      }).toString()
    });
    if (!response.ok) throw new Error('PSN auth failed');
    return response.json();
  }

  async getTrophies(accountId, accessToken) {
    const response = await fetch(
      `https://us-tpy.np.community.playstation.net/trophy/v1/trophyTitles?fields=%40default&limit=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error('Failed to get PSN trophies');
    return response.json();
  }

  async getPlayerProfile(accountId, accessToken) {
    const response = await fetch(
      `https://us-prof.np.community.playstation.net/userProfile/v1/users/${accountId}/profile2`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error('Failed to get PSN profile');
    return response.json();
  }
}

// ─── Microsoft Xbox connector ─────────────────────────────────────────────────
export class MicrosoftXboxConnector extends GamePlatformBase {
  constructor() {
    super('xbox');
    this._clientId = process.env.XBOX_CLIENT_ID;
    this._clientSecret = process.env.XBOX_CLIENT_SECRET;
    this._tenantId = process.env.XBOX_TENANT_ID || 'common';
  }

  get isConfigured() { return !!(this._clientId && this._clientSecret); }

  async getMsalToken() {
    if (!this.isConfigured) throw new Error('Xbox/Microsoft not configured');
    const response = await fetch(
      `https://login.microsoftonline.com/${this._tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this._clientId,
          client_secret: this._clientSecret,
          scope: 'https://xboxlive.com/.default'
        }).toString()
      }
    );
    if (!response.ok) throw new Error('Xbox auth failed');
    return response.json();
  }

  async getPlayerAchievements(xuid, accessToken) {
    const response = await fetch(
      `https://achievements.xboxlive.com/users/xuid(${xuid})/achievements`,
      {
        headers: {
          Authorization: `XBL3.0 x=;${accessToken}`,
          'x-xbl-contract-version': '2',
          Accept: 'application/json'
        }
      }
    );
    if (!response.ok) throw new Error('Failed to get Xbox achievements');
    const data = await response.json();
    return (data.achievements || []).map(a => this.normalizeAchievement({
      id: a.id,
      name: a.name,
      description: a.description,
      unlocked: a.progressState === 'Achieved',
      earn_date: a.progression?.timeUnlocked
    }));
  }

  async getGamePassCatalog() {
    const response = await fetch(
      'https://catalog.gamepass.com/sigls/v2?id=f13cf6bf-486c-4d32-8dab-35aa4b5afe73&language=en-US&market=US'
    );
    if (!response.ok) throw new Error('Failed to get Game Pass catalog');
    return response.json();
  }
}

// ─── Ubisoft Connect ──────────────────────────────────────────────────────────
export class UbisoftConnector extends GamePlatformBase {
  constructor() {
    super('ubisoft');
    this._appId = process.env.UBISOFT_APP_ID;
    this._apiKey = process.env.UBISOFT_API_KEY;
  }

  get isConfigured() { return !!(this._appId && this._apiKey); }

  async authenticate(ticket) {
    if (!this.isConfigured) throw new Error('Ubisoft not configured');
    const response = await fetch('https://public-ubiservices.ubi.com/v3/profiles/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this._appId}:${this._apiKey}`).toString('base64')}`,
        'Ubi-AppId': this._appId
      },
      body: JSON.stringify({ ticket })
    });
    if (!response.ok) throw new Error('Ubisoft auth failed');
    return response.json();
  }

  async getPlayerStats(profileId, sessionTicket) {
    const response = await fetch(
      `https://public-ubiservices.ubi.com/v1/profiles/${profileId}/stats`,
      {
        headers: {
          'Ubi-AppId': this._appId,
          'Ubi-SessionId': sessionTicket,
          Authorization: `Ubi_v1 t=${sessionTicket}`
        }
      }
    );
    if (!response.ok) throw new Error('Failed to get Ubisoft stats');
    return response.json();
  }
}

// ─── Game project tracker ─────────────────────────────────────────────────────
export class GameProjectTracker {
  constructor() {
    this.projects = new Map();
  }

  createProject(userId, data) {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const project = {
      id,
      userId,
      name: data.name,
      type: data.type, // 'game' | 'ar' | 'vr' | '3d' | 'app' | 'coding'
      engine: data.engine || null, // 'unreal' | 'unity' | 'godot' | 'custom' | null
      platforms: data.platforms || [],
      status: 'active',
      progress: 0,
      milestones: data.milestones || [],
      tasks: [],
      metrics: { commits: 0, builds: 0, playtests: 0, bugs: 0, features: 0 },
      connectedPlatforms: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.projects.set(id, project);
    return project;
  }

  updateProjectMetrics(projectId, metrics) {
    const project = this.projects.get(projectId);
    if (!project) return null;
    project.metrics = { ...project.metrics, ...metrics };
    project.updatedAt = Date.now();
    return project;
  }

  addMilestone(projectId, milestone) {
    const project = this.projects.get(projectId);
    if (!project) return null;
    const ms = { id: `ms_${Date.now()}`, ...milestone, completed: false, createdAt: Date.now() };
    project.milestones.push(ms);
    project.updatedAt = Date.now();
    return ms;
  }

  completeMilestone(projectId, milestoneId) {
    const project = this.projects.get(projectId);
    if (!project) return null;
    const ms = project.milestones.find(m => m.id === milestoneId);
    if (!ms) return null;
    ms.completed = true;
    ms.completedAt = Date.now();
    const completed = project.milestones.filter(m => m.completed).length;
    project.progress = Math.round((completed / project.milestones.length) * 100);
    project.updatedAt = Date.now();
    return project;
  }

  getProject(projectId) { return this.projects.get(projectId) || null; }
  getUserProjects(userId) {
    return [...this.projects.values()].filter(p => p.userId === userId);
  }
}

export const epicConnector = new EpicGamesConnector();
export const sonyConnector = new SonyPSNConnector();
export const xboxConnector = new MicrosoftXboxConnector();
export const ubisoftConnector = new UbisoftConnector();
export const gameProjectTracker = new GameProjectTracker();
