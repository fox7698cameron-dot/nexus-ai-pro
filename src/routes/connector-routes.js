// src/routes/connector-routes.js
// Date: 2026-07-08
// Integration connectors: Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket

import express from 'express';
import { createAuthMiddleware } from '../middleware/auth-middleware.js';
import { INTEGRATIONS } from '../services/integration-service.js';

export function createConnectorRouter(integrationService, authService) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(authService);

  // GET /api/connectors
  router.get('/', authenticate, (req, res) => {
    const connections = integrationService.getConnections(req.user.id);
    res.json({ connections, available: Object.values(INTEGRATIONS) });
  });

  // POST /api/connectors/connect
  router.post('/connect', authenticate, (req, res) => {
    const { integration, config } = req.body;
    if (!integration) return res.status(400).json({ error: 'integration required' });
    const result = integrationService.connectIntegration(req.user.id, integration, config || {});
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // DELETE /api/connectors/:integration
  router.delete('/:integration', authenticate, (req, res) => {
    const result = integrationService.disconnectIntegration(req.user.id, req.params.integration);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // GET /api/connectors/dashboard
  router.get('/dashboard', authenticate, async (req, res) => {
    try {
      const dashboard = await integrationService.getDashboard(req.user.id);
      res.json(dashboard);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/connectors/:integration/status
  router.get('/:integration/status', authenticate, async (req, res) => {
    try {
      const { integration } = req.params;
      const handlers = {
        azure: () => integrationService.getAzureStatus(req.user.id),
        aws: () => integrationService.getAWSStatus(req.user.id),
        google: () => integrationService.getGoogleStatus(req.user.id),
        slack: () => integrationService.getSlackStatus(req.user.id),
        zoom: () => integrationService.getZoomStatus(req.user.id),
        github: () => integrationService.getGitHubStatus(req.user.id),
        bitbucket: () => integrationService.getBitbucketStatus(req.user.id),
        adobe: () => integrationService.getAdobeStatus(req.user.id)
      };

      const handler = handlers[integration];
      if (!handler) return res.status(400).json({ error: `Unknown integration: ${integration}` });
      const status = await handler();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/connectors/slack/message
  router.post('/slack/message', authenticate, async (req, res) => {
    try {
      const { channel, text, blocks } = req.body;
      if (!channel || !text) return res.status(400).json({ error: 'channel and text required' });
      const result = await integrationService.sendSlackMessage(req.user.id, channel, text, blocks);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/connectors/:integration/webhook
  router.post('/:integration/webhook', authenticate, (req, res) => {
    const { url, events } = req.body;
    if (!url || !events) return res.status(400).json({ error: 'url and events required' });
    const result = integrationService.registerWebhook(req.user.id, req.params.integration, url, events);
    res.json(result);
  });

  return router;
}
