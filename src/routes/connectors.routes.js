// src/routes/connectors.routes.js
// Nexus AI Pro - Cloud & Service Connector Routes
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import { Router } from 'express';
import { param, body, validationResult } from 'express-validator';

const VALID_SERVICES = ['azure', 'aws', 'google', 'adobe', 'slack', 'zoom', 'github', 'bitbucket'];

export function createConnectorsRouter(cloudRegistry, authService) {
  const router = Router();
  const auth = authService.requireAuth();

  // ─── Generic connector proxy ──────────────────────────────────────────────────
  router.get('/:service/status', auth,
    [param('service').isIn(VALID_SERVICES)],
    async (req, res) => {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: 'Invalid service' });
      try {
        const connector = cloudRegistry.getConnector(req.params.service);
        res.json({ service: req.params.service, configured: true, connector: connector.name });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  // ─── GitHub ───────────────────────────────────────────────────────────────────
  router.get('/github/repos/:owner', auth, async (req, res) => {
    try {
      const data = await cloudRegistry.github.getRepos(req.params.owner);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/github/repos/:owner/:repo/stats', auth, async (req, res) => {
    try {
      const data = await cloudRegistry.github.getRepoStats(req.params.owner, req.params.repo);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/github/repos/:owner/:repo/workflows', auth, async (req, res) => {
    try {
      const data = await cloudRegistry.github.getWorkflowRuns(req.params.owner, req.params.repo);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Slack ────────────────────────────────────────────────────────────────────
  router.get('/slack/channels', auth, async (req, res) => {
    try {
      const data = await cloudRegistry.slack.listChannels();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/slack/message', auth, [
    body('channelId').isString().notEmpty(),
    body('text').isString().notEmpty(),
  ], async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'channelId and text required' });
    try {
      const data = await cloudRegistry.slack.sendMessage(req.body.channelId, req.body.text);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Zoom ─────────────────────────────────────────────────────────────────────
  router.post('/zoom/meeting', auth, [
    body('topic').isString().notEmpty(),
    body('duration').optional().isInt({ min: 15, max: 480 }),
  ], async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'topic required' });
    try {
      const data = await cloudRegistry.zoom.createMeeting(req.body);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/zoom/meetings', auth, async (req, res) => {
    try {
      const data = await cloudRegistry.zoom.listMeetings();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Bitbucket ────────────────────────────────────────────────────────────────
  router.get('/bitbucket/:workspace/repos', auth, async (req, res) => {
    try {
      const data = await cloudRegistry.bitbucket.getWorkspaceRepos(req.params.workspace);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/bitbucket/:workspace/:repo/pipelines', auth, async (req, res) => {
    try {
      const data = await cloudRegistry.bitbucket.getPipelines(req.params.workspace, req.params.repo);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Azure ────────────────────────────────────────────────────────────────────
  router.get('/azure/devops/projects', auth, async (req, res) => {
    try {
      const data = await cloudRegistry.azure.getDevOpsProjects();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Auto-translate endpoint ──────────────────────────────────────────────────
  router.post('/translate', auth, [
    body('text').isString().notEmpty(),
    body('targetLang').isString().isLength({ min: 2, max: 5 }),
    body('sourceLang').optional().isString(),
  ], async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'text and targetLang required' });
    const { text, targetLang, sourceLang = 'en' } = req.body;
    const { autoTranslate } = await import('../i18n/index.js');
    try {
      const translated = await autoTranslate(text, targetLang, sourceLang);
      res.json({ original: text, translated, targetLang, sourceLang });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
