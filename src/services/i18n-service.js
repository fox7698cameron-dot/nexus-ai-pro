// src/services/i18n-service.js
// Date: 2026-07-08
// Multi-language support and auto-translate

export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false, region: 'US' },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false, region: 'ES' },
  fr: { name: 'French', nativeName: 'Français', rtl: false, region: 'FR' },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false, region: 'DE' },
  zh: { name: 'Chinese (Simplified)', nativeName: '中文', rtl: false, region: 'CN' },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false, region: 'JP' },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false, region: 'KR' },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false, region: 'BR' },
  ru: { name: 'Russian', nativeName: 'Русский', rtl: false, region: 'RU' },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true, region: 'SA' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false, region: 'IN' },
  it: { name: 'Italian', nativeName: 'Italiano', rtl: false, region: 'IT' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', rtl: false, region: 'NL' },
  pl: { name: 'Polish', nativeName: 'Polski', rtl: false, region: 'PL' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', rtl: false, region: 'TR' },
  sv: { name: 'Swedish', nativeName: 'Svenska', rtl: false, region: 'SE' },
  th: { name: 'Thai', nativeName: 'ไทย', rtl: false, region: 'TH' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false, region: 'VN' }
};

// Core translations for server-side messages
const TRANSLATIONS = {
  en: {
    'auth.invalid_credentials': 'Invalid credentials',
    'auth.account_locked': 'Account is locked. Try again later.',
    'auth.register_success': 'Registration successful',
    'auth.2fa_required': 'Two-factor authentication required',
    'payment.success': 'Payment successful',
    'payment.failed': 'Payment failed',
    'error.generic': 'An error occurred',
    'error.unauthorized': 'Unauthorized',
    'error.forbidden': 'Access forbidden',
    'error.not_found': 'Not found'
  },
  es: {
    'auth.invalid_credentials': 'Credenciales inválidas',
    'auth.account_locked': 'Cuenta bloqueada. Inténtalo más tarde.',
    'auth.register_success': 'Registro exitoso',
    'auth.2fa_required': 'Se requiere autenticación de dos factores',
    'payment.success': 'Pago exitoso',
    'payment.failed': 'Pago fallido',
    'error.generic': 'Ocurrió un error',
    'error.unauthorized': 'No autorizado',
    'error.forbidden': 'Acceso prohibido',
    'error.not_found': 'No encontrado'
  },
  fr: {
    'auth.invalid_credentials': 'Identifiants invalides',
    'auth.account_locked': 'Compte verrouillé. Réessayez plus tard.',
    'auth.register_success': 'Inscription réussie',
    'auth.2fa_required': 'Authentification à deux facteurs requise',
    'payment.success': 'Paiement réussi',
    'payment.failed': 'Échec du paiement',
    'error.generic': 'Une erreur est survenue',
    'error.unauthorized': 'Non autorisé',
    'error.forbidden': 'Accès interdit',
    'error.not_found': 'Introuvable'
  },
  de: {
    'auth.invalid_credentials': 'Ungültige Anmeldeinformationen',
    'auth.account_locked': 'Konto gesperrt. Versuchen Sie es später erneut.',
    'auth.register_success': 'Registrierung erfolgreich',
    'auth.2fa_required': 'Zwei-Faktor-Authentifizierung erforderlich',
    'payment.success': 'Zahlung erfolgreich',
    'payment.failed': 'Zahlung fehlgeschlagen',
    'error.generic': 'Ein Fehler ist aufgetreten',
    'error.unauthorized': 'Nicht autorisiert',
    'error.forbidden': 'Zugriff verboten',
    'error.not_found': 'Nicht gefunden'
  },
  zh: {
    'auth.invalid_credentials': '凭据无效',
    'auth.account_locked': '账户已锁定，请稍后重试。',
    'auth.register_success': '注册成功',
    'auth.2fa_required': '需要双因素身份验证',
    'payment.success': '支付成功',
    'payment.failed': '支付失败',
    'error.generic': '发生错误',
    'error.unauthorized': '未授权',
    'error.forbidden': '禁止访问',
    'error.not_found': '未找到'
  }
};

export class I18nService {
  translate(key, lang = 'en', params = {}) {
    const langTranslations = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    let text = langTranslations[key] || TRANSLATIONS['en'][key] || key;
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(`{{${param}}}`, value);
    }
    return text;
  }

  // Auto-translate via external API (Google Translate)
  async autoTranslate(text, targetLang, sourceLang = 'en') {
    if (sourceLang === targetLang) return text;

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      // Return original text if no translation API configured
      return text;
    }

    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' })
      });

      if (!response.ok) return text;
      const data = await response.json();
      return data.data?.translations?.[0]?.translatedText || text;
    } catch {
      return text;
    }
  }

  getLanguageInfo(lang) {
    return SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES['en'];
  }

  getSupportedLanguages() {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({ code, ...info }));
  }

  detectLanguageFromHeader(acceptLanguage) {
    if (!acceptLanguage) return 'en';
    const preferred = acceptLanguage.split(',').map(l => l.split(';')[0].trim().slice(0, 2).toLowerCase());
    for (const lang of preferred) {
      if (SUPPORTED_LANGUAGES[lang]) return lang;
    }
    return 'en';
  }
}

export const i18nService = new I18nService();
