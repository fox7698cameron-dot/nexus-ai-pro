// ================================================
// NEXUS AI PRO - Game Platform Connectors
// Unreal/Epic, PSN, Xbox Live, Ubisoft Connect
// AES-256-GCM encrypted token store, unified profile
// ================================================

import fetch from 'node-fetch';
import crypto from 'crypto';
import express from 'express';

// ─── Encryption helpers ──────────────────────────────────────────────────────
// Token values are encrypted at rest inside the in-memory Map so a heap dump
// cannot expose raw OAuth tokens.

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function _getEncKey() {
  const secret = process.env.ENCRYPTION_SECRET || '';
  // Derive a stable 32-byte key from the secret
  return crypto.createHash('sha256').update(secret).digest();
}

function _encrypt(plaintext) {
  const key = _getEncKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack: iv(12) | tag(16) | ciphertext
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function _decrypt(b64) {
  const key = _getEncKey();
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ─── Token store ─────────────────────────────────────────────────────────────

/**
 * Internal token store.
 * Map<platform, encryptedJSON>
 * Stored JSON shape: { accessToken, refreshToken, expiresAt, profileId }
 */
const _tokenStore = new Map();

function _saveToken(platform, data) {
  _tokenStore.set(platform, _encrypt(JSON.stringify(data)));
}

function _loadToken(platform) {
  const raw = _tokenStore.get(platform);
  if (!raw) return null;
  try {
    return JSON.parse(_decrypt(raw));
  } catch {
    return null;
  }
}

function _clearToken(platform) {
  _tokenStore.delete(platform);
}

// ─── In-memory game session store ────────────────────────────────────────────

/** Map<userId, SessionRecord[]> */
const _sessionStore = new Map();

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function _apiFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, ok: res.ok, body };
}

// ─── Platform connection status helper ───────────────────────────────────────

