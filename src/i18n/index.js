/* src/i18n/index.js
   Multi-language & regional support with auto-translate scaffolding
   Created: 2026-10-29
*/

export const SUPPORTED_LOCALES = {
  'en-US': { name: 'English (US)', flag: '🇺🇸', dir: 'ltr' },
  'en-GB': { name: 'English (UK)', flag: '🇬🇧', dir: 'ltr' },
  'es-ES': { name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  'es-MX': { name: 'Español (México)', flag: '🇲🇽', dir: 'ltr' },
  'fr-FR': { name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  'de-DE': { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  'pt-BR': { name: 'Português (Brasil)', flag: '🇧🇷', dir: 'ltr' },
  'pt-PT': { name: 'Português', flag: '🇵🇹', dir: 'ltr' },
  'ja-JP': { name: '日本語', flag: '🇯🇵', dir: 'ltr' },
  'ko-KR': { name: '한국어', flag: '🇰🇷', dir: 'ltr' },
  'zh-CN': { name: '简体中文', flag: '🇨🇳', dir: 'ltr' },
  'zh-TW': { name: '繁體中文', flag: '🇹🇼', dir: 'ltr' },
  'ar-SA': { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  'he-IL': { name: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  'ru-RU': { name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  'hi-IN': { name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  'it-IT': { name: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  'nl-NL': { name: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  'pl-PL': { name: 'Polski', flag: '🇵🇱', dir: 'ltr' },
  'sv-SE': { name: 'Svenska', flag: '🇸🇪', dir: 'ltr' },
  'tr-TR': { name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  'vi-VN': { name: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
  'id-ID': { name: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  'th-TH': { name: 'ภาษาไทย', flag: '🇹🇭', dir: 'ltr' },
  'uk-UA': { name: 'Українська', flag: '🇺🇦', dir: 'ltr' }
};

export const TRANSLATIONS = {
  'en-US': {
    'app.title': 'Nexus AI Pro',
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.email': 'Email',
    'auth.mfa': 'Multi-Factor Authentication',
    'auth.biometric': 'Biometric Verification',
    'dashboard.title': 'Dashboard',
    'analytics.title': 'Analytics',
    'security.title': 'Security Dashboard',
    'gamedev.title': 'Game Dev Tracker',
    'payment.title': 'Checkout',
    'payment.success': 'Payment Successful',
    'error.required': 'This field is required',
    'error.invalid': 'Invalid value',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.refresh': 'Refresh',
    'common.search': 'Search'
  },
  'es-ES': {
    'app.title': 'Nexus AI Pro',
    'auth.signin': 'Iniciar Sesión',
    'auth.signup': 'Registrarse',
    'auth.username': 'Usuario',
    'auth.password': 'Contraseña',
    'auth.email': 'Correo electrónico',
    'auth.mfa': 'Autenticación Multifactor',
    'auth.biometric': 'Verificación Biométrica',
    'dashboard.title': 'Panel',
    'analytics.title': 'Analíticas',
    'security.title': 'Panel de Seguridad',
    'gamedev.title': 'Seguimiento de Juegos',
    'payment.title': 'Pago',
    'payment.success': 'Pago Exitoso',
    'error.required': 'Este campo es obligatorio',
    'error.invalid': 'Valor inválido',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'common.refresh': 'Actualizar',
    'common.search': 'Buscar'
  },
  'fr-FR': {
    'app.title': 'Nexus AI Pro',
    'auth.signin': 'Se connecter',
    'auth.signup': "S'inscrire",
    'auth.username': "Nom d'utilisateur",
    'auth.password': 'Mot de passe',
    'auth.email': 'Email',
    'auth.mfa': 'Authentification Multifacteur',
    'auth.biometric': 'Vérification Biométrique',
    'dashboard.title': 'Tableau de bord',
    'analytics.title': 'Analytiques',
    'security.title': 'Tableau de Sécurité',
    'gamedev.title': 'Suivi Jeux Vidéo',
    'payment.title': 'Paiement',
    'payment.success': 'Paiement réussi',
    'error.required': 'Ce champ est requis',
    'error.invalid': 'Valeur invalide',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    'common.refresh': 'Actualiser',
    'common.search': 'Rechercher'
  },
  'ja-JP': {
    'app.title': 'Nexus AI Pro',
    'auth.signin': 'ログイン',
    'auth.signup': '新規登録',
    'auth.username': 'ユーザー名',
    'auth.password': 'パスワード',
    'auth.email': 'メールアドレス',
    'auth.mfa': '多要素認証',
    'auth.biometric': '生体認証',
    'dashboard.title': 'ダッシュボード',
    'analytics.title': 'アナリティクス',
    'security.title': 'セキュリティダッシュボード',
    'gamedev.title': 'ゲーム開発トラッカー',
    'payment.title': '支払い',
    'payment.success': '支払い完了',
    'error.required': 'この項目は必須です',
    'error.invalid': '無効な値',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.loading': '読み込み中...',
    'common.refresh': '更新',
    'common.search': '検索'
  },
  'zh-CN': {
    'app.title': 'Nexus AI Pro',
    'auth.signin': '登录',
    'auth.signup': '注册',
    'auth.username': '用户名',
    'auth.password': '密码',
    'auth.email': '邮箱',
    'auth.mfa': '多因素身份验证',
    'auth.biometric': '生物特征验证',
    'dashboard.title': '仪表板',
    'analytics.title': '分析',
    'security.title': '安全仪表板',
    'gamedev.title': '游戏开发追踪',
    'payment.title': '结账',
    'payment.success': '支付成功',
    'error.required': '此字段为必填项',
    'error.invalid': '无效值',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.loading': '加载中...',
    'common.refresh': '刷新',
    'common.search': '搜索'
  },
  'de-DE': {
    'app.title': 'Nexus AI Pro',
    'auth.signin': 'Anmelden',
    'auth.signup': 'Registrieren',
    'auth.username': 'Benutzername',
    'auth.password': 'Passwort',
    'auth.email': 'E-Mail',
    'auth.mfa': 'Multi-Faktor-Authentifizierung',
    'auth.biometric': 'Biometrische Verifizierung',
    'dashboard.title': 'Dashboard',
    'analytics.title': 'Analytik',
    'security.title': 'Sicherheits-Dashboard',
    'gamedev.title': 'Spielentwicklungs-Tracker',
    'payment.title': 'Kasse',
    'payment.success': 'Zahlung erfolgreich',
    'error.required': 'Dieses Feld ist erforderlich',
    'error.invalid': 'Ungültiger Wert',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.loading': 'Wird geladen...',
    'common.refresh': 'Aktualisieren',
    'common.search': 'Suchen'
  }
};

export function detectBrowserLocale() {
  const lang = (navigator.language || navigator.userLanguage || 'en-US');
  if (SUPPORTED_LOCALES[lang]) return lang;
  const short = lang.split('-')[0];
  const match = Object.keys(SUPPORTED_LOCALES).find(k => k.startsWith(short));
  return match || 'en-US';
}

export function createI18n(locale = 'en-US') {
  const translations = TRANSLATIONS[locale] || TRANSLATIONS['en-US'];
  const fallback = TRANSLATIONS['en-US'];

  return {
    locale,
    dir: SUPPORTED_LOCALES[locale]?.dir || 'ltr',
    t(key, vars = {}) {
      let str = translations[key] || fallback[key] || key;
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
      return str;
    },
    formatNumber(n, opts = {}) {
      return new Intl.NumberFormat(locale, opts).format(n);
    },
    formatDate(d, opts = { dateStyle: 'medium' }) {
      return new Intl.DateTimeFormat(locale, opts).format(new Date(d));
    },
    formatCurrency(amount, currency = 'USD') {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    }
  };
}

// Auto-translate stub — hooks into backend translation API endpoint
// Never exposes API keys; keys live server-side only
export async function autoTranslate(text, targetLocale) {
  if (!text || !targetLocale) return text;
  const shortLang = targetLocale.split('-')[0];
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLanguage: shortLang })
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translatedText || text;
  } catch {
    return text;
  }
}

export default { SUPPORTED_LOCALES, TRANSLATIONS, detectBrowserLocale, createI18n, autoTranslate };
