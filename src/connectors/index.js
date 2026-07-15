/**
 * src/connectors/index.js
 * Nexus AI Pro — Server-Side Connector Registry
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Manages third-party connector state (connected/disconnected) per user.
 * OAuth flows redirect to the provider; API-key connectors store credentials
 * encrypted via the SecurityModule. No secrets are hardcoded.
 */

import crypto from 'crypto';

// ─── In-memory connector store (replace with Redis/DB in production) ──────────

class ConnectorStore {
  constructor() {
    this._store = new Map(); // userId -> { connectorId -> { connected, meta } }
  }

  _userMap(userId) {
    if (!this._store.has(userId)) this._store.set(userId, new Map());
    return this._store.get(userId);
  }

  setConnected(userId, connectorId, meta = {}) {
    this._userMap(userId).set(connectorId, { connected: true, meta, connectedAt: Date.now() });
  }

  setDisconnected(userId, connectorId) {
    this._userMap(userId).delete(connectorId);
  }

  getStatus(userId) {
    const map = this._userMap(userId);
    const connected = {};
    for (const [id, data] of map.entries()) {
      if (data.connected) connected[id] = { connectedAt: data.connectedAt };
    }
    return { connected };
  }

  isConnected(userId, connectorId) {
    return this._userMap(userId).has(connectorId);
  }
}

export const connectorStore = new ConnectorStore();

// ─── OAuth URL builders (server-side, using env vars) ─────────────────────────

const OAUTH_CONFIGS = {
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    scopes: ['repo', 'read:user'],
  },
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
    scopes: ['openid', 'profile', 'email'],
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    clientIdEnv: 'SLACK_CLIENT_ID',
    scopes: ['chat:write', 'channels:read'],
  },
  azure: {
    authUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID ?? 'common'}/oauth2/v2.0/authorize`,
    clientIdEnv: 'AZURE_CLIENT_ID',
    scopes: ['openid', 'profile', 'offline_access'],
  },
  zoom: {
    authUrl: 'https://zoom.us/oauth/authorize',
    clientIdEnv: 'ZOOM_CLIENT_ID',
    scopes: ['meeting:write'],
  },
  adobe: {
    authUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
    clientIdEnv: 'ADOBE_CLIENT_ID',
    scopes: ['openid', 'AdobeID'],
  },
  unreal: {
    authUrl: 'https://www.epicgames.com/id/authorize',
    clientIdEnv: 'EPIC_CLIENT_ID',
    scopes: ['basic', 'presence'],
  },
  sony: {
    authUrl: 'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize',
    clientIdEnv: 'SONY_CLIENT_ID',
    scopes: ['psn:s2s'],
  },
  xbox: {
    authUrl: 'https://login.live.com/oauth20_authorize.srf',
    clientIdEnv: 'XBOX_CLIENT_ID',
    scopes: ['xboxlive.signin', 'offline_access'],
  },
  bitbucket: {
    authUrl: 'https://bitbucket.org/site/oauth2/authorize',
    clientIdEnv: 'BITBUCKET_CLIENT_ID',
    scopes: ['repository', 'pullrequest'],
  },
};

/**
 * Build OAuth authorization URL for a connector.
 * State token is HMAC-signed and includes userId to prevent CSRF.
 */
export function buildOAuthUrl(connectorId, userId, signingSecret) {
  const config = OAUTH_CONFIGS[connectorId];
  if (!config) throw new Error(`No OAuth config for connector: ${connectorId}`);

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) throw new Error(`Missing env var: ${config.clientIdEnv}`);

  const redirectUri = `${process.env.APP_BASE_URL ?? 'http://localhost:3001'}/api/connectors/${connectorId}/callback`;
  const state = buildState(userId, connectorId, signingSecret);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });

  return `${config.authUrl}?${params.toString()}`;
}

function buildState(userId, connectorId, secret) {
  const payload = JSON.stringify({ userId, connectorId, ts: Date.now() });
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

export function verifyState(state, secret) {
  const [encoded, sig] = state.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (Date.now() - payload.ts > 10 * 60 * 1000) return null; // 10 min expiry
    return payload;
  } catch {
    return null;
  }
}
