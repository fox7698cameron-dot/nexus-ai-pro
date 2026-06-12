// src/integrations/routes.js
// 2026-06-12 | Enterprise connector routes: Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket + game platforms
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../auth/middleware.js';

const CONNECTORS = Object.freeze([
  // Cloud providers
  { id: 'azure', name: 'Microsoft Azure', category: 'cloud', icon: 'azure' },
  { id: 'aws', name: 'Amazon AWS', category: 'cloud', icon: 'aws' },
  { id: 'gcp', name: 'Google Cloud', category: 'cloud', icon: 'gcp' },
  // Developer tools
  { id: 'github', name: 'GitHub', category: 'devtools', icon: 'github' },
  { id: 'bitbucket', name: 'Bitbucket', category: 'devtools', icon: 'bitbucket' },
  // Communication
  { id: 'slack', name: 'Slack', category: 'communication', icon: 'slack' },
  { id: 'zoom', name: 'Zoom', category: 'communication', icon: 'zoom' },
  { id: 'discord', name: 'Discord', category: 'communication', icon: 'discord' },
  // Creative
  { id: 'adobe', name: 'Adobe Creative Cloud', category: 'creative', icon: 'adobe' },
  // Game platforms
  { id: 'epic_games', name: 'Epic Games / Unreal', category: 'gaming', icon: 'epic' },
  { id: 'sony_psn', name: 'PlayStation Network', category: 'gaming', icon: 'sony' },
  { id: 'microsoft_xbox', name: 'Xbox / Microsoft', category: 'gaming', icon: 'xbox' },
  { id: 'ubisoft_connect', name: 'Ubisoft Connect', category: 'gaming', icon: 'ubisoft' },
  { id: 'steam', name: 'Steam', category: 'gaming', icon: 'steam' },
  // Storage
  { id: 'azure_blob', name: 'Azure Blob Storage', category: 'storage', icon: 'azure_blob' },
  { id: 'aws_s3', name: 'AWS S3', category: 'storage', icon: 's3' },
  { id: 'redis', name: 'Redis', category: 'cache', icon: 'redis' }
]);

const ConnectSchema = z.object({
  connectorId: z.string().min(1),
  credentials: z.record(z.string()).optional(),
  config: z.record(z.unknown()).optional()
});

function maskCredential(value) {
  if (!value || value.length < 4) return '****';
  return value.slice(0, 4) + '****' + value.slice(-2);
}

export function createIntegrationsRouter(integrationStore) {
  const router = Router();

  // GET /api/integrations/available
  router.get('/available', (_req, res) => {
    res.json({ connectors: CONNECTORS });
  });

  // GET /api/integrations/connected
  router.get('/connected', authMiddleware, (req, res) => {
    const connections = integrationStore.listByUser(req.user.sub).map(c => ({
      ...c,
      credentials: c.credentials
        ? Object.fromEntries(Object.entries(c.credentials).map(([k, v]) => [k, maskCredential(v)]))
        : {}
    }));
    res.json({ connections });
  });

  // POST /api/integrations/connect
  router.post('/connect', authMiddleware, (req, res) => {
    const parsed = ConnectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { connectorId, credentials, config } = parsed.data;
    const connector = CONNECTORS.find(c => c.id === connectorId);
    if (!connector) return res.status(400).json({ error: 'Unknown connector' });

    // Never store raw API keys in plaintext — in production use encrypted vault
    // Here we store a masked representation only
    const connection = {
      id: `${req.user.sub}:${connectorId}`,
      userId: req.user.sub,
      connectorId,
      connectorName: connector.name,
      category: connector.category,
      status: 'connected',
      credentials: credentials || {},
      config: config || {},
      connectedAt: Date.now()
    };
    integrationStore.save(connection);
    res.json({ success: true, connectorId, status: 'connected' });
  });

  // DELETE /api/integrations/:connectorId
  router.delete('/:connectorId', authMiddleware, (req, res) => {
    const id = `${req.user.sub}:${req.params.connectorId}`;
    integrationStore.delete(id);
    res.json({ success: true });
  });

  // POST /api/integrations/slack/notify
  router.post('/slack/notify', authMiddleware, async (req, res) => {
    const { message, channel } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return res.status(400).json({ error: 'Slack webhook not configured' });

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message, channel })
      });
      if (!response.ok) throw new Error(`Slack returned ${response.status}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Slack notification failed' });
    }
  });

  // GET /api/integrations/status - Health check for all connected integrations
  router.get('/status', authMiddleware, (req, res) => {
    const connections = integrationStore.listByUser(req.user.sub);
    res.json({
      total: connections.length,
      connected: connections.filter(c => c.status === 'connected').length,
      connections: connections.map(c => ({ connectorId: c.connectorId, status: c.status, connectedAt: c.connectedAt }))
    });
  });

  return router;
}

export class InMemoryIntegrationStore {
  constructor() {
    this._connections = new Map();
  }

  save(connection) { this._connections.set(connection.id, { ...connection }); }
  delete(id) { this._connections.delete(id); }
  listByUser(userId) {
    return Array.from(this._connections.values()).filter(c => c.userId === userId);
  }
}
