// Created: 2026-09-30
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// gameConnectors.js — OAuth2 + achievement sync connectors for gaming platforms.
// All API credentials are read from process.env — never hardcoded.

import { createLogger, format, transports } from 'winston';

// ─── Logger ───────────────────────────────────────────────────────────────────

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  defaultMeta: { service: 'gameConnectors' },
  transports: [new transports.Console()],
});

// ─── In-memory cache with TTL ─────────────────────────────────────────────────

/**
 * Simple TTL cache keyed by string.
 * @template T
 */
class TtlCache {
  /** @param {number} defaultTtlMs */
  constructor(defaultTtlMs = 60_000) {
    this._store = new Map();
    this._defaultTtl = defaultTtlMs;
  }

  /**
   * Retrieve a cached value; returns `undefined` if missing or expired.
   * @param {string} key
   * @returns {T|undefined}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Store a value with an optional TTL override.
   * @param {string} key
   * @param {T}      value
   * @param {number} [ttlMs]
   */
  set(key, value, ttlMs) {
    this._store.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this._defaultTtl) });
  }

  /** Remove a specific key immediately. */
  invalidate(key) {
    this._store.delete(key);
  }

  /** Clear all entries. */
  clear() {
    this._store.clear();
  }
}

// ─── Rate limiter (token-bucket per platform) ─────────────────────────────────

/**
 * Simple per-key token-bucket rate limiter.
 */
class RateLimiter {
  /**
   * @param {number} tokensPerWindow  – requests allowed per window
   * @param {number} windowMs         – rolling window duration in milliseconds
   */
  constructor(tokensPerWindow, windowMs) {
    this._max = tokensPerWindow;
    this._windowMs = windowMs;
    this._buckets = new Map(); // key -> { tokens: number, windowStart: number }
  }

  /**
   * Check and consume one token for `key`.
   * @param {string} key
   * @returns {{ allowed: boolean, retryAfterMs: number }}
   */
  consume(key) {
    const now = Date.now();
    let bucket = this._buckets.get(key);
    if (!bucket || now - bucket.windowStart >= this._windowMs) {
      bucket = { tokens: this._max, windowStart: now };
    }
    if (bucket.tokens <= 0) {
      const retryAfterMs = this._windowMs - (now - bucket.windowStart);
      this._buckets.set(key, bucket);
      return { allowed: false, retryAfterMs };
    }
    bucket.tokens -= 1;
    this._buckets.set(key, bucket);
    return { allowed: true, retryAfterMs: 0 };
  }
}

// Shared per-platform rate limiters (configured conservatively)
const rateLimiters = {
  epic:        new RateLimiter(30,  60_000),  // 30 req / min
  xbox:        new RateLimiter(20,  60_000),  // 20 req / min
  playstation: new RateLimiter(15,  60_000),  // 15 req / min
  ubisoft:     new RateLimiter(25,  60_000),  // 25 req / min
};

// Shared TTL caches per platform (5-minute default)
const caches = {
  epic:        new TtlCache(5 * 60_000),
  xbox:        new TtlCache(5 * 60_000),
  playstation: new TtlCache(5 * 60_000),
  ubisoft:     new TtlCache(5 * 60_000),
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Execute a rate-limited, cached API call.
 *
 * @param {string}            platformId  – 'epic' | 'xbox' | 'playstation' | 'ubisoft'
 * @param {string}            cacheKey    – unique cache key for this request
 * @param {() => Promise<*>}  apiFn       – the fetch/API call to execute when cache misses
 * @param {number}            [ttlMs]     – optional TTL override for the cached result
 * @returns {Promise<*>}
 */
async function cachedApiCall(platformId, cacheKey, apiFn, ttlMs) {
  const cache = caches[platformId];
  const limiter = rateLimiters[platformId];

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    logger.debug('Cache hit', { platformId, cacheKey });
    return cached;
  }

  // Rate-limit check
  const { allowed, retryAfterMs } = limiter.consume(platformId);
  if (!allowed) {
    const err = new Error(`Rate limit exceeded for platform "${platformId}". Retry after ${retryAfterMs}ms.`);
    err.code = 'RATE_LIMITED';
    err.retryAfterMs = retryAfterMs;
    throw err;
  }

  const result = await apiFn();
  cache.set(cacheKey, result, ttlMs);
  return result;
}

