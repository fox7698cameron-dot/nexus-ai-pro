// Created: 2026-09-30
// Nexus AI Pro - Authentication System (React / WebAuthn / TOTP / i18n)

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';

// ---------------------------------------------------------------------------
// i18n translations (inline, no external dependency needed at runtime)
// ---------------------------------------------------------------------------
const TRANSLATIONS = {
  en: {
    signIn: 'Sign In',
    createAccount: 'Create Account',
    email: 'Email',
    password: 'Password',
    username: 'Username',
    role: 'Role',
    language: 'Language',
    loginWithBiometric: 'Sign in with Biometric',
    loginWithPasskey: 'Sign in with Passkey',
    registerPasskey: 'Register Passkey',
    setup2FA: 'Set up 2FA',
    verify2FA: 'Verify 2FA Code',
    totpCode: 'Authenticator Code',
    passwordStrength: 'Password strength',
    strengthWeak: 'Weak',
    strengthFair: 'Fair',
    strengthGood: 'Good',
    strengthStrong: 'Strong',
    strengthVeryStrong: 'Very Strong',
    alreadyHaveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
    errors: {
      emailRequired: 'Email is required',
      emailInvalid: 'Enter a valid email address',
      passwordRequired: 'Password is required',
      passwordLength: 'Password must be at least 13 characters',
      passwordUppercase: 'Must include uppercase letter',
      passwordLowercase: 'Must include lowercase letter',
      passwordNumber: 'Must include a number',
      passwordSpecial: 'Must include a special character',
      usernameRequired: 'Username is required',
      usernameLength: 'Username must be 2–64 characters',
      networkError: 'Network error, please try again',
      biometricUnsupported: 'Biometric authentication is not supported on this device',
      biometricFailed: 'Biometric authentication failed',
    },
    scanQR: 'Scan this QR code with your authenticator app',
    orEnterManually: 'Or enter the code manually:',
    mfaRequired: 'Two-factor authentication required',
    success: 'Success!',
    loggedIn: 'You are now logged in.',
    registered: 'Account created. You can now sign in.',
  },
  es: {
    signIn: 'Iniciar sesión',
    createAccount: 'Crear cuenta',
    email: 'Correo electrónico',
    password: 'Contraseña',
    username: 'Nombre de usuario',
    role: 'Rol',
    language: 'Idioma',
    loginWithBiometric: 'Entrar con biometría',
    loginWithPasskey: 'Entrar con clave de acceso',
    registerPasskey: 'Registrar clave de acceso',
    setup2FA: 'Configurar 2FA',
    verify2FA: 'Verificar código 2FA',
    totpCode: 'Código del autenticador',
    passwordStrength: 'Fortaleza de contraseña',
    strengthWeak: 'Débil',
    strengthFair: 'Regular',
    strengthGood: 'Buena',
    strengthStrong: 'Fuerte',
    strengthVeryStrong: 'Muy fuerte',
    alreadyHaveAccount: '¿Ya tienes cuenta?',
    noAccount: '¿No tienes cuenta?',
    errors: {
      emailRequired: 'El correo es requerido',
      emailInvalid: 'Ingresa un correo válido',
      passwordRequired: 'La contraseña es requerida',
      passwordLength: 'La contraseña debe tener al menos 13 caracteres',
      passwordUppercase: 'Debe incluir una letra mayúscula',
      passwordLowercase: 'Debe incluir una letra minúscula',
      passwordNumber: 'Debe incluir un número',
      passwordSpecial: 'Debe incluir un carácter especial',
      usernameRequired: 'El nombre de usuario es requerido',
      usernameLength: 'El nombre de usuario debe tener 2–64 caracteres',
      networkError: 'Error de red, intente nuevamente',
      biometricUnsupported: 'La autenticación biométrica no es compatible con este dispositivo',
      biometricFailed: 'Error en la autenticación biométrica',
    },
    scanQR: 'Escanea este código QR con tu aplicación autenticadora',
    orEnterManually: 'O ingresa el código manualmente:',
    mfaRequired: 'Se requiere autenticación de dos factores',
    success: '¡Éxito!',
    loggedIn: 'Has iniciado sesión.',
    registered: 'Cuenta creada. Ahora puedes iniciar sesión.',
  },
  fr: {
    signIn: 'Se connecter',
    createAccount: 'Créer un compte',
    email: 'E-mail',
    password: 'Mot de passe',
    username: "Nom d'utilisateur",
    role: 'Rôle',
    language: 'Langue',
    loginWithBiometric: 'Connexion biométrique',
    loginWithPasskey: 'Connexion avec clé d'accès',
    registerPasskey: 'Enregistrer une clé d'accès',
    setup2FA: 'Configurer 2FA',
    verify2FA: 'Vérifier le code 2FA',
    totpCode: "Code d'authentification",
    passwordStrength: 'Force du mot de passe',
    strengthWeak: 'Faible',
    strengthFair: 'Passable',
    strengthGood: 'Bon',
    strengthStrong: 'Fort',
    strengthVeryStrong: 'Très fort',
    alreadyHaveAccount: 'Vous avez déjà un compte?',
    noAccount: "Vous n'avez pas de compte?",
    errors: {
      emailRequired: "L'e-mail est requis",
      emailInvalid: 'Entrez une adresse e-mail valide',
      passwordRequired: 'Le mot de passe est requis',
      passwordLength: 'Le mot de passe doit comporter au moins 13 caractères',
      passwordUppercase: 'Doit inclure une lettre majuscule',
      passwordLowercase: 'Doit inclure une lettre minuscule',
      passwordNumber: 'Doit inclure un chiffre',
      passwordSpecial: 'Doit inclure un caractère spécial',
      usernameRequired: "Le nom d'utilisateur est requis",
      usernameLength: "Le nom d'utilisateur doit comporter 2–64 caractères",
      networkError: 'Erreur réseau, veuillez réessayer',
      biometricUnsupported: "L'authentification biométrique n'est pas prise en charge",
      biometricFailed: "Échec de l'authentification biométrique",
    },
    scanQR: "Scannez ce QR code avec votre application d'authentification",
    orEnterManually: 'Ou entrez le code manuellement:',
    mfaRequired: "Authentification à deux facteurs requise",
    success: 'Succès!',
    loggedIn: 'Vous êtes maintenant connecté.',
    registered: 'Compte créé. Vous pouvez maintenant vous connecter.',
  },
  de: {
    signIn: 'Anmelden',
    createAccount: 'Konto erstellen',
    email: 'E-Mail',
    password: 'Passwort',
    username: 'Benutzername',
    role: 'Rolle',
    language: 'Sprache',
    loginWithBiometric: 'Mit Biometrie anmelden',
    loginWithPasskey: 'Mit Passkey anmelden',
    registerPasskey: 'Passkey registrieren',
    setup2FA: '2FA einrichten',
    verify2FA: '2FA-Code verifizieren',
    totpCode: 'Authentifizierungscode',
    passwordStrength: 'Passwortstärke',
    strengthWeak: 'Schwach',
    strengthFair: 'Akzeptabel',
    strengthGood: 'Gut',
    strengthStrong: 'Stark',
    strengthVeryStrong: 'Sehr stark',
    alreadyHaveAccount: 'Haben Sie bereits ein Konto?',
    noAccount: 'Noch kein Konto?',
    errors: {
      emailRequired: 'E-Mail ist erforderlich',
      emailInvalid: 'Gültige E-Mail-Adresse eingeben',
      passwordRequired: 'Passwort ist erforderlich',
      passwordLength: 'Passwort muss mindestens 13 Zeichen haben',
      passwordUppercase: 'Muss einen Großbuchstaben enthalten',
      passwordLowercase: 'Muss einen Kleinbuchstaben enthalten',
      passwordNumber: 'Muss eine Zahl enthalten',
      passwordSpecial: 'Muss ein Sonderzeichen enthalten',
      usernameRequired: 'Benutzername ist erforderlich',
      usernameLength: 'Benutzername muss 2–64 Zeichen haben',
      networkError: 'Netzwerkfehler, bitte erneut versuchen',
      biometricUnsupported: 'Biometrische Authentifizierung wird nicht unterstützt',
      biometricFailed: 'Biometrische Authentifizierung fehlgeschlagen',
    },
    scanQR: 'Scannen Sie diesen QR-Code mit Ihrer Authentifikator-App',
    orEnterManually: 'Oder geben Sie den Code manuell ein:',
    mfaRequired: 'Zwei-Faktor-Authentifizierung erforderlich',
    success: 'Erfolg!',
    loggedIn: 'Sie sind jetzt angemeldet.',
    registered: 'Konto erstellt. Sie können sich jetzt anmelden.',
  },
  ja: {
    signIn: 'サインイン',
    createAccount: 'アカウント作成',
    email: 'メール',
    password: 'パスワード',
    username: 'ユーザー名',
    role: '役割',
    language: '言語',
    loginWithBiometric: '生体認証でサインイン',
    loginWithPasskey: 'パスキーでサインイン',
    registerPasskey: 'パスキーを登録',
    setup2FA: '2FAを設定',
    verify2FA: '2FAコードを確認',
    totpCode: '認証コード',
    passwordStrength: 'パスワード強度',
    strengthWeak: '弱い',
    strengthFair: '普通',
    strengthGood: '良い',
    strengthStrong: '強い',
    strengthVeryStrong: '非常に強い',
    alreadyHaveAccount: 'すでにアカウントをお持ちですか？',
    noAccount: 'アカウントをお持ちでないですか？',
    errors: {
      emailRequired: 'メールは必須です',
      emailInvalid: '有効なメールアドレスを入力してください',
      passwordRequired: 'パスワードは必須です',
      passwordLength: 'パスワードは13文字以上必要です',
      passwordUppercase: '大文字を含める必要があります',
      passwordLowercase: '小文字を含める必要があります',
      passwordNumber: '数字を含める必要があります',
      passwordSpecial: '特殊文字を含める必要があります',
      usernameRequired: 'ユーザー名は必須です',
      usernameLength: 'ユーザー名は2～64文字にしてください',
      networkError: 'ネットワークエラー、もう一度お試しください',
      biometricUnsupported: '生体認証はこのデバイスではサポートされていません',
      biometricFailed: '生体認証に失敗しました',
    },
    scanQR: '認証アプリでこのQRコードをスキャンしてください',
    orEnterManually: 'または手動でコードを入力:',
    mfaRequired: '二要素認証が必要です',
    success: '成功！',
    loggedIn: 'ログインしました。',
    registered: 'アカウントが作成されました。サインインできます。',
  },
  zh: {
    signIn: '登录',
    createAccount: '创建账户',
    email: '电子邮件',
    password: '密码',
    username: '用户名',
    role: '角色',
    language: '语言',
    loginWithBiometric: '使用生物识别登录',
    loginWithPasskey: '使用通行密钥登录',
    registerPasskey: '注册通行密钥',
    setup2FA: '设置双因素认证',
    verify2FA: '验证双因素代码',
    totpCode: '验证码',
    passwordStrength: '密码强度',
    strengthWeak: '弱',
    strengthFair: '一般',
    strengthGood: '良好',
    strengthStrong: '强',
    strengthVeryStrong: '非常强',
    alreadyHaveAccount: '已有账户？',
    noAccount: '没有账户？',
    errors: {
      emailRequired: '电子邮件为必填项',
      emailInvalid: '请输入有效的电子邮件地址',
      passwordRequired: '密码为必填项',
      passwordLength: '密码至少需要13个字符',
      passwordUppercase: '必须包含大写字母',
      passwordLowercase: '必须包含小写字母',
      passwordNumber: '必须包含数字',
      passwordSpecial: '必须包含特殊字符',
      usernameRequired: '用户名为必填项',
      usernameLength: '用户名必须为2-64个字符',
      networkError: '网络错误，请重试',
      biometricUnsupported: '此设备不支持生物识别认证',
      biometricFailed: '生物识别认证失败',
    },
    scanQR: '使用您的认证应用扫描此二维码',
    orEnterManually: '或手动输入代码：',
    mfaRequired: '需要双因素认证',
    success: '成功！',
    loggedIn: '您已登录。',
    registered: '账户已创建，您现在可以登录。',
  },
  ar: {
    signIn: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    username: 'اسم المستخدم',
    role: 'الدور',
    language: 'اللغة',
    loginWithBiometric: 'تسجيل الدخول بالبيومتري',
    loginWithPasskey: 'تسجيل الدخول بمفتاح المرور',
    registerPasskey: 'تسجيل مفتاح المرور',
    setup2FA: 'إعداد المصادقة الثنائية',
    verify2FA: 'التحقق من رمز المصادقة الثنائية',
    totpCode: 'رمز المصادقة',
    passwordStrength: 'قوة كلمة المرور',
    strengthWeak: 'ضعيف',
    strengthFair: 'مقبول',
    strengthGood: 'جيد',
    strengthStrong: 'قوي',
    strengthVeryStrong: 'قوي جداً',
    alreadyHaveAccount: 'هل لديك حساب بالفعل؟',
    noAccount: 'ليس لديك حساب؟',
    errors: {
      emailRequired: 'البريد الإلكتروني مطلوب',
      emailInvalid: 'أدخل عنوان بريد إلكتروني صالح',
      passwordRequired: 'كلمة المرور مطلوبة',
      passwordLength: 'يجب أن تتكون كلمة المرور من 13 حرفاً على الأقل',
      passwordUppercase: 'يجب أن تتضمن حرفاً كبيراً',
      passwordLowercase: 'يجب أن تتضمن حرفاً صغيراً',
      passwordNumber: 'يجب أن تتضمن رقماً',
      passwordSpecial: 'يجب أن تتضمن رمزاً خاصاً',
      usernameRequired: 'اسم المستخدم مطلوب',
      usernameLength: 'يجب أن يكون اسم المستخدم 2-64 حرفاً',
      networkError: 'خطأ في الشبكة، يرجى المحاولة مرة أخرى',
      biometricUnsupported: 'لا يدعم هذا الجهاز المصادقة البيومترية',
      biometricFailed: 'فشلت المصادقة البيومترية',
    },
    scanQR: 'امسح رمز QR هذا باستخدام تطبيق المصادقة الخاص بك',
    orEnterManually: 'أو أدخل الرمز يدوياً:',
    mfaRequired: 'مطلوب المصادقة الثنائية',
    success: 'نجاح!',
    loggedIn: 'لقد سجلت الدخول الآن.',
    registered: 'تم إنشاء الحساب. يمكنك الآن تسجيل الدخول.',
  },
  pt: {
    signIn: 'Entrar',
    createAccount: 'Criar conta',
    email: 'E-mail',
    password: 'Senha',
    username: 'Nome de usuário',
    role: 'Função',
    language: 'Idioma',
    loginWithBiometric: 'Entrar com biometria',
    loginWithPasskey: 'Entrar com chave de acesso',
    registerPasskey: 'Registrar chave de acesso',
    setup2FA: 'Configurar 2FA',
    verify2FA: 'Verificar código 2FA',
    totpCode: 'Código de autenticação',
    passwordStrength: 'Força da senha',
    strengthWeak: 'Fraca',
    strengthFair: 'Razoável',
    strengthGood: 'Boa',
    strengthStrong: 'Forte',
    strengthVeryStrong: 'Muito forte',
    alreadyHaveAccount: 'Já tem uma conta?',
    noAccount: 'Não tem uma conta?',
    errors: {
      emailRequired: 'E-mail é obrigatório',
      emailInvalid: 'Insira um endereço de e-mail válido',
      passwordRequired: 'Senha é obrigatória',
      passwordLength: 'A senha deve ter pelo menos 13 caracteres',
      passwordUppercase: 'Deve incluir letra maiúscula',
      passwordLowercase: 'Deve incluir letra minúscula',
      passwordNumber: 'Deve incluir um número',
      passwordSpecial: 'Deve incluir um caractere especial',
      usernameRequired: 'Nome de usuário é obrigatório',
      usernameLength: 'Nome de usuário deve ter 2–64 caracteres',
      networkError: 'Erro de rede, tente novamente',
      biometricUnsupported: 'Autenticação biométrica não é suportada neste dispositivo',
      biometricFailed: 'Falha na autenticação biométrica',
    },
    scanQR: 'Escaneie este código QR com seu aplicativo de autenticação',
    orEnterManually: 'Ou insira o código manualmente:',
    mfaRequired: 'Autenticação de dois fatores necessária',
    success: 'Sucesso!',
    loggedIn: 'Você está agora conectado.',
    registered: 'Conta criada. Agora você pode entrar.',
  },
};

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  ar: 'العربية',
  pt: 'Português',
};

