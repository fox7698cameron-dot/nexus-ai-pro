/**
 * nexus-ai-pro/src/connectors/gaming.js
 * Gaming platform connectors: Unreal/Epic · Sony PSN · Microsoft Xbox ·
 * Ubisoft Connect — achievement sync, game progress, store integration
 * All credentials from environment variables
 * Date: 2026-08-16
 */

export class EpicGamesConnector {
  constructor() {
    this.clientId = process.env.EPIC_CLIENT_ID;
    this.clientSecret = process.env.EPIC_CLIENT_SECRET;
    this.deploymentId = process.env.EPIC_DEPLOYMENT_ID;
    this.baseUrl = 'https://api.epicgames.dev';
    this.eosBaseUrl = 'https://api.epicgames.dev/epic/oauth/v2';
  }

  isConfigured() { return !!(this.clientId && this.clientSecret); }

  async getClientToken() {
    if (!this.isConfigured()) throw new Error('Epic Games not configured — set EPIC_CLIENT_ID, EPIC_CLIENT_SECRET');
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const resp = await fetch(`${this.eosBaseUrl}/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!resp.ok) throw new Error(`Epic Games auth failed: ${resp.status}`);
    return (await resp.json()).access_token;
  }

  async getPlayerAchievements(productUserId) {
    const token = await this.getClientToken();
    const resp = await fetch(
      `${this.baseUrl}/stats/v1/achievements/${this.deploymentId}/${productUserId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) throw new Error(`Epic achievements error: ${resp.status}`);
    return resp.json();
  }

  async getStoreProducts(sandboxId, count = 20) {
    const token = await this.getClientToken();
    const resp = await fetch(
      `${this.baseUrl}/catalog/v1/products?sandboxId=${sandboxId}&count=${count}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) throw new Error(`Epic store error: ${resp.status}`);
    return resp.json();
  }

  async getLeaderboard(deploymentId, statName, limit = 20) {
    const token = await this.getClientToken();
    const resp = await fetch(
      `${this.baseUrl}/stats/v1/leaderboards/${deploymentId}?statName=${statName}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) throw new Error(`Epic leaderboard error: ${resp.status}`);
    return resp.json();
  }

  /** Send an Unreal Engine telemetry event */
  async sendTelemetry(deploymentId, events) {
    const token = await this.getClientToken();
    const resp = await fetch(
      `${this.baseUrl}/analytics/v1/platforms/client/${deploymentId}/events`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      }
    );
    if (!resp.ok) throw new Error(`Epic telemetry error: ${resp.status}`);
    return resp.json();
  }
}

export class SonyPSNConnector {
  constructor() {
    this.apiKey = process.env.SONY_PSN_API_KEY;
    this.clientId = process.env.SONY_PSN_CLIENT_ID;
    this.clientSecret = process.env.SONY_PSN_CLIENT_SECRET;
    this.baseUrl = 'https://m.np.playstation.com/api';
  }

  isConfigured() { return !!(this.apiKey || (this.clientId && this.clientSecret)); }

  async getPlayerProfile(accessToken, accountId = 'me') {
    if (!this.isConfigured()) throw new Error('Sony PSN not configured — set SONY_PSN_API_KEY or SONY_PSN_CLIENT_ID/SECRET');
    const resp = await fetch(`${this.baseUrl}/trophy/v1/users/${accountId}/trophySummary`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!resp.ok) throw new Error(`PSN profile error: ${resp.status}`);
    return resp.json();
  }

  async getTrophies(accessToken, accountId = 'me', npCommunicationId) {
    const resp = await fetch(
      `${this.baseUrl}/trophy/v1/users/${accountId}/trophyTitles/${npCommunicationId}/trophyGroups/all/trophies`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!resp.ok) throw new Error(`PSN trophies error: ${resp.status}`);
    return resp.json();
  }

