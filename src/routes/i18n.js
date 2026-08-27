/**
 * routes/i18n.js
 * Nexus AI Pro — Translation / Internationalization API
 * Date: 2026-08-27
 * POST /api/i18n/translate — auto-translate text using server-side API key
 * GET  /api/i18n/locales   — list supported locales
 * TRANSLATE_API_KEY loaded from environment — never hard-coded
 */

import express from 'express';

const router = express.Router();

const SUPPORTED_LOCALES = [
  'en','es','fr','de','ja','ko','zh','ar','pt','ru','hi','it','nl','pl','tr','sv',
];

// ── GET /api/i18n/locales ─────────────────────────────────────────────────────
router.get('/locales', (req, res) => {
  res.json({ locales: SUPPORTED_LOCALES });
});

// ── POST /api/i18n/translate ──────────────────────────────────────────────────
router.post('/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'text and targetLang required' });
  }
  if (!SUPPORTED_LOCALES.includes(targetLang)) {
    return res.status(400).json({ error: 'Unsupported locale', supported: SUPPORTED_LOCALES });
  }
  if (targetLang === 'en') {
    return res.json({ translatedText: text, fromCache: false });
  }

  const apiKey = process.env.TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    // Dev fallback: return original text with locale prefix
    return res.json({ translatedText: text, mocked: true });
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const resp = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ q: text, target: targetLang, format: 'text' }),
    });
    if (!resp.ok) throw new Error('Translation API error');
    const data = await resp.json();
    const translatedText = data?.data?.translations?.[0]?.translatedText || text;
    return res.json({ translatedText });
  } catch {
    return res.json({ translatedText: text, fallback: true });
  }
});

export default router;
