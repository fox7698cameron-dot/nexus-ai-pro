// src/integrations/gaming/sony-psn.js
// Sony PlayStation Network connector — PSN API v2
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { encrypt, decrypt } from '../../services/crypto.service.js';

const PSN_AUTH_URL = 'https://ca.account.sony.com/api/authz/v3/oauth/authorize';
const PSN_TOKEN_URL = 'https://ca.account.sony.com/api/authz/v3/oauth/token';
const PSN_API_BASE = 'https://m.np.playstation.com/api';

export class SonyPSNConnector {
  #clientId;
  #clientSecret;

  constructor() {
    this.#clientId = process.env.PSN_CLIENT_ID;
    this.#clientSecret = process.env.PSN_CLIENT_SECRET;
  }

  getAuthUrl(redirectUri, state) {
    if (!this.#clientId) throw new Error('PSN_CLIENT_ID not configured');
    const params = new URLSearchParams({
      access_type: 'offline',
      client_id: this.#clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'psn:clientapp',
      state,
    });
    return `${PSN_AUTH_URL}?${params}`;
  }

  async exchangeCode(code, redirectUri) {
    if (!this.#clientId || !this.#clientSecret) throw new Error('PSN credentials not configured');
    const credentials = Buffer.from(`${this.#clientId}:${this.#clientSecret}`).toString('base64');
    const res = await fetch(PSN_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`PSN token exchange failed: ${res.status}`);
    const data = await res.json();
    return {
      accessTokenEnc: encrypt(data.access_token),
      refreshTokenEnc: data.refresh_token ? encrypt(data.refresh_token) : null,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };
  }

  async getProfile(accessTokenEnc) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`${PSN_API_BASE}/userProfile/v1/internal/users/me/profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`PSN profile fetch failed: ${res.status}`);
    return res.json();
  }

  async getTrophies(accessTokenEnc, accountId = 'me') {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`${PSN_API_BASE}/trophy/v1/users/${accountId}/trophyTitles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`PSN trophy fetch failed: ${res.status}`);
    return res.json();
  }

  async getGameLibrary(accessTokenEnc, accountId = 'me') {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`${PSN_API_BASE}/gamelist/v2/users/${accountId}/titles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`PSN library fetch failed: ${res.status}`);
    return res.json();
  }
}

export const sonyPSNConnector = new SonyPSNConnector();