const RTL_LANGS = new Set(['ar']);

// ---------------------------------------------------------------------------
// Password strength analysis
// ---------------------------------------------------------------------------
function analyzePassword(password) {
  let score = 0;
  const issues = [];

  if (password.length >= 13) score++;
  if (password.length >= 20) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9\u0000-\u007F]/.test(password)) score++; // non-ASCII bonus

  if (password.length < 13) issues.push('passwordLength');
  if (!/[A-Z]/.test(password)) issues.push('passwordUppercase');
  if (!/[a-z]/.test(password)) issues.push('passwordLowercase');
  if (!/[0-9]/.test(password)) issues.push('passwordNumber');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('passwordSpecial');

  // Clamp score to 0-4 for 5 strength levels
  const level = Math.min(4, Math.floor((score / 7) * 5));
  return { level, issues };
}

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------
function validateRegisterForm({ email, password, username }) {
  const errors = {};
  if (!email) errors.email = 'emailRequired';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'emailInvalid';
  if (!password) errors.password = 'passwordRequired';
  else {
    const { issues } = analyzePassword(password);
    if (issues.length > 0) errors.password = issues[0];
  }
  if (!username) errors.username = 'usernameRequired';
  else if (username.length < 2 || username.length > 64) errors.username = 'usernameLength';
  return errors;
}

