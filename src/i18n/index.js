// src/i18n/index.js
// 2026-07-24 | Nexus AI Pro - Internationalization & Auto-translate

export const SUPPORTED_LOCALES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr', region: 'US' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr', region: 'ES' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr', region: 'FR' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr', region: 'DE' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr', region: 'BR' },
  zh: { name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', region: 'CN' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr', region: 'JP' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr', region: 'KR' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl', region: 'SA' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', region: 'IN' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr', region: 'RU' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr', region: 'IT' },
};

// Base translations (English as source of truth)
const en = {
  common: {
    loading: 'Loading…',
    error: 'An error occurred',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    success: 'Success',
  },
  auth: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    username: 'Username',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    mfaRequired: 'MFA Token Required',
    mfaPlaceholder: '6-digit code',
    passwordStrength: 'Password strength',
    weakPassword: 'Weak',
    fairPassword: 'Fair',
    goodPassword: 'Good',
    strongPassword: 'Strong',
    passwordMin: 'Minimum 13 characters',
    biometricAuth: 'Use Biometrics',
    fingerprintAuth: 'Fingerprint',
    faceIdAuth: 'Face ID',
    retinalAuth: 'Retinal Scan',
  },
  dashboard: {
    overview: 'Overview',
    analytics: 'Analytics',
    projects: 'Projects',
    security: 'Security',
    settings: 'Settings',
    admin: 'Admin Panel',
  },
  analytics: {
    totalViews: 'Total Views',
    totalFollowers: 'Total Followers',
    engagement: 'Engagement',
    reach: 'Reach',
    retention: 'Retention',
    realtime: 'Real-time',
    platforms: 'Platforms',
    connectPlatform: 'Connect Platform',
    noData: 'No data available',
  },
  projects: {
    newProject: 'New Project',
    progress: 'Progress',
    milestones: 'Milestones',
    builds: 'Builds',
    achievements: 'Achievements',
    testCoverage: 'Test Coverage',
    linesOfCode: 'Lines of Code',
    status: {
      planning: 'Planning',
      in_progress: 'In Progress',
      review: 'Review',
      testing: 'Testing',
      deployed: 'Deployed',
      archived: 'Archived',
    },
  },
  security: {
    score: 'Security Score',
    runScan: 'Run Scan',
    vulnerabilities: 'Vulnerabilities',
    threats: 'Threats Blocked',
    networkStatus: 'Network Status',
    deviceStatus: 'Device Status',
    allClear: 'All Clear',
    issueFound: 'Issue Found',
    scanning: 'Scanning…',
    lastScan: 'Last scan',
  },
  payment: {
    subscribe: 'Subscribe',
    choosePlan: 'Choose a Plan',
    currentPlan: 'Current Plan',
    upgrade: 'Upgrade',
    downgrade: 'Downgrade',
    payWithCard: 'Pay with Card',
    payWithCrypto: 'Pay with Crypto',
    redeemGiftCard: 'Redeem Gift Card',
    giftCardCode: 'Gift Card Code',
    billingPortal: 'Manage Billing',
  },
};

