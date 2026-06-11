// src/integrations/gaming/epic-games.js
// Epic Games / Unreal Engine connector — OAuth2 + EOS API
// No credentials hardcoded — all from env
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { encrypt, decrypt } from '../../services/crypto.service.js';

const EPIC_AUTH_URL = 'https://www.epicgames.com/id/api/redirect';
const EPIC_TOKEN_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
const EPIC_FRIENDS_URL = 'https://friends-public-service-prod.ol.epicgames.com/friends/api/v1';
const EOS_BASE = 'https://api.epicgames.dev/epic/ecom/v3';

export class EpicGamesConnector {
  #clientId;
  #clientSecret;

  constructor() {
    this.#clientId = process.env.EPIC_GAMES_CLIENT_ID;
    this.#clientSecret = process.env.EPIC_GAMES_CLIENT_SECRET;
  }

  getAuthUrl(redirectUri, state) {
    if (!this.#clientId) throw new Error('EPIC_GAMES_CLIENT_ID not configured');
    const params = new URLSearchParams({
      client_id: this.#clientId,
      response_type: 'code',
      scope: 'basic_profile friends_list presence openid',
      redirect_uri: redirectUri,
      state,
    });
    return `${EPIC_AUTH_URL}?${params}`;
  }

  async exchangeCode(code, redirectUri) {
    if (!this.#clientId || !this.#clientSecret) throw new Error('Epic Games credentials not configured');
    const credentials = Buffer.from(`${this.#clientId}:${this.#clientSecret}`).toString('base64');
    const res = await fetch(EPIC_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Epic token exchange failed: ${res.status}`);
    const data = await res.json();
    return {
      accessTokenEnc: encrypt(data.access_token),
      refreshTokenEnc: data.refresh_token ? encrypt(data.refresh_token) : null,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      accountId: data.account_id,
      displayName: data.displayName,
    };
  }

  async getPlayerAchievements(accessTokenEnc, sandboxId, accountId) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`${EOS_BASE}/sandboxes/${sandboxId}/players/${accountId}/achievements`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Epic achievements fetch failed: ${res.status}`);
    return res.json();
  }

  async getPlayerStats(accessTokenEnc, sandboxId, accountId) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`${EOS_BASE}/sandboxes/${sandboxId}/players/${accountId}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Epic stats fetch failed: ${res.status}`);
    return res.json();
  }

  // Unreal Build system webhook handler
  static parseUnrealBuildEvent(payload) {
    return {
      engine: 'unreal',
      eventType: payload.result === 'Success' ? 'build.complete' : 'build.failed',
      payload: {
        success: payload.result === 'Success',
        platform: payload.platform,
        configuration: payload.configuration,
        duration: payload.duration,
        errors: payload.errors ?? [],
        warnings: payload.warnings ?? [],
      },
    };
  }
}

export const epicGamesConnector = new EpicGamesConnector();
