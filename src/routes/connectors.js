// ================================================
// NEXUS AI PRO - Cloud Connector Routes
// File: src/routes/connectors.js
// Updated: 2026-07-01
// Connectors: Azure, Adobe, AWS, Google Cloud,
//             Slack, Zoom, GitHub, Bitbucket
// ================================================

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  CONNECTORS, checkConnectorStatus,
  uploadToAzureBlob, uploadToS3, getS3PresignedUrl,
  sendSlackMessage, listSlackChannels, createZoomMeeting,
  getGitHubRepos, getGitHubCommits, getBitbucketRepos,
} from '../services/connectorService.js';

const router = Router();

function ok(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ error: 'Validation failed', details: e.array() }); return false; }
  return true;
}

const CONNECTOR_IDS = Object.values(CONNECTORS);

// ── GET /api/connectors ───────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  const statuses = await Promise.allSettled(
    CONNECTOR_IDS.map(id => checkConnectorStatus(id).then(s => ({ id, ...s })))
  );
  const result = statuses.map(r => r.status === 'fulfilled' ? r.value : { id: 'unknown', connected: false });
  res.json({ connectors: result });
});

// ── GET /api/connectors/:id/status ────────────────────────────────────────

router.get('/:id/status', requireAuth, [param('id').isIn(CONNECTOR_IDS)], async (req, res) => {
  if (!ok(req, res)) return;
  const status = await checkConnectorStatus(req.params.id);
  res.json(status);
});

// ── POST /api/connectors/azure/upload ─────────────────────────────────────

router.post('/azure/upload', requireAuth, [body('container').notEmpty(), body('blobName').notEmpty()], async (req, res) => {
  if (!ok(req, res)) return;
  try {
    const { container, blobName, data = '' } = req.body;
    const result = await uploadToAzureBlob(container, blobName, Buffer.from(data, 'base64'));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/connectors/aws/upload ───────────────────────────────────────

router.post('/aws/upload', requireAuth, [body('key').notEmpty()], async (req, res) => {
  if (!ok(req, res)) return;
  try {
    const { key, data = '', contentType = 'application/octet-stream' } = req.body;
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) return res.status(500).json({ error: 'AWS_S3_BUCKET not configured' });
    const result = await uploadToS3(bucket, key, Buffer.from(data, 'base64'), contentType);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/connectors/aws/presign ───────────────────────────────────────

router.get('/aws/presign', requireAuth, async (req, res) => {
  const { key, expiresIn = 3600 } = req.query;
  if (!key) return res.status(400).json({ error: 'key required' });
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) return res.status(500).json({ error: 'AWS_S3_BUCKET not configured' });
  try {
    const url = await getS3PresignedUrl(bucket, key, parseInt(expiresIn));
    return res.json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/connectors/slack/message ────────────────────────────────────

router.post('/slack/message', requireAuth, [body('channel').notEmpty(), body('text').notEmpty()], async (req, res) => {
  if (!ok(req, res)) return;
  try {
    const result = await sendSlackMessage(req.body.channel, req.body.text, req.body.blocks);
    return res.json({ success: true, ts: result.ts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/connectors/slack/channels ────────────────────────────────────

router.get('/slack/channels', requireAuth, async (req, res) => {
  try {
    const channels = await listSlackChannels();
    return res.json({ channels });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/connectors/zoom/meeting ─────────────────────────────────────

router.post('/zoom/meeting', requireAuth, [body('topic').notEmpty(), body('startTime').isISO8601()], async (req, res) => {
  if (!ok(req, res)) return;
  try {
    const meeting = await createZoomMeeting({ topic: req.body.topic, startTime: req.body.startTime, duration: req.body.duration });
    return res.json(meeting);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/connectors/github/repos ──────────────────────────────────────

router.get('/github/repos', requireAuth, async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    const repos = await getGitHubRepos(username);
    return res.json({ repos });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/connectors/github/commits ────────────────────────────────────

router.get('/github/commits', requireAuth, async (req, res) => {
  const { owner, repo, since } = req.query;
  if (!owner || !repo) return res.status(400).json({ error: 'owner and repo required' });
  try {
    const commits = await getGitHubCommits(owner, repo, since);
    return res.json({ commits });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/connectors/bitbucket/repos ───────────────────────────────────

router.get('/bitbucket/repos', requireAuth, async (req, res) => {
  try {
    const repos = await getBitbucketRepos();
    return res.json({ repos });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