function _statusEntry(platform) {
  const tok = _loadToken(platform);
  if (!tok) return { connected: false, profileId: null, lastSync: null };
  return {
    connected: true,
    profileId: tok.profileId || null,
    lastSync: tok.lastSync || null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. EPIC GAMES / UNREAL ENGINE
// ════════════════════════════════════════════════════════════════════════════

const EPIC_TOKEN_URL =
  'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
const EPIC_PROFILE_URL =
  'https://account-public-service-prod.ol.epicgames.com/account/api/public/account';
const EPIC_ACHIEVEMENTS_URL =
  'https://achievements-public-service-prod.ol.epicgames.com/achievements';

/**
 * Exchange an OAuth authorization code for Epic tokens.
 * @param {string} code - Authorization code from Epic redirect
 * @returns {{ success: boolean, profileId?: string, error?: string }}
 */
export async function connectEpic(code) {
  try {
    const clientId = process.env.EPIC_CLIENT_ID;
    const clientSecret = process.env.EPIC_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { success: false, error: 'Epic credentials not configured' };
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const result = await _apiFetch(EPIC_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        token_type: 'eg1',
      }).toString(),
    });

    if (!result.ok) {
      return { success: false, error: result.body?.errorMessage || 'Epic auth failed' };
    }

    const { access_token, refresh_token, expires_in, account_id } = result.body;
    _saveToken('epic', {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      profileId: account_id,
      lastSync: null,
    });

    return { success: true, profileId: account_id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch the Epic profile for the authenticated account.
 * @returns {{ profile: object|null, error?: string }}
 */
export async function getEpicProfile() {
  try {
    const tok = _loadToken('epic');
    if (!tok) return { profile: null, error: 'Not connected to Epic' };

    const result = await _apiFetch(`${EPIC_PROFILE_URL}/${tok.profileId}`, {
      headers: { Authorization: `Bearer ${tok.accessToken}` },
    });

    if (result.status === 401) {
      _clearToken('epic');
      return { profile: null, error: 'Epic session expired' };
    }
    if (!result.ok) return { profile: null, error: 'Failed to fetch Epic profile' };

    return { profile: result.body };
  } catch (err) {
    return { profile: null, error: err.message };
  }
}

/**
 * Fetch achievements for a given Epic user.
 * @param {string} userId
 * @returns {{ achievements: Array, error?: string }}
 */
export async function getEpicAchievements(userId) {
  try {
    const tok = _loadToken('epic');
    if (!tok) return { achievements: [], error: 'Not connected to Epic' };

    const result = await _apiFetch(
      `${EPIC_ACHIEVEMENTS_URL}/v1/${userId}/achievements`,
      { headers: { Authorization: `Bearer ${tok.accessToken}` } }
    );

    if (result.status === 401) {
      _clearToken('epic');
      return { achievements: [], error: 'Epic session expired' };
    }
    if (!result.ok) return { achievements: [] };

    // Normalize to shared format
    const raw = Array.isArray(result.body?.achievements) ? result.body.achievements : [];
    const achievements = raw.map((a) => ({
      id: a.achievementName || a.id,
      title: a.unlockedDisplayName || a.name || '',
      description: a.unlockedDescription || a.description || '',
      unlocked: a.isUnlocked ?? false,
      progress: a.progress ?? 0,
      maxProgress: a.sandboxId ? 1 : (a.maxProgress ?? 1),
      xp: a.xp ?? 0,
    }));

    return { achievements };
  } catch (err) {
    return { achievements: [], error: err.message };
  }
}

/**
 * Sync Epic progress and update lastSync timestamp.
 * @param {string} userId
 * @returns {{ synced: boolean, error?: string }}
 */
export async function syncEpicProgress(userId) {
  try {
    const tok = _loadToken('epic');
    if (!tok) return { synced: false, error: 'Not connected to Epic' };

    const { achievements, error } = await getEpicAchievements(userId);
    if (error && achievements.length === 0) return { synced: false, error };

    // Update lastSync in stored token
    tok.lastSync = new Date().toISOString();
    _saveToken('epic', tok);

    return { synced: true, achievementCount: achievements.length };
  } catch (err) {
    return { synced: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 2. PLAYSTATION NETWORK (SONY)
// ════════════════════════════════════════════════════════════════════════════

const PSN_TOKEN_URL = 'https://ca.account.sony.com/api/authz/v3/oauth/token';
const PSN_PROFILE_URL = 'https://us-prof.np.community.playstation.net/userProfile/v1/users/me/profile2';
const PSN_TROPHIES_URL = 'https://us-tpy.np.community.playstation.net/trophy/v1/users';

/**
 * Exchange a PSN authorization code for tokens.
 */
export async function connectPSN(authCode) {
  try {
    const clientId = process.env.PSN_CLIENT_ID;
    const clientSecret = process.env.PSN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { success: false, error: 'PSN credentials not configured' };
    }

    const result = await _apiFetch(PSN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: process.env.PSN_REDIRECT_URI || '',
      }).toString(),
    });

    if (!result.ok) {
      return { success: false, error: result.body?.error_description || 'PSN auth failed' };
    }

    const { access_token, refresh_token, expires_in } = result.body;

    // Fetch account ID
    const profileRes = await _apiFetch(PSN_PROFILE_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profileId = profileRes?.body?.profile?.accountId || null;

    _saveToken('psn', {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in || 3600) * 1000,
      profileId,
      lastSync: null,
    });

    return { success: true, profileId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch the PSN profile for the authenticated user.
 */
export async function getPSNProfile() {
  try {
    const tok = _loadToken('psn');
    if (!tok) return { profile: null, error: 'Not connected to PSN' };

    const result = await _apiFetch(PSN_PROFILE_URL, {
      headers: { Authorization: `Bearer ${tok.accessToken}` },
    });

    if (result.status === 401) {
      _clearToken('psn');
      return { profile: null, error: 'PSN session expired' };
    }
    if (!result.ok) return { profile: null, error: 'Failed to fetch PSN profile' };

    return { profile: result.body?.profile || result.body };
  } catch (err) {
    return { profile: null, error: err.message };
  }
}

/**
 * Fetch trophies for a PSN user.
 * @returns {{ trophies: Array, error?: string }}
 */
export async function getPSNTrophies(userId) {
  try {
    const tok = _loadToken('psn');
    if (!tok) return { trophies: [], error: 'Not connected to PSN' };

    const result = await _apiFetch(
      `${PSN_TROPHIES_URL}/${userId}/trophyTitles`,
      { headers: { Authorization: `Bearer ${tok.accessToken}` } }
    );

    if (result.status === 401) {
      _clearToken('psn');
      return { trophies: [], error: 'PSN session expired' };
    }
    if (!result.ok) return { trophies: [] };

    const raw = Array.isArray(result.body?.trophyTitles) ? result.body.trophyTitles : [];
    const trophies = raw.flatMap((title) =>
      (title.trophies || []).map((t) => ({
        id: t.trophyId,
        name: t.trophyName || '',
        detail: t.trophyDetail || '',
        type: t.trophyType || 'bronze', // 'bronze'|'silver'|'gold'|'platinum'
        earned: t.earned ?? false,
        earnedDateTime: t.earnedDateTime || null,
      }))
    );

    return { trophies };
  } catch (err) {
    return { trophies: [], error: err.message };
  }
}

/**
 * Sync PSN trophies and update lastSync.
 */
export async function syncPSNProgress(userId) {
  try {
    const tok = _loadToken('psn');
    if (!tok) return { synced: false, error: 'Not connected to PSN' };

    const { trophies, error } = await getPSNTrophies(userId);
    if (error && trophies.length === 0) return { synced: false, error };

    tok.lastSync = new Date().toISOString();
    _saveToken('psn', tok);

    return { synced: true, trophyCount: trophies.length };
  } catch (err) {
    return { synced: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 3. XBOX LIVE / MICROSOFT
// ════════════════════════════════════════════════════════════════════════════

const XBOX_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBOX_XBL_URL = 'https://user.auth.xboxlive.com/user/authenticate';
const XBOX_XSTS_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const XBOX_PROFILE_URL = 'https://profile.xboxlive.com/users/me/profile/settings';
const XBOX_ACHIEVEMENTS_URL = 'https://achievements.xboxlive.com/users/xuid';

async function _getXboxAuthHeaders(msAccessToken) {
  // Step 1: Xbox Live authentication
  const xblRes = await _apiFetch(XBOX_XBL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${msAccessToken}`,
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    }),
  });
  if (!xblRes.ok) return null;

  const xblToken = xblRes.body.Token;
  const userHash = xblRes.body.DisplayClaims?.xui?.[0]?.uhs;

  // Step 2: XSTS token
  const xstsRes = await _apiFetch(XBOX_XSTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
      RelyingParty: 'http://xboxlive.com',
      TokenType: 'JWT',
    }),
  });
  if (!xstsRes.ok) return null;

  const xstsToken = xstsRes.body.Token;
  return {
    Authorization: `XBL3.0 x=${userHash};${xstsToken}`,
    'x-xbl-contract-version': '2',
    Accept: 'application/json',
  };
}

/**
 * Connect to Xbox Live using an MS OAuth token.
 */
export async function connectXbox(token) {
  try {
    const clientId = process.env.XBOX_CLIENT_ID;
    const clientSecret = process.env.XBOX_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { success: false, error: 'Xbox credentials not configured' };
    }

    // token may be a raw MS access_token or an auth code; handle both
    let accessToken = token;
    if (!token.startsWith('ey')) {
      // Exchange code for token
      const tokenRes = await _apiFetch(XBOX_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code: token,
          redirect_uri: process.env.XBOX_REDIRECT_URI || '',
          scope: 'Xboxlive.signin',
        }).toString(),
      });
      if (!tokenRes.ok) {
        return { success: false, error: tokenRes.body?.error_description || 'Xbox auth failed' };
      }
      accessToken = tokenRes.body.access_token;
    }

    const headers = await _getXboxAuthHeaders(accessToken);
    if (!headers) return { success: false, error: 'Xbox Live authentication failed' };

    // Fetch profile to get XUID
    const profileRes = await _apiFetch(
      `${XBOX_PROFILE_URL}?settings=Gamertag,GameDisplayPicRaw`,
      { headers }
    );
    const xuid = profileRes?.body?.profileUsers?.[0]?.id || null;

    _saveToken('xbox', {
      accessToken,
      expiresAt: Date.now() + 3600 * 1000,
      profileId: xuid,
      lastSync: null,
    });

    return { success: true, profileId: xuid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch the Xbox profile for the authenticated user.
 */
export async function getXboxProfile() {
  try {
    const tok = _loadToken('xbox');
    if (!tok) return { profile: null, error: 'Not connected to Xbox' };

    const headers = await _getXboxAuthHeaders(tok.accessToken);
    if (!headers) {
      _clearToken('xbox');
      return { profile: null, error: 'Xbox session expired' };
    }

    const result = await _apiFetch(
      `${XBOX_PROFILE_URL}?settings=Gamertag,GameDisplayPicRaw,GameDisplayName,AccountTier`,
      { headers }
    );

    if (result.status === 401) {
      _clearToken('xbox');
      return { profile: null, error: 'Xbox session expired' };
    }
    if (!result.ok) return { profile: null, error: 'Failed to fetch Xbox profile' };

    return { profile: result.body?.profileUsers?.[0] || result.body };
  } catch (err) {
    return { profile: null, error: err.message };
  }
}

/**
 * Fetch achievements for an Xbox user.
 */
export async function getXboxAchievements(userId) {
  try {
    const tok = _loadToken('xbox');
    if (!tok) return { achievements: [], error: 'Not connected to Xbox' };

    const headers = await _getXboxAuthHeaders(tok.accessToken);
    if (!headers) {
      _clearToken('xbox');
      return { achievements: [], error: 'Xbox session expired' };
    }

    const result = await _apiFetch(
      `${XBOX_ACHIEVEMENTS_URL}(${userId})/achievements`,
      { headers }
    );

    if (result.status === 401) {
      _clearToken('xbox');
      return { achievements: [], error: 'Xbox session expired' };
    }
    if (!result.ok) return { achievements: [] };

    const raw = Array.isArray(result.body?.achievements) ? result.body.achievements : [];
    const achievements = raw.map((a) => ({
      id: a.id,
      name: a.name || '',
      description: a.lockedDescription || a.description || '',
      gamerscore: a.rewards?.find((r) => r.type === 'Gamerscore')?.value ?? 0,
      unlocked: a.progressState === 'Achieved',
      timeUnlocked: a.progression?.timeUnlocked || null,
    }));

    return { achievements };
  } catch (err) {
    return { achievements: [], error: err.message };
  }
}

/**
 * Sync Xbox achievements and update lastSync.
 */
export async function syncXboxProgress(userId) {
  try {
    const tok = _loadToken('xbox');
    if (!tok) return { synced: false, error: 'Not connected to Xbox' };

    const { achievements, error } = await getXboxAchievements(userId);
    if (error && achievements.length === 0) return { synced: false, error };

    tok.lastSync = new Date().toISOString();
    _saveToken('xbox', tok);

    return { synced: true, achievementCount: achievements.length };
  } catch (err) {
    return { synced: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4. UBISOFT CONNECT
// ════════════════════════════════════════════════════════════════════════════

const UBISOFT_TOKEN_URL = 'https://public-ubiservices.ubi.com/v3/profiles/sessions';
const UBISOFT_PROFILE_URL = 'https://public-ubiservices.ubi.com/v3/profiles';
const UBISOFT_ACHIEVEMENTS_URL = 'https://public-ubiservices.ubi.com/v1/profiles';

/**
 * Connect to Ubisoft Connect using an authorization code.
 */
export async function connectUbisoft(code) {
  try {
    const clientId = process.env.UBISOFT_CLIENT_ID;
    const clientSecret = process.env.UBISOFT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { success: false, error: 'Ubisoft credentials not configured' };
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const result = await _apiFetch(UBISOFT_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
        'Ubi-AppId': clientId,
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code }),
    });

    if (!result.ok) {
      return { success: false, error: result.body?.message || 'Ubisoft auth failed' };
    }

    const { ticket, expiration, profileId } = result.body;
    _saveToken('ubisoft', {
      accessToken: ticket,
      expiresAt: expiration ? new Date(expiration).getTime() : Date.now() + 3600 * 1000,
      profileId,
      lastSync: null,
    });

    return { success: true, profileId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch the Ubisoft profile for the authenticated user.
 */
export async function getUbisoftProfile() {
  try {
    const tok = _loadToken('ubisoft');
    if (!tok) return { profile: null, error: 'Not connected to Ubisoft' };

    const result = await _apiFetch(`${UBISOFT_PROFILE_URL}?userId=${tok.profileId}`, {
      headers: {
        Authorization: `Ubi_v1 t=${tok.accessToken}`,
        'Ubi-AppId': process.env.UBISOFT_CLIENT_ID || '',
      },
    });

    if (result.status === 401) {
      _clearToken('ubisoft');
      return { profile: null, error: 'Ubisoft session expired' };
    }
    if (!result.ok) return { profile: null, error: 'Failed to fetch Ubisoft profile' };

    return { profile: result.body?.profiles?.[0] || result.body };
  } catch (err) {
    return { profile: null, error: err.message };
  }
}

/**
 * Fetch achievements for a Ubisoft user.
 */
export async function getUbisoftAchievements(userId) {
  try {
    const tok = _loadToken('ubisoft');
    if (!tok) return { achievements: [], error: 'Not connected to Ubisoft' };

    const result = await _apiFetch(
      `${UBISOFT_ACHIEVEMENTS_URL}/${userId}/achievements`,
      {
        headers: {
          Authorization: `Ubi_v1 t=${tok.accessToken}`,
          'Ubi-AppId': process.env.UBISOFT_CLIENT_ID || '',
        },
      }
    );

    if (result.status === 401) {
      _clearToken('ubisoft');
      return { achievements: [], error: 'Ubisoft session expired' };
    }
    if (!result.ok) return { achievements: [] };

    const raw = Array.isArray(result.body?.achievements) ? result.body.achievements : [];
    const achievements = raw.map((a) => ({
      id: a.id,
      title: a.name || '',
      description: a.description || '',
      unlocked: a.isUnlocked ?? false,
      progress: a.progressInt ?? 0,
      maxProgress: a.maxProgressInt ?? 1,
      xp: a.xp ?? 0,
    }));

    return { achievements };
  } catch (err) {
    return { achievements: [], error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. UNIFIED PROFILE & ACHIEVEMENT AGGREGATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Aggregate profiles from all connected platforms.
 * @param {string} userId
 * @returns {{ platforms: object }}
 */
export async function getUnifiedProfile(userId) {
  const [epic, psn, xbox, ubisoft] = await Promise.all([
    getEpicProfile(),
    getPSNProfile(),
    getXboxProfile(),
    getUbisoftProfile(),
  ]);

  return {
    userId,
    platforms: {
      epic: epic.profile || null,
      psn: psn.profile || null,
      xbox: xbox.profile || null,
      ubisoft: ubisoft.profile || null,
    },
  };
}

/**
 * Merge achievements from all connected platforms into a normalized format.
 * @param {string} userId
 * @returns {{ achievements: Array }}
 */
export async function getUnifiedAchievements(userId) {
  const [epicResult, psnResult, xboxResult, ubisoftResult] = await Promise.all([
    getEpicAchievements(userId),
    getPSNTrophies(userId),
    getXboxAchievements(userId),
    getUbisoftAchievements(userId),
  ]);

  const normalize = (list, platform) =>
    list.map((a) => ({ ...a, platform, _source: platform }));

  // PSN trophies normalized to the same schema
  const psnNormalized = (psnResult.trophies || []).map((t) => ({
    id: t.id,
    title: t.name,
    description: t.detail,
    unlocked: t.earned,
    progress: t.earned ? 1 : 0,
    maxProgress: 1,
    xp: { platinum: 300, gold: 90, silver: 30, bronze: 15 }[t.type] ?? 0,
    trophyType: t.type,
    platform: 'psn',
    _source: 'psn',
  }));

  const xboxNormalized = (xboxResult.achievements || []).map((a) => ({
    id: a.id,
    title: a.name,
    description: a.description,
    unlocked: a.unlocked,
    progress: a.unlocked ? 1 : 0,
    maxProgress: 1,
    xp: a.gamerscore,
    gamerscore: a.gamerscore,
    platform: 'xbox',
    _source: 'xbox',
  }));

  return {
    userId,
    achievements: [
      ...normalize(epicResult.achievements || [], 'epic'),
      ...psnNormalized,
      ...xboxNormalized,
      ...normalize(ubisoftResult.achievements || [], 'ubisoft'),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 6. GAME SESSION TRACKING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Record a game session for a user.
 * @param {string} userId
 * @param {string} platform - 'epic'|'psn'|'xbox'|'ubisoft'
 * @param {string} gameId
 * @param {{ startTime?, endTime?, playtimeMinutes?, score?, level? }} sessionData
 */
export function trackGameSession(userId, platform, gameId, sessionData = {}) {
  if (!_sessionStore.has(userId)) _sessionStore.set(userId, []);
  _sessionStore.get(userId).push({
    id: crypto.randomUUID(),
    platform,
    gameId,
    startTime: sessionData.startTime || new Date().toISOString(),
    endTime: sessionData.endTime || null,
    playtimeMinutes: sessionData.playtimeMinutes ?? 0,
    score: sessionData.score ?? null,
    level: sessionData.level ?? null,
    recordedAt: new Date().toISOString(),
  });
  return { tracked: true };
}

/**
 * Return all game sessions for a user.
 * @param {string} userId
 * @returns {{ sessions: Array }}
 */
export function getGameHistory(userId) {
  return { sessions: _sessionStore.get(userId) || [] };
}

/**
 * Compute aggregate gaming stats for a user.
 * @param {string} userId
 * @returns {{ totalPlaytime, totalAchievements, totalGamescore, topGames }}
 */
export async function calculateGamingStats(userId) {
  const { sessions } = getGameHistory(userId);
  const { achievements } = await getUnifiedAchievements(userId);

  const totalPlaytime = sessions.reduce((sum, s) => sum + (s.playtimeMinutes || 0), 0);
  const totalAchievements = achievements.filter((a) => a.unlocked).length;
  const totalGamescore = achievements.reduce((sum, a) => sum + (a.gamerscore || a.xp || 0), 0);

  // Aggregate playtime per game
  const gameMap = {};
  for (const s of sessions) {
    if (!gameMap[s.gameId]) gameMap[s.gameId] = { gameId: s.gameId, platform: s.platform, playtimeMinutes: 0, sessions: 0 };
    gameMap[s.gameId].playtimeMinutes += s.playtimeMinutes || 0;
    gameMap[s.gameId].sessions += 1;
  }
  const topGames = Object.values(gameMap)
    .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)
    .slice(0, 10);

  return { totalPlaytime, totalAchievements, totalGamescore, topGames };
}

// ════════════════════════════════════════════════════════════════════════════
// 7. CONNECTION STATE MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Return connection state for all platforms.
 * @returns {{ epic, psn, xbox, ubisoft }}
 */
export function getConnectionStatus() {
  return {
    epic: _statusEntry('epic'),
    psn: _statusEntry('psn'),
    xbox: _statusEntry('xbox'),
    ubisoft: _statusEntry('ubisoft'),
  };
}

/**
 * Disconnect a platform by removing its stored token.
 * @param {'epic'|'psn'|'xbox'|'ubisoft'} platform
 */
export function disconnectPlatform(platform) {
  const valid = ['epic', 'psn', 'xbox', 'ubisoft'];
  if (!valid.includes(platform)) return { success: false, error: 'Unknown platform' };
  _clearToken(platform);
  return { success: true, platform, disconnected: true };
}

/**
 * Refresh all expired OAuth tokens using their refresh tokens.
 * @returns {{ results: object }}
 */
export async function refreshTokens() {
  const results = {};

  // Epic refresh
  const epicTok = _loadToken('epic');
  if (epicTok && epicTok.expiresAt < Date.now() + 300_000 && epicTok.refreshToken) {
    try {
      const basic = Buffer.from(
        `${process.env.EPIC_CLIENT_ID}:${process.env.EPIC_CLIENT_SECRET}`
      ).toString('base64');
      const res = await _apiFetch(EPIC_TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: epicTok.refreshToken,
        }).toString(),
      });
      if (res.ok) {
        epicTok.accessToken = res.body.access_token;
        epicTok.refreshToken = res.body.refresh_token || epicTok.refreshToken;
        epicTok.expiresAt = Date.now() + (res.body.expires_in || 3600) * 1000;
        _saveToken('epic', epicTok);
        results.epic = { refreshed: true };
      } else {
        _clearToken('epic');
        results.epic = { refreshed: false, error: 'Refresh failed, disconnected' };
      }
    } catch (err) {
      results.epic = { refreshed: false, error: err.message };
    }
  } else {
    results.epic = { refreshed: false, reason: epicTok ? 'not_expired' : 'not_connected' };
  }

  // PSN refresh
  const psnTok = _loadToken('psn');
  if (psnTok && psnTok.expiresAt < Date.now() + 300_000 && psnTok.refreshToken) {
    try {
      const res = await _apiFetch(PSN_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: psnTok.refreshToken,
          client_id: process.env.PSN_CLIENT_ID || '',
          client_secret: process.env.PSN_CLIENT_SECRET || '',
        }).toString(),
      });
      if (res.ok) {
        psnTok.accessToken = res.body.access_token;
        psnTok.refreshToken = res.body.refresh_token || psnTok.refreshToken;
        psnTok.expiresAt = Date.now() + (res.body.expires_in || 3600) * 1000;
        _saveToken('psn', psnTok);
        results.psn = { refreshed: true };
      } else {
        _clearToken('psn');
        results.psn = { refreshed: false, error: 'Refresh failed, disconnected' };
      }
    } catch (err) {
      results.psn = { refreshed: false, error: err.message };
    }
  } else {
    results.psn = { refreshed: false, reason: psnTok ? 'not_expired' : 'not_connected' };
  }

  // Xbox has no standard refresh without MS identity library; mark as noted
  results.xbox = { refreshed: false, reason: 'manual_reconnect_required' };

  // Ubisoft has no public refresh endpoint; mark as noted
  results.ubisoft = { refreshed: false, reason: 'manual_reconnect_required' };

  return { results };
}

// ════════════════════════════════════════════════════════════════════════════
// EXPRESS ROUTER
// ════════════════════════════════════════════════════════════════════════════

export const gamingRouter = express.Router();

// Status
gamingRouter.get('/status', (_req, res) => {
  res.json(getConnectionStatus());
});

// Disconnect a platform
gamingRouter.delete('/connect/:platform', (req, res) => {
  res.json(disconnectPlatform(req.params.platform));
});

// Refresh tokens
gamingRouter.post('/tokens/refresh', async (_req, res) => {
  res.json(await refreshTokens());
});

// ── Epic ──────────────────────────────────────────────────────────────────
gamingRouter.post('/epic/connect', async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  res.json(await connectEpic(code));
});

gamingRouter.get('/epic/profile', async (_req, res) => {
  res.json(await getEpicProfile());
});

gamingRouter.get('/epic/achievements/:userId', async (req, res) => {
  res.json(await getEpicAchievements(req.params.userId));
});

gamingRouter.post('/epic/sync/:userId', async (req, res) => {
  res.json(await syncEpicProgress(req.params.userId));
});

// ── PSN ───────────────────────────────────────────────────────────────────
gamingRouter.post('/psn/connect', async (req, res) => {
  const { authCode } = req.body || {};
  if (!authCode) return res.status(400).json({ error: 'authCode required' });
  res.json(await connectPSN(authCode));
});

gamingRouter.get('/psn/profile', async (_req, res) => {
  res.json(await getPSNProfile());
});

gamingRouter.get('/psn/trophies/:userId', async (req, res) => {
  res.json(await getPSNTrophies(req.params.userId));
});

gamingRouter.post('/psn/sync/:userId', async (req, res) => {
  res.json(await syncPSNProgress(req.params.userId));
});

// ── Xbox ──────────────────────────────────────────────────────────────────
gamingRouter.post('/xbox/connect', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  res.json(await connectXbox(token));
});

gamingRouter.get('/xbox/profile', async (_req, res) => {
  res.json(await getXboxProfile());
});

gamingRouter.get('/xbox/achievements/:userId', async (req, res) => {
  res.json(await getXboxAchievements(req.params.userId));
});

gamingRouter.post('/xbox/sync/:userId', async (req, res) => {
  res.json(await syncXboxProgress(req.params.userId));
});

// ── Ubisoft ───────────────────────────────────────────────────────────────
gamingRouter.post('/ubisoft/connect', async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  res.json(await connectUbisoft(code));
});

gamingRouter.get('/ubisoft/profile', async (_req, res) => {
  res.json(await getUbisoftProfile());
});

gamingRouter.get('/ubisoft/achievements/:userId', async (req, res) => {
  res.json(await getUbisoftAchievements(req.params.userId));
});

// ── Unified ───────────────────────────────────────────────────────────────
gamingRouter.get('/unified/profile/:userId', async (req, res) => {
  res.json(await getUnifiedProfile(req.params.userId));
});

gamingRouter.get('/unified/achievements/:userId', async (req, res) => {
  res.json(await getUnifiedAchievements(req.params.userId));
});

gamingRouter.get('/unified/stats/:userId', async (req, res) => {
  res.json(await calculateGamingStats(req.params.userId));
});

// ── Sessions ─────────────────────────────────────────────────────────────
gamingRouter.post('/sessions/:userId', (req, res) => {
  const { platform, gameId, ...sessionData } = req.body || {};
  if (!platform || !gameId) return res.status(400).json({ error: 'platform and gameId required' });
  res.json(trackGameSession(req.params.userId, platform, gameId, sessionData));
});

gamingRouter.get('/sessions/:userId', (req, res) => {
  res.json(getGameHistory(req.params.userId));
});
