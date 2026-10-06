// File: src/i18n/index.js | Updated: 2026-10-06
// Multi-language and regional support with auto-translate capability

const SUPPORTED_LOCALES = {
  en: { name: 'English', dir: 'ltr', dateFormat: 'MM/DD/YYYY', currency: 'USD' },
  es: { name: 'Español', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'EUR' },
  fr: { name: 'Français', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'EUR' },
  de: { name: 'Deutsch', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'EUR' },
  ja: { name: '日本語', dir: 'ltr', dateFormat: 'YYYY/MM/DD', currency: 'JPY' },
  ko: { name: '한국어', dir: 'ltr', dateFormat: 'YYYY.MM.DD', currency: 'KRW' },
  zh: { name: '中文(简体)', dir: 'ltr', dateFormat: 'YYYY-MM-DD', currency: 'CNY' },
  ar: { name: 'العربية', dir: 'rtl', dateFormat: 'DD/MM/YYYY', currency: 'SAR' },
  pt: { name: 'Português', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'BRL' },
  hi: { name: 'हिन्दी', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'INR' },
  ru: { name: 'Русский', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'RUB' },
  it: { name: 'Italiano', dir: 'ltr', dateFormat: 'DD/MM/YYYY', currency: 'EUR' },
  nl: { name: 'Nederlands', dir: 'ltr', dateFormat: 'DD-MM-YYYY', currency: 'EUR' },
  pl: { name: 'Polski', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'PLN' },
  tr: { name: 'Türkçe', dir: 'ltr', dateFormat: 'DD.MM.YYYY', currency: 'TRY' },
};

