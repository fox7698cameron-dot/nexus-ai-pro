// src/routes/i18n.js | Nexus AI Pro | Date: 2026-06-07

import { Router }       from 'express';
import { body, query, validationResult } from 'express-validator';
import rateLimit        from 'express-rate-limit';

// ---------------------------------------------------------------------------
// Supported locale metadata (mirrors src/services/i18n.js — single source of
// truth at the service layer; duplicated here to keep the route self-contained
// and avoid a circular browser/Node import boundary).
// ---------------------------------------------------------------------------

const SUPPORTED_LOCALES = [
  { code: 'en-US', name: 'English (US)',           nativeName: 'English',          rtl: false },
  { code: 'es-ES', name: 'Spanish (Spain)',         nativeName: 'Español',          rtl: false },
  { code: 'fr-FR', name: 'French (France)',         nativeName: 'Français',         rtl: false },
  { code: 'de-DE', name: 'German (Germany)',        nativeName: 'Deutsch',          rtl: false },
  { code: 'pt-BR', name: 'Portuguese (Brazil)',     nativeName: 'Português (BR)',   rtl: false },
  { code: 'ja-JP', name: 'Japanese',                nativeName: '日本語',            rtl: false },
  { code: 'ko-KR', name: 'Korean',                  nativeName: '한국어',             rtl: false },
  { code: 'zh-CN', name: 'Chinese (Simplified)',    nativeName: '简体中文',           rtl: false },
  { code: 'zh-TW', name: 'Chinese (Traditional)',   nativeName: '繁體中文',           rtl: false },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)',   nativeName: 'العربية',           rtl: true  },
  { code: 'hi-IN', name: 'Hindi (India)',            nativeName: 'हिन्दी',             rtl: false },
  { code: 'it-IT', name: 'Italian (Italy)',          nativeName: 'Italiano',         rtl: false },
  { code: 'ru-RU', name: 'Russian (Russia)',         nativeName: 'Русский',          rtl: false },
  { code: 'nl-NL', name: 'Dutch (Netherlands)',      nativeName: 'Nederlands',       rtl: false },
  { code: 'pl-PL', name: 'Polish (Poland)',          nativeName: 'Polski',           rtl: false },
  { code: 'tr-TR', name: 'Turkish (Turkey)',         nativeName: 'Türkçe',           rtl: false },
  { code: 'sv-SE', name: 'Swedish (Sweden)',         nativeName: 'Svenska',          rtl: false },
  { code: 'da-DK', name: 'Danish (Denmark)',         nativeName: 'Dansk',            rtl: false },
];

const SUPPORTED_CODES = new Set(SUPPORTED_LOCALES.map((l) => l.code));

// ---------------------------------------------------------------------------
// Translation strings (full en-US + sample locales) — served to clients so
// they can hydrate the browser-side I18nService without a separate build step.
// ---------------------------------------------------------------------------

