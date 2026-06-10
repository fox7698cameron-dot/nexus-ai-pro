// /home/user/nexus-ai-pro/src/lib/gameIntegrations.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

/**
 * Game platform integration connectors for Nexus AI Pro.
 * All credentials are read from environment variables — no hardcoded secrets.
 * @module gameIntegrations
 */

// ─── Typed Errors ─────────────────────────────────────────────────────────────

export class GameIntegrationError extends Error {
  /** @param {string} message @param {string} platform @param {number} [statusCode] */
  constructor(message, platform, statusCode) {
    super(message);
    this.name = 'GameIntegrationError';
    this.platform = platform;
    this.statusCode = statusCode ?? null;
  }
}

export class AuthenticationError extends GameIntegrationError {
  /** @param {string} platform */
  constructor(platform) {
    super(`Authentication failed for platform: ${platform}`, platform, 401);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends GameIntegrationError {
  /** @param {string} resource @param {string} platform */
  constructor(resource, platform) {
    super(`Resource not found: ${resource}`, platform, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends GameIntegrationError {
  /** @param {string} platform */
  constructor(platform) {
    super(`Rate limit exceeded for platform: ${platform}`, platform, 429);
    this.name = 'RateLimitError';
  }
}

// ─── Schema Factories ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} Achievement
 * @property {string}      id
 * @property {string}      title
 * @property {string}      description
 * @property {number}      points
 * @property {boolean}     unlocked
 * @property {string|null} unlockedAt  ISO 8601 or null
 * @property {string}      platform
 * @property {string}      iconUrl
 */

/**
 * @typedef {Object} GameProgress
 * @property {string}   gameId
 * @property {string}   title
 * @property {string}   platform
 * @property {number}   completion   0-100
 * @property {number}   playtime     minutes
 * @property {string}   lastPlayed   ISO 8601
 * @property {number}   trophies
 */

/**
 * Normalise raw achievement data into the canonical Achievement schema.
 * @param {object} raw
 * @param {string} platform
 * @returns {Achievement}
 */
function normaliseAchievement(raw, platform) {
  return {
    id:          String(raw.id ?? raw.achievementId ?? ''),
    title:       String(raw.title ?? raw.name ?? ''),
    description: String(raw.description ?? raw.desc ?? ''),
    points:      Number(raw.points ?? raw.xp ?? raw.gamerscore ?? 0),
    unlocked:    Boolean(raw.unlocked ?? raw.earned ?? raw.achieved ?? false),
    unlockedAt:  raw.unlockedAt ?? raw.earnedAt ?? raw.achievedAt ?? null,
    platform,
    iconUrl:     String(raw.iconUrl ?? raw.icon ?? raw.image ?? '')
  };
}

/**
 * Normalise raw game data into the canonical GameProgress schema.
 * @param {object} raw
 * @param {string} platform
 * @returns {GameProgress}
 */
function normaliseGameProgress(raw, platform) {
  return {
    gameId:     String(raw.gameId ?? raw.titleId ?? raw.id ?? ''),
    title:      String(raw.title ?? raw.name ?? ''),
    platform,
    completion: Number(raw.completion ?? raw.completionPercent ?? raw.progress ?? 0),
    playtime:   Number(raw.playtime ?? raw.playTimeMinutes ?? raw.minutesPlayed ?? 0),
    lastPlayed: raw.lastPlayed ?? raw.lastPlayedTime ?? new Date(0).toISOString(),
    trophies:   Number(raw.trophies ?? raw.achievementCount ?? raw.awards ?? 0)
  };
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

/**
 * Minimal fetch wrapper that maps HTTP error codes to typed errors.
 * @param {string} url
 * @param {RequestInit} options
 * @param {string} platform
 * @returns {Promise<unknown>}
 */
async function platformFetch(url, options, platform) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (cause) {
    throw new GameIntegrationError(`Network error: ${cause.message}`, platform);
  }

  if (response.status === 401 || response.status === 403) throw new AuthenticationError(platform);
  if (response.status === 404) throw new NotFoundError(url, platform);
  if (response.status === 429) throw new RateLimitError(platform);
  if (!response.ok) throw new GameIntegrationError(`HTTP ${response.status}`, platform, response.status);

  return response.json();
}

// ─── Connector: Unreal Engine (REST API) ──────────────────────────────────────

/**
 * @typedef {Object} UnrealCredentials
 * @property {string} [endpoint]     Base URL for the Unreal Engine REST API
 * @property {string} [apiKey]       API key (falls back to UNREAL_API_KEY)
 */

/**
 * Unreal Engine REST API connector (stub adapter).
 */
export const UnrealEngineConnector = {
  _token: null,
  _endpoint: null,

  /**
   * Authenticate against the Unreal Engine REST endpoint.
   * @param {UnrealCredentials} [credentials={}]
   * @returns {Promise<{ connected: boolean, endpoint: string }>}
   */
  async connect(credentials = {}) {
    const apiKey   = credentials.apiKey ?? process.env.UNREAL_API_KEY ?? '';
    const endpoint = credentials.endpoint ?? process.env.UNREAL_API_ENDPOINT ?? 'https://api.unrealengine.local';

    if (!apiKey) throw new AuthenticationError('unreal');

    this._token    = apiKey;
    this._endpoint = endpoint;
    return { connected: true, endpoint };
  },

  /**
   * Retrieve achievements for a user.
   * @param {string} userId
   * @returns {Promise<Achievement[]>}
   */
  async getAchievements(userId) {
    if (!this._token) throw new AuthenticationError('unreal');
    const data = await platformFetch(
      `${this._endpoint}/v1/users/${encodeURIComponent(userId)}/achievements`,
      { headers: { Authorization: `Bearer ${this._token}` } },
      'unreal'
    );
    const items = Array.isArray(data) ? data : (data.achievements ?? []);
    return items.map(r => normaliseAchievement(r, 'unreal'));
  },

  /**
   * Retrieve game progress for a user and game.
   * @param {string} userId
   * @param {string} gameId
   * @returns {Promise<GameProgress>}
   */
  async getGameProgress(userId, gameId) {
    if (!this._token) throw new AuthenticationError('unreal');
    const data = await platformFetch(
      `${this._endpoint}/v1/users/${encodeURIComponent(userId)}/games/${encodeURIComponent(gameId)}`,
      { headers: { Authorization: `Bearer ${this._token}` } },
      'unreal'
    );
    return normaliseGameProgress(data, 'unreal');
  },

  /**
   * Sync user stats to the Unreal telemetry endpoint.
   * @param {string} userId
   * @returns {Promise<{ synced: boolean, timestamp: string }>}
   */
  async syncStats(userId) {
    if (!this._token) throw new AuthenticationError('unreal');
    await platformFetch(
      `${this._endpoint}/v1/users/${encodeURIComponent(userId)}/sync`,
      { method: 'POST', headers: { Authorization: `Bearer ${this._token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) },
      'unreal'
    );
    return { synced: true, timestamp: new Date().toISOString() };
  }
};

// ─── Connector: Epic Games Store ──────────────────────────────────────────────

/**
 * @typedef {Object} EpicCredentials
 * @property {string} [clientId]     Falls back to EPIC_CLIENT_ID
 * @property {string} [clientSecret] Falls back to EPIC_CLIENT_SECRET
 */

/**
 * Epic Games Store OAuth2 connector (stub adapter).
 */
export const EpicGamesConnector = {
  _accessToken: null,

  /**
   * Obtain a client_credentials access token from Epic's OAuth endpoint.
   * @param {EpicCredentials} [credentials={}]
   * @returns {Promise<{ connected: boolean, expiresIn: number }>}
   */
  async connect(credentials = {}) {
    const clientId     = credentials.clientId     ?? process.env.EPIC_CLIENT_ID     ?? '';
    const clientSecret = credentials.clientSecret ?? process.env.EPIC_CLIENT_SECRET ?? '';

    if (!clientId || !clientSecret) throw new AuthenticationError('epic');

    const body = new URLSearchParams({ grant_type: 'client_credentials', deployment_id: clientId });
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const data = await platformFetch(
      'https://api.epicgames.dev/epic/oauth/v2/token',
      {
        method:  'POST',
        headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString()
      },
      'epic'
    );

    this._accessToken = data.access_token;
    return { connected: true, expiresIn: data.expires_in ?? 3600 };
  },

  /**
   * @param {string} userId
   * @returns {Promise<Achievement[]>}
   */
  async getAchievements(userId) {
    if (!this._accessToken) throw new AuthenticationError('epic');
    const data = await platformFetch(
      `https://api.epicgames.dev/epic/achievements/v1/player/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${this._accessToken}` } },
      'epic'
    );
    const items = Array.isArray(data) ? data : (data.achievements ?? []);
    return items.map(r => normaliseAchievement(r, 'epic'));
  },

  /**
   * @param {string} userId
   * @param {string} gameId
   * @returns {Promise<GameProgress>}
   */
  async getGameProgress(userId, gameId) {
    if (!this._accessToken) throw new AuthenticationError('epic');
    const data = await platformFetch(
      `https://api.epicgames.dev/epic/games/v1/player/${encodeURIComponent(userId)}/title/${encodeURIComponent(gameId)}`,
      { headers: { Authorization: `Bearer ${this._accessToken}` } },
      'epic'
    );
    return normaliseGameProgress(data, 'epic');
  },

  /**
   * @param {string} userId
   * @returns {Promise<{ synced: boolean, timestamp: string }>}
   */
  async syncStats(userId) {
    if (!this._accessToken) throw new AuthenticationError('epic');
    await platformFetch(
      `https://api.epicgames.dev/epic/stats/v1/player/${encodeURIComponent(userId)}/sync`,
      { method: 'POST', headers: { Authorization: `Bearer ${this._accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) },
      'epic'
    );
    return { synced: true, timestamp: new Date().toISOString() };
  }
};

// ─── Connector: Sony PSN ──────────────────────────────────────────────────────

/**
 * @typedef {Object} PSNCredentials
 * @property {string} [apiKey] Falls back to PSN_API_KEY
 */

/**
 * Sony PlayStation Network connector (stub adapter).
 */
export const PSNConnector = {
  _apiKey: null,
  _base:   'https://m.np.playstation.com/api',

  /**
   * @param {PSNCredentials} [credentials={}]
   * @returns {Promise<{ connected: boolean }>}
   */
  async connect(credentials = {}) {
    const apiKey = credentials.apiKey ?? process.env.PSN_API_KEY ?? '';
    if (!apiKey) throw new AuthenticationError('psn');
    this._apiKey = apiKey;
    return { connected: true };
  },

  /**
   * @param {string} userId
   * @returns {Promise<Achievement[]>}
   */
  async getAchievements(userId) {
    if (!this._apiKey) throw new AuthenticationError('psn');
    const data = await platformFetch(
      `${this._base}/trophy/v1/users/${encodeURIComponent(userId)}/trophyTitles`,
      { headers: { Authorization: `Bearer ${this._apiKey}` } },
      'psn'
    );
    const items = Array.isArray(data) ? data : (data.trophyTitles ?? []);
    return items.map(r => normaliseAchievement({ ...r, unlocked: r.hasTrophyGroups ?? false }, 'psn'));
  },

  /**
   * @param {string} userId
   * @param {string} gameId
   * @returns {Promise<GameProgress>}
   */
  async getGameProgress(userId, gameId) {
    if (!this._apiKey) throw new AuthenticationError('psn');
    const data = await platformFetch(
      `${this._base}/gamelist/v2/users/${encodeURIComponent(userId)}/titles/${encodeURIComponent(gameId)}`,
      { headers: { Authorization: `Bearer ${this._apiKey}` } },
      'psn'
    );
    return normaliseGameProgress(data, 'psn');
  },

  /**
   * @param {string} userId
   * @returns {Promise<{ synced: boolean, timestamp: string }>}
   */
  async syncStats(userId) {
    if (!this._apiKey) throw new AuthenticationError('psn');
    await platformFetch(
      `${this._base}/userProfile/v1/users/${encodeURIComponent(userId)}/sync`,
      { method: 'POST', headers: { Authorization: `Bearer ${this._apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) },
      'psn'
    );
    return { synced: true, timestamp: new Date().toISOString() };
  }
};

// ─── Connector: Microsoft Xbox Live ───────────────────────────────────────────

/**
 * @typedef {Object} XboxCredentials
 * @property {string} [clientId]     Falls back to XBOX_CLIENT_ID
 * @property {string} [clientSecret] Falls back to XBOX_CLIENT_SECRET
 */

/**
 * Microsoft Xbox Live OAuth2 connector (stub adapter).
 */
export const XboxLiveConnector = {
  _xstsToken: null,

  /**
   * Exchange Azure AD credentials for an XSTS token.
   * @param {XboxCredentials} [credentials={}]
   * @returns {Promise<{ connected: boolean }>}
   */
  async connect(credentials = {}) {
    const clientId     = credentials.clientId     ?? process.env.XBOX_CLIENT_ID     ?? '';
    const clientSecret = credentials.clientSecret ?? process.env.XBOX_CLIENT_SECRET ?? '';

    if (!clientId || !clientSecret) throw new AuthenticationError('xbox');

    const aadBody = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
      scope:         'https://user.auth.xboxlive.com/.default'
    });

    const aadData = await platformFetch(
      'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: aadBody.toString() },
      'xbox'
    );

    // Exchange AAD token for XSTS
    const xstsData = await platformFetch(
      'https://xsts.auth.xboxlive.com/xsts/authorize',
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify({ Properties: { SandboxId: 'RETAIL', UserTokens: [aadData.access_token] }, RelyingParty: 'http://xboxlive.com', TokenType: 'JWT' })
      },
      'xbox'
    );

    this._xstsToken = xstsData.Token;
    return { connected: true };
  },

  /**
   * @param {string} userId  Xbox User ID (XUID)
   * @returns {Promise<Achievement[]>}
   */
  async getAchievements(userId) {
    if (!this._xstsToken) throw new AuthenticationError('xbox');
    const data = await platformFetch(
      `https://achievements.xboxlive.com/users/xuid(${encodeURIComponent(userId)})/achievements`,
      { headers: { Authorization: `XBL3.0 x=;${this._xstsToken}`, 'x-xbl-contract-version': '2', Accept: 'application/json' } },
      'xbox'
    );
    const items = Array.isArray(data) ? data : (data.achievements ?? []);
    return items.map(r => normaliseAchievement({ ...r, points: r.rewards?.[0]?.value ?? 0 }, 'xbox'));
  },

  /**
   * @param {string} userId
   * @param {string} gameId  Title ID
   * @returns {Promise<GameProgress>}
   */
  async getGameProgress(userId, gameId) {
    if (!this._xstsToken) throw new AuthenticationError('xbox');
    const data = await platformFetch(
      `https://achievements.xboxlive.com/users/xuid(${encodeURIComponent(userId)})/titleAchievements?titleId=${encodeURIComponent(gameId)}`,
      { headers: { Authorization: `XBL3.0 x=;${this._xstsToken}`, 'x-xbl-contract-version': '2', Accept: 'application/json' } },
      'xbox'
    );
    return normaliseGameProgress(data, 'xbox');
  },

  /**
   * @param {string} userId
   * @returns {Promise<{ synced: boolean, timestamp: string }>}
   */
  async syncStats(userId) {
    if (!this._xstsToken) throw new AuthenticationError('xbox');
    await platformFetch(
      `https://profile.xboxlive.com/users/xuid(${encodeURIComponent(userId)})/settings/sync`,
      { method: 'POST', headers: { Authorization: `XBL3.0 x=;${this._xstsToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) },
      'xbox'
    );
    return { synced: true, timestamp: new Date().toISOString() };
  }
};

// ─── Connector: Ubisoft Connect ───────────────────────────────────────────────

/**
 * @typedef {Object} UbisoftCredentials
 * @property {string} [appId]     Falls back to UBISOFT_APP_ID
 * @property {string} [appSecret] Falls back to UBISOFT_APP_SECRET
 */

/**
 * Ubisoft Connect connector (stub adapter).
 */
export const UbisoftConnector = {
  _ticket:  null,
  _spaceId: null,
  _base:    'https://public-ubiservices.ubi.com',

  /**
   * Authenticate with Ubisoft Services using Basic auth.
   * @param {UbisoftCredentials} [credentials={}]
   * @returns {Promise<{ connected: boolean, spaceId: string }>}
   */
  async connect(credentials = {}) {
    const appId     = credentials.appId     ?? process.env.UBISOFT_APP_ID     ?? '';
    const appSecret = credentials.appSecret ?? process.env.UBISOFT_APP_SECRET ?? '';

    if (!appId || !appSecret) throw new AuthenticationError('ubisoft');

    const encoded = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    const data = await platformFetch(
      `${this._base}/v3/profiles/sessions`,
      { method: 'POST', headers: { Authorization: `Basic ${encoded}`, 'Ubi-AppId': appId, 'Content-Type': 'application/json' }, body: '{}' },
      'ubisoft'
    );

    this._ticket  = data.ticket;
    this._spaceId = data.spaceId ?? appId;
    return { connected: true, spaceId: this._spaceId };
  },

  /**
   * @param {string} userId  Ubisoft profile ID
   * @returns {Promise<Achievement[]>}
   */
  async getAchievements(userId) {
    if (!this._ticket) throw new AuthenticationError('ubisoft');
    const data = await platformFetch(
      `${this._base}/v1/spaces/${this._spaceId}/statsfetchersummarized?populations=${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Ubi_v1 t=${this._ticket}`, 'Ubi-AppId': this._spaceId } },
      'ubisoft'
    );
    const items = data.results?.[userId]?.achievements ?? [];
    return items.map(r => normaliseAchievement(r, 'ubisoft'));
  },

  /**
   * @param {string} userId
   * @param {string} gameId  Space ID or product ID
   * @returns {Promise<GameProgress>}
   */
  async getGameProgress(userId, gameId) {
    if (!this._ticket) throw new AuthenticationError('ubisoft');
    const data = await platformFetch(
      `${this._base}/v2/spaces/${encodeURIComponent(gameId)}/statsfetchersummarized?populations=${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Ubi_v1 t=${this._ticket}`, 'Ubi-AppId': this._spaceId } },
      'ubisoft'
    );
    return normaliseGameProgress(data.results?.[userId] ?? data, 'ubisoft');
  },

  /**
   * @param {string} userId
   * @returns {Promise<{ synced: boolean, timestamp: string }>}
   */
  async syncStats(userId) {
    if (!this._ticket) throw new AuthenticationError('ubisoft');
    await platformFetch(
      `${this._base}/v1/profiles/${encodeURIComponent(userId)}/sync`,
      { method: 'POST', headers: { Authorization: `Ubi_v1 t=${this._ticket}`, 'Ubi-AppId': this._spaceId, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) },
      'ubisoft'
    );
    return { synced: true, timestamp: new Date().toISOString() };
  }
};

// ─── Connector Registry ───────────────────────────────────────────────────────

/**
 * Map of supported platform identifiers to their connector objects.
 * @type {Record<string, typeof UnrealEngineConnector>}
 */
export const connectors = {
  unreal:  UnrealEngineConnector,
  epic:    EpicGamesConnector,
  psn:     PSNConnector,
  xbox:    XboxLiveConnector,
  ubisoft: UbisoftConnector
};

/**
 * Resolve a connector by platform key.
 * @param {string} platform
 * @returns {typeof UnrealEngineConnector}
 */
export function getConnector(platform) {
  const connector = connectors[platform.toLowerCase()];
  if (!connector) throw new GameIntegrationError(`Unknown platform: ${platform}`, platform);
  return connector;
}
