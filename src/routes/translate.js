/**
 * src/routes/translate.js
 * Nexus AI Pro — Translation Route
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * POST /api/translate — auto-translate text to target locale
 *
 * Delegates to a configured translation provider (Google Cloud Translation,
 * DeepL, or LibreTranslate). Falls back to returning the source text if no
 * provider is configured so the UI degrades gracefully.
 */

import { Router } from 'express';

const router = Router();

const SUPPORTED_LOCALES = new Set([
  'en','es','fr','de','ja','zh','ko','pt','ar','hi','ru','it','nl','sv','pl'
]);

// ─── POST /api/translate ──────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { text, targetLocale, sourceLocale = 'en' } = req.body ?? {};
  if (!text)         return res.status(400).json({ error: 'text is required' });
  if (!targetLocale) return res.status(400).json({ error: 'targetLocale is required' });
  if (!SUPPORTED_LOCALES.has(targetLocale)) return res.status(400).json({ error: `Unsupported locale: ${targetLocale}` });
  if (targetLocale === sourceLocale)        return res.json({ translated: text, cached: true });

  // ── Google Cloud Translation ──────────────────────────────────────────────
  if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    try {
      const url = new URL('https://translation.googleapis.com/language/translate/v2');
      url.searchParams.set('key', process.env.GOOGLE_TRANSLATE_API_KEY);
      const r = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: sourceLocale, target: targetLocale, format: 'text' }),
      });
      if (r.ok) {
        const data = await r.json();
        const translated = data?.data?.translations?.[0]?.translatedText;
        if (translated) return res.json({ translated, provider: 'google' });
      }
    } catch { /* fall through */ }
  }

  // ── DeepL ─────────────────────────────────────────────────────────────────
  if (process.env.DEEPL_API_KEY) {
    try {
      const r = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        },
        body: new URLSearchParams({ text, target_lang: targetLocale.toUpperCase(), source_lang: sourceLocale.toUpperCase() }),
      });
      if (r.ok) {
        const data = await r.json();
        const translated = data?.translations?.[0]?.text;
        if (translated) return res.json({ translated, provider: 'deepl' });
      }
    } catch { /* fall through */ }
  }

  // ── LibreTranslate (self-hosted) ──────────────────────────────────────────
  const libreUrl = process.env.LIBRETRANSLATE_URL;
  if (libreUrl) {
    try {
      const r = await fetch(`${libreUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: sourceLocale, target: targetLocale }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data?.translatedText) return res.json({ translated: data.translatedText, provider: 'libretranslate' });
      }
    } catch { /* fall through */ }
  }

  // ── Graceful degradation ──────────────────────────────────────────────────
  res.json({ translated: text, provider: 'fallback', warning: 'No translation provider configured — returning source text' });
});

export default router;
