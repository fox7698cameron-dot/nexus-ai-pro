/**
 * filename: GameConnectors.js
 * purpose:  Game platform connector module — OAuth/API integrations for Epic Games,
 *           Sony PlayStation, Microsoft Xbox, Ubisoft Connect, and Steam. Each connector
 *           falls back to mock data when environment variables are not configured.
 * date:     2026-08-22
 * copyright: Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *            Licensed under the Apache-2.0 License.
 */

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function envOrNull(key) {
  return (typeof process !== 'undefined' && process.env?.[key]) || null;
}

class ConnectorError extends Error {
  constructor(platform, message, cause) {
    super(`[${platform}] ${message}`);
    this.name = 'ConnectorError';
    this.platform = platform;
    this.cause = cause ?? null;
  }
}

// ---------------------------------------------------------------------------
// EpicGamesConnector  (UE5 / Epic Games Store)
// ---------------------------------------------------------------------------

export class EpicGamesConnector {
  #clientId = envOrNull('EPIC_CLIENT_ID');
  #clientSecret = envOrNull('EPIC_CLIENT_SECRET');
  #token = null;
  #connected = false;

  get platform() { return 'Epic Games'; }

  isConnected() { return this.#connected; }

  async connect() {
    if (!this.#clientId || !this.#clientSecret) {
      console.warn('[EpicGamesConnector] EPIC_CLIENT_ID / EPIC_CLIENT_SECRET not set — using mock mode');
      this.#connected = true;
      return { mode: 'mock', platform: this.platform };
    }
    try {
      // Real OAuth2 client-credentials flow against Epic's token endpoint
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        deployment_id: this.#clientId,
      });
      const response = await fetch('https://api.epicgames.dev/epic/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${this.#clientId}:${this.#clientSecret}`)}`,
        },
        body,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      this.#token = data.access_token;
      this.#connected = true;
      return { mode: 'live', platform: this.platform, expiresIn: data.expires_in };
    } catch (err) {
      throw new ConnectorError(this.platform, 'OAuth connection failed', err);
    }
  }

  async disconnect() {
    this.#token = null;
    this.#connected = false;
    return { disconnected: true, platform: this.platform };
  }

  async fetchProjects() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#token) {
      // Mock data
      return {
        source: 'mock',
        projects: [
          { id: 'ue-proj-001', name: 'Nexus Realms', engine: 'UE5.4', buildStatus: 'passing', lastBuild: '2026-08-22T09:00:00Z', platform: ['Win64', 'PS5', 'Xbox'] },
          { id: 'ue-proj-002', name: 'ShadowCraft VR', engine: 'UE5.3', buildStatus: 'building', lastBuild: '2026-08-21T22:15:00Z', platform: ['Win64', 'PSVR2', 'MetaQuest'] },
        ],
      };
    }
    try {
      const response = await fetch('https://api.epicgames.dev/epic/dev-portal/v1/projects', {
        headers: { Authorization: `Bearer ${this.#token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', projects: await response.json() };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchProjects failed', err);
    }
  }

  async fetchAchievements() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#token) {
      return {
        source: 'mock',
        achievements: [
          { id: 'ach-001', name: 'First Blood', description: 'First game shipped on Epic Games Store', unlockedAt: '2026-06-01T00:00:00Z', xp: 100 },
          { id: 'ach-002', name: 'World Builder', description: 'Created 10 UE5 levels', unlockedAt: '2026-07-14T00:00:00Z', xp: 250 },
        ],
      };
    }
    try {
      const response = await fetch('https://api.epicgames.dev/epic/achievements/v1', {
        headers: { Authorization: `Bearer ${this.#token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', achievements: await response.json() };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchAchievements failed', err);
    }
  }
}

// ---------------------------------------------------------------------------
// SonyConnector  (PlayStation Developer Portal)
// ---------------------------------------------------------------------------

export class SonyConnector {
  #partnerId = envOrNull('SONY_PARTNER_ID');
  #apiKey = envOrNull('SONY_API_KEY');
  #connected = false;

  get platform() { return 'Sony PlayStation'; }

  isConnected() { return this.#connected; }

  async connect() {
    if (!this.#partnerId || !this.#apiKey) {
      console.warn('[SonyConnector] SONY_PARTNER_ID / SONY_API_KEY not set — using mock mode');
      this.#connected = true;
      return { mode: 'mock', platform: this.platform };
    }
    try {
      const response = await fetch('https://devnet.playstation.net/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Partner-Id': this.#partnerId,
          'X-API-Key': this.#apiKey,
        },
        body: JSON.stringify({ grantType: 'api_key' }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      this.#connected = true;
      return { mode: 'live', platform: this.platform };
    } catch (err) {
      throw new ConnectorError(this.platform, 'Authentication failed', err);
    }
  }

  async disconnect() {
    this.#connected = false;
    return { disconnected: true, platform: this.platform };
  }

  async fetchProjects() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#partnerId) {
      return {
        source: 'mock',
        projects: [
          { id: 'ps-proj-001', name: 'Nexus Realms', platform: 'PS5', status: 'certification', buildHealth: 'green', trophySetStatus: 'approved' },
          { id: 'ps-proj-002', name: 'ShadowCraft VR', platform: 'PSVR2', status: 'development', buildHealth: 'yellow', trophySetStatus: 'pending' },
        ],
      };
    }
    try {
      const response = await fetch('https://devnet.playstation.net/api/v1/titles', {
        headers: { 'X-Partner-Id': this.#partnerId, 'X-API-Key': this.#apiKey },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', projects: await response.json() };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchProjects failed', err);
    }
  }

  async fetchAchievements() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#partnerId) {
      return {
        source: 'mock',
        achievements: [
          { id: 'troph-001', name: 'Platinum Hunter', type: 'PLATINUM', earnedAt: '2026-08-01T12:00:00Z' },
          { id: 'troph-002', name: 'Speed Runner', type: 'GOLD', earnedAt: '2026-07-20T08:30:00Z' },
        ],
      };
    }
    try {
      const response = await fetch('https://devnet.playstation.net/api/v1/trophies', {
        headers: { 'X-Partner-Id': this.#partnerId, 'X-API-Key': this.#apiKey },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', achievements: await response.json() };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchAchievements failed', err);
    }
  }
}

// ---------------------------------------------------------------------------
// MicrosoftConnector  (Xbox Developer Integration)
// ---------------------------------------------------------------------------

export class MicrosoftConnector {
  #clientId = envOrNull('MICROSOFT_CLIENT_ID');
  #tenantId = envOrNull('MICROSOFT_TENANT_ID');
  #token = null;
  #connected = false;

  get platform() { return 'Microsoft Xbox'; }

  isConnected() { return this.#connected; }

  async connect() {
    if (!this.#clientId || !this.#tenantId) {
      console.warn('[MicrosoftConnector] MICROSOFT_CLIENT_ID / MICROSOFT_TENANT_ID not set — using mock mode');
      this.#connected = true;
      return { mode: 'mock', platform: this.platform };
    }
    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.#clientId,
        scope: 'https://xboxlive.com/.default',
      });
      const response = await fetch(`https://login.microsoftonline.com/${this.#tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      this.#token = data.access_token;
      this.#connected = true;
      return { mode: 'live', platform: this.platform, expiresIn: data.expires_in };
    } catch (err) {
      throw new ConnectorError(this.platform, 'OAuth connection failed', err);
    }
  }

  async disconnect() {
    this.#token = null;
    this.#connected = false;
    return { disconnected: true, platform: this.platform };
  }

  async fetchProjects() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#token) {
      return {
        source: 'mock',
        projects: [
          { id: 'xbox-proj-001', name: 'Nexus Realms', platform: 'Xbox Series X|S', certification: 'submitted', achievements: 50, gamerscore: 1000 },
          { id: 'xbox-proj-002', name: 'Nexus Realms PC', platform: 'Windows', certification: 'approved', achievements: 50, gamerscore: 1000 },
        ],
      };
    }
    try {
      const response = await fetch('https://developer.microsoft.com/en-us/games/api/v1/products', {
        headers: { Authorization: `Bearer ${this.#token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', projects: await response.json() };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchProjects failed', err);
    }
  }

  async fetchAchievements() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#token) {
      return {
        source: 'mock',
        achievements: [
          { id: 'xach-001', name: 'Launch Day', description: 'Game published to Xbox marketplace', gamerscore: 10, unlockedAt: '2026-06-15T00:00:00Z' },
          { id: 'xach-002', name: 'Centurion', description: '100 players reached simultaneously', gamerscore: 50, unlockedAt: '2026-07-01T00:00:00Z' },
        ],
      };
    }
    try {
      const response = await fetch('https://developer.microsoft.com/en-us/games/api/v1/achievements', {
        headers: { Authorization: `Bearer ${this.#token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', achievements: await response.json() };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchAchievements failed', err);
    }
  }
}

// ---------------------------------------------------------------------------
// UbisoftConnector  (Ubisoft Connect)
// ---------------------------------------------------------------------------

export class UbisoftConnector {
  #appId = envOrNull('UBISOFT_APP_ID');
  #apiKey = envOrNull('UBISOFT_API_KEY');
  #connected = false;

  get platform() { return 'Ubisoft Connect'; }

  isConnected() { return this.#connected; }

  async connect() {
    if (!this.#appId || !this.#apiKey) {
      console.warn('[UbisoftConnector] UBISOFT_APP_ID / UBISOFT_API_KEY not set — using mock mode');
      this.#connected = true;
      return { mode: 'mock', platform: this.platform };
    }
    try {
      const response = await fetch('https://api.ubisoft.com/v3/profiles/me', {
        headers: {
          'Ubi-AppId': this.#appId,
          'Authorization': `UbiTicket ${this.#apiKey}`,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      this.#connected = true;
      return { mode: 'live', platform: this.platform };
    } catch (err) {
      throw new ConnectorError(this.platform, 'Authentication failed', err);
    }
  }

  async disconnect() {
    this.#connected = false;
    return { disconnected: true, platform: this.platform };
  }

  async fetchProjects() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#appId) {
      return {
        source: 'mock',
        projects: [
          { id: 'ubi-proj-001', name: 'Nexus Realms', connectStatus: 'live', actions: 120, challengeCount: 30 },
        ],
      };
    }
    try {
      const response = await fetch(`https://api.ubisoft.com/v3/applications/${this.#appId}/spaces`, {
        headers: { 'Ubi-AppId': this.#appId, Authorization: `UbiTicket ${this.#apiKey}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', projects: await response.json() };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchProjects failed', err);
    }
  }

  async fetchAchievements() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#appId) {
      return {
        source: 'mock',
        achievements: [
          { id: 'uach-001', name: 'Ubisoft Pioneer', xp: 500, category: 'dev', unlockedAt: '2026-05-10T00:00:00Z' },
          { id: 'uach-002', name: 'Connect Master', xp: 1000, category: 'social', unlockedAt: '2026-06-22T00:00:00Z' },
        ],
      };
    }
    try {
      const response = await fetch(`https://api.ubisoft.com/v3/applications/${this.#appId}/actions`, {
        headers: { 'Ubi-AppId': this.#appId, Authorization: `UbiTicket ${this.#apiKey}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', achievements: await response.json() };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchAchievements failed', err);
    }
  }
}

// ---------------------------------------------------------------------------
// SteamConnector  (Steamworks)
// ---------------------------------------------------------------------------

export class SteamConnector {
  #publisherKey = envOrNull('STEAM_PUBLISHER_KEY');
  #connected = false;

  get platform() { return 'Steam'; }

  isConnected() { return this.#connected; }

  async connect() {
    if (!this.#publisherKey) {
      console.warn('[SteamConnector] STEAM_PUBLISHER_KEY not set — using mock mode');
      this.#connected = true;
      return { mode: 'mock', platform: this.platform };
    }
    try {
      // Validate key with a lightweight ISteamWebAPIUtil call
      const url = new URL('https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/');
      url.searchParams.set('key', this.#publisherKey);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      this.#connected = true;
      return { mode: 'live', platform: this.platform };
    } catch (err) {
      throw new ConnectorError(this.platform, 'Steamworks connection failed', err);
    }
  }

  async disconnect() {
    this.#connected = false;
    return { disconnected: true, platform: this.platform };
  }

  async fetchProjects() {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#publisherKey) {
      return {
        source: 'mock',
        projects: [
          { appId: 1000001, name: 'Nexus Realms', releaseState: 'released', reviewScore: 89, owners: '50k-100k', currentPlayers: 1420 },
          { appId: 1000002, name: 'ShadowCraft VR', releaseState: 'coming_soon', reviewScore: null, owners: null, currentPlayers: 0 },
        ],
      };
    }
    try {
      const url = new URL('https://api.steampowered.com/IGamePublisherService/GetPartnerAppListForWebAPI/v1/');
      url.searchParams.set('key', this.#publisherKey);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', projects: (await response.json()).response?.apps ?? [] };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchProjects failed', err);
    }
  }

  async fetchAchievements(appId) {
    if (!this.#connected) throw new ConnectorError(this.platform, 'Not connected — call connect() first');
    if (!this.#publisherKey) {
      return {
        source: 'mock',
        achievements: [
          { name: 'ACH_WIN_ONE_GAME', displayName: 'Winner', percent: 62.4 },
          { name: 'ACH_PLAY_100_GAMES', displayName: 'Veteran', percent: 18.2 },
        ],
      };
    }
    try {
      const url = new URL('https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/');
      url.searchParams.set('gameid', appId);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source: 'live', achievements: (await response.json()).achievementpercentages?.achievements ?? [] };
    } catch (err) {
      throw new ConnectorError(this.platform, 'fetchAchievements failed', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience factory — returns all connectors in a map
// ---------------------------------------------------------------------------

export function createAllConnectors() {
  return {
    epic: new EpicGamesConnector(),
    sony: new SonyConnector(),
    microsoft: new MicrosoftConnector(),
    ubisoft: new UbisoftConnector(),
    steam: new SteamConnector(),
  };
}

export { ConnectorError };