// Minimal translations for other locales (key UI strings)
const translations = {
  en,
  es: {
    common: { loading: 'Cargando…', error: 'Ocurrió un error', save: 'Guardar', cancel: 'Cancelar', confirm: 'Confirmar', delete: 'Eliminar', edit: 'Editar', search: 'Buscar', close: 'Cerrar', back: 'Atrás', next: 'Siguiente', submit: 'Enviar', success: 'Éxito' },
    auth: { signIn: 'Iniciar sesión', signUp: 'Registrarse', signOut: 'Cerrar sesión', email: 'Correo', password: 'Contraseña', username: 'Usuario', mfaRequired: 'Token MFA requerido', passwordMin: 'Mínimo 13 caracteres', biometricAuth: 'Usar biometría' },
    dashboard: { overview: 'Resumen', analytics: 'Analítica', projects: 'Proyectos', security: 'Seguridad', settings: 'Configuración', admin: 'Panel de administración' },
    analytics: { totalViews: 'Vistas totales', totalFollowers: 'Seguidores totales', engagement: 'Participación', reach: 'Alcance', retention: 'Retención', realtime: 'Tiempo real', platforms: 'Plataformas' },
  },
  fr: {
    common: { loading: 'Chargement…', error: 'Une erreur est survenue', save: 'Enregistrer', cancel: 'Annuler', confirm: 'Confirmer', delete: 'Supprimer', edit: 'Modifier', search: 'Rechercher', close: 'Fermer', back: 'Retour', next: 'Suivant', submit: 'Envoyer', success: 'Succès' },
    auth: { signIn: 'Connexion', signUp: "S'inscrire", signOut: 'Déconnexion', email: 'E-mail', password: 'Mot de passe', username: 'Nom d\'utilisateur', mfaRequired: 'Code MFA requis', passwordMin: '13 caractères minimum', biometricAuth: 'Biométrie' },
    dashboard: { overview: 'Vue d\'ensemble', analytics: 'Analytique', projects: 'Projets', security: 'Sécurité', settings: 'Paramètres', admin: 'Administration' },
  },
  de: {
    common: { loading: 'Laden…', error: 'Ein Fehler ist aufgetreten', save: 'Speichern', cancel: 'Abbrechen', confirm: 'Bestätigen', delete: 'Löschen', edit: 'Bearbeiten', search: 'Suchen', close: 'Schließen', back: 'Zurück', next: 'Weiter', submit: 'Senden', success: 'Erfolg' },
    auth: { signIn: 'Anmelden', signUp: 'Registrieren', signOut: 'Abmelden', email: 'E-Mail', password: 'Passwort', username: 'Benutzername', mfaRequired: 'MFA-Token erforderlich', passwordMin: 'Mindestens 13 Zeichen', biometricAuth: 'Biometrie' },
    dashboard: { overview: 'Übersicht', analytics: 'Analysen', projects: 'Projekte', security: 'Sicherheit', settings: 'Einstellungen', admin: 'Admin' },
  },
  zh: {
    common: { loading: '加载中…', error: '发生错误', save: '保存', cancel: '取消', confirm: '确认', delete: '删除', edit: '编辑', search: '搜索', close: '关闭', back: '返回', next: '下一步', submit: '提交', success: '成功' },
    auth: { signIn: '登录', signUp: '注册', signOut: '退出', email: '邮箱', password: '密码', username: '用户名', mfaRequired: '需要MFA验证码', passwordMin: '最少13个字符', biometricAuth: '生物识别' },
    dashboard: { overview: '概览', analytics: '分析', projects: '项目', security: '安全', settings: '设置', admin: '管理员' },
  },
  ja: {
    common: { loading: '読み込み中…', error: 'エラーが発生しました', save: '保存', cancel: 'キャンセル', confirm: '確認', delete: '削除', edit: '編集', search: '検索', close: '閉じる', back: '戻る', next: '次へ', submit: '送信', success: '成功' },
    auth: { signIn: 'ログイン', signUp: '新規登録', signOut: 'ログアウト', email: 'メール', password: 'パスワード', username: 'ユーザー名', mfaRequired: 'MFAトークンが必要です', passwordMin: '最低13文字', biometricAuth: '生体認証' },
    dashboard: { overview: '概要', analytics: '分析', projects: 'プロジェクト', security: 'セキュリティ', settings: '設定', admin: '管理者' },
  },
  ar: {
    common: { loading: 'جار التحميل…', error: 'حدث خطأ', save: 'حفظ', cancel: 'إلغاء', confirm: 'تأكيد', delete: 'حذف', edit: 'تعديل', search: 'بحث', close: 'إغلاق', back: 'رجوع', next: 'التالي', submit: 'إرسال', success: 'نجح' },
    auth: { signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', signOut: 'تسجيل الخروج', email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم', mfaRequired: 'رمز MFA مطلوب', passwordMin: '13 حرفاً على الأقل', biometricAuth: 'البيومتري' },
    dashboard: { overview: 'نظرة عامة', analytics: 'التحليلات', projects: 'المشاريع', security: 'الأمان', settings: 'الإعدادات', admin: 'لوحة الإدارة' },
  },
};

// Detect locale from Accept-Language header
export function detectLocale(acceptLanguage = '') {
  const langs = acceptLanguage.split(',').map(l => l.split(';')[0].trim().toLowerCase().split('-')[0]);
  for (const lang of langs) {
    if (SUPPORTED_LOCALES[lang]) return lang;
  }
  return 'en';
}

// Deep merge with English fallback
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function getTranslations(locale) {
  if (!SUPPORTED_LOCALES[locale]) locale = 'en';
  if (locale === 'en') return en;
  return deepMerge(en, translations[locale] || {});
}

// Auto-translate via Google or DeepL (uses env key)
export async function autoTranslate(text, targetLocale, sourceLocale = 'en') {
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!googleKey) return text;

  const url = `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: sourceLocale, target: targetLocale, format: 'text' }),
  });

  if (!response.ok) return text;
  const data = await response.json();
  return data?.data?.translations?.[0]?.translatedText || text;
}

export default { SUPPORTED_LOCALES, getTranslations, detectLocale, autoTranslate };
