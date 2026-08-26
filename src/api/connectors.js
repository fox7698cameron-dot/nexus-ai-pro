/**
 * NEXUS AI PRO - Cloud & Platform Connectors API
 * File: src/api/connectors.js
 * Date: 2026-08-26
 *
 * Connectors/plugins for: Azure, Adobe, AWS, Google Cloud, Slack, Zoom,
 * GitHub, Bitbucket, Redis, Blob Storage.
 * All credentials loaded from environment — never hardcoded.
 */

import express from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditLog } from '../utils/helpers.js';

const router = express.Router();

// ─── Connector registry ────────────────────────────────────────────────────────
const CONNECTOR_TYPES = Object.freeze({
  // Cloud providers
  AZURE: 'azure',
  AWS: 'aws',
  GCP: 'gcp',
  // Creative
  ADOBE: 'adobe',
  // Communication
  SLACK: 'slack',
  ZOOM: 'zoom',
  DISCORD: 'discord_bot',
  // Source control
  GITHUB: 'github',
  BITBUCKET: 'bitbucket',
  // Storage/Cache
  REDIS: 'redis',
  BLOB_AZURE: 'blob_azure',
  BLOB_S3: 'blob_s3',
  BLOB_GCS: 'blob_gcs',
  // Game platforms
  UNREAL: 'unreal_engine',
  EPIC: 'epic_games',
  PLAYSTATION: 'playstation_network',
  XBOX: 'xbox_live',
  UBISOFT: 'ubisoft_connect',
  STEAM: 'steam',
});

// ─── Connector configs store (in-memory; use DB in production) ─────────────────
const connectorConfigs = new Map(); // userId → Map<connectorType, config>

function getUserConnectors(userId) {
  if (!connectorConfigs.has(userId)) connectorConfigs.set(userId, new Map());
  return connectorConfigs.get(userId);
}