const TRANSLATIONS = {
  'en-US': {
    'auth.login': 'Login', 'auth.register': 'Register', 'auth.email': 'Email',
    'auth.password': 'Password', 'auth.username': 'Username',
    'auth.forgotPassword': 'Forgot password?', 'auth.twoFactor': 'Two-Factor Authentication',
    'auth.biometric': 'Biometric Login', 'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up', 'auth.signOut': 'Sign Out',
    'nav.dashboard': 'Dashboard', 'nav.analytics': 'Analytics',
    'nav.security': 'Security', 'nav.gaming': 'Gaming',
    'nav.settings': 'Settings', 'nav.admin': 'Admin',
    'dashboard.welcome': 'Welcome back, {name}!', 'dashboard.overview': 'Overview',
    'errors.required': 'This field is required.',
    'errors.invalidEmail': 'Please enter a valid email address.',
    'errors.passwordTooShort': 'Password must be at least {min} characters.',
    'errors.passwordWeak': 'Password is too weak. Add uppercase letters, numbers, and special characters.',
    'errors.usernameInvalid': 'Username must be between 2 and 50 characters.',
    'errors.networkError': 'A network error occurred. Please try again.',
    'errors.unauthorized': 'You are not authorized to perform this action.',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete',
    'common.edit': 'Edit', 'common.search': 'Search', 'common.loading': 'Loading…',
    'common.realtime': 'Real-time', 'common.connected': 'Connected',
    'common.disconnected': 'Disconnected', 'common.error': 'Error', 'common.success': 'Success',
  },
  'es-ES': {
    'auth.login': 'Iniciar sesión', 'auth.register': 'Registrarse',
    'auth.email': 'Correo electrónico', 'auth.password': 'Contraseña',
    'auth.username': 'Nombre de usuario', 'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.twoFactor': 'Autenticación de dos factores', 'auth.biometric': 'Inicio de sesión biométrico',
    'auth.signIn': 'Entrar', 'auth.signUp': 'Crear cuenta', 'auth.signOut': 'Cerrar sesión',
    'nav.dashboard': 'Panel', 'nav.analytics': 'Analítica', 'nav.security': 'Seguridad',
    'nav.gaming': 'Juegos', 'nav.settings': 'Configuración', 'nav.admin': 'Administración',
    'dashboard.welcome': '¡Bienvenido de nuevo, {name}!', 'dashboard.overview': 'Resumen',
    'errors.required': 'Este campo es obligatorio.',
    'errors.invalidEmail': 'Por favor ingresa un correo electrónico válido.',
    'errors.passwordTooShort': 'La contraseña debe tener al menos {min} caracteres.',
    'errors.passwordWeak': 'La contraseña es demasiado débil.',
    'errors.usernameInvalid': 'El nombre de usuario debe tener entre 2 y 50 caracteres.',
    'errors.networkError': 'Ocurrió un error de red. Por favor inténtalo de nuevo.',
    'errors.unauthorized': 'No tienes autorización para realizar esta acción.',
    'common.save': 'Guardar', 'common.cancel': 'Cancelar', 'common.delete': 'Eliminar',
    'common.edit': 'Editar', 'common.search': 'Buscar', 'common.loading': 'Cargando…',
    'common.realtime': 'Tiempo real', 'common.connected': 'Conectado',
    'common.disconnected': 'Desconectado', 'common.error': 'Error', 'common.success': 'Éxito',
  },
  'fr-FR': {
    'auth.login': 'Connexion', 'auth.register': "S'inscrire",
    'auth.email': 'E-mail', 'auth.password': 'Mot de passe',
    'auth.username': "Nom d'utilisateur", 'auth.forgotPassword': 'Mot de passe oublié ?',
    'auth.twoFactor': 'Authentification à deux facteurs', 'auth.biometric': 'Connexion biométrique',
    'auth.signIn': 'Se connecter', 'auth.signUp': 'Créer un compte', 'auth.signOut': 'Se déconnecter',
    'nav.dashboard': 'Tableau de bord', 'nav.analytics': 'Analytique',
    'nav.security': 'Sécurité', 'nav.gaming': 'Jeux',
    'nav.settings': 'Paramètres', 'nav.admin': 'Administration',
    'dashboard.welcome': 'Bienvenue, {name} !', 'dashboard.overview': "Vue d'ensemble",
    'errors.required': 'Ce champ est obligatoire.',
    'errors.invalidEmail': 'Veuillez entrer une adresse e-mail valide.',
    'errors.passwordTooShort': 'Le mot de passe doit comporter au moins {min} caractères.',
    'errors.passwordWeak': 'Le mot de passe est trop faible.',
    'errors.usernameInvalid': "Le nom d'utilisateur doit comporter entre 2 et 50 caractères.",
    'errors.networkError': "Une erreur réseau s'est produite. Veuillez réessayer.",
    'errors.unauthorized': "Vous n'êtes pas autorisé à effectuer cette action.",
    'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.delete': 'Supprimer',
    'common.edit': 'Modifier', 'common.search': 'Rechercher', 'common.loading': 'Chargement…',
    'common.realtime': 'Temps réel', 'common.connected': 'Connecté',
    'common.disconnected': 'Déconnecté', 'common.error': 'Erreur', 'common.success': 'Succès',
  },
  'ar-SA': {
    'auth.login': 'تسجيل الدخول', 'auth.register': 'إنشاء حساب',
    'auth.email': 'البريد الإلكتروني', 'auth.password': 'كلمة المرور',
    'auth.username': 'اسم المستخدم', 'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.twoFactor': 'المصادقة الثنائية', 'auth.biometric': 'تسجيل الدخول البيومتري',
    'auth.signIn': 'دخول', 'auth.signUp': 'إنشاء حساب', 'auth.signOut': 'تسجيل الخروج',
    'nav.dashboard': 'لوحة التحكم', 'nav.analytics': 'التحليلات',
    'nav.security': 'الأمان', 'nav.gaming': 'الألعاب',
    'nav.settings': 'الإعدادات', 'nav.admin': 'الإدارة',
    'dashboard.welcome': 'مرحباً بعودتك، {name}!', 'dashboard.overview': 'نظرة عامة',
    'errors.required': 'هذا الحقل مطلوب.',
    'errors.invalidEmail': 'يرجى إدخال عنوان بريد إلكتروني صحيح.',
    'errors.passwordTooShort': 'يجب أن تكون كلمة المرور {min} أحرف على الأقل.',
    'errors.passwordWeak': 'كلمة المرور ضعيفة جداً.',
    'errors.usernameInvalid': 'يجب أن يكون اسم المستخدم بين 2 و 50 حرفاً.',
    'errors.networkError': 'حدث خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
    'errors.unauthorized': 'غير مخول لك تنفيذ هذا الإجراء.',
    'common.save': 'حفظ', 'common.cancel': 'إلغاء', 'common.delete': 'حذف',
    'common.edit': 'تعديل', 'common.search': 'بحث', 'common.loading': 'جاري التحميل…',
    'common.realtime': 'الوقت الفعلي', 'common.connected': 'متصل',
    'common.disconnected': 'غير متصل', 'common.error': 'خطأ', 'common.success': 'نجاح',
  },
};