/**
 * Validate that required environment variables are present.
 * @param {string[]} keys
 * @param {string}   platformId
 */
function requireEnv(keys, platformId) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `[${platformId}] Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

// ─── Epic Games / Unreal Engine connector ────────────────────────────────────

/**
 * @typedef {object} EpicConnector
 * @property {() => string}                    getAuthUrl
 * @property {(code: string) => Promise<*>}   exchangeCode
 * @property {(token: string) => Promise<*>}  refreshToken
 * @property {(token: string, accountId: string) => Promise<*>} getAchievements
 * @property {(token: string, accountId: string) => Promise<*>} getGameProgress
 * @property {() => Promise<boolean>}         testConnection
 */

/**
 * Factory for the Epic Games / Unreal Engine connector.
 * Reads: EPIC_CLIENT_ID, EPIC_CLIENT_SECRET, EPIC_REDIRECT_URI
 * @returns {EpicConnector}
 */
export function createEpicConnector() {
  const PLATFORM = 'epic';
  const BASE_URL = 'https://api.epicgames.com';
  const AUTH_URL = 'https://www.epicgames.com/id/authorize';
  const TOKEN_URL = 'https://api.epicgames.com/epic/oauth/v2/token';

  function credentials() {
    requireEnv(['EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET', 'EPIC_REDIRECT_URI'], PLATFORM);
    return {
      clientId:     process.env.EPIC_CLIENT_ID,
      clientSecret: process.env.EPIC_CLIENT_SECRET,
      redirectUri:  process.env.EPIC_REDIRECT_URI,
    };
  }

  return {
    /**
     * Build the OAuth2 authorization URL for the Epic Games consent screen.
     * @param {string} [state] – CSRF token / state parameter
     * @returns {string}
     */
    getAuthUrl(state = '') {
      const { clientId, redirectUri } = credentials();
      const params = new URLSearchParams({
        response_type: 'code',
        client_id:     clientId,
        redirect_uri:  redirectUri,
        scope:         'openid profile friends:list xp:shared achievements:read',
        state,
      });
      return `${AUTH_URL}?${params.toString()}`;
    },

    /**
     * Exchange an authorization code for tokens.
     * @param {string} code
     * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
     */
    async exchangeCode(code) {
      const { clientId, clientSecret, redirectUri } = credentials();
      logger.info('Exchanging Epic authorization code', { platform: PLATFORM });
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type:   'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[${PLATFORM}] Token exchange failed (${response.status}): ${text}`);
      }
      return response.json();
    },

    /**
     * Refresh an expired Epic access token.
     * @param {string} refreshToken
     * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
     */
    async refreshToken(refreshToken) {
      const { clientId, clientSecret } = credentials();
      logger.info('Refreshing Epic token', { platform: PLATFORM });
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type:    'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[${PLATFORM}] Token refresh failed (${response.status}): ${text}`);
      }
      return response.json();
    },

    /**
     * Fetch achievements for an Epic account.
     * @param {string} token     – bearer access token
     * @param {string} accountId – Epic account ID
     * @returns {Promise<*>}
     */
    async getAchievements(token, accountId) {
      const cacheKey = `achievements:${accountId}`;
      return cachedApiCall(PLATFORM, cacheKey, async () => {
        logger.info('Fetching Epic achievements', { platform: PLATFORM, accountId });
        const response = await fetch(
          `${BASE_URL}/epic/ecom/v2/accounts/${accountId}/achievements`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`[${PLATFORM}] getAchievements failed (${response.status}): ${text}`);
        }
        return response.json();
      });
    },

    /**
     * Fetch game progress for an Epic account.
     * @param {string} token
     * @param {string} accountId
     * @returns {Promise<*>}
     */
    async getGameProgress(token, accountId) {
      const cacheKey = `progress:${accountId}`;
      return cachedApiCall(PLATFORM, cacheKey, async () => {
        logger.info('Fetching Epic game progress', { platform: PLATFORM, accountId });
        const response = await fetch(
          `${BASE_URL}/epic/ecom/v2/accounts/${accountId}/entitlements`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`[${PLATFORM}] getGameProgress failed (${response.status}): ${text}`);
        }
        return response.json();
      });
    },

    /** Validate that credentials are configured and the endpoint is reachable. */
    async testConnection() {
      try {
        credentials(); // throws if env vars missing
        const response = await fetch(`${BASE_URL}/epic/oauth/v2/.well-known/openid-configuration`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        logger.info('[epic] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[epic] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Xbox Live / Microsoft connector ─────────────────────────────────────────

/**
 * @typedef {object} XboxConnector
 * @property {() => string}                    getAuthUrl
 * @property {(code: string) => Promise<*>}   exchangeCode
 * @property {(token: string) => Promise<*>}  refreshToken
 * @property {(token: string) => Promise<*>}  getAchievements
 * @property {(token: string) => Promise<*>}  getGameProgress
 * @property {() => Promise<boolean>}         testConnection
 */

/**
 * Factory for the Xbox Live / Microsoft connector.
 * Reads: XBOX_CLIENT_ID, XBOX_CLIENT_SECRET, XBOX_REDIRECT_URI, XBOX_TENANT_ID
 * @returns {XboxConnector}
 */
export function createXboxConnector() {
  const PLATFORM = 'xbox';
  const BASE_URL  = 'https://xboxlive.com';
  const XBL_URL   = 'https://user.auth.xboxlive.com';
  const XSTS_URL  = 'https://xsts.auth.xboxlive.com';

  function credentials() {
    requireEnv(['XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET', 'XBOX_REDIRECT_URI'], PLATFORM);
    return {
      clientId:     process.env.XBOX_CLIENT_ID,
      clientSecret: process.env.XBOX_CLIENT_SECRET,
      redirectUri:  process.env.XBOX_REDIRECT_URI,
      tenantId:     process.env.XBOX_TENANT_ID || 'consumers',
    };
  }

  return {
    /**
     * Build the Microsoft OAuth2 authorization URL.
     * @param {string} [state]
     * @returns {string}
     */
    getAuthUrl(state = '') {
      const { clientId, redirectUri, tenantId } = credentials();
      const params = new URLSearchParams({
        client_id:     clientId,
        response_type: 'code',
        redirect_uri:  redirectUri,
        response_mode: 'query',
        scope:         'XboxLive.signin XboxLive.offline_access',
        state,
      });
      return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
    },

    /**
     * Exchange an authorization code for Microsoft + Xbox tokens.
     * @param {string} code
     * @returns {Promise<*>}
     */
    async exchangeCode(code) {
      const { clientId, clientSecret, redirectUri, tenantId } = credentials();
      logger.info('Exchanging Xbox authorization code', { platform: PLATFORM });
      const msResponse = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id:     clientId,
            client_secret: clientSecret,
            code,
            redirect_uri:  redirectUri,
            grant_type:    'authorization_code',
            scope:         'XboxLive.signin XboxLive.offline_access',
          }).toString(),
        },
      );
      if (!msResponse.ok) {
        const text = await msResponse.text();
        throw new Error(`[${PLATFORM}] MS token exchange failed (${msResponse.status}): ${text}`);
      }
      const msTokens = await msResponse.json();

      // Authenticate with Xbox Live
      const xblResponse = await fetch(`${XBL_URL}/user/authenticate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msTokens.access_token}` },
          RelyingParty: 'http://auth.xboxlive.com',
          TokenType: 'JWT',
        }),
      });
      if (!xblResponse.ok) {
        const text = await xblResponse.text();
        throw new Error(`[${PLATFORM}] XBL auth failed (${xblResponse.status}): ${text}`);
      }
      const xblData = await xblResponse.json();

      // Obtain XSTS token
      const xstsResponse = await fetch(`${XSTS_URL}/xsts/authorize`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          Properties: { SandboxId: 'RETAIL', UserTokens: [xblData.Token] },
          RelyingParty: 'http://xboxlive.com',
          TokenType: 'JWT',
        }),
      });
      if (!xstsResponse.ok) {
        const text = await xstsResponse.text();
        throw new Error(`[${PLATFORM}] XSTS auth failed (${xstsResponse.status}): ${text}`);
      }
      const xstsData = await xstsResponse.json();

      return {
        msTokens,
        xblToken:  xblData.Token,
        xstsToken: xstsData.Token,
        userHash:  xstsData.DisplayClaims?.xui?.[0]?.uhs,
      };
    },

    /**
     * Refresh Microsoft tokens and re-derive Xbox tokens.
     * @param {string} refreshToken – Microsoft refresh token
     * @returns {Promise<*>}
     */
    async refreshToken(refreshToken) {
      const { clientId, clientSecret, tenantId } = credentials();
      logger.info('Refreshing Xbox tokens', { platform: PLATFORM });
      const response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id:     clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type:    'refresh_token',
            scope:         'XboxLive.signin XboxLive.offline_access',
          }).toString(),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[${PLATFORM}] Token refresh failed (${response.status}): ${text}`);
      }
      return response.json();
    },

    /**
     * Fetch Xbox achievements for the authenticated user.
     * @param {string} xstsToken
     * @param {string} userHash
     * @returns {Promise<*>}
     */
    async getAchievements(xstsToken, userHash) {
      const authHeader = `XBL3.0 x=${userHash};${xstsToken}`;
      const cacheKey = `achievements:${userHash}`;
      return cachedApiCall(PLATFORM, cacheKey, async () => {
        logger.info('Fetching Xbox achievements', { platform: PLATFORM });
        const response = await fetch(
          `${BASE_URL}/achievements/user/xuid(@me)/achievements?maxItems=100`,
          {
            headers: {
              Authorization:   authHeader,
              'x-xbl-contract-version': '2',
              Accept:          'application/json',
            },
          },
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`[${PLATFORM}] getAchievements failed (${response.status}): ${text}`);
        }
        return response.json();
      });
    },

    /**
     * Fetch recent game activity for the authenticated user.
     * @param {string} xstsToken
     * @param {string} userHash
     * @returns {Promise<*>}
     */
    async getGameProgress(xstsToken, userHash) {
      const authHeader = `XBL3.0 x=${userHash};${xstsToken}`;
      const cacheKey = `progress:${userHash}`;
      return cachedApiCall(PLATFORM, cacheKey, async () => {
        logger.info('Fetching Xbox game progress', { platform: PLATFORM });
        const response = await fetch(
          `${BASE_URL}/titles/user/xuid(@me)/titles/titleHistory/decoration/detail?maxItems=25`,
          {
            headers: {
              Authorization:   authHeader,
              'x-xbl-contract-version': '4',
              Accept:          'application/json',
            },
          },
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`[${PLATFORM}] getGameProgress failed (${response.status}): ${text}`);
        }
        return response.json();
      });
    },

    /** Validate that credentials are configured. */
    async testConnection() {
      try {
        credentials();
        const { tenantId } = credentials();
        const response = await fetch(
          `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
        );
        if (!response.ok) throw new Error(`Status ${response.status}`);
        logger.info('[xbox] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[xbox] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── PlayStation Network connector ───────────────────────────────────────────

/**
 * Factory for the PlayStation Network (PSN) connector.
 * Reads: PSN_CLIENT_ID, PSN_CLIENT_SECRET, PSN_REDIRECT_URI, PSN_NPSSO (optional)
 * @returns {object}
 */
export function createPlayStationConnector() {
  const PLATFORM = 'playstation';
  const BASE_URL  = 'https://m.np.playstation.com/api';
  const AUTH_BASE = 'https://ca.account.sony.com/api/authz/v3';
  const TOKEN_URL = 'https://ca.account.sony.com/api/authz/v3/oauth/token';

  function credentials() {
    requireEnv(['PSN_CLIENT_ID', 'PSN_CLIENT_SECRET', 'PSN_REDIRECT_URI'], PLATFORM);
    return {
      clientId:     process.env.PSN_CLIENT_ID,
      clientSecret: process.env.PSN_CLIENT_SECRET,
      redirectUri:  process.env.PSN_REDIRECT_URI,
      npsso:        process.env.PSN_NPSSO, // optional: pre-existing NPSSO cookie
    };
  }

  return {
    /**
     * Build the Sony OAuth2 authorization URL.
     * @param {string} [state]
     * @returns {string}
     */
    getAuthUrl(state = '') {
      const { clientId, redirectUri } = credentials();
      const params = new URLSearchParams({
        access_type:   'offline',
        client_id:     clientId,
        redirect_uri:  redirectUri,
        response_type: 'code',
        scope:         'psn:clientapp',
        state,
      });
      return `${AUTH_BASE}/oauth/authorize?${params.toString()}`;
    },

    /**
     * Exchange an authorization code for PSN tokens.
     * @param {string} code
     * @returns {Promise<*>}
     */
    async exchangeCode(code) {
      const { clientId, clientSecret, redirectUri } = credentials();
      logger.info('Exchanging PSN authorization code', { platform: PLATFORM });
      const response = await fetch(TOKEN_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type:   'authorization_code',
          redirect_uri: redirectUri,
          token_format: 'jtw',
        }).toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[${PLATFORM}] Token exchange failed (${response.status}): ${text}`);
      }
      return response.json();
    },

    /**
     * Refresh a PSN access token.
     * @param {string} refreshToken
     * @returns {Promise<*>}
     */
    async refreshToken(refreshToken) {
      const { clientId, clientSecret } = credentials();
      logger.info('Refreshing PSN token', { platform: PLATFORM });
      const response = await fetch(TOKEN_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type:    'refresh_token',
          refresh_token: refreshToken,
          token_format:  'jtw',
          scope:         'psn:clientapp',
        }).toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[${PLATFORM}] Token refresh failed (${response.status}): ${text}`);
      }
      return response.json();
    },

    /**
     * Fetch PSN trophies (achievements) for a user.
     * @param {string} token     – PSN access token
     * @param {string} accountId – PSN account ID or 'me'
     * @returns {Promise<*>}
     */
    async getAchievements(token, accountId = 'me') {
      const cacheKey = `trophies:${accountId}`;
      return cachedApiCall(PLATFORM, cacheKey, async () => {
        logger.info('Fetching PSN trophies', { platform: PLATFORM, accountId });
        const response = await fetch(
          `${BASE_URL}/trophy/v1/users/${accountId}/trophyTitles`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`[${PLATFORM}] getAchievements failed (${response.status}): ${text}`);
        }
        return response.json();
      });
    },

    /**
     * Fetch game activity / titles for a PSN user.
     * @param {string} token
     * @param {string} accountId
     * @returns {Promise<*>}
     */
    async getGameProgress(token, accountId = 'me') {
      const cacheKey = `gameProgress:${accountId}`;
      return cachedApiCall(PLATFORM, cacheKey, async () => {
        logger.info('Fetching PSN game progress', { platform: PLATFORM, accountId });
        const response = await fetch(
          `${BASE_URL}/gamelist/v2/users/${accountId}/titles`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`[${PLATFORM}] getGameProgress failed (${response.status}): ${text}`);
        }
        return response.json();
      });
    },

    /** Validate credentials are present. */
    async testConnection() {
      try {
        credentials();
        const response = await fetch(
          `${AUTH_BASE}/oauth/authorize`,
          { method: 'HEAD' },
        );
        // 400 is expected without params — the endpoint is reachable
        if (response.status >= 500) throw new Error(`Status ${response.status}`);
        logger.info('[playstation] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[playstation] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Ubisoft Connect connector ────────────────────────────────────────────────

/**
 * Factory for the Ubisoft Connect connector.
 * Reads: UBISOFT_CLIENT_ID, UBISOFT_CLIENT_SECRET, UBISOFT_REDIRECT_URI, UBISOFT_APP_ID
 * @returns {object}
 */
export function createUbisoftConnector() {
  const PLATFORM  = 'ubisoft';
  const BASE_URL   = 'https://public-ubiservices.ubi.com';
  const AUTH_URL   = 'https://connect.ubisoft.com/oauth/authorize';
  const TOKEN_URL  = 'https://public-ubiservices.ubi.com/v3/oauth/token';

  function credentials() {
    requireEnv(['UBISOFT_CLIENT_ID', 'UBISOFT_CLIENT_SECRET', 'UBISOFT_REDIRECT_URI'], PLATFORM);
    return {
      clientId:     process.env.UBISOFT_CLIENT_ID,
      clientSecret: process.env.UBISOFT_CLIENT_SECRET,
      redirectUri:  process.env.UBISOFT_REDIRECT_URI,
      appId:        process.env.UBISOFT_APP_ID || process.env.UBISOFT_CLIENT_ID,
    };
  }

  return {
    /**
     * Build the Ubisoft Connect authorization URL.
     * @param {string} [state]
     * @returns {string}
     */
    getAuthUrl(state = '') {
      const { clientId, redirectUri, appId } = credentials();
      const params = new URLSearchParams({
        client_id:     clientId,
        response_type: 'code',
        redirect_uri:  redirectUri,
        app_id:        appId,
        scope:         'openid profile uplay:read',
        state,
      });
      return `${AUTH_URL}?${params.toString()}`;
    },

    /**
     * Exchange an authorization code for Ubisoft tokens.
     * @param {string} code
     * @returns {Promise<*>}
     */
    async exchangeCode(code) {
      const { clientId, clientSecret, redirectUri } = credentials();
      logger.info('Exchanging Ubisoft authorization code', { platform: PLATFORM });
      const response = await fetch(TOKEN_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Ubi-AppId':     clientId,
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          grant_type:   'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[${PLATFORM}] Token exchange failed (${response.status}): ${text}`);
      }
      return response.json();
    },

    /**
     * Refresh a Ubisoft access token.
     * @param {string} refreshToken
     * @returns {Promise<*>}
     */
    async refreshToken(refreshToken) {
      const { clientId, clientSecret } = credentials();
      logger.info('Refreshing Ubisoft token', { platform: PLATFORM });
      const response = await fetch(TOKEN_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Ubi-AppId':     clientId,
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          grant_type:    'refresh_token',
          refresh_token: refreshToken,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[${PLATFORM}] Token refresh failed (${response.status}): ${text}`);
      }
      return response.json();
    },

    /**
     * Fetch Ubisoft achievements for the authenticated user.
     * @param {string} token
     * @param {string} profileId – Ubisoft profile ID
     * @returns {Promise<*>}
     */
    async getAchievements(token, profileId) {
      const { appId } = credentials();
      const cacheKey = `achievements:${profileId}`;
      return cachedApiCall(PLATFORM, cacheKey, async () => {
        logger.info('Fetching Ubisoft achievements', { platform: PLATFORM, profileId });
        const response = await fetch(
          `${BASE_URL}/v2/profiles/${profileId}/achievements?appId=${appId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Ubi-AppId':   appId,
            },
          },
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`[${PLATFORM}] getAchievements failed (${response.status}): ${text}`);
        }
        return response.json();
      });
    },

    /**
     * Fetch game/app activity for a Ubisoft profile.
     * @param {string} token
     * @param {string} profileId
     * @returns {Promise<*>}
     */
    async getGameProgress(token, profileId) {
      const { appId } = credentials();
      const cacheKey = `progress:${profileId}`;
      return cachedApiCall(PLATFORM, cacheKey, async () => {
        logger.info('Fetching Ubisoft game progress', { platform: PLATFORM, profileId });
        const response = await fetch(
          `${BASE_URL}/v2/profiles/${profileId}/playedgames?appId=${appId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Ubi-AppId':   appId,
            },
          },
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`[${PLATFORM}] getGameProgress failed (${response.status}): ${text}`);
        }
        return response.json();
      });
    },

    /** Validate credentials are present. */
    async testConnection() {
      try {
        credentials();
        const response = await fetch(`${BASE_URL}/v3/profiles?onlineIds=test`, {
          method: 'HEAD',
          headers: { 'Ubi-AppId': credentials().appId },
        });
        if (response.status >= 500) throw new Error(`Status ${response.status}`);
        logger.info('[ubisoft] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[ubisoft] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Achievement sync orchestrator ────────────────────────────────────────────

/**
 * Sync achievements from all connected platforms.
 *
 * @param {object} tokenMap – { epic?: {token, accountId}, xbox?: {xstsToken, userHash}, playstation?: {token, accountId}, ubisoft?: {token, profileId} }
 * @returns {Promise<{ platform: string, achievements: *, error?: string }[]>}
 */
export async function syncAllAchievements(tokenMap) {
  const connectors = {
    epic:        createEpicConnector(),
    xbox:        createXboxConnector(),
    playstation: createPlayStationConnector(),
    ubisoft:     createUbisoftConnector(),
  };

  const results = await Promise.allSettled(
    Object.entries(tokenMap).map(async ([platform, creds]) => {
      const connector = connectors[platform];
      if (!connector) throw new Error(`Unknown platform: ${platform}`);
      logger.info(`Syncing achievements for platform: ${platform}`);
      let achievements;
      if (platform === 'xbox') {
        achievements = await connector.getAchievements(creds.xstsToken, creds.userHash);
      } else if (platform === 'playstation') {
        achievements = await connector.getAchievements(creds.token, creds.accountId || 'me');
      } else if (platform === 'ubisoft') {
        achievements = await connector.getAchievements(creds.token, creds.profileId);
      } else {
        achievements = await connector.getAchievements(creds.token, creds.accountId);
      }
      return { platform, achievements };
    }),
  );

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { platform: 'unknown', achievements: null, error: r.reason?.message ?? String(r.reason) },
  );
}

/**
 * Sync game progress from all connected platforms.
 *
 * @param {object} tokenMap – same shape as syncAllAchievements
 * @returns {Promise<{ platform: string, progress: *, error?: string }[]>}
 */
export async function syncAllGameProgress(tokenMap) {
  const connectors = {
    epic:        createEpicConnector(),
    xbox:        createXboxConnector(),
    playstation: createPlayStationConnector(),
    ubisoft:     createUbisoftConnector(),
  };

  const results = await Promise.allSettled(
    Object.entries(tokenMap).map(async ([platform, creds]) => {
      const connector = connectors[platform];
      if (!connector) throw new Error(`Unknown platform: ${platform}`);
      logger.info(`Syncing game progress for platform: ${platform}`);
      let progress;
      if (platform === 'xbox') {
        progress = await connector.getGameProgress(creds.xstsToken, creds.userHash);
      } else if (platform === 'playstation') {
        progress = await connector.getGameProgress(creds.token, creds.accountId || 'me');
      } else if (platform === 'ubisoft') {
        progress = await connector.getGameProgress(creds.token, creds.profileId);
      } else {
        progress = await connector.getGameProgress(creds.token, creds.accountId);
      }
      return { platform, progress };
    }),
  );

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { platform: 'unknown', progress: null, error: r.reason?.message ?? String(r.reason) },
  );
}

/**
 * Invalidate all caches for a specific platform or all platforms.
 * @param {string} [platformId]
 */
export function invalidateCache(platformId) {
  if (platformId) {
    caches[platformId]?.clear();
  } else {
    Object.values(caches).forEach((c) => c.clear());
  }
}