const TRANSLATIONS = {
  en: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytics',
    'nav.security': 'Security',
    'nav.settings': 'Settings',
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm password',
    'auth.name': 'Full name',
    'auth.biometric': 'Use Biometrics',
    'auth.mfa': 'Two-Factor Authentication',
    'auth.mfaCode': 'Enter 6-digit code',
    'auth.passwordWeak': 'Password too weak',
    'auth.passwordStrong': 'Strong password',
    'payment.subscribe': 'Subscribe',
    'payment.upgrade': 'Upgrade Plan',
    'payment.card': 'Credit/Debit Card',
    'payment.crypto': 'Cryptocurrency',
    'payment.giftCard': 'Gift Card',
    'security.scan': 'Run Security Scan',
    'security.score': 'Security Score',
    'security.threats': 'Threats Blocked',
    'analytics.followers': 'Followers',
    'analytics.views': 'Views',
    'analytics.engagement': 'Engagement Rate',
    'analytics.retention': 'Retention Rate',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.close': 'Close',
  },
  es: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': 'Panel',
    'nav.analytics': 'Analíticas',
    'nav.security': 'Seguridad',
    'nav.settings': 'Configuración',
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Crear cuenta',
    'auth.logout': 'Cerrar sesión',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.confirmPassword': 'Confirmar contraseña',
    'auth.name': 'Nombre completo',
    'auth.biometric': 'Usar biométricos',
    'auth.mfa': 'Autenticación de dos factores',
    'auth.mfaCode': 'Código de 6 dígitos',
    'auth.passwordWeak': 'Contraseña débil',
    'auth.passwordStrong': 'Contraseña segura',
    'payment.subscribe': 'Suscribirse',
    'payment.upgrade': 'Actualizar plan',
    'payment.card': 'Tarjeta de crédito/débito',
    'payment.crypto': 'Criptomoneda',
    'payment.giftCard': 'Tarjeta de regalo',
    'security.scan': 'Análisis de seguridad',
    'security.score': 'Puntuación de seguridad',
    'security.threats': 'Amenazas bloqueadas',
    'analytics.followers': 'Seguidores',
    'analytics.views': 'Vistas',
    'analytics.engagement': 'Tasa de participación',
    'analytics.retention': 'Tasa de retención',
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.submit': 'Enviar',
    'common.close': 'Cerrar',
  },
  fr: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': 'Tableau de bord',
    'nav.analytics': 'Analytique',
    'nav.security': 'Sécurité',
    'nav.settings': 'Paramètres',
    'auth.login': 'Se connecter',
    'auth.register': 'Créer un compte',
    'auth.logout': 'Se déconnecter',
    'auth.email': 'Adresse e-mail',
    'auth.password': 'Mot de passe',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.name': 'Nom complet',
    'auth.biometric': 'Utiliser la biométrie',
    'auth.mfa': 'Authentification à deux facteurs',
    'auth.mfaCode': 'Code à 6 chiffres',
    'auth.passwordWeak': 'Mot de passe faible',
    'auth.passwordStrong': 'Mot de passe fort',
    'payment.subscribe': "S'abonner",
    'payment.upgrade': 'Mettre à niveau',
    'payment.card': 'Carte de crédit/débit',
    'payment.crypto': 'Cryptomonnaie',
    'payment.giftCard': 'Carte cadeau',
    'security.scan': 'Analyse de sécurité',
    'security.score': 'Score de sécurité',
    'security.threats': 'Menaces bloquées',
    'analytics.followers': 'Abonnés',
    'analytics.views': 'Vues',
    'analytics.engagement': "Taux d'engagement",
    'analytics.retention': 'Taux de rétention',
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.submit': 'Soumettre',
    'common.close': 'Fermer',
  },
  de: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': 'Dashboard',
    'nav.analytics': 'Analytik',
    'nav.security': 'Sicherheit',
    'nav.settings': 'Einstellungen',
    'auth.login': 'Anmelden',
    'auth.register': 'Konto erstellen',
    'auth.logout': 'Abmelden',
    'auth.email': 'E-Mail-Adresse',
    'auth.password': 'Passwort',
    'auth.confirmPassword': 'Passwort bestätigen',
    'auth.name': 'Vollständiger Name',
    'auth.biometric': 'Biometrie verwenden',
    'auth.mfa': 'Zwei-Faktor-Authentifizierung',
    'auth.mfaCode': '6-stelliger Code',
    'auth.passwordWeak': 'Schwaches Passwort',
    'auth.passwordStrong': 'Starkes Passwort',
    'payment.subscribe': 'Abonnieren',
    'payment.upgrade': 'Plan upgraden',
    'payment.card': 'Kredit-/Debitkarte',
    'payment.crypto': 'Kryptowährung',
    'payment.giftCard': 'Geschenkkarte',
    'security.scan': 'Sicherheitsscan',
    'security.score': 'Sicherheitsbewertung',
    'security.threats': 'Bedrohungen blockiert',
    'analytics.followers': 'Follower',
    'analytics.views': 'Aufrufe',
    'analytics.engagement': 'Engagement-Rate',
    'analytics.retention': 'Bindungsrate',
    'common.loading': 'Laden...',
    'common.error': 'Ein Fehler ist aufgetreten',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.submit': 'Absenden',
    'common.close': 'Schließen',
  },
  ja: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': 'ダッシュボード',
    'nav.analytics': '分析',
    'nav.security': 'セキュリティ',
    'nav.settings': '設定',
    'auth.login': 'サインイン',
    'auth.register': 'アカウント作成',
    'auth.logout': 'サインアウト',
    'auth.email': 'メールアドレス',
    'auth.password': 'パスワード',
    'auth.confirmPassword': 'パスワードの確認',
    'auth.name': '氏名',
    'auth.biometric': '生体認証を使用',
    'auth.mfa': '二要素認証',
    'auth.mfaCode': '6桁のコード',
    'auth.passwordWeak': 'パスワードが弱い',
    'auth.passwordStrong': '強いパスワード',
    'payment.subscribe': '購読する',
    'payment.upgrade': 'プランをアップグレード',
    'payment.card': 'クレジット/デビットカード',
    'payment.crypto': '暗号通貨',
    'payment.giftCard': 'ギフトカード',
    'security.scan': 'セキュリティスキャン',
    'security.score': 'セキュリティスコア',
    'security.threats': 'ブロックされた脅威',
    'analytics.followers': 'フォロワー',
    'analytics.views': '視聴回数',
    'analytics.engagement': 'エンゲージメント率',
    'analytics.retention': '視聴維持率',
    'common.loading': '読み込み中...',
    'common.error': 'エラーが発生しました',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.submit': '送信',
    'common.close': '閉じる',
  },
  ko: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': '대시보드',
    'nav.analytics': '분석',
    'nav.security': '보안',
    'nav.settings': '설정',
    'auth.login': '로그인',
    'auth.register': '계정 만들기',
    'auth.logout': '로그아웃',
    'auth.email': '이메일 주소',
    'auth.password': '비밀번호',
    'auth.confirmPassword': '비밀번호 확인',
    'auth.name': '이름',
    'auth.biometric': '생체 인증 사용',
    'auth.mfa': '2단계 인증',
    'auth.mfaCode': '6자리 코드',
    'auth.passwordWeak': '약한 비밀번호',
    'auth.passwordStrong': '강한 비밀번호',
    'payment.subscribe': '구독',
    'payment.upgrade': '플랜 업그레이드',
    'payment.card': '신용/직불 카드',
    'payment.crypto': '암호화폐',
    'payment.giftCard': '기프트 카드',
    'security.scan': '보안 스캔',
    'security.score': '보안 점수',
    'security.threats': '차단된 위협',
    'analytics.followers': '팔로워',
    'analytics.views': '조회수',
    'analytics.engagement': '참여율',
    'analytics.retention': '유지율',
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.submit': '제출',
    'common.close': '닫기',
  },
  zh: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': '仪表板',
    'nav.analytics': '分析',
    'nav.security': '安全',
    'nav.settings': '设置',
    'auth.login': '登录',
    'auth.register': '创建账户',
    'auth.logout': '退出登录',
    'auth.email': '电子邮件',
    'auth.password': '密码',
    'auth.confirmPassword': '确认密码',
    'auth.name': '全名',
    'auth.biometric': '使用生物识别',
    'auth.mfa': '双重身份验证',
    'auth.mfaCode': '6位验证码',
    'auth.passwordWeak': '密码太弱',
    'auth.passwordStrong': '密码强度高',
    'payment.subscribe': '订阅',
    'payment.upgrade': '升级计划',
    'payment.card': '信用卡/借记卡',
    'payment.crypto': '加密货币',
    'payment.giftCard': '礼品卡',
    'security.scan': '安全扫描',
    'security.score': '安全评分',
    'security.threats': '已屏蔽威胁',
    'analytics.followers': '关注者',
    'analytics.views': '观看次数',
    'analytics.engagement': '互动率',
    'analytics.retention': '留存率',
    'common.loading': '加载中...',
    'common.error': '发生错误',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.submit': '提交',
    'common.close': '关闭',
  },
  ar: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': 'لوحة التحكم',
    'nav.analytics': 'التحليلات',
    'nav.security': 'الأمان',
    'nav.settings': 'الإعدادات',
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'إنشاء حساب',
    'auth.logout': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.confirmPassword': 'تأكيد كلمة المرور',
    'auth.name': 'الاسم الكامل',
    'auth.biometric': 'استخدام القياسات الحيوية',
    'auth.mfa': 'المصادقة الثنائية',
    'auth.mfaCode': 'رمز مكون من 6 أرقام',
    'auth.passwordWeak': 'كلمة مرور ضعيفة',
    'auth.passwordStrong': 'كلمة مرور قوية',
    'payment.subscribe': 'اشتراك',
    'payment.upgrade': 'ترقية الخطة',
    'payment.card': 'بطاقة ائتمان/خصم',
    'payment.crypto': 'العملة المشفرة',
    'payment.giftCard': 'بطاقة هدية',
    'security.scan': 'فحص الأمان',
    'security.score': 'درجة الأمان',
    'security.threats': 'التهديدات المحجوبة',
    'analytics.followers': 'المتابعون',
    'analytics.views': 'المشاهدات',
    'analytics.engagement': 'معدل المشاركة',
    'analytics.retention': 'معدل الاحتفاظ',
    'common.loading': 'جار التحميل...',
    'common.error': 'حدث خطأ',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.submit': 'إرسال',
    'common.close': 'إغلاق',
  },
  pt: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': 'Painel',
    'nav.analytics': 'Análises',
    'nav.security': 'Segurança',
    'nav.settings': 'Configurações',
    'auth.login': 'Entrar',
    'auth.register': 'Criar conta',
    'auth.logout': 'Sair',
    'auth.email': 'Endereço de e-mail',
    'auth.password': 'Senha',
    'auth.confirmPassword': 'Confirmar senha',
    'auth.name': 'Nome completo',
    'auth.biometric': 'Usar biometria',
    'auth.mfa': 'Autenticação de dois fatores',
    'auth.mfaCode': 'Código de 6 dígitos',
    'auth.passwordWeak': 'Senha fraca',
    'auth.passwordStrong': 'Senha forte',
    'payment.subscribe': 'Assinar',
    'payment.upgrade': 'Atualizar plano',
    'payment.card': 'Cartão de crédito/débito',
    'payment.crypto': 'Criptomoeda',
    'payment.giftCard': 'Cartão presente',
    'security.scan': 'Verificação de segurança',
    'security.score': 'Pontuação de segurança',
    'security.threats': 'Ameaças bloqueadas',
    'analytics.followers': 'Seguidores',
    'analytics.views': 'Visualizações',
    'analytics.engagement': 'Taxa de engajamento',
    'analytics.retention': 'Taxa de retenção',
    'common.loading': 'Carregando...',
    'common.error': 'Ocorreu um erro',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.submit': 'Enviar',
    'common.close': 'Fechar',
  },
  hi: {
    'app.title': 'Nexus AI Pro',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.analytics': 'विश्लेषण',
    'nav.security': 'सुरक्षा',
    'nav.settings': 'सेटिंग्स',
    'auth.login': 'साइन इन करें',
    'auth.register': 'खाता बनाएं',
    'auth.logout': 'साइन आउट करें',
    'auth.email': 'ईमेल पता',
    'auth.password': 'पासवर्ड',
    'auth.confirmPassword': 'पासवर्ड की पुष्टि करें',
    'auth.name': 'पूरा नाम',
    'auth.biometric': 'बायोमेट्रिक्स का उपयोग करें',
    'auth.mfa': 'दो-कारक प्रमाणीकरण',
    'auth.mfaCode': '6 अंकों का कोड',
    'auth.passwordWeak': 'कमजोर पासवर्ड',
    'auth.passwordStrong': 'मजबूत पासवर्ड',
    'payment.subscribe': 'सदस्यता लें',
    'payment.upgrade': 'प्लान अपग्रेड करें',
    'payment.card': 'क्रेडिट/डेबिट कार्ड',
    'payment.crypto': 'क्रिप्टोकरेंसी',
    'payment.giftCard': 'गिफ्ट कार्ड',
    'security.scan': 'सुरक्षा स्कैन',
    'security.score': 'सुरक्षा स्कोर',
    'security.threats': 'अवरुद्ध खतरे',
    'analytics.followers': 'अनुयायी',
    'analytics.views': 'दृश्य',
    'analytics.engagement': 'सहभागिता दर',
    'analytics.retention': 'प्रतिधारण दर',
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'एक त्रुटि हुई',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.submit': 'जमा करें',
    'common.close': 'बंद करें',
  },
};

