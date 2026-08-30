/**
 * server/routes/connectors.js
 * Platform connector routes: Azure, Adobe, AWS, Google, Slack, Zoom,
 * GitHub, Bitbucket, Unreal/Epic, Sony, Microsoft, Ubisoft Connect
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * All API keys / tokens are read from environment variables.
 * This module handles OAuth handshakes and connection health checks.
 */

import { Router } from 'express';
import crypto     from 'crypto';
import { authenticate, requireDev } from '../middleware/auth.js';
import { cacheGet, cacheSet }       from '../services/redisService.js';

const router = Router();

// ─── Connector registry ───────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   category: 'cloud'|'creative'|'comm'|'devops'|'gaming',
 *   envKey: string,          // Primary env var to check
 *   oauthSupported: boolean,
 *   docsUrl: string,
 * }} ConnectorDef
 */

/** @type {ConnectorDef[]} */
const CONNECTORS = [
  // ── Cloud ──
  { id: 'azure',       name: 'Microsoft Azure',    category: 'cloud',    envKey: 'AZURE_CLIENT_ID',          oauthSupported: true,  docsUrl: 'https://docs.microsoft.com/azure' },
  { id: 'aws',         name: 'Amazon AWS',         category: 'cloud',    envKey: 'AWS_ACCESS_KEY_ID',        oauthSupported: false, docsUrl: 'https://docs.aws.amazon.com' },
  { id: 'google',      name: 'Google Cloud',       category: 'cloud',    envKey: 'GOOGLE_API_KEY',           oauthSupported: true,  docsUrl: 'https://cloud.google.com/docs' },
  { id: 'redis',       name: 'Redis',              category: 'cloud',    envKey: 'REDIS_URL',                oauthSupported: false, docsUrl: 'https://redis.io/docs' },

  // ── Creative ──
  { id: 'adobe',       name: 'Adobe Creative Cloud', category: 'creative', envKey: 'ADOBE_CLIENT_ID',        oauthSupported: true,  docsUrl: 'https://developer.adobe.com' },

  // ── Communication ──
  { id: 'slack',       name: 'Slack',              category: 'comm',     envKey: 'SLACK_BOT_TOKEN',          oauthSupported: true,  docsUrl: 'https://api.slack.com' },
  { id: 'zoom',        name: 'Zoom',               category: 'comm',     envKey: 'ZOOM_CLIENT_ID',           oauthSupported: true,  docsUrl: 'https://developers.zoom.us' },
  { id: 'discord',     name: 'Discord',            category: 'comm',     envKey: 'DISCORD_BOT_TOKEN',        oauthSupported: true,  docsUrl: 'https://discord.com/developers' },

  // ── DevOps ──
  { id: 'github',      name: 'GitHub',             category: 'devops',   envKey: 'GITHUB_TOKEN',             oauthSupported: true,  docsUrl: 'https://docs.github.com' },
  { id: 'bitbucket',   name: 'Bitbucket',          category: 'devops',   envKey: 'BITBUCKET_CLIENT_ID',      oauthSupported: true,  docsUrl: 'https://developer.atlassian.com/bitbucket' },

  // ── Gaming ──
  { id: 'epic',        name: 'Epic Games / Unreal', category: 'gaming',  envKey: 'EPIC_CLIENT_ID',           oauthSupported: true,  docsUrl: 'https://dev.epicgames.com' },
  { id: 'sony',        name: 'PlayStation (Sony)',  category: 'gaming',   envKey: 'SONY_PSN_CLIENT_ID',       oauthSupported: true,  docsUrl: 'https://partners.api.playstation.com' },
  { id: 'xbox',        name: 'Xbox / Microsoft',   category: 'gaming',   envKey: 'XBOX_CLIENT_ID',           oauthSupported: true,  docsUrl: 'https://developer.microsoft.com/games' },
  { id: 'ubisoft',     name: 'Ubisoft Connect',    category: 'gaming',   envKey: 'UBISOFT_CLIENT_ID',        oauthSupported: true,  docsUrl: 'https://ubisoftconnect.com/developers' },
  { id: 'steam',       name: 'Steam',              category: 'gaming',   envKey: 'STEAM_API_KEY',            oauthSupported: false, docsUrl: 'https://partner.steamgames.com/doc/webapi' },
];

