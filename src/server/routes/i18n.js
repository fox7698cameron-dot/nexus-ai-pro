// i18n.js - 2026-10-07
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const translateSchema = z.object({
  targetLang: z.string().min(2).max(10),
  strings: z.record(z.string(), z.string()).refine(
    obj => Object.keys(obj).length <= 500,
    'Too many strings (max 500)'
  )
});

// POST /api/i18n/translate - server-side proxy for auto-translation
// Keeps API key server-side; never exposes it to the client
router.post('/translate', async (req, res) => {
  try {
    const parsed = translateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { targetLang, strings } = parsed.data;

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Translation service not configured', translations: strings });
    }

    const keys = Object.keys(strings);
    const values = Object.values(strings);

    // Google Translate batch
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: values,
            target: targetLang,
            source: 'en',
            format: 'text'
          })
        }
      );
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Translation failed' });

      const translations = {};
      data.data.translations.forEach((t, i) => { translations[keys[i]] = t.translatedText; });
      return res.json({ translations, lang: targetLang });
    }

    // DeepL batch
    if (process.env.DEEPL_API_KEY) {
      const body = new URLSearchParams({ target_lang: targetLang.toUpperCase() });
      values.forEach(v => body.append('text', v));
      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: 'DeepL error' });

      const translations = {};
      data.translations.forEach((t, i) => { translations[keys[i]] = t.text; });
      return res.json({ translations, lang: targetLang });
    }

    res.status(503).json({ error: 'No translation provider configured', translations: strings });
  } catch (err) {
    console.error('[i18n/translate]', err.message);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// GET /api/i18n/locales - list supported locales
router.get('/locales', (req, res) => {
  res.json({
    locales: [
      { code: 'en', name: 'English', dir: 'ltr' },
      { code: 'es', name: 'Español', dir: 'ltr' },
      { code: 'fr', name: 'Français', dir: 'ltr' },
      { code: 'de', name: 'Deutsch', dir: 'ltr' },
      { code: 'ja', name: '日本語', dir: 'ltr' },
      { code: 'zh', name: '中文 (简体)', dir: 'ltr' },
      { code: 'zh-TW', name: '中文 (繁體)', dir: 'ltr' },
      { code: 'ko', name: '한국어', dir: 'ltr' },
      { code: 'pt', name: 'Português', dir: 'ltr' },
      { code: 'ar', name: 'العربية', dir: 'rtl' },
      { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
      { code: 'ru', name: 'Русский', dir: 'ltr' },
      { code: 'tr', name: 'Türkçe', dir: 'ltr' },
      { code: 'it', name: 'Italiano', dir: 'ltr' },
      { code: 'nl', name: 'Nederlands', dir: 'ltr' },
      { code: 'pl', name: 'Polski', dir: 'ltr' },
      { code: 'sv', name: 'Svenska', dir: 'ltr' }
    ]
  });
});

export default router;