// Auto-detect browser language
function detectLanguage() {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus:language') : null;
  if (stored && SUPPORTED_LOCALES[stored]) return stored;

  const browserLang = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : 'en';
  return SUPPORTED_LOCALES[browserLang] ? browserLang : 'en';
}

class I18nManager {
  constructor() {
    this.locale = detectLanguage();
    this.fallback = 'en';
    this.listeners = new Set();
  }

  t(key, params = {}) {
    const dict = TRANSLATIONS[this.locale] || TRANSLATIONS[this.fallback] || {};
    let text = dict[key] || TRANSLATIONS[this.fallback]?.[key] || key;
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return text;
  }

  setLocale(locale) {
    if (!SUPPORTED_LOCALES[locale]) return false;
    this.locale = locale;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('nexus:language', locale); } catch {}
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = SUPPORTED_LOCALES[locale].dir;
    }
    this.listeners.forEach(fn => fn(locale));
    return true;
  }

  getLocale() { return this.locale; }
  getLocales() { return SUPPORTED_LOCALES; }
  getLocaleInfo(locale) { return SUPPORTED_LOCALES[locale || this.locale]; }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  formatDate(ts, format) {
    const d = new Date(ts);
    const fmt = format || SUPPORTED_LOCALES[this.locale]?.dateFormat || 'MM/DD/YYYY';
    const pad = n => String(n).padStart(2, '0');
    return fmt
      .replace('YYYY', d.getFullYear())
      .replace('MM', pad(d.getMonth() + 1))
      .replace('DD', pad(d.getDate()));
  }

  formatNumber(n) {
    return new Intl.NumberFormat(this.locale).format(n);
  }

  formatCurrency(amount, currency) {
    const curr = currency || SUPPORTED_LOCALES[this.locale]?.currency || 'USD';
    return new Intl.NumberFormat(this.locale, { style: 'currency', currency: curr }).format(amount / 100);
  }

  isRTL() {
    return SUPPORTED_LOCALES[this.locale]?.dir === 'rtl';
  }
}

export const i18n = new I18nManager();
export { SUPPORTED_LOCALES, TRANSLATIONS };
export default i18n;