// ---------------------------------------------------------------------------
// Google Translate helper (lazy-initialised)
// ---------------------------------------------------------------------------

let _googleTranslate = null;

async function getGoogleTranslateClient() {
  if (_googleTranslate) return _googleTranslate;

  if (!process.env.GOOGLE_TRANSLATE_API_KEY) return null;

  try {
    // @google-cloud/translate v9 — ESM-compatible named export
    const { Translate } = await import('@google-cloud/translate').then(
      (m) => m.v2 ?? m,
    );
    _googleTranslate = new Translate({ key: process.env.GOOGLE_TRANSLATE_API_KEY });
    return _googleTranslate;
  } catch (err) {
    console.error('[i18n route] Failed to initialise Google Translate client:', err?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// BCP-47 → Google Translate language code mapping
// ---------------------------------------------------------------------------

const GT_LANG_MAP = {
  'en-US': 'en', 'es-ES': 'es', 'fr-FR': 'fr', 'de-DE': 'de',
  'pt-BR': 'pt', 'ja-JP': 'ja', 'ko-KR': 'ko', 'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW', 'ar-SA': 'ar', 'hi-IN': 'hi', 'it-IT': 'it',
  'ru-RU': 'ru', 'nl-NL': 'nl', 'pl-PL': 'pl', 'tr-TR': 'tr',
  'sv-SE': 'sv', 'da-DK': 'da',
};

// ---------------------------------------------------------------------------
// Rate limiter — 10 requests per minute per IP for POST /translate
// ---------------------------------------------------------------------------

const translateRateLimiter = rateLimit({
  windowMs:         60 * 1000,   // 1 minute
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  keyGenerator:     (req) => req.ip,
  message: {
    success: false,
    error: 'Too many translation requests. Please wait a minute and try again.',
    retryAfterMs: 60 * 1000,
  },
  handler: (req, res, _next, options) => {
    res.status(429).json(options.message);
  },
});

// ---------------------------------------------------------------------------
// Shared validation error responder
// ---------------------------------------------------------------------------

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/i18n/locales
// Returns the list of all supported locales with metadata.
// ---------------------------------------------------------------------------

router.get('/locales', (_req, res) => {
  res.json({
    success: true,
    data: SUPPORTED_LOCALES,
    total: SUPPORTED_LOCALES.length,
  });
});

// ---------------------------------------------------------------------------
// GET /api/i18n/translations/:locale
// Returns the full translation string bundle for a given locale.
// Falls back to en-US for unsupported locales.
// ---------------------------------------------------------------------------

router.get('/translations/:locale', (req, res) => {
  const { locale } = req.params;

  if (!SUPPORTED_CODES.has(locale)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported locale "${locale}". See /api/i18n/locales for the supported list.`,
    });
  }

  const strings = TRANSLATIONS[locale] ?? TRANSLATIONS['en-US'];
  const isFallback = !TRANSLATIONS[locale];

  res.json({
    success:    true,
    locale,
    isFallback,
    fallbackLocale: isFallback ? 'en-US' : undefined,
    data:       strings,
    keyCount:   Object.keys(strings).length,
  });
});

// ---------------------------------------------------------------------------
// POST /api/i18n/translate
// Translate text to a target locale.
// Body: { text: string, targetLocale: string, sourceLocale?: string }
// Uses Google Translate when GOOGLE_TRANSLATE_API_KEY is set; otherwise
// returns a mock response with the original text.
// ---------------------------------------------------------------------------

router.post(
  '/translate',
  translateRateLimiter,
  [
    body('text')
      .isString()
      .withMessage('text must be a string.')
      .trim()
      .notEmpty()
      .withMessage('text must not be empty.')
      .isLength({ max: 5000 })
      .withMessage('text must not exceed 5 000 characters.'),
    body('targetLocale')
      .isString()
      .withMessage('targetLocale must be a string.')
      .trim()
      .notEmpty()
      .withMessage('targetLocale is required.')
      .custom((val) => {
        if (!SUPPORTED_CODES.has(val)) {
          throw new Error(`Unsupported targetLocale "${val}".`);
        }
        return true;
      }),
    body('sourceLocale')
      .optional()
      .isString()
      .withMessage('sourceLocale must be a string.'),
  ],
  async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    const { text, targetLocale, sourceLocale } = req.body;
    const targetLang = GT_LANG_MAP[targetLocale] ?? targetLocale.split('-')[0];
    const sourceLang = sourceLocale ? (GT_LANG_MAP[sourceLocale] ?? sourceLocale.split('-')[0]) : undefined;

    // -----------------------------------------------------------------------
    // Try Google Translate
    // -----------------------------------------------------------------------
    const gtClient = await getGoogleTranslateClient();

    if (gtClient) {
      try {
        const options = { to: targetLang };
        if (sourceLang) options.from = sourceLang;

        const [translatedText, metadata] = await gtClient.translate(text, options);

        return res.json({
          success:        true,
          originalText:   text,
          translatedText,
          targetLocale,
          targetLang,
          detectedSourceLang: metadata?.data?.translations?.[0]?.detectedSourceLanguage ?? sourceLang ?? null,
          provider:       'google',
        });
      } catch (err) {
        console.error('[i18n route] Google Translate error:', err?.message ?? err);
        // Fall through to mock response rather than returning a hard error,
        // so the client always gets a usable value.
      }
    }

    // -----------------------------------------------------------------------
    // Mock response — no API key or Google Translate unavailable
    // -----------------------------------------------------------------------
    return res.json({
      success:        true,
      originalText:   text,
      translatedText: text,   // echo original when translation unavailable
      targetLocale,
      targetLang,
      detectedSourceLang: sourceLang ?? null,
      provider:       'mock',
      note:           'Set GOOGLE_TRANSLATE_API_KEY to enable real AI translation.',
    });
  },
);

// ---------------------------------------------------------------------------
// GET /api/i18n/detect
// Detect the language of the supplied text.
// Query param: text (preferred), or JSON body: { text }
// ---------------------------------------------------------------------------

router.get(
  '/detect',
  [
    query('text')
      .optional()
      .isString()
      .withMessage('text query parameter must be a string.'),
  ],
  async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    // Accept text from query string or JSON body
    const text = (req.query.text ?? req.body?.text ?? '').toString().trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Provide text via the ?text= query parameter or a JSON body { text }.',
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'text must not exceed 5 000 characters.',
      });
    }

    const gtClient = await getGoogleTranslateClient();

    if (gtClient) {
      try {
        const [detections] = await gtClient.detect(text);
        const detection = Array.isArray(detections) ? detections[0] : detections;

        return res.json({
          success:    true,
          text,
          detectedLanguage: detection.language,
          confidence:       detection.confidence,
          isReliable:       detection.isReliable,
          provider:         'google',
        });
      } catch (err) {
        console.error('[i18n route] Google Detect error:', err?.message ?? err);
      }
    }

    // Mock detection — check for common unicode script ranges
    let mockLang = 'en';

    if (/[؀-ۿ]/.test(text)) {
      mockLang = 'ar';
    } else if (/[一-鿿]/.test(text)) {
      mockLang = 'zh';
    } else if (/[぀-ヿ]/.test(text)) {
      mockLang = 'ja';
    } else if (/[가-힯]/.test(text)) {
      mockLang = 'ko';
    } else if (/[Ѐ-ӿ]/.test(text)) {
      mockLang = 'ru';
    } else if (/[ऀ-ॿ]/.test(text)) {
      mockLang = 'hi';
    }

    return res.json({
      success:          true,
      text,
      detectedLanguage: mockLang,
      confidence:       null,
      isReliable:       false,
      provider:         'mock',
      note:             'Set GOOGLE_TRANSLATE_API_KEY to enable real language detection.',
    });
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
