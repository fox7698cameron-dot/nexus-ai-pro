/**
 * server/router.js
 * Central router mounting all Nexus AI Pro API route modules
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 */

import { Router }        from 'express';
import { authenticate }  from './middleware/auth.js';
import authRoutes        from './routes/auth.js';
import securityRoutes    from './routes/security.js';
import paymentRoutes     from './routes/payments.js';
import analyticsRoutes   from './routes/analytics.js';
import connectorsRoutes  from './routes/connectors.js';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────

// Authentication (register, login, refresh, biometric challenge)
router.use('/auth', authRoutes);

// ─── Protected routes (require valid JWT) ─────────────────────────────────────
// Note: individual sub-routers also enforce role checks where needed.

router.use('/security',   authenticate, securityRoutes);
router.use('/payments',   authenticate, paymentRoutes);
router.use('/analytics',  authenticate, analyticsRoutes);
router.use('/connectors', authenticate, connectorsRoutes);

// ─── Translation proxy ───────────────────────────────────────────────────────
// Proxies translation requests to the configured provider without exposing its key to the client.
router.post('/translate', authenticate, async (req, res) => {
  try {
    const { text, target } = req.body;
    if (!text || !target) return res.status(400).json({ error: 'text and target required' });

    const endpoint = process.env.TRANSLATE_API_ENDPOINT;
    const apiKey   = process.env.TRANSLATE_API_KEY;

    if (!endpoint) {
      // Return original text when translation service is not configured
      return res.json({ translated: text, note: 'TRANSLATE_API_ENDPOINT not configured' });
    }

    const response = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ text, target }),
    });

    if (!response.ok) {
      return res.json({ translated: text, error: 'Translation service unavailable' });
    }

    const data = await response.json();
    return res.json({ translated: data.translatedText ?? data.translated ?? text });
  } catch (err) {
    console.error('[translate]', err.message);
    return res.json({ translated: req.body?.text ?? '' });
  }
});

export default router;