function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'emailRequired';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'emailInvalid';
  if (!password) errors.password = 'passwordRequired';
  return errors;
}

// ---------------------------------------------------------------------------
// WebAuthn helpers
// ---------------------------------------------------------------------------
function isWebAuthnSupported() {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
const API_BASE = '/api/auth';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Password strength bar */
function PasswordStrengthBar({ password, t, dark }) {
  if (!password) return null;
  const { level } = analyzePassword(password);
  const labels = [t.strengthWeak, t.strengthFair, t.strengthGood, t.strengthStrong, t.strengthVeryStrong];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const width = `${((level + 1) / 5) * 100}%`;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: dark ? '#9ca3af' : '#6b7280' }}>{t.passwordStrength}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors[level] }}>{labels[level]}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: dark ? '#374151' : '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ height: '100%', width, background: colors[level], borderRadius: 3, transition: 'width 0.3s, background 0.3s' }} />
      </div>
    </div>
  );
}

/** Inline form field error */
function FieldError({ msg }) {
  if (!msg) return null;
  return <span style={{ fontSize: 12, color: '#ef4444', marginTop: 3, display: 'block' }}>{msg}</span>;
}

/** QR Code display panel */
function TotpSetupPanel({ qrCode, secret, t, dark }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <p style={{ marginBottom: 12, color: dark ? '#d1d5db' : '#374151', fontSize: 14 }}>{t.scanQR}</p>
      {qrCode && (
        <img
          src={qrCode}
          alt="TOTP QR Code"
          style={{ width: 180, height: 180, margin: '0 auto 12px', display: 'block', borderRadius: 8, border: dark ? '2px solid #374151' : '2px solid #e5e7eb' }}
        />
      )}
      {secret && (
        <>
          <p style={{ fontSize: 13, color: dark ? '#9ca3af' : '#6b7280', marginBottom: 6 }}>{t.orEnterManually}</p>
          <code
            style={{
              fontSize: 13,
              letterSpacing: 2,
              background: dark ? '#1f2937' : '#f3f4f6',
              padding: '6px 12px',
              borderRadius: 6,
              display: 'inline-block',
              wordBreak: 'break-all',
              color: dark ? '#e5e7eb' : '#111827',
            }}
          >
            {secret}
          </code>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AuthSystem Component
// ---------------------------------------------------------------------------

/**
 * @param {object} props
 * @param {boolean} [props.darkMode] - force dark theme
 * @param {string} [props.initialLanguage] - BCP47 language code (en|es|fr|de|ja|zh|ar|pt)
 * @param {string} [props.apiBase] - override API base URL
 * @param {function} [props.onAuthSuccess] - called with { user, accessToken, refreshToken } on success
 * @param {function} [props.onError] - called with Error on unhandled errors
 */
export default function AuthSystem({
  darkMode = false,
  initialLanguage = 'en',
  apiBase,
  onAuthSuccess,
  onError,
}) {
  // ---- State ----
  const [view, setView] = useState('login'); // login | register | mfa | totpSetup | success
  const [lang, setLang] = useState(initialLanguage in TRANSLATIONS ? initialLanguage : 'en');
  const [dark, setDark] = useState(darkMode);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState({});
  const [mfaUserId, setMfaUserId] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState('USER');
  const [regErrors, setRegErrors] = useState({});

  // 2FA setup
  const [totpQR, setTotpQR] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpVerifyCode, setTotpVerifyCode] = useState('');

  // Auth tokens (in-memory; caller should persist via onAuthSuccess)
  const [accessToken, setAccessToken] = useState('');

  const t = TRANSLATIONS[lang];
  const isRTL = RTL_LANGS.has(lang);

  useEffect(() => { setDark(darkMode); }, [darkMode]);

  // ---- Styling tokens ----
  const colors = useMemo(() => ({
    bg: dark ? '#111827' : '#f9fafb',
    card: dark ? '#1f2937' : '#ffffff',
    border: dark ? '#374151' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    subtext: dark ? '#9ca3af' : '#6b7280',
    input: dark ? '#374151' : '#f3f4f6',
    inputBorder: dark ? '#4b5563' : '#d1d5db',
    inputFocus: '#6366f1',
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    error: '#ef4444',
    success: '#10b981',
  }), [dark]);

  const styles = useMemo(() => ({
    overlay: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: colors.bg,
      padding: '16px',
      direction: isRTL ? 'rtl' : 'ltr',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    card: {
      width: '100%',
      maxWidth: 440,
      background: colors.card,
      borderRadius: 16,
      boxShadow: dark
        ? '0 4px 32px rgba(0,0,0,0.5)'
        : '0 4px 32px rgba(0,0,0,0.1)',
      padding: '32px 28px',
      border: `1px solid ${colors.border}`,
    },
    heading: {
      fontSize: 26,
      fontWeight: 700,
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subheading: {
      fontSize: 14,
      color: colors.subtext,
      textAlign: 'center',
      marginBottom: 24,
    },
    field: { marginBottom: 16 },
    label: {
      display: 'block',
      fontSize: 13,
      fontWeight: 600,
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: 8,
      border: `1.5px solid ${colors.inputBorder}`,
      background: colors.input,
      color: colors.text,
      fontSize: 15,
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: 8,
      border: `1.5px solid ${colors.inputBorder}`,
      background: colors.input,
      color: colors.text,
      fontSize: 15,
      outline: 'none',
      boxSizing: 'border-box',
      cursor: 'pointer',
    },
    primaryBtn: {
      width: '100%',
      padding: '12px',
      borderRadius: 8,
      background: colors.primary,
      color: '#fff',
      fontWeight: 700,
      fontSize: 15,
      border: 'none',
      cursor: 'pointer',
      transition: 'background 0.2s, opacity 0.2s',
      marginTop: 8,
    },
    secondaryBtn: {
      width: '100%',
      padding: '11px',
      borderRadius: 8,
      background: 'transparent',
      color: colors.primary,
      fontWeight: 600,
      fontSize: 14,
      border: `1.5px solid ${colors.primary}`,
      cursor: 'pointer',
      transition: 'background 0.2s',
      marginTop: 8,
    },
    link: {
      color: colors.primary,
      cursor: 'pointer',
      fontWeight: 600,
      textDecoration: 'underline',
      fontSize: 14,
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      margin: '16px 0',
      color: colors.subtext,
      fontSize: 13,
    },
    dividerLine: { flex: 1, height: 1, background: colors.border },
    errorBox: {
      background: dark ? '#450a0a' : '#fef2f2',
      border: `1px solid ${colors.error}`,
      borderRadius: 8,
      padding: '10px 14px',
      color: colors.error,
      fontSize: 14,
      marginBottom: 16,
    },
    successBox: {
      background: dark ? '#052e16' : '#f0fdf4',
      border: `1px solid ${colors.success}`,
      borderRadius: 8,
      padding: '10px 14px',
      color: colors.success,
      fontSize: 14,
      marginBottom: 16,
      textAlign: 'center',
    },
    topBar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 20,
      background: dark ? '#312e81' : '#eef2ff',
      color: colors.primary,
      fontSize: 12,
      fontWeight: 600,
    },
    modeToggle: {
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      color: colors.subtext,
      fontSize: 18,
      padding: 4,
    },
  }), [colors, dark, isRTL]);

  // ---- Helpers ----
  const clearErrors = () => { setGlobalError(''); setLoginErrors({}); setRegErrors({}); };

  // ---- Login ----
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    clearErrors();
    const errors = validateLoginForm({ email: loginEmail, password: loginPassword });
    if (Object.keys(errors).length > 0) { setLoginErrors(errors); return; }
    setLoading(true);
    try {
      const { ok, status, data } = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (status === 200 && data.mfaRequired) {
        setMfaUserId(data.userId);
        setView('mfa');
        return;
      }
      if (!ok) { setGlobalError(data.error || t.errors.networkError); return; }
      setAccessToken(data.accessToken);
      onAuthSuccess?.({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      setSuccessMsg(t.loggedIn);
      setView('success');
    } catch {
      setGlobalError(t.errors.networkError);
    } finally {
      setLoading(false);
    }
  }, [loginEmail, loginPassword, t, onAuthSuccess]);

  // ---- MFA Submit ----
  const handleMfaSubmit = useCallback(async (e) => {
    e.preventDefault();
    clearErrors();
    if (!totpCode || totpCode.length !== 6) { setGlobalError('Enter a 6-digit code'); return; }
    setLoading(true);
    try {
      const { ok, data } = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword, totpCode }),
      });
      if (!ok) { setGlobalError(data.error || t.errors.networkError); return; }
      setAccessToken(data.accessToken);
      onAuthSuccess?.({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      setSuccessMsg(t.loggedIn);
      setView('success');
    } catch {
      setGlobalError(t.errors.networkError);
    } finally {
      setLoading(false);
    }
  }, [loginEmail, loginPassword, totpCode, t, onAuthSuccess]);

  // ---- Register ----
  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    clearErrors();
    const errors = validateRegisterForm({ email: regEmail, password: regPassword, username: regUsername });
    if (Object.keys(errors).length > 0) { setRegErrors(errors); return; }
    setLoading(true);
    try {
      const { ok, data } = await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify({ email: regEmail, password: regPassword, username: regUsername, role: regRole, language: lang }),
      });
      if (!ok) { setGlobalError(data.error || t.errors.networkError); return; }
      setSuccessMsg(t.registered);
      setView('login');
    } catch {
      setGlobalError(t.errors.networkError);
    } finally {
      setLoading(false);
    }
  }, [regEmail, regPassword, regUsername, regRole, lang, t]);

  // ---- Biometric / WebAuthn login ----
  const handleBiometricLogin = useCallback(async () => {
    clearErrors();
    if (!isWebAuthnSupported()) { setGlobalError(t.errors.biometricUnsupported); return; }
    if (!loginEmail) { setLoginErrors({ email: 'emailRequired' }); return; }

    // 1. Get userId from server (we need it for the challenge)
    setLoading(true);
    try {
      // Attempt a challenge request; in a real app you'd resolve email → userId server-side
      // Here we pass a placeholder and expect the server to handle it
      const challengeRes = await apiFetch('/webauthn/challenge', {
        method: 'POST',
        body: JSON.stringify({ userId: loginEmail, mode: 'authenticate' }),
      });
      if (!challengeRes.ok) { setGlobalError(challengeRes.data.error || t.errors.biometricFailed); return; }

      const options = challengeRes.data;
      const publicKeyOptions = {
        challenge: base64urlToBuffer(options.challenge),
        rpId: options.rpId,
        allowCredentials: (options.allowCredentials || []).map((c) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })),
        userVerification: options.userVerification || 'preferred',
        timeout: options.timeout || 60000,
      };

      const assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });
      if (!assertion) throw new Error('No credential returned');

      const verifyRes = await apiFetch('/webauthn/authenticate', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: options.challengeId,
          credentialId: bufferToBase64url(assertion.rawId),
          authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
          clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
          signature: bufferToBase64url(assertion.response.signature),
          userHandle: assertion.response.userHandle ? bufferToBase64url(assertion.response.userHandle) : null,
        }),
      });

      if (!verifyRes.ok) { setGlobalError(verifyRes.data.error || t.errors.biometricFailed); return; }
      setAccessToken(verifyRes.data.accessToken);
      onAuthSuccess?.({ user: verifyRes.data.user, accessToken: verifyRes.data.accessToken, refreshToken: verifyRes.data.refreshToken });
      setSuccessMsg(t.loggedIn);
      setView('success');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setGlobalError(t.errors.biometricFailed);
      } else {
        setGlobalError(err.message || t.errors.biometricFailed);
      }
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [loginEmail, t, onAuthSuccess, onError]);

  // ---- Register WebAuthn passkey ----
  const handleRegisterPasskey = useCallback(async () => {
    clearErrors();
    if (!isWebAuthnSupported()) { setGlobalError(t.errors.biometricUnsupported); return; }
    if (!accessToken) { setGlobalError('Log in first to register a passkey'); return; }

    setLoading(true);
    try {
      // Decode userId from JWT (sub claim)
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const userId = payload.sub;

      const challengeRes = await apiFetch('/webauthn/challenge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId, mode: 'register' }),
      });
      if (!challengeRes.ok) { setGlobalError(challengeRes.data.error || t.errors.biometricFailed); return; }

      const options = challengeRes.data;
      const publicKeyOptions = {
        challenge: base64urlToBuffer(options.challenge),
        rp: { id: options.rpId, name: options.rpName },
        user: {
          id: base64urlToBuffer(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        authenticatorSelection: options.authenticatorSelection,
        attestation: options.attestation,
        timeout: options.timeout || 60000,
      };

      const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });
      if (!credential) throw new Error('No credential created');

      const regRes = await apiFetch('/webauthn/register', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          challengeId: options.challengeId,
          credentialId: bufferToBase64url(credential.rawId),
          publicKey: bufferToBase64url(credential.response.getPublicKey?.() || new ArrayBuffer(0)),
          transports: credential.response.getTransports?.() || [],
          clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          attestationObject: bufferToBase64url(credential.response.attestationObject),
        }),
      });

      if (!regRes.ok) { setGlobalError(regRes.data.error || t.errors.biometricFailed); return; }
      setSuccessMsg('Passkey registered successfully!');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setGlobalError(t.errors.biometricFailed);
      } else {
        setGlobalError(err.message || t.errors.biometricFailed);
      }
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t, onError]);

  // ---- 2FA Setup ----
  const handleSetup2FA = useCallback(async () => {
    clearErrors();
    if (!accessToken) { setGlobalError('Log in first to set up 2FA'); return; }
    setLoading(true);
    try {
      const { ok, data } = await apiFetch('/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      });
      if (!ok) { setGlobalError(data.error || t.errors.networkError); return; }
      setTotpQR(data.qrCode);
      setTotpSecret(data.secret);
      setView('totpSetup');
    } catch {
      setGlobalError(t.errors.networkError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  const handleVerify2FA = useCallback(async (e) => {
    e.preventDefault();
    clearErrors();
    if (!totpVerifyCode || totpVerifyCode.length !== 6) { setGlobalError('Enter a 6-digit code'); return; }
    setLoading(true);
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const { ok, data } = await apiFetch('/2fa/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId: payload.sub, token: totpVerifyCode }),
      });
      if (!ok) { setGlobalError(data.error || t.errors.networkError); return; }
      setSuccessMsg('2FA enabled successfully!');
      setView('success');
    } catch {
      setGlobalError(t.errors.networkError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, totpVerifyCode, t]);

  // ---- Shared input focus ring (no inline :focus) ----
  const inputFocusRef = useRef({});

  // ---- Render helpers ----
  const renderTopBar = () => (
    <div style={styles.topBar}>
      <div style={styles.badge}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Nexus AI Pro
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{ ...styles.select, width: 'auto', padding: '4px 8px', fontSize: 12 }}
          aria-label="Select language"
        >
          {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        <button
          type="button"
          style={styles.modeToggle}
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );

  // ---- View: Login ----
  const renderLogin = () => (
    <form onSubmit={handleLogin} noValidate>
      {renderTopBar()}
      <h1 style={styles.heading}>{t.signIn}</h1>
      <p style={styles.subheading}>Welcome back to Nexus AI Pro</p>

      {globalError && <div style={styles.errorBox} role="alert">{globalError}</div>}
      {successMsg && <div style={styles.successBox} role="status">{successMsg}</div>}

      <div style={styles.field}>
        <label htmlFor="login-email" style={styles.label}>{t.email}</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          style={{ ...styles.input, borderColor: loginErrors.email ? colors.error : colors.inputBorder }}
          placeholder="you@example.com"
          aria-describedby={loginErrors.email ? 'login-email-error' : undefined}
        />
        <FieldError msg={loginErrors.email ? t.errors[loginErrors.email] : ''} />
      </div>

      <div style={styles.field}>
        <label htmlFor="login-password" style={styles.label}>{t.password}</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          style={{ ...styles.input, borderColor: loginErrors.password ? colors.error : colors.inputBorder }}
          placeholder="••••••••••••••"
          aria-describedby={loginErrors.password ? 'login-pw-error' : undefined}
        />
        <FieldError msg={loginErrors.password ? t.errors[loginErrors.password] : ''} />
      </div>

      <button
        type="submit"
        style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
        disabled={loading}
      >
        {loading ? '…' : t.signIn}
      </button>

      {isWebAuthnSupported() && (
        <>
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span>or</span>
            <div style={styles.dividerLine} />
          </div>
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={handleBiometricLogin}
            disabled={loading}
          >
            {t.loginWithBiometric} / {t.loginWithPasskey}
          </button>
        </>
      )}

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: colors.subtext }}>
        {t.noAccount}{' '}
        <span
          role="button"
          tabIndex={0}
          style={styles.link}
          onClick={() => { clearErrors(); setSuccessMsg(''); setView('register'); }}
          onKeyDown={(e) => e.key === 'Enter' && (clearErrors(), setSuccessMsg(''), setView('register'))}
        >
          {t.createAccount}
        </span>
      </p>
    </form>
  );

  // ---- View: Register ----
  const renderRegister = () => (
    <form onSubmit={handleRegister} noValidate>
      {renderTopBar()}
      <h1 style={styles.heading}>{t.createAccount}</h1>
      <p style={styles.subheading}>Join Nexus AI Pro</p>

      {globalError && <div style={styles.errorBox} role="alert">{globalError}</div>}

      <div style={styles.field}>
        <label htmlFor="reg-username" style={styles.label}>{t.username}</label>
        <input
          id="reg-username"
          type="text"
          autoComplete="username"
          value={regUsername}
          onChange={(e) => setRegUsername(e.target.value)}
          style={{ ...styles.input, borderColor: regErrors.username ? colors.error : colors.inputBorder }}
          placeholder="Your display name 🚀"
          aria-describedby={regErrors.username ? 'reg-username-error' : undefined}
        />
        <FieldError msg={regErrors.username ? t.errors[regErrors.username] : ''} />
      </div>

      <div style={styles.field}>
        <label htmlFor="reg-email" style={styles.label}>{t.email}</label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          style={{ ...styles.input, borderColor: regErrors.email ? colors.error : colors.inputBorder }}
          placeholder="you@example.com"
        />
        <FieldError msg={regErrors.email ? t.errors[regErrors.email] : ''} />
      </div>

      <div style={styles.field}>
        <label htmlFor="reg-password" style={styles.label}>{t.password}</label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          value={regPassword}
          onChange={(e) => setRegPassword(e.target.value)}
          style={{ ...styles.input, borderColor: regErrors.password ? colors.error : colors.inputBorder }}
          placeholder="13+ characters"
        />
        <PasswordStrengthBar password={regPassword} t={t} dark={dark} />
        <FieldError msg={regErrors.password ? t.errors[regErrors.password] : ''} />
      </div>

      <div style={styles.field}>
        <label htmlFor="reg-role" style={styles.label}>{t.role}</label>
        <select
          id="reg-role"
          value={regRole}
          onChange={(e) => setRegRole(e.target.value)}
          style={styles.select}
        >
          <option value="USER">User</option>
          <option value="DEVELOPER">Developer</option>
          <option value="MODERATOR">Moderator</option>
        </select>
      </div>

      <button
        type="submit"
        style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
        disabled={loading}
      >
        {loading ? '…' : t.createAccount}
      </button>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: colors.subtext }}>
        {t.alreadyHaveAccount}{' '}
        <span
          role="button"
          tabIndex={0}
          style={styles.link}
          onClick={() => { clearErrors(); setView('login'); }}
          onKeyDown={(e) => e.key === 'Enter' && (clearErrors(), setView('login'))}
        >
          {t.signIn}
        </span>
      </p>
    </form>
  );

  // ---- View: MFA ----
  const renderMFA = () => (
    <form onSubmit={handleMfaSubmit} noValidate>
      {renderTopBar()}
      <h1 style={styles.heading}>{t.mfaRequired}</h1>
      <p style={styles.subheading}>{t.verify2FA}</p>

      {globalError && <div style={styles.errorBox} role="alert">{globalError}</div>}

      <div style={styles.field}>
        <label htmlFor="mfa-code" style={styles.label}>{t.totpCode}</label>
        <input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
          style={{ ...styles.input, letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
          placeholder="000000"
          autoFocus
        />
      </div>

      <button
        type="submit"
        style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
        disabled={loading}
      >
        {loading ? '…' : t.verify2FA}
      </button>
    </form>
  );

  // ---- View: TOTP Setup ----
  const renderTotpSetup = () => (
    <form onSubmit={handleVerify2FA} noValidate>
      {renderTopBar()}
      <h1 style={styles.heading}>{t.setup2FA}</h1>

      {globalError && <div style={styles.errorBox} role="alert">{globalError}</div>}
      {successMsg && <div style={styles.successBox} role="status">{successMsg}</div>}

      <TotpSetupPanel qrCode={totpQR} secret={totpSecret} t={t} dark={dark} />

      <div style={styles.field}>
        <label htmlFor="totp-verify" style={styles.label}>{t.totpCode}</label>
        <input
          id="totp-verify"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          value={totpVerifyCode}
          onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, ''))}
          style={{ ...styles.input, letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
          placeholder="000000"
        />
      </div>

      <button
        type="submit"
        style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
        disabled={loading}
      >
        {loading ? '…' : t.verify2FA}
      </button>
    </form>
  );

  // ---- View: Success ----
  const renderSuccess = () => (
    <div style={{ textAlign: 'center' }}>
      {renderTopBar()}
      <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
      <h1 style={styles.heading}>{t.success}</h1>
      <p style={{ color: colors.subtext, marginBottom: 24 }}>{successMsg}</p>

      {accessToken && (
        <>
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span>Post-login options</span>
            <div style={styles.dividerLine} />
          </div>
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={handleSetup2FA}
            disabled={loading}
          >
            {t.setup2FA}
          </button>
          {isWebAuthnSupported() && (
            <button
              type="button"
              style={styles.secondaryBtn}
              onClick={handleRegisterPasskey}
              disabled={loading}
            >
              {t.registerPasskey}
            </button>
          )}
        </>
      )}
    </div>
  );

  // ---- Render ----
  return (
    <div style={styles.overlay}>
      <div style={styles.card} role="main" aria-label="Authentication">
        {view === 'login' && renderLogin()}
        {view === 'register' && renderRegister()}
        {view === 'mfa' && renderMFA()}
        {view === 'totpSetup' && renderTotpSetup()}
        {view === 'success' && renderSuccess()}
      </div>
    </div>
  );
}
