// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { z } from 'zod';
import { authenticate, auditLog } from './middleware.js';
import { db } from './database.js';

export const router = Router();

// All connector routes require authentication
router.use(authenticate);

// ── AES-256-GCM token encryption ──────────────────────────────
function getEncKey() {
  const raw = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!raw) throw new Error('CONNECTOR_ENCRYPTION_KEY is not set');
  // Accept 64-char hex string (32 bytes) or plain 32+ char string
  const buf = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw);
  if (buf.length < 32) throw new Error('CONNECTOR_ENCRYPTION_KEY must be at least 32 bytes');
  return buf.slice(0, 32);
}

function encryptToken(plaintext) {
  const iv = randomBytes(12);
  const key = getEncKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  });
}

function decryptToken(blob) {
  const { iv, data, tag } = JSON.parse(blob);
  const key = getEncKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
}

// 30-day TTL for stored connector tokens
const TOKEN_TTL = 30 * 24 * 3600;

async function storeToken(userId, service, token) {
  await db.set(`connectors:${userId}:${service}:token`, encryptToken(token), TOKEN_TTL);
}

async function loadToken(userId, service) {
  const blob = await db.get(`connectors:${userId}:${service}:token`);
  if (!blob) return null;
  return decryptToken(blob);
}

async function hasToken(userId, service) {
  return !!(await db.get(`connectors:${userId}:${service}:token`));
}

// ── Connector registry ────────────────────────────────────────
const SERVICES = ['github', 'slack', 'zoom', 'azure', 'aws', 'google', 'bitbucket'];

// ── List connectors ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const statuses = await Promise.all(
      SERVICES.map(async svc => ({ service: svc, connected: await hasToken(req.user.id, svc) }))
    );
    res.json({ connectors: statuses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GitHub ────────────────────────────────────────────────────
router.post('/github/connect', auditLog('CONNECTOR_GITHUB_CONNECT'), async (req, res) => {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID ?? '',
      client_secret: process.env.GITHUB_CLIENT_SECRET ?? '',
      code
    });
    const resp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: params
    });
    const data = await resp.json();
    if (!data.access_token) return res.status(400).json({ error: data.error_description ?? 'GitHub OAuth failed' });

    await storeToken(req.user.id, 'github', data.access_token);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/github/repos', async (req, res) => {
  try {
    const token = await loadToken(req.user.id, 'github');
    if (!token) return res.status(400).json({ error: 'GitHub is not connected' });

    const resp = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', {
      headers: { Authorization: `token ${token}`, 'User-Agent': 'NexusAIPro/2.0' }
    });
    if (!resp.ok) return res.status(resp.status).json({ error: 'GitHub API request failed' });

    const repos = await resp.json();
    res.json({
      repos: repos.map(r => ({
        id: r.id,
        name: r.full_name,
        url: r.html_url,
        private: r.private,
        updatedAt: r.updated_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Slack ─────────────────────────────────────────────────────
router.post('/slack/connect', auditLog('CONNECTOR_SLACK_CONNECT'), async (req, res) => {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);

    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? '',
      client_secret: process.env.SLACK_CLIENT_SECRET ?? '',
      code
    });
    const resp = await fetch('https://slack.com/api/oauth.v2.access', { method: 'POST', body: params });
    const data = await resp.json();
    if (!data.ok) return res.status(400).json({ error: data.error ?? 'Slack OAuth failed' });

    await storeToken(req.user.id, 'slack', data.access_token);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/slack/notify', async (req, res) => {
  try {
    const { channel, message } = z.object({
      channel: z.string().min(1),
      message: z.string().min(1).max(3000)
    }).parse(req.body);

    const token = await loadToken(req.user.id, 'slack');
    if (!token) return res.status(400).json({ error: 'Slack is not connected' });

    const resp = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text: message })
    });
    const data = await resp.json();
    if (!data.ok) return res.status(400).json({ error: data.error ?? 'Slack message failed' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Zoom ──────────────────────────────────────────────────────
router.post('/zoom/connect', auditLog('CONNECTOR_ZOOM_CONNECT'), async (req, res) => {
  try {
    const { code, redirectUri } = z.object({
      code: z.string().min(1),
      redirectUri: z.string().url()
    }).parse(req.body);

    const credentials = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
    const params = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
    const resp = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    const data = await resp.json();
    if (!data.access_token) return res.status(400).json({ error: 'Zoom OAuth failed' });

    await storeToken(req.user.id, 'zoom', data.access_token);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Azure ─────────────────────────────────────────────────────
router.post('/azure/connect', auditLog('CONNECTOR_AZURE_CONNECT'), async (req, res) => {
  try {
    const { code, redirectUri } = z.object({
      code: z.string().min(1),
      redirectUri: z.string().url()
    }).parse(req.body);

    const tenantId = process.env.AZURE_TENANT_ID || 'common';
    const params = new URLSearchParams({
      code, redirect_uri: redirectUri, grant_type: 'authorization_code',
      client_id: process.env.AZURE_CLIENT_ID ?? '',
      client_secret: process.env.AZURE_CLIENT_SECRET ?? '',
      scope: 'https://management.azure.com/.default offline_access'
    });
    const resp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST', body: params
    });
    const data = await resp.json();
    if (!data.access_token) return res.status(400).json({ error: 'Azure OAuth failed' });

    await storeToken(req.user.id, 'azure', data.access_token);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── AWS ───────────────────────────────────────────────────────
// Stores user-supplied AWS credentials encrypted at rest — no OAuth flow for AWS
router.post('/aws/connect', auditLog('CONNECTOR_AWS_CONNECT'), async (req, res) => {
  try {
    const { accessKeyId, secretAccessKey, region } = z.object({
      accessKeyId: z.string().min(16).max(128),
      secretAccessKey: z.string().min(1),
      region: z.string().min(1).max(32)
    }).parse(req.body);

    await storeToken(req.user.id, 'aws', JSON.stringify({ accessKeyId, secretAccessKey, region }));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Google ────────────────────────────────────────────────────
router.post('/google/connect', auditLog('CONNECTOR_GOOGLE_CONNECT'), async (req, res) => {
  try {
    const { code, redirectUri } = z.object({
      code: z.string().min(1),
      redirectUri: z.string().url()
    }).parse(req.body);

    const params = new URLSearchParams({
      code, redirect_uri: redirectUri, grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? ''
    });
    const resp = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
    const data = await resp.json();
    if (!data.access_token) return res.status(400).json({ error: 'Google OAuth failed' });

    await storeToken(req.user.id, 'google', data.access_token);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Bitbucket ─────────────────────────────────────────────────
router.post('/bitbucket/connect', auditLog('CONNECTOR_BITBUCKET_CONNECT'), async (req, res) => {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);

    const credentials = Buffer.from(`${process.env.BITBUCKET_CLIENT_ID}:${process.env.BITBUCKET_CLIENT_SECRET}`).toString('base64');
    const params = new URLSearchParams({ grant_type: 'authorization_code', code });
    const resp = await fetch('https://bitbucket.org/site/oauth2/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    const data = await resp.json();
    if (!data.access_token) return res.status(400).json({ error: 'Bitbucket OAuth failed' });

    await storeToken(req.user.id, 'bitbucket', data.access_token);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
