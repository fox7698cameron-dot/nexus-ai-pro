// src/integrations/gaming/ubisoft.js
// Ubisoft Connect connector — OAuth2 + Ubisoft API
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { encrypt, decrypt } from '../../services/crypto.service.js';

const UBI_AUTH_URL = 'https://connect.ubisoft.com/authorize';
const UBI_TOKEN_URL = 'https://public-ubiservices.ubi.com/v3/profiles/sessions';
const UBI_API_BASE = 'https://public-ubiservices.ubi.com/v1';

export class UbisoftConnector {
  #appId;
  #appSecret;

  constructor() {
    this.#appId = process.env.UBISOFT_APP_ID;
    this.#appSecret = process.env.UBISOFT_APP_SECRET;
  }

  getAuthUrl(redirectUri, state) {
    if (!this.#appId) throw new Error('UBISOFT_APP_ID not configured');
    const params = new URLSearchParams({
      client_id: this.#appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
    });
    return `${UBI_AUTH_URL}?${params}`;
  }

  async authenticate(email, password) {
    if (!this.#appId) throw new Error('Ubisoft credentials not configured');
    const credentials = Buffer.from(`${email}:${password}`).toString('base64');
    const res = await fetch(UBI_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Ubi-AppId': this.#appId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rememberMe: false }),
    });
    if (!res.ok) throw new Error(`Ubisoft auth failed: ${res.status}`);
    const data = await res.json();
    return {
      tokenEnc: encrypt(data.ticket),
      sessionId: data.sessionId,
      profileId: data.profileId,
      expiresAt: data.expiration,
    };
  }

  async getAchievements(tokenEnc, profileId, spaceId) {
    const token = decrypt(tokenEnc);
    const res = await fetch(`${UBI_API_BASE}/profiles/${profileId}/achievements?spaceId=${spaceId}`, {
      headers: { Authorization: `Ubi_v1 t=${token}`, 'Ubi-AppId': this.#appId },
    });
    if (!res.ok) throw new Error(`Ubisoft achievements fetch failed: ${res.status}`);
    return res.json();
  }

  async getGameStats(tokenEnc, profileId, spaceId) {
    const token = decrypt(tokenEnc);
    const res = await fetch(`${UBI_API_BASE}/profiles/${profileId}/stats?spaceId=${spaceId}`, {
      headers: { Authorization: `Ubi_v1 t=${token}`, 'Ubi-AppId': this.#appId },
    });
    if (!res.ok) throw new Error(`Ubisoft stats fetch failed: ${res.status}`);
    return res.json();
  }
}

export const ubisoftConnector = new UbisoftConnector();