// ─── Connector Status Checker ──────────────────────────────────────────────────
class ConnectorStatusChecker {
  static async checkAzure(config) {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    if (!tenantId || !clientId || !clientSecret) return { status: 'not_configured', detail: 'Azure credentials not set in environment' };

    try {
      const resp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'https://management.azure.com/.default' }),
      });
      return resp.ok ? { status: 'connected', detail: 'Azure authentication successful' } : { status: 'error', detail: 'Azure authentication failed' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  static async checkAWS(config) {
    const key = process.env.AWS_ACCESS_KEY_ID;
    const secret = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';
    if (!key || !secret) return { status: 'not_configured', detail: 'AWS credentials not set in environment' };
    // STS GetCallerIdentity (lightweight connectivity check)
    try {
      const now = new Date();
      const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const resp = await fetch(`https://sts.${region}.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15`, {
        headers: { 'X-Amz-Date': amzDate, Authorization: `AWS4-HMAC-SHA256 Credential=${key}/${dateStamp}/${region}/sts/aws4_request,SignedHeaders=host;x-amz-date,Signature=placeholder` },
      });
      return { status: resp.ok ? 'connected' : 'error', detail: `AWS STS responded with ${resp.status}` };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  static async checkGitHub(config) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return { status: 'not_configured', detail: 'GITHUB_TOKEN not set in environment' };
    try {
      const resp = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/2.0' } });
      if (resp.ok) {
        const data = await resp.json();
        return { status: 'connected', detail: `Connected as ${data.login}` };
      }
      return { status: 'error', detail: 'GitHub authentication failed' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  static async checkSlack(config) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return { status: 'not_configured', detail: 'SLACK_BOT_TOKEN not set in environment' };
    try {
      const resp = await fetch('https://slack.com/api/auth.test', { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      return data.ok ? { status: 'connected', detail: `Connected to workspace: ${data.team}` } : { status: 'error', detail: data.error };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  static async checkBitbucket(config) {
    const user = process.env.BITBUCKET_USER;
    const appPassword = process.env.BITBUCKET_APP_PASSWORD;
    if (!user || !appPassword) return { status: 'not_configured', detail: 'BITBUCKET_USER/BITBUCKET_APP_PASSWORD not set' };
    try {
      const creds = Buffer.from(`${user}:${appPassword}`).toString('base64');
      const resp = await fetch('https://api.bitbucket.org/2.0/user', { headers: { Authorization: `Basic ${creds}` } });
      if (resp.ok) {
        const data = await resp.json();
        return { status: 'connected', detail: `Connected as ${data.display_name}` };
      }
      return { status: 'error', detail: 'Bitbucket authentication failed' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  static async checkZoom(config) {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!accountId || !clientId || !clientSecret) return { status: 'not_configured', detail: 'Zoom credentials not set in environment' };
    try {
      const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const resp = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${creds}` },
      });
      return resp.ok ? { status: 'connected', detail: 'Zoom Server-to-Server OAuth successful' } : { status: 'error', detail: 'Zoom authentication failed' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  static checkRedis() {
    const url = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
    return url ? { status: 'configured', detail: `Redis URL configured (${url.split('@').pop()})` } : { status: 'not_configured', detail: 'REDIS_URL not set' };
  }

  static checkBlobStorage(type) {
    switch (type) {
      case CONNECTOR_TYPES.BLOB_AZURE:
        return process.env.AZURE_STORAGE_CONNECTION_STRING
          ? { status: 'configured', detail: 'Azure Blob Storage connection string found' }
          : { status: 'not_configured', detail: 'AZURE_STORAGE_CONNECTION_STRING not set' };
      case CONNECTOR_TYPES.BLOB_S3:
        return process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET
          ? { status: 'configured', detail: `S3 Bucket: ${process.env.S3_BUCKET}` }
          : { status: 'not_configured', detail: 'AWS_ACCESS_KEY_ID or S3_BUCKET not set' };
      case CONNECTOR_TYPES.BLOB_GCS:
        return process.env.GCS_BUCKET
          ? { status: 'configured', detail: `GCS Bucket: ${process.env.GCS_BUCKET}` }
          : { status: 'not_configured', detail: 'GCS_BUCKET not set' };
      default:
        return { status: 'unknown', detail: 'Unknown blob type' };
    }
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// List all connector statuses
router.get('/status', requireAuth, async (req, res) => {
  try {
    const [azure, aws, github, slack, bitbucket, zoom] = await Promise.all([
      ConnectorStatusChecker.checkAzure(),
      ConnectorStatusChecker.checkAWS(),
      ConnectorStatusChecker.checkGitHub(),
      ConnectorStatusChecker.checkSlack(),
      ConnectorStatusChecker.checkBitbucket(),
      ConnectorStatusChecker.checkZoom(),
    ]);

    const statuses = {
      [CONNECTOR_TYPES.AZURE]: azure,
      [CONNECTOR_TYPES.AWS]: aws,
      [CONNECTOR_TYPES.GITHUB]: github,
      [CONNECTOR_TYPES.SLACK]: slack,
      [CONNECTOR_TYPES.BITBUCKET]: bitbucket,
      [CONNECTOR_TYPES.ZOOM]: zoom,
      [CONNECTOR_TYPES.REDIS]: ConnectorStatusChecker.checkRedis(),
      [CONNECTOR_TYPES.BLOB_AZURE]: ConnectorStatusChecker.checkBlobStorage(CONNECTOR_TYPES.BLOB_AZURE),
      [CONNECTOR_TYPES.BLOB_S3]: ConnectorStatusChecker.checkBlobStorage(CONNECTOR_TYPES.BLOB_S3),
      [CONNECTOR_TYPES.BLOB_GCS]: ConnectorStatusChecker.checkBlobStorage(CONNECTOR_TYPES.BLOB_GCS),
    };

    const connected = Object.values(statuses).filter(s => s.status === 'connected' || s.status === 'configured').length;
    res.json({ connectors: statuses, summary: { connected, total: Object.keys(statuses).length }, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Status check failed', detail: err.message });
  }
});

// Check specific connector
router.get('/status/:type', requireAuth, async (req, res) => {
  const { type } = req.params;
  let result;

  switch (type) {
    case CONNECTOR_TYPES.AZURE: result = await ConnectorStatusChecker.checkAzure(); break;
    case CONNECTOR_TYPES.AWS: result = await ConnectorStatusChecker.checkAWS(); break;
    case CONNECTOR_TYPES.GITHUB: result = await ConnectorStatusChecker.checkGitHub(); break;
    case CONNECTOR_TYPES.SLACK: result = await ConnectorStatusChecker.checkSlack(); break;
    case CONNECTOR_TYPES.BITBUCKET: result = await ConnectorStatusChecker.checkBitbucket(); break;
    case CONNECTOR_TYPES.ZOOM: result = await ConnectorStatusChecker.checkZoom(); break;
    case CONNECTOR_TYPES.REDIS: result = ConnectorStatusChecker.checkRedis(); break;
    case CONNECTOR_TYPES.BLOB_AZURE:
    case CONNECTOR_TYPES.BLOB_S3:
    case CONNECTOR_TYPES.BLOB_GCS:
      result = ConnectorStatusChecker.checkBlobStorage(type); break;
    default:
      return res.status(400).json({ error: `Unknown connector type: ${type}` });
  }

  res.json({ type, ...result, timestamp: new Date().toISOString() });
});

// User connector preferences
router.get('/my-connectors', requireAuth, (req, res) => {
  const userConnectors = getUserConnectors(req.user.sub);
  const list = [];
  for (const [type, config] of userConnectors) {
    list.push({ type, ...config });
  }
  res.json({ connectors: list });
});

router.post('/my-connectors', requireAuth, (req, res) => {
  const { type, label, projectId } = req.body;
  if (!Object.values(CONNECTOR_TYPES).includes(type)) {
    return res.status(400).json({ error: `Unknown connector. Valid: ${Object.values(CONNECTOR_TYPES).join(', ')}` });
  }

  const userConnectors = getUserConnectors(req.user.sub);
  const entry = { label: label || type, projectId: projectId || null, addedAt: new Date().toISOString(), active: true };
  userConnectors.set(type, entry);
  auditLog('CONNECTOR_CONFIGURED', { userId: req.user.sub, type });
  res.json({ message: 'Connector configured', type, ...entry });
});

router.delete('/my-connectors/:type', requireAuth, (req, res) => {
  const userConnectors = getUserConnectors(req.user.sub);
  userConnectors.delete(req.params.type);
  auditLog('CONNECTOR_REMOVED', { userId: req.user.sub, type: req.params.type });
  res.json({ message: 'Connector removed' });
});

// Connector types list
router.get('/types', (_req, res) => {
  res.json({ types: Object.values(CONNECTOR_TYPES) });
});

export { router as connectorsRouter, CONNECTOR_TYPES };
