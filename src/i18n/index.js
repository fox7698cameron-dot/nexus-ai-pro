// src/i18n/index.js
// Updated: 2026-10-26 — Multi-language support with 20 languages, RTL, auto-detect

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', rtl: false },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', rtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', rtl: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', rtl: false },
];

const translations = {
  en: {
    // Auth
    login: 'Login', logout: 'Logout', register: 'Register', signIn: 'Sign In', signUp: 'Sign Up',
    email: 'Email', password: 'Password', username: 'Username', displayName: 'Display Name',
    confirmPassword: 'Confirm Password', forgotPassword: 'Forgot Password?', resetPassword: 'Reset Password',
    rememberMe: 'Remember me', orContinueWith: 'Or continue with',
    biometricLogin: 'Biometric Login', faceId: 'Face ID', touchId: 'Touch ID', fingerprint: 'Fingerprint',
    setupBiometric: 'Set Up Biometric', twoFactorAuth: '2-Factor Authentication',
    enterCode: 'Enter 6-digit code', backupCodes: 'Backup Codes', copyAll: 'Copy All',
    enableMfa: 'Enable MFA', mfaEnforced: 'MFA Enforced', scanQrCode: 'Scan QR Code',
    // Navigation
    dashboard: 'Dashboard', settings: 'Settings', profile: 'Profile', home: 'Home',
    analytics: 'Analytics', security: 'Security', projects: 'Projects', gamedev: 'Game Dev',
    arVr: 'AR/VR', payments: 'Payments', admin: 'Admin', moderator: 'Moderator',
    notifications: 'Notifications', messages: 'Messages', help: 'Help',
    // Actions
    save: 'Save', cancel: 'Cancel', submit: 'Submit', search: 'Search', delete: 'Delete',
    edit: 'Edit', create: 'Create', update: 'Update', upload: 'Upload', download: 'Download',
    export: 'Export', import: 'Import', refresh: 'Refresh', confirm: 'Confirm', back: 'Back',
    next: 'Next', previous: 'Previous', close: 'Close', open: 'Open', share: 'Share',
    copy: 'Copy', paste: 'Paste', cut: 'Cut', undo: 'Undo', redo: 'Redo',
    // Status
    loading: 'Loading...', error: 'Error', success: 'Success', warning: 'Warning', info: 'Info',
    active: 'Active', inactive: 'Inactive', pending: 'Pending', completed: 'Completed',
    failed: 'Failed', cancelled: 'Cancelled', draft: 'Draft', published: 'Published',
    // Security
    threatDetected: 'Threat Detected', securityScore: 'Security Score', vulnerability: 'Vulnerability',
    networkMonitor: 'Network Monitor', authEvents: 'Auth Events', activeSessions: 'Active Sessions',
    scanNow: 'Scan Now', patchVulnerability: 'Patch Vulnerability', revokeSession: 'Revoke Session',
    exportReport: 'Export Report', criticalAlert: 'Critical Alert', securityPolicy: 'Security Policy',
    // Analytics
    views: 'Views', likes: 'Likes', reach: 'Reach', retention: 'Retention', engagement: 'Engagement',
    followers: 'Followers', following: 'Following', posts: 'Posts', impressions: 'Impressions',
    clickRate: 'Click Rate', conversionRate: 'Conversion Rate', totalRevenue: 'Total Revenue',
    // Project Tracking
    projectName: 'Project Name', status: 'Status', progress: 'Progress', deadline: 'Deadline',
    tasks: 'Tasks', milestones: 'Milestones', teamMembers: 'Team Members', priority: 'Priority',
    high: 'High', medium: 'Medium', low: 'Low', critical: 'Critical',
    // Payment
    checkout: 'Checkout', subscribe: 'Subscribe', plan: 'Plan', billing: 'Billing',
    paymentMethod: 'Payment Method', cardNumber: 'Card Number', expiryDate: 'Expiry Date',
    cvv: 'CVV', billingAddress: 'Billing Address', cryptoPayment: 'Crypto Payment',
    giftCard: 'Gift Card', giftCardCode: 'Gift Card Code', applyCode: 'Apply Code',
    // Password
    passwordStrength: 'Password Strength', veryWeak: 'Very Weak', weak: 'Weak', fair: 'Fair',
    strong: 'Strong', veryStrong: 'Very Strong', minChars: 'Minimum 13 characters',
    requiresUpper: 'Requires uppercase letter', requiresLower: 'Requires lowercase letter',
    requiresNumber: 'Requires number', requiresSpecial: 'Requires special character',
    // Misc
    language: 'Language', region: 'Region', theme: 'Theme', darkMode: 'Dark Mode',
    lightMode: 'Light Mode', autoTranslate: 'Auto Translate', version: 'Version',
    termsOfService: 'Terms of Service', privacyPolicy: 'Privacy Policy', cookiePolicy: 'Cookie Policy',
    allRightsReserved: 'All rights reserved', noData: 'No data available',
    selectAll: 'Select All', deselectAll: 'Deselect All', filterBy: 'Filter by',
    sortBy: 'Sort by', groupBy: 'Group by', viewAll: 'View All', seeMore: 'See More',
  },
  es: {
    login: 'Iniciar sesión', logout: 'Cerrar sesión', register: 'Registrarse', signIn: 'Entrar', signUp: 'Registrarse',
    email: 'Correo electrónico', password: 'Contraseña', username: 'Nombre de usuario', displayName: 'Nombre visible',
    confirmPassword: 'Confirmar contraseña', forgotPassword: '¿Olvidaste tu contraseña?', resetPassword: 'Restablecer contraseña',
    rememberMe: 'Recuérdame', orContinueWith: 'O continuar con',
    dashboard: 'Panel', settings: 'Configuración', profile: 'Perfil', home: 'Inicio',
    analytics: 'Analíticas', security: 'Seguridad', projects: 'Proyectos',
    save: 'Guardar', cancel: 'Cancelar', submit: 'Enviar', search: 'Buscar', delete: 'Eliminar',
    loading: 'Cargando...', error: 'Error', success: 'Éxito', warning: 'Advertencia',
    language: 'Idioma', region: 'Región', theme: 'Tema', darkMode: 'Modo oscuro',
    passwordStrength: 'Fortaleza de contraseña', veryWeak: 'Muy débil', weak: 'Débil', fair: 'Regular', strong: 'Fuerte', veryStrong: 'Muy fuerte',
    views: 'Vistas', likes: 'Me gusta', reach: 'Alcance', followers: 'Seguidores',
    checkout: 'Pago', subscribe: 'Suscribirse', plan: 'Plan', billing: 'Facturación',
  },
  fr: {
    login: 'Connexion', logout: 'Déconnexion', register: "S'inscrire", signIn: 'Se connecter', signUp: "S'inscrire",
    email: 'E-mail', password: 'Mot de passe', username: "Nom d'utilisateur", displayName: 'Nom affiché',
    confirmPassword: 'Confirmer le mot de passe', forgotPassword: 'Mot de passe oublié ?', resetPassword: 'Réinitialiser le mot de passe',
    rememberMe: 'Se souvenir de moi', orContinueWith: 'Ou continuer avec',
    dashboard: 'Tableau de bord', settings: 'Paramètres', profile: 'Profil', home: 'Accueil',
    analytics: 'Analytiques', security: 'Sécurité', projects: 'Projets',
    save: 'Enregistrer', cancel: 'Annuler', submit: 'Soumettre', search: 'Rechercher', delete: 'Supprimer',
    loading: 'Chargement...', error: 'Erreur', success: 'Succès', warning: 'Avertissement',
    language: 'Langue', theme: 'Thème', darkMode: 'Mode sombre',
    passwordStrength: 'Force du mot de passe', veryWeak: 'Très faible', weak: 'Faible', fair: 'Correct', strong: 'Fort', veryStrong: 'Très fort',
    views: 'Vues', likes: "J'aime", reach: 'Portée', followers: 'Abonnés',
    checkout: 'Paiement', subscribe: "S'abonner", plan: 'Plan', billing: 'Facturation',
  },
  de: {
    login: 'Anmelden', logout: 'Abmelden', register: 'Registrieren', signIn: 'Einloggen', signUp: 'Registrieren',
    email: 'E-Mail', password: 'Passwort', username: 'Benutzername', displayName: 'Anzeigename',
    confirmPassword: 'Passwort bestätigen', forgotPassword: 'Passwort vergessen?', resetPassword: 'Passwort zurücksetzen',
    rememberMe: 'Angemeldet bleiben', dashboard: 'Dashboard', settings: 'Einstellungen', profile: 'Profil',
    save: 'Speichern', cancel: 'Abbrechen', submit: 'Absenden', search: 'Suchen', delete: 'Löschen',
    loading: 'Laden...', error: 'Fehler', success: 'Erfolg', language: 'Sprache',
    passwordStrength: 'Passwortstärke', veryWeak: 'Sehr schwach', weak: 'Schwach', fair: 'Mittel', strong: 'Stark', veryStrong: 'Sehr stark',
    views: 'Aufrufe', likes: 'Likes', followers: 'Follower', checkout: 'Kasse', subscribe: 'Abonnieren',
  },
  ja: {
    login: 'ログイン', logout: 'ログアウト', register: '登録', signIn: 'サインイン', signUp: 'サインアップ',
    email: 'メール', password: 'パスワード', username: 'ユーザー名', displayName: '表示名',
    confirmPassword: 'パスワード確認', forgotPassword: 'パスワードを忘れた？',
    dashboard: 'ダッシュボード', settings: '設定', profile: 'プロフィール', home: 'ホーム',
    save: '保存', cancel: 'キャンセル', submit: '送信', search: '検索', delete: '削除',
    loading: '読み込み中...', error: 'エラー', success: '成功', language: '言語',
    analytics: '分析', security: 'セキュリティ', projects: 'プロジェクト',
    views: '再生数', likes: 'いいね', followers: 'フォロワー', checkout: 'チェックアウト',
  },
  zh: {
    login: '登录', logout: '退出', register: '注册', signIn: '登录', signUp: '注册',
    email: '邮箱', password: '密码', username: '用户名', displayName: '显示名称',
    confirmPassword: '确认密码', forgotPassword: '忘记密码？',
    dashboard: '仪表板', settings: '设置', profile: '个人资料', home: '首页',
    save: '保存', cancel: '取消', submit: '提交', search: '搜索', delete: '删除',
    loading: '加载中...', error: '错误', success: '成功', language: '语言',
    analytics: '分析', security: '安全', projects: '项目',
    views: '观看量', likes: '点赞', followers: '粉丝', checkout: '结账',
  },
  'zh-TW': {
    login: '登入', logout: '登出', register: '註冊', signIn: '登入', signUp: '註冊',
    email: '電子郵件', password: '密碼', username: '使用者名稱', displayName: '顯示名稱',
    confirmPassword: '確認密碼', forgotPassword: '忘記密碼？',
    dashboard: '儀表板', settings: '設定', profile: '個人資料', home: '首頁',
    save: '儲存', cancel: '取消', submit: '提交', search: '搜尋', delete: '刪除',
    loading: '載入中...', error: '錯誤', success: '成功', language: '語言',
  },
  ko: {
    login: '로그인', logout: '로그아웃', register: '회원가입', signIn: '로그인', signUp: '회원가입',
    email: '이메일', password: '비밀번호', username: '사용자명', displayName: '표시 이름',
    dashboard: '대시보드', settings: '설정', profile: '프로필', home: '홈',
    save: '저장', cancel: '취소', submit: '제출', search: '검색', delete: '삭제',
    loading: '로딩 중...', error: '오류', success: '성공', language: '언어',
    views: '조회수', likes: '좋아요', followers: '팔로워',
  },
  pt: {
    login: 'Entrar', logout: 'Sair', register: 'Registrar', signIn: 'Entrar', signUp: 'Registrar',
    email: 'E-mail', password: 'Senha', username: 'Nome de usuário', displayName: 'Nome de exibição',
    confirmPassword: 'Confirmar senha', forgotPassword: 'Esqueceu a senha?',
    dashboard: 'Painel', settings: 'Configurações', profile: 'Perfil', home: 'Início',
    save: 'Salvar', cancel: 'Cancelar', submit: 'Enviar', search: 'Buscar', delete: 'Excluir',
    loading: 'Carregando...', error: 'Erro', success: 'Sucesso', language: 'Idioma',
    views: 'Visualizações', likes: 'Curtidas', followers: 'Seguidores',
  },
  ar: {
    login: 'تسجيل الدخول', logout: 'تسجيل الخروج', register: 'التسجيل', signIn: 'دخول', signUp: 'تسجيل',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم', displayName: 'الاسم المعروض',
    dashboard: 'لوحة التحكم', settings: 'الإعدادات', profile: 'الملف الشخصي', home: 'الرئيسية',
    save: 'حفظ', cancel: 'إلغاء', submit: 'إرسال', search: 'بحث', delete: 'حذف',
    loading: 'جار التحميل...', error: 'خطأ', success: 'نجاح', language: 'اللغة',
    views: 'مشاهدات', likes: 'إعجابات', followers: 'متابعون',
  },
  hi: {
    login: 'लॉगिन', logout: 'लॉगआउट', register: 'रजिस्टर', signIn: 'साइन इन', signUp: 'साइन अप',
    email: 'ईमेल', password: 'पासवर्ड', username: 'उपयोगकर्ता नाम', displayName: 'प्रदर्शन नाम',
    dashboard: 'डैशबोर्ड', settings: 'सेटिंग्स', profile: 'प्रोफाइल', home: 'होम',
    save: 'सहेजें', cancel: 'रद्द करें', submit: 'सबमिट', search: 'खोजें', delete: 'हटाएं',
    loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफलता', language: 'भाषा',
  },
  ru: {
    login: 'Вход', logout: 'Выход', register: 'Регистрация', signIn: 'Войти', signUp: 'Зарегистрироваться',
    email: 'Эл. почта', password: 'Пароль', username: 'Имя пользователя', displayName: 'Отображаемое имя',
    confirmPassword: 'Подтвердить пароль', forgotPassword: 'Забыли пароль?',
    dashboard: 'Панель управления', settings: 'Настройки', profile: 'Профиль', home: 'Главная',
    save: 'Сохранить', cancel: 'Отмена', submit: 'Отправить', search: 'Поиск', delete: 'Удалить',
    loading: 'Загрузка...', error: 'Ошибка', success: 'Успех', language: 'Язык',
    views: 'Просмотры', likes: 'Лайки', followers: 'Подписчики',
  },
  it: {
    login: 'Accedi', logout: 'Esci', register: 'Registrati', signIn: 'Accedi', signUp: 'Registrati',
    email: 'E-mail', password: 'Password', username: 'Nome utente', displayName: 'Nome visualizzato',
    dashboard: 'Dashboard', settings: 'Impostazioni', profile: 'Profilo', home: 'Home',
    save: 'Salva', cancel: 'Annulla', submit: 'Invia', search: 'Cerca', delete: 'Elimina',
    loading: 'Caricamento...', error: 'Errore', success: 'Successo', language: 'Lingua',
  },
  nl: {
    login: 'Inloggen', logout: 'Uitloggen', register: 'Registreren', signIn: 'Inloggen', signUp: 'Registreren',
    email: 'E-mail', password: 'Wachtwoord', username: 'Gebruikersnaam', displayName: 'Weergavenaam',
    dashboard: 'Dashboard', settings: 'Instellingen', profile: 'Profiel', home: 'Home',
    save: 'Opslaan', cancel: 'Annuleren', submit: 'Verzenden', search: 'Zoeken', delete: 'Verwijderen',
    loading: 'Laden...', error: 'Fout', success: 'Succes', language: 'Taal',
  },
  sv: {
    login: 'Logga in', logout: 'Logga ut', register: 'Registrera', signIn: 'Logga in', signUp: 'Registrera',
    email: 'E-post', password: 'Lösenord', username: 'Användarnamn', displayName: 'Visningsnamn',
    dashboard: 'Instrumentpanel', settings: 'Inställningar', profile: 'Profil', home: 'Hem',
    save: 'Spara', cancel: 'Avbryt', submit: 'Skicka', search: 'Sök', delete: 'Radera',
    loading: 'Laddar...', error: 'Fel', success: 'Framgång', language: 'Språk',
  },
  pl: {
    login: 'Zaloguj się', logout: 'Wyloguj się', register: 'Zarejestruj się', signIn: 'Zaloguj', signUp: 'Rejestracja',
    email: 'E-mail', password: 'Hasło', username: 'Nazwa użytkownika', displayName: 'Nazwa wyświetlana',
    dashboard: 'Panel', settings: 'Ustawienia', profile: 'Profil', home: 'Strona główna',
    save: 'Zapisz', cancel: 'Anuluj', submit: 'Wyślij', search: 'Szukaj', delete: 'Usuń',
    loading: 'Ładowanie...', error: 'Błąd', success: 'Sukces', language: 'Język',
  },
  tr: {
    login: 'Giriş Yap', logout: 'Çıkış Yap', register: 'Kayıt Ol', signIn: 'Giriş', signUp: 'Kayıt',
    email: 'E-posta', password: 'Şifre', username: 'Kullanıcı adı', displayName: 'Görünen Ad',
    dashboard: 'Gösterge Paneli', settings: 'Ayarlar', profile: 'Profil', home: 'Ana Sayfa',
    save: 'Kaydet', cancel: 'İptal', submit: 'Gönder', search: 'Ara', delete: 'Sil',
    loading: 'Yükleniyor...', error: 'Hata', success: 'Başarılı', language: 'Dil',
  },
  vi: {
    login: 'Đăng nhập', logout: 'Đăng xuất', register: 'Đăng ký', signIn: 'Đăng nhập', signUp: 'Đăng ký',
    email: 'Email', password: 'Mật khẩu', username: 'Tên người dùng', displayName: 'Tên hiển thị',
    dashboard: 'Bảng điều khiển', settings: 'Cài đặt', profile: 'Hồ sơ', home: 'Trang chủ',
    save: 'Lưu', cancel: 'Hủy', submit: 'Gửi', search: 'Tìm kiếm', delete: 'Xóa',
    loading: 'Đang tải...', error: 'Lỗi', success: 'Thành công', language: 'Ngôn ngữ',
  },
  id: {
    login: 'Masuk', logout: 'Keluar', register: 'Daftar', signIn: 'Masuk', signUp: 'Daftar',
    email: 'Email', password: 'Kata Sandi', username: 'Nama Pengguna', displayName: 'Nama Tampilan',
    dashboard: 'Dasbor', settings: 'Pengaturan', profile: 'Profil', home: 'Beranda',
    save: 'Simpan', cancel: 'Batal', submit: 'Kirim', search: 'Cari', delete: 'Hapus',
    loading: 'Memuat...', error: 'Kesalahan', success: 'Berhasil', language: 'Bahasa',
  },
  th: {
    login: 'เข้าสู่ระบบ', logout: 'ออกจากระบบ', register: 'ลงทะเบียน', signIn: 'เข้าสู่ระบบ', signUp: 'สมัครสมาชิก',
    email: 'อีเมล', password: 'รหัสผ่าน', username: 'ชื่อผู้ใช้', displayName: 'ชื่อที่แสดง',
    dashboard: 'แดชบอร์ด', settings: 'การตั้งค่า', profile: 'โปรไฟล์', home: 'หน้าแรก',
    save: 'บันทึก', cancel: 'ยกเลิก', submit: 'ส่ง', search: 'ค้นหา', delete: 'ลบ',
    loading: 'กำลังโหลด...', error: 'ข้อผิดพลาด', success: 'สำเร็จ', language: 'ภาษา',
  },
};

const STORAGE_KEY = 'nexus:language';

function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || 'en';
  const base = lang.split('-')[0];
  if (lang === 'zh-TW' || lang === 'zh-HK') return 'zh-TW';
  const supported = SUPPORTED_LANGUAGES.map(l => l.code);
  if (supported.includes(lang)) return lang;
  if (supported.includes(base)) return base;
  return 'en';
}

let currentLanguage = (() => {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const supported = SUPPORTED_LANGUAGES.map(l => l.code);
    if (stored && supported.includes(stored)) return stored;
  } catch (_) {}
  return detectBrowserLanguage();
})();

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(code) {
  const supported = SUPPORTED_LANGUAGES.map(l => l.code);
  if (!supported.includes(code)) return false;
  currentLanguage = code;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
  } catch (_) {}
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  if (lang && typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', lang.rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', code);
  }
  return true;
}

export function t(key, fallback) {
  const langStrings = translations[currentLanguage] || {};
  const enStrings = translations.en || {};
  return langStrings[key] ?? enStrings[key] ?? fallback ?? key;
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

export const i18n = { t, setLanguage, getLanguage, getSupportedLanguages };

if (typeof window !== 'undefined') {
  window.i18n = i18n;
}

setLanguage(currentLanguage);
