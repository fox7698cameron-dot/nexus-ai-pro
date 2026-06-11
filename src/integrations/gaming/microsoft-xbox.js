// src/integrations/gaming/microsoft-xbox.js
// Microsoft Xbox / Azure connector — MSAL OAuth2 + XBL API
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { encrypt, decrypt } from '../../services/crypto.service.js';

const XBOX_AUTH_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
const XBOX_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBL_AUTH_URL = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_AUTH_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const PROFILE_URL = 'https://profile.xboxlive.com/users/me/profile/settings';
const ACHIEVEMENTS_URL = 'https://achievements.xboxlive.com/users/xuid';

export class MicrosoftXboxConnector {
  #clientId;
  #clientSecret;

  constructor() {
    this.#clientId = process.env.XBOX_CLIENT_ID;
    this.#clientSecret = process.env.XBOX_CLIENT_SECRET;
  }

  getAuthUrl(redirectUri, state) {
    if (!this.#clientId) throw new Error('XBOX_CLIENT_ID not configured');
    const params = new URLSearchParams({
      client_id: this.#clientId,
      response_type: 'code',
      scope: 'XboxLive.signin XboxLive.offline_access',
      redirect_uri: redirectUri,
      state,
    });
    return `${XBOX_AUTH_URL}?${params}`;
  }

  async exchangeCode(code, redirectUri) {
    if (!this.#clientId || !this.#clientSecret) throw new Error('Xbox credentials not configured');
    const res = await fetch(XBOX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.#clientId,
        client_secret: this.#clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new Error(`Xbox token exchange failed: ${res.status}`);
    const msToken = await res.json();

    // Exchange Microsoft token for Xbox Live token
    const xblRes = await fetch(XBL_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msToken.access_token}` },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      }),
    });
    if (!xblRes.ok) throw new Error(`Xbox Live auth failed: ${xblRes.status}`);
    const xblToken = await xblRes.json();

    // Exchange for XSTS token
    const xstsRes = await fetch(XSTS_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken.Token] },
        RelyingParty: 'http://xboxlive.com',
        TokenType: 'JWT',
      }),
    });
    if (!xstsRes.ok) throw new Error(`XSTS auth failed: ${xstsRes.status}`);
    const xstsToken = await xstsRes.json();
    const userHash = xstsToken.DisplayClaims?.xui?.[0]?.uhs;
    const xuid = xstsToken.DisplayClaims?.xui?.[0]?.xid;

    return {
      accessTokenEnc: encrypt(xstsToken.Token),
      refreshTokenEnc: msToken.refresh_token ? encrypt(msToken.refresh_token) : null,
      userHash,
      xuid,
      expiresAt: xblToken.NotAfter,
    };
  }

  async getAchievements(accessTokenEnc, userHash, xuid) {
    const token = decrypt(accessTokenEnc);
    const authHeader = `XBL3.0 x=${userHash};${token}`;
    const res = await fetch(`${ACHIEVEMENTS_URL}(${xuid})/achievements`, {
      headers: { Authorization: authHeader, 'x-xbl-contract-version': '2', Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Xbox achievements fetch failed: ${res.status}`);
    return res.json();
  }

  async getProfile(accessTokenEnc, userHash) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`${PROFILE_URL}?settings=GameDisplayName,GameDisplayPicRaw,Gamerscore`, {
      headers: {
        Authorization: `XBL3.0 x=${userHash};${token}`,
        'x-xbl-contract-version': '3',
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Xbox profile fetch failed: ${res.status}`);
    return res.json();
  }
}

export const microsoftXboxConnector = new MicrosoftXboxConnector();