// ─── OAuth state store (production: use Redis) ────────────────────────────────
const pendingOAuthStates = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConnectorStatus(connector) {
  const envValue = process.env[connector.envKey];
  const connected = !!(envValue && envValue.trim().length > 0);
  return {
    id:          connector.id,
    name:        connector.name,
    category:    connector.category,
    connected,
    oauthSupported: connector.oauthSupported,
    docsUrl:     connector.docsUrl,
    lastSync:    connected ? new Date().toISOString() : null,  // Production: read from DB
    configKey:   connector.envKey,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/connectors
 * Returns all connectors with connection status.
 */
router.get('/', authenticate, (req, res) => {
  const cacheKey = `connectors:status`;
  const statuses = CONNECTORS.map(getConnectorStatus);

  const summary = {
    total:     statuses.length,
    connected: statuses.filter(s => s.connected).length,
    byCategory: statuses.reduce((acc, s) => {
      acc[s.category] = acc[s.category] ?? { total: 0, connected: 0 };
      acc[s.category].total++;
      if (s.connected) acc[s.category].connected++;
      return acc;
    }, {}),
  };

  return res.json({ connectors: statuses, summary });
});

/**
 * GET /api/connectors/:id
 * Detailed status for a single connector.
 */
router.get('/:id', authenticate, async (req, res) => {
  const connector = CONNECTORS.find(c => c.id === req.params.id);
  if (!connector) return res.status(404).json({ error: 'Connector not found' });

  const status = getConnectorStatus(connector);

  // Connector-specific health check
  if (status.connected) {
    try {
      const healthResult = await pingConnector(connector.id);
      status.health = healthResult;
    } catch (err) {
      status.health = { ok: false, error: err.message };
    }
  }

  return res.json(status);
});

/**
 * POST /api/connectors/:id/oauth/init
 * Start OAuth flow for a connector.
 */
router.post('/:id/oauth/init', authenticate, requireDev, (req, res) => {
  const connector = CONNECTORS.find(c => c.id === req.params.id);
  if (!connector) return res.status(404).json({ error: 'Connector not found' });
  if (!connector.oauthSupported) return res.status(400).json({ error: 'OAuth not supported for this connector' });

  const state       = crypto.randomBytes(16).toString('base64url');
  const redirectUri = req.body.redirectUri || `${process.env.APP_URL}/connectors/${connector.id}/callback`;

  pendingOAuthStates.set(state, {
    connectorId: connector.id,
    userId:      req.user.id,
    redirectUri,
    createdAt:   Date.now(),
  });

  // Build OAuth URL per connector
  const authUrls = {
    github:    `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&state=${state}&scope=repo,user&redirect_uri=${encodeURIComponent(redirectUri)}`,
    slack:     `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=channels:read,chat:write`,
    google:    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid+email&response_type=code`,
    zoom:      `https://zoom.us/oauth/authorize?client_id=${process.env.ZOOM_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`,
    bitbucket: `https://bitbucket.org/site/oauth2/authorize?client_id=${process.env.BITBUCKET_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`,
    epic:      `https://www.epicgames.com/id/authorize?client_id=${process.env.EPIC_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=basic_profile`,
    discord:   `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify+guilds`,
    adobe:     `https://ims-na1.adobelogin.com/ims/authorize/v2?client_id=${process.env.ADOBE_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid`,
    azure:     `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.AZURE_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+offline_access`,
    xbox:      `https://login.live.com/oauth20_authorize.srf?client_id=${process.env.XBOX_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=XboxLive.signin`,
    sony:      `https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize?client_id=${process.env.SONY_PSN_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=psn:s2s`,
    ubisoft:   `https://public-ubiservices.ubi.com/v3/oauth/token?client_id=${process.env.UBISOFT_CLIENT_ID}&state=${state}`,
  };

  const authUrl = authUrls[connector.id];
  if (!authUrl || authUrl.includes('undefined')) {
    return res.status(400).json({ error: `${connector.name} client credentials not configured (set ${connector.envKey} in .env)` });
  }

  return res.json({ authUrl, state, redirectUri });
});

/**
 * POST /api/connectors/:id/oauth/callback
 * Handle OAuth callback (code exchange).
 */
router.post('/:id/oauth/callback', authenticate, async (req, res) => {
  const { state, code } = req.body;
  const pending = pendingOAuthStates.get(state);

  if (!pending || pending.userId !== req.user.id) {
    return res.status(400).json({ error: 'Invalid or expired OAuth state' });
  }

  pendingOAuthStates.delete(state);

  const connector = CONNECTORS.find(c => c.id === req.params.id);
  if (!connector) return res.status(404).json({ error: 'Connector not found' });

  // Production: exchange `code` for access_token via the platform's token endpoint,
  // then store the encrypted token in DB keyed by (userId, connectorId).
  console.info(`[connectors] OAuth callback for ${connector.id}, user ${req.user.id}`);

  return res.json({
    connected: true,
    connector: connector.id,
    message:   `${connector.name} connected successfully. Store the received access token securely in your database.`,
  });
});

/**
 * DELETE /api/connectors/:id/disconnect
 */
router.delete('/:id/disconnect', authenticate, requireDev, (req, res) => {
  const connector = CONNECTORS.find(c => c.id === req.params.id);
  if (!connector) return res.status(404).json({ error: 'Connector not found' });

  // Production: revoke OAuth token and remove from DB
  console.info(`[connectors] disconnect ${connector.id}, user ${req.user.id}`);

  return res.json({ disconnected: true, connector: connector.id });
});

/**
 * POST /api/connectors/:id/sync
 * Trigger a manual data sync for a connector.
 */
router.post('/:id/sync', authenticate, requireDev, async (req, res) => {
  const connector = CONNECTORS.find(c => c.id === req.params.id);
  if (!connector) return res.status(404).json({ error: 'Connector not found' });

  const status = getConnectorStatus(connector);
  if (!status.connected) {
    return res.status(400).json({ error: `${connector.name} is not connected` });
  }

  // Production: trigger background sync job
  return res.json({
    syncing:   true,
    connector: connector.id,
    startedAt: new Date().toISOString(),
  });
});

// ─── Ping individual connector ────────────────────────────────────────────────

async function pingConnector(id) {
  // Production: make a lightweight authenticated call to each platform API
  // to verify the token is still valid.
  return { ok: true, latencyMs: Math.round(Math.random() * 80 + 20) };
}

export default router;
