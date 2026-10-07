// connectors.js - 2026-10-07
import { Router } from 'express';
import { CONNECTORS, pingAllConnectors, getConnectorByName } from '../connectors/EnterpriseConnectors.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/connectors/status - list all connectors and their cached status
// Requires authentication (admin or developer role)
router.get('/status', requireAuth(['admin', 'developer']), async (req, res) => {
  try {
    const results = CONNECTORS.map(c => ({ name: c.name, status: c.status }));
    res.json({ connectors: results });
  } catch (err) {
    console.error('[connectors/status]', err.message);
    res.status(500).json({ error: 'Failed to fetch connector statuses' });
  }
});

// POST /api/connectors/ping/:name - ping a specific connector
router.post('/ping/:name', requireAuth(['admin', 'developer']), async (req, res) => {
  try {
    const { name } = req.params;
    const connector = getConnectorByName(decodeURIComponent(name));
    if (!connector) return res.status(404).json({ error: `Connector not found: ${name}` });

    const status = await connector.ping();
    res.json({ name: connector.name, status });
  } catch (err) {
    console.error('[connectors/ping]', err.message);
    res.status(500).json({ error: 'Ping failed' });
  }
});

// POST /api/connectors/ping-all - ping all connectors
router.post('/ping-all', requireAuth(['admin']), async (req, res) => {
  try {
    const results = await pingAllConnectors();
    res.json({ connectors: results });
  } catch (err) {
    console.error('[connectors/ping-all]', err.message);
    res.status(500).json({ error: 'Failed to ping all connectors' });
  }
});

export default router;
