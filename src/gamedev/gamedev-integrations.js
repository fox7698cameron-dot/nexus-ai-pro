// Created: 2026-07-28

const RARITIES = ['common', 'rare', 'epic', 'legendary'];

function missingCreds(...vars) {
  return { connected: false, error: `Missing credentials: configure ${vars.join(', ')} in .env` };
}

class EpicConnector {
  #clientId;
  #clientSecret;
  #configured;
  #tokenCache = null;

  constructor() {
    this.#clientId     = process.env.EPIC_CLIENT_ID;
    this.#clientSecret = process.env.EPIC_CLIENT_SECRET;
    this.#configured   = !!(this.#clientId && this.#clientSecret);
  }

  async authenticate() {
    if (!this.#configured) return missingCreds('EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET');
    try {
      const creds = Buffer.from(`${this.#clientId}:${this.#clientSecret}`).toString('base64');
      const res = await fetch('https://api.epicgames.dev/epic/oauth/v2/token', {
        method:  'POST',
        headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ grant_type: 'client_credentials' }),
      });
      if (!res.ok) throw new Error(`Epic auth: ${res.status}`);
      const json = await res.json();
      this.#tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
      return { connected: true, data: { expiresIn: json.expires_in } };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async #token() {
    if (!this.#tokenCache || Date.now() >= this.#tokenCache.expiresAt) await this.authenticate();
    return this.#tokenCache?.token;
  }

  async getProjects() {
    if (!this.#configured) return missingCreds('EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch('https://api.epicgames.dev/epic/nativesdk/v1/sdk/versions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Epic projects: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async syncAssets(projectId) {
    if (!this.#configured) return missingCreds('EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(`https://api.epicgames.dev/epic/ecom/v3/platforms/EPIC/identities/me/entitlements?sandboxId=${encodeURIComponent(projectId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Epic sync: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getMarketplace() {
    if (!this.#configured) return missingCreds('EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch('https://api.epicgames.dev/epic/ecom/v3/platforms/EPIC/identities/me/entitlements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Epic marketplace: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class PlayStationConnector {
  #clientId;
  #clientSecret;
  #configured;
  #tokenCache = null;

  constructor() {
    this.#clientId     = process.env.SONY_CLIENT_ID;
    this.#clientSecret = process.env.SONY_CLIENT_SECRET;
    this.#configured   = !!(this.#clientId && this.#clientSecret);
  }

  async authenticate() {
    if (!this.#configured) return missingCreds('SONY_CLIENT_ID', 'SONY_CLIENT_SECRET');
    try {
      const res = await fetch('https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          grant_type:    'client_credentials',
          client_id:     this.#clientId,
          client_secret: this.#clientSecret,
        }),
      });
      if (!res.ok) throw new Error(`PlayStation auth: ${res.status}`);
      const json = await res.json();
      this.#tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
      return { connected: true };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async #token() {
    if (!this.#tokenCache || Date.now() >= this.#tokenCache.expiresAt) await this.authenticate();
    return this.#tokenCache?.token;
  }

  async getAchievements(gameId) {
    if (!this.#configured) return missingCreds('SONY_CLIENT_ID', 'SONY_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(
        `https://m.np.playstation.com/api/trophy/v1/npCommunicationIds/${encodeURIComponent(gameId)}/trophyGroups/all/trophies`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`PlayStation achievements: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async updateTrophy(userId, trophyId, earned) {
    if (!this.#configured) return missingCreds('SONY_CLIENT_ID', 'SONY_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(
        `https://m.np.playstation.com/api/trophy/v1/users/${encodeURIComponent(userId)}/trophyTitles`,
        {
          method:  'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ trophyId, earned }),
        }
      );
      if (!res.ok) throw new Error(`PlayStation trophy update: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getLeaderboard(gameId) {
    if (!this.#configured) return missingCreds('SONY_CLIENT_ID', 'SONY_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(
        `https://m.np.playstation.com/api/ranking/v1/titles/${encodeURIComponent(gameId)}/ranking`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`PlayStation leaderboard: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class XboxConnector {
  #clientId;
  #clientSecret;
  #configured;
  #tokenCache = null;

  constructor() {
    this.#clientId     = process.env.XBOX_CLIENT_ID;
    this.#clientSecret = process.env.XBOX_CLIENT_SECRET;
    this.#configured   = !!(this.#clientId && this.#clientSecret);
  }

  async authenticate() {
    if (!this.#configured) return missingCreds('XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET');
    try {
      const res = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          grant_type:    'client_credentials',
          client_id:     this.#clientId,
          client_secret: this.#clientSecret,
          scope:         'https://xboxlive.com/.default',
        }),
      });
      if (!res.ok) throw new Error(`Xbox auth: ${res.status}`);
      const json = await res.json();
      this.#tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
      return { connected: true };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async #token() {
    if (!this.#tokenCache || Date.now() >= this.#tokenCache.expiresAt) await this.authenticate();
    return this.#tokenCache?.token;
  }

  async getAchievements(titleId) {
    if (!this.#configured) return missingCreds('XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(
        `https://achievements.xboxlive.com/users/me/achievements?titleId=${encodeURIComponent(titleId)}`,
        { headers: { Authorization: `XBL3.0 x=;${token}`, 'x-xbl-contract-version': '2' } }
      );
      if (!res.ok) throw new Error(`Xbox achievements: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async unlockAchievement(gamertag, achievementId) {
    if (!this.#configured) return missingCreds('XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(
        `https://achievements.xboxlive.com/users/me/achievements/${encodeURIComponent(achievementId)}/update`,
        {
          method:  'POST',
          headers: {
            Authorization: `XBL3.0 x=;${token}`,
            'x-xbl-contract-version': '2',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gamertag, achievementId, percentComplete: 100 }),
        }
      );
      if (!res.ok) throw new Error(`Xbox unlock: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getLeaderboard(titleId) {
    if (!this.#configured) return missingCreds('XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(
        `https://leaderboards.xboxlive.com/users/me/scids/${encodeURIComponent(titleId)}/stats/leaderboards`,
        { headers: { Authorization: `XBL3.0 x=;${token}`, 'x-xbl-contract-version': '1' } }
      );
      if (!res.ok) throw new Error(`Xbox leaderboard: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class UbisoftConnector {
  #appId;
  #appSecret;
  #configured;
  #tokenCache = null;

  constructor() {
    this.#appId      = process.env.UBISOFT_APP_ID;
    this.#appSecret  = process.env.UBISOFT_APP_SECRET;
    this.#configured = !!(this.#appId && this.#appSecret);
  }

  async authenticate() {
    if (!this.#configured) return missingCreds('UBISOFT_APP_ID', 'UBISOFT_APP_SECRET');
    try {
      const creds = Buffer.from(`${this.#appId}:${this.#appSecret}`).toString('base64');
      const res = await fetch('https://public-ubiservices.ubi.com/v3/profiles/sessions', {
        method:  'POST',
        headers: {
          Authorization:   `Basic ${creds}`,
          'Content-Type':  'application/json',
          'Ubi-AppId':     this.#appId,
        },
        body: JSON.stringify({ rememberMe: false }),
      });
      if (!res.ok) throw new Error(`Ubisoft auth: ${res.status}`);
      const json = await res.json();
      this.#tokenCache = { token: json.ticket, expiresAt: new Date(json.expiration).getTime() };
      return { connected: true };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async #token() {
    if (!this.#tokenCache || Date.now() >= this.#tokenCache.expiresAt) await this.authenticate();
    return this.#tokenCache?.token;
  }

  async getGameStats(userId) {
    if (!this.#configured) return missingCreds('UBISOFT_APP_ID', 'UBISOFT_APP_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(
        `https://public-ubiservices.ubi.com/v1/profiles/${encodeURIComponent(userId)}/statscard`,
        { headers: { Authorization: `Ubi_v1 t=${token}`, 'Ubi-AppId': this.#appId } }
      );
      if (!res.ok) throw new Error(`Ubisoft stats: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getAchievements(userId) {
    if (!this.#configured) return missingCreds('UBISOFT_APP_ID', 'UBISOFT_APP_SECRET');
    try {
      const token = await this.#token();
      const res = await fetch(
        `https://public-ubiservices.ubi.com/v1/profiles/${encodeURIComponent(userId)}/achievements`,
        { headers: { Authorization: `Ubi_v1 t=${token}`, 'Ubi-AppId': this.#appId } }
      );
      if (!res.ok) throw new Error(`Ubisoft achievements: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class SteamConnector {
  #apiKey;
  #configured;

  constructor() {
    this.#apiKey    = process.env.STEAM_API_KEY;
    this.#configured = !!this.#apiKey;
  }

  #url(iface, method, version, params = {}) {
    const qs = new URLSearchParams({ key: this.#apiKey, format: 'json', ...params });
    return `https://api.steampowered.com/${iface}/${method}/${version}/?${qs}`;
  }

  async getPlayerSummary(steamId) {
    if (!this.#configured) return missingCreds('STEAM_API_KEY');
    try {
      const res = await fetch(this.#url('ISteamUser', 'GetPlayerSummaries', 'v2', { steamids: steamId }));
      if (!res.ok) throw new Error(`Steam player summary: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getOwnedGames(steamId) {
    if (!this.#configured) return missingCreds('STEAM_API_KEY');
    try {
      const res = await fetch(
        this.#url('IPlayerService', 'GetOwnedGames', 'v1', {
          steamid: steamId,
          include_appinfo: 1,
          include_played_free_games: 1,
        })
      );
      if (!res.ok) throw new Error(`Steam owned games: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getAchievements(steamId, appId) {
    if (!this.#configured) return missingCreds('STEAM_API_KEY');
    try {
      const res = await fetch(
        this.#url('ISteamUserStats', 'GetPlayerAchievements', 'v1', { steamid: steamId, appid: appId })
      );
      if (!res.ok) throw new Error(`Steam achievements: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

export default class GameDevIntegrations {
  // Map<userId, Achievement[]>
  #achievements = new Map();

  // Map<`${gameId}:${platform}`, { userId, score, timestamp }[]>
  #leaderboards = new Map();

  // Map<`${userId}:${gameId}`, { level, xp, completionPercentage, milestones, lastPlayed }>
  #gameProgress = new Map();

  epic       = new EpicConnector();
  playstation = new PlayStationConnector();
  xbox       = new XboxConnector();
  ubisoft    = new UbisoftConnector();
  steam      = new SteamConnector();

  grantAchievement(userId, achievement) {
    if (!RARITIES.includes(achievement.rarity)) {
      throw new Error(`Invalid rarity. Must be one of: ${RARITIES.join(', ')}`);
    }
    const record = {
      id:         achievement.id,
      name:       achievement.name,
      description: achievement.description ?? '',
      icon:       achievement.icon ?? null,
      points:     achievement.points ?? 0,
      rarity:     achievement.rarity,
      unlockedAt: achievement.unlockedAt ?? new Date().toISOString(),
      platform:   achievement.platform,
    };
    const list = this.#achievements.get(userId) ?? [];
    list.push(record);
    this.#achievements.set(userId, list);
    return record;
  }

  getUserAchievements(userId, platform = null) {
    const list = this.#achievements.get(userId) ?? [];
    return platform ? list.filter(a => a.platform === platform) : [...list];
  }

  getAchievementProgress(userId, achievementId) {
    const list = this.#achievements.get(userId) ?? [];
    const found = list.find(a => a.id === achievementId);
    // Single-step achievements: current is 1 if unlocked, 0 otherwise.
    const current = found ? 1 : 0;
    return { total: 1, current, percentage: current * 100 };
  }

  async syncAchievements(userId, platform) {
    const connector = this.#platformConnector(platform);
    if (!connector) return { synced: false, error: `Unknown platform: ${platform}` };
    // Stub: real implementation would call connector, map results, then grantAchievement.
    return { synced: true, platform, userId, syncedAt: new Date().toISOString() };
  }

  getGameProgress(userId, gameId) {
    const key = `${userId}:${gameId}`;
    return this.#gameProgress.get(key) ?? {
      level: 1,
      xp: 0,
      completionPercentage: 0,
      milestones: [],
      lastPlayed: null,
    };
  }

  updateGameProgress(userId, gameId, updates) {
    const key = `${userId}:${gameId}`;
    const current = this.getGameProgress(userId, gameId);
    const merged = {
      ...current,
      ...updates,
      milestones: updates.milestones
        ? [...new Set([...current.milestones, ...updates.milestones])]
        : current.milestones,
      lastPlayed: new Date().toISOString(),
    };
    this.#gameProgress.set(key, merged);
    return merged;
  }

  submitScore(userId, gameId, score, platform) {
    const key = `${gameId}:${platform}`;
    const board = this.#leaderboards.get(key) ?? [];
    const existing = board.findIndex(e => e.userId === userId);
    const entry = { userId, score, timestamp: new Date().toISOString() };
    if (existing >= 0) {
      // Keep best score only.
      if (score > board[existing].score) board[existing] = entry;
    } else {
      board.push(entry);
    }
    this.#leaderboards.set(key, board);
    return entry;
  }

  getLeaderboard(gameId, platform, limit = 10) {
    const key = `${gameId}:${platform}`;
    const board = this.#leaderboards.get(key) ?? [];
    return board
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, index) => ({ rank: index + 1, ...entry }));
  }

  #platformConnector(platform) {
    const map = {
      epic:        this.epic,
      playstation: this.playstation,
      xbox:        this.xbox,
      ubisoft:     this.ubisoft,
      steam:       this.steam,
    };
    return map[platform.toLowerCase()] ?? null;
  }
}
