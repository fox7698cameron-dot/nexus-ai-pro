// translate.js | Nexus AI Pro | Created: 2026-10-15 | Translation & i18n Routes

import { Router } from 'express';

const router = Router();

// Supported locales
const SUPPORTED_LANGUAGES = Object.freeze([
  { code: 'en', name: 'English', rtl: false },
  { code: 'es', name: 'Español', rtl: false },
  { code: 'fr', name: 'Français', rtl: false },
  { code: 'de', name: 'Deutsch', rtl: false },
  { code: 'ja', name: '日本語', rtl: false },
  { code: 'zh', name: '中文', rtl: false },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'pt', name: 'Português', rtl: false },
  { code: 'hi', name: 'हिन्दी', rtl: false },
  { code: 'ko', name: '한국어', rtl: false },
]);

// GET /api/translate/languages
router.get('/languages', (req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

// POST /api/translate
router.post('/', async (req, res) => {
  try {
    const { text, targetLang, sourceLang = 'auto' } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const validCodes = SUPPORTED_LANGUAGES.map(l => l.code);
    if (targetLang && !validCodes.includes(targetLang)) {
      return res.status(400).json({ error: `Unsupported target language. Supported: ${validCodes.join(', ')}` });
    }

    // Use DeepL or Google Translate if configured
    if (process.env.DEEPL_API_KEY) {
      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: [text], target_lang: (targetLang || 'EN').toUpperCase() }),
      });
      const data = await response.json();
      if (data.translations?.[0]) {
        return res.json({ translated: data.translations[0].text, detectedSource: data.translations[0].detected_source_language, targetLang });
      }
    }

    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: targetLang || 'en', source: sourceLang === 'auto' ? undefined : sourceLang }),
      });
      const data = await response.json();
      const translated = data.data?.translations?.[0]?.translatedText;
      if (translated) {
        return res.json({ translated, targetLang });
      }
    }

    // Stub: return original text when no translation service configured
    res.json({ translated: text, targetLang, stub: true, message: 'Configure DEEPL_API_KEY or GOOGLE_TRANSLATE_API_KEY for real translation' });
  } catch (err) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

// POST /api/translate/batch - Translate multiple strings
router.post('/batch', async (req, res) => {
  const { texts, targetLang } = req.body;
  if (!Array.isArray(texts) || texts.length === 0) return res.status(400).json({ error: 'texts array required' });
  if (texts.length > 100) return res.status(400).json({ error: 'Maximum 100 strings per batch' });

  // In production, forward to translation service
  const results = texts.map(t => ({ original: t, translated: t, targetLang, stub: true }));
  res.json({ results });
});

export { router as translateRouter };