  async getRecentActivities(accessToken) {
    const resp = await fetch(`${this.baseUrl}/activityfeed/v1/users/me/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw new Error(`PSN activities error: ${resp.status}`);
    return resp.json();
  }
}

export class XboxLiveConnector {
  constructor() {
    this.clientId = process.env.XBOX_CLIENT_ID;
    this.clientSecret = process.env.XBOX_CLIENT_SECRET;
    this.tenantId = process.env.XBOX_TENANT_ID || 'consumers';
    this.baseUrl = 'https://xboxlive.com';
    this.profileUrl = 'https://profile.xboxlive.com';
    this.achievementsUrl = 'https://achievements.xboxlive.com';
    this.presenceUrl = 'https://userpresence.xboxlive.com';
  }

  isConfigured() { return !!(this.clientId && this.clientSecret); }

  async getMsaToken(xblToken) {
    if (!this.isConfigured()) throw new Error('Xbox Live not configured — set XBOX_CLIENT_ID, XBOX_CLIENT_SECRET');
    const resp = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${xblToken}` },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      }),
    });
    if (!resp.ok) throw new Error(`Xbox auth failed: ${resp.status}`);
    return resp.json();
  }

  async getPlayerProfile(xuid, xstsToken) {
    const resp = await fetch(`${this.profileUrl}/users/xuid(${xuid})/settings`, {
      headers: {
        Authorization: `XBL3.0 x=${xstsToken}`,
        'x-xbl-contract-version': '2',
        Accept: 'application/json',
      },
    });
    if (!resp.ok) throw new Error(`Xbox profile error: ${resp.status}`);
    return resp.json();
  }

  async getAchievements(xuid, xstsToken, titleId) {
    const url = `${this.achievementsUrl}/users/xuid(${xuid})/titles/${titleId}/achievements`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `XBL3.0 x=${xstsToken}`,
        'x-xbl-contract-version': '2',
        Accept: 'application/json',
      },
    });
    if (!resp.ok) throw new Error(`Xbox achievements error: ${resp.status}`);
    return resp.json();
  }

  async getPresence(xuid, xstsToken) {
    const resp = await fetch(`${this.presenceUrl}/users/xuid(${xuid})`, {
      headers: { Authorization: `XBL3.0 x=${xstsToken}`, Accept: 'application/json' },
    });
    if (!resp.ok) throw new Error(`Xbox presence error: ${resp.status}`);
    return resp.json();
  }
}

export class UbisoftConnector {
  constructor() {
    this.appId = process.env.UBISOFT_APP_ID;
    this.clientId = process.env.UBISOFT_CLIENT_ID;
    this.clientSecret = process.env.UBISOFT_CLIENT_SECRET;
    this.genomeId = process.env.UBISOFT_GENOME_ID;
    this.baseUrl = 'https://public-ubiservices.ubi.com';
  }

  isConfigured() { return !!(this.clientId && this.clientSecret); }

  async getToken(email, password) {
    if (!this.isConfigured()) throw new Error('Ubisoft Connect not configured — set UBISOFT_CLIENT_ID, UBISOFT_CLIENT_SECRET');
    const credentials = Buffer.from(`${email}:${password}`).toString('base64');
    const resp = await fetch(`${this.baseUrl}/v3/profiles/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ubi-AppId': this.appId || this.clientId,
        'Ubi-RequestedPlatformType': 'uplay',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({}),
    });
    if (!resp.ok) throw new Error(`Ubisoft auth failed: ${resp.status}`);
    return resp.json();
  }

  async getPlayerProfile(sessionTicket, profileId) {
    const resp = await fetch(`${this.baseUrl}/v2/profiles?userId=${profileId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Ubi-AppId': this.appId || this.clientId,
        Authorization: `Ubi_v1 t=${sessionTicket}`,
      },
    });
    if (!resp.ok) throw new Error(`Ubisoft profile error: ${resp.status}`);
    return resp.json();
  }

  async getPlayerStats(sessionTicket, spaceId, profileId) {
    const resp = await fetch(`${this.baseUrl}/v1/profiles/${profileId}/statscard?spaceId=${spaceId}`, {
      headers: {
        'Ubi-AppId': this.appId || this.clientId,
        Authorization: `Ubi_v1 t=${sessionTicket}`,
        'Content-Type': 'application/json',
      },
    });
    if (!resp.ok) throw new Error(`Ubisoft stats error: ${resp.status}`);
    return resp.json();
  }
}

// Registry of all gaming connectors
export const gamingConnectors = {
  epic:    new EpicGamesConnector(),
  psn:     new SonyPSNConnector(),
  xbox:    new XboxLiveConnector(),
  ubisoft: new UbisoftConnector(),
};

export function getGamingConnectorStatuses() {
  return Object.entries(gamingConnectors).map(([id, c]) => ({
    id,
    name: { epic: 'Epic Games / Unreal', psn: 'Sony PlayStation', xbox: 'Xbox Live', ubisoft: 'Ubisoft Connect' }[id],
    configured: c.isConfigured(),
    status: c.isConfigured() ? 'ready' : 'not_configured',
  }));
}

export default gamingConnectors;
