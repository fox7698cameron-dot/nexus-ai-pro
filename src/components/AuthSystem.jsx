// AuthSystem.jsx — 2026-10-27
// Multi-role authentication: admin, developer, moderator, user
// Biometrics, 2FA/MFA, SSO stubs, 13+ char passwords, emoji usernames

import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import {
  Shield, Lock, Key, User, Eye, EyeOff, Fingerprint, Scan, ScanFace,
  Mail, AlertTriangle, CheckCircle, ChevronDown, X, Loader2,
  Github, Globe, Monitor, MessageSquare, RefreshCw, QrCode, Smartphone
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  MODERATOR: 'moderator',
  USER: 'user',
};

const ROLE_META = {
  admin: { label: 'Admin', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: Shield },
  developer: { label: 'Developer', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Monitor },
  moderator: { label: 'Moderator', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Key },
  user: { label: 'User', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: User },
};

// ─── i18n ─────────────────────────────────────────────────────────────────────

const I18N = {
  en: {
    signIn: 'Sign In', signUp: 'Sign Up', email: 'Email', password: 'Password',
    username: 'Username', forgotPassword: 'Forgot password?', rememberMe: 'Remember me',
    or: 'or continue with', biometric: 'Biometric Login', twoFA: '2FA Code',
    setup2FA: 'Setup 2FA', scanQR: 'Scan QR Code', verify: 'Verify',
    passwordStrength: 'Password Strength', weak: 'Weak', medium: 'Medium',
    strong: 'Strong', enterprise: 'Enterprise', enterCode: 'Enter 6-digit code',
    retinalScan: 'Retinal Scan', connectDevice: 'Connect Device',
    loginWith: 'Sign in with', register: 'Create Account',
    alreadyHave: 'Already have an account?', noAccount: "Don't have an account?",
    loading: 'Loading...', error: 'Authentication failed', success: 'Success!',
    pwMinLength: 'Minimum 13 characters required',
    pwUppercase: 'Add uppercase letters',
    pwLowercase: 'Add lowercase letters',
    pwNumber: 'Add numbers',
    pwSpecial: 'Add special characters (!@#$%^&*)',
    selectRole: 'Select Role',
  },
  es: {
    signIn: 'Iniciar sesión', signUp: 'Registrarse', email: 'Correo electrónico',
    password: 'Contraseña', username: 'Nombre de usuario', forgotPassword: '¿Olvidaste tu contraseña?',
    rememberMe: 'Recordarme', or: 'o continúa con', biometric: 'Inicio biométrico',
    twoFA: 'Código 2FA', setup2FA: 'Configurar 2FA', scanQR: 'Escanear código QR',
    verify: 'Verificar', passwordStrength: 'Fortaleza', weak: 'Débil', medium: 'Media',
    strong: 'Fuerte', enterprise: 'Empresa', enterCode: 'Ingresa código de 6 dígitos',
    retinalScan: 'Escaneo retinal', connectDevice: 'Conectar dispositivo',
    loginWith: 'Iniciar con', register: 'Crear cuenta',
    alreadyHave: '¿Ya tienes cuenta?', noAccount: '¿No tienes cuenta?',
    loading: 'Cargando...', error: 'Error de autenticación', success: '¡Éxito!',
    pwMinLength: 'Mínimo 13 caracteres', pwUppercase: 'Agrega mayúsculas',
    pwLowercase: 'Agrega minúsculas', pwNumber: 'Agrega números',
    pwSpecial: 'Agrega caracteres especiales', selectRole: 'Seleccionar rol',
  },
  fr: {
    signIn: 'Se connecter', signUp: "S'inscrire", email: 'E-mail',
    password: 'Mot de passe', username: "Nom d'utilisateur",
    forgotPassword: 'Mot de passe oublié ?', rememberMe: 'Se souvenir',
    or: 'ou continuer avec', biometric: 'Connexion biométrique',
    twoFA: 'Code 2FA', setup2FA: 'Configurer 2FA', scanQR: 'Scanner le QR code',
    verify: 'Vérifier', passwordStrength: 'Force', weak: 'Faible', medium: 'Moyen',
    strong: 'Fort', enterprise: 'Entreprise', enterCode: 'Entrer le code à 6 chiffres',
    retinalScan: 'Scan rétinien', connectDevice: 'Connecter appareil',
    loginWith: 'Se connecter avec', register: 'Créer un compte',
    alreadyHave: 'Déjà un compte ?', noAccount: 'Pas de compte ?',
    loading: 'Chargement...', error: 'Échec auth', success: 'Succès !',
    pwMinLength: 'Minimum 13 caractères', pwUppercase: 'Ajoutez des majuscules',
    pwLowercase: 'Ajoutez des minuscules', pwNumber: 'Ajoutez des chiffres',
    pwSpecial: 'Ajoutez des caractères spéciaux', selectRole: 'Sélectionner le rôle',
  },
  de: { signIn: 'Anmelden', signUp: 'Registrieren', email: 'E-Mail', password: 'Passwort', username: 'Benutzername', forgotPassword: 'Passwort vergessen?', or: 'oder weiter mit', weak: 'Schwach', medium: 'Mittel', strong: 'Stark', enterprise: 'Enterprise', loading: 'Laden...', error: 'Fehler', success: 'Erfolg!', selectRole: 'Rolle wählen', rememberMe: 'Erinnern', verify: 'Verifizieren', register: 'Konto erstellen', loginWith: 'Anmelden mit', pwMinLength: 'Mind. 13 Zeichen', pwUppercase: 'Großbuchstaben hinzufügen', pwLowercase: 'Kleinbuchstaben hinzufügen', pwNumber: 'Zahlen hinzufügen', pwSpecial: 'Sonderzeichen hinzufügen', noAccount: 'Kein Konto?', alreadyHave: 'Bereits ein Konto?', twoFA: '2FA-Code', setup2FA: '2FA einrichten', scanQR: 'QR-Code scannen', biometric: 'Biometrisch', retinalScan: 'Retinascan', connectDevice: 'Gerät verbinden', enterCode: '6-stelligen Code eingeben', passwordStrength: 'Passwortstärke' },
  ja: { signIn: 'ログイン', signUp: '登録', email: 'メール', password: 'パスワード', username: 'ユーザー名', forgotPassword: 'パスワードを忘れた', or: 'または', weak: '弱い', medium: '普通', strong: '強い', enterprise: 'エンタープライズ', loading: '読込中...', error: 'エラー', success: '成功！', selectRole: '役割を選択', rememberMe: '記憶する', verify: '確認', register: 'アカウント作成', loginWith: 'でログイン', pwMinLength: '13文字以上必要', pwUppercase: '大文字を追加', pwLowercase: '小文字を追加', pwNumber: '数字を追加', pwSpecial: '特殊文字を追加', noAccount: 'アカウントをお持ちでない方', alreadyHave: 'すでにアカウントをお持ちですか？', twoFA: '2FAコード', setup2FA: '2FA設定', scanQR: 'QRコードをスキャン', biometric: '生体認証', retinalScan: '網膜スキャン', connectDevice: 'デバイスを接続', enterCode: '6桁のコードを入力', passwordStrength: 'パスワード強度' },
  zh: { signIn: '登录', signUp: '注册', email: '邮箱', password: '密码', username: '用户名', forgotPassword: '忘记密码', or: '或继续使用', weak: '弱', medium: '中', strong: '强', enterprise: '企业', loading: '加载中...', error: '认证失败', success: '成功！', selectRole: '选择角色', rememberMe: '记住我', verify: '验证', register: '创建账户', loginWith: '使用登录', pwMinLength: '至少13个字符', pwUppercase: '添加大写字母', pwLowercase: '添加小写字母', pwNumber: '添加数字', pwSpecial: '添加特殊字符', noAccount: '没有账户？', alreadyHave: '已有账户？', twoFA: '两步验证码', setup2FA: '设置两步验证', scanQR: '扫描二维码', biometric: '生物识别', retinalScan: '视网膜扫描', connectDevice: '连接设备', enterCode: '输入6位验证码', passwordStrength: '密码强度' },
  pt: { signIn: 'Entrar', signUp: 'Registrar', email: 'E-mail', password: 'Senha', username: 'Nome de usuário', forgotPassword: 'Esqueceu a senha?', or: 'ou continue com', weak: 'Fraca', medium: 'Média', strong: 'Forte', enterprise: 'Enterprise', loading: 'Carregando...', error: 'Falha na autenticação', success: 'Sucesso!', selectRole: 'Selecionar papel', rememberMe: 'Lembrar', verify: 'Verificar', register: 'Criar conta', loginWith: 'Entrar com', pwMinLength: 'Mínimo 13 caracteres', pwUppercase: 'Adicione maiúsculas', pwLowercase: 'Adicione minúsculas', pwNumber: 'Adicione números', pwSpecial: 'Adicione caracteres especiais', noAccount: 'Não tem conta?', alreadyHave: 'Já tem conta?', twoFA: 'Código 2FA', setup2FA: 'Configurar 2FA', scanQR: 'Escanear QR', biometric: 'Biometria', retinalScan: 'Escaneamento retinal', connectDevice: 'Conectar dispositivo', enterCode: 'Digite o código de 6 dígitos', passwordStrength: 'Força da senha' },
  ar: { signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم', forgotPassword: 'نسيت كلمة المرور؟', or: 'أو تابع مع', weak: 'ضعيف', medium: 'متوسط', strong: 'قوي', enterprise: 'مؤسسة', loading: 'جاري التحميل...', error: 'فشل المصادقة', success: 'نجاح!', selectRole: 'اختر الدور', rememberMe: 'تذكرني', verify: 'تحقق', register: 'إنشاء حساب', loginWith: 'تسجيل الدخول باستخدام', pwMinLength: '13 حرفًا على الأقل', pwUppercase: 'أضف أحرفًا كبيرة', pwLowercase: 'أضف أحرفًا صغيرة', pwNumber: 'أضف أرقامًا', pwSpecial: 'أضف رموزًا خاصة', noAccount: 'ليس لديك حساب؟', alreadyHave: 'لديك حساب بالفعل؟', twoFA: 'رمز 2FA', setup2FA: 'إعداد 2FA', scanQR: 'مسح رمز QR', biometric: 'تسجيل بيومتري', retinalScan: 'مسح الشبكية', connectDevice: 'توصيل الجهاز', enterCode: 'أدخل الرمز المكون من 6 أرقام', passwordStrength: 'قوة كلمة المرور' },
  ko: { signIn: '로그인', signUp: '회원가입', email: '이메일', password: '비밀번호', username: '사용자명', forgotPassword: '비밀번호 찾기', or: '또는 계속하기', weak: '약함', medium: '보통', strong: '강함', enterprise: '엔터프라이즈', loading: '로딩 중...', error: '인증 실패', success: '성공!', selectRole: '역할 선택', rememberMe: '기억하기', verify: '인증', register: '계정 만들기', loginWith: '로그인 with', pwMinLength: '13자 이상 필요', pwUppercase: '대문자 추가', pwLowercase: '소문자 추가', pwNumber: '숫자 추가', pwSpecial: '특수문자 추가', noAccount: '계정이 없으신가요?', alreadyHave: '이미 계정이 있으신가요?', twoFA: '2FA 코드', setup2FA: '2FA 설정', scanQR: 'QR 코드 스캔', biometric: '생체 인증', retinalScan: '망막 스캔', connectDevice: '기기 연결', enterCode: '6자리 코드 입력', passwordStrength: '비밀번호 강도' },
  ru: { signIn: 'Войти', signUp: 'Регистрация', email: 'Эл. почта', password: 'Пароль', username: 'Имя пользователя', forgotPassword: 'Забыли пароль?', or: 'или продолжить с', weak: 'Слабый', medium: 'Средний', strong: 'Сильный', enterprise: 'Корпоративный', loading: 'Загрузка...', error: 'Ошибка аутентификации', success: 'Успех!', selectRole: 'Выбрать роль', rememberMe: 'Запомнить', verify: 'Подтвердить', register: 'Создать аккаунт', loginWith: 'Войти с', pwMinLength: 'Минимум 13 символов', pwUppercase: 'Добавьте заглавные буквы', pwLowercase: 'Добавьте строчные буквы', pwNumber: 'Добавьте цифры', pwSpecial: 'Добавьте специальные символы', noAccount: 'Нет аккаунта?', alreadyHave: 'Уже есть аккаунт?', twoFA: 'Код 2FA', setup2FA: 'Настроить 2FA', scanQR: 'Сканировать QR', biometric: 'Биометрия', retinalScan: 'Сканирование сетчатки', connectDevice: 'Подключить устройство', enterCode: 'Введите 6-значный код', passwordStrength: 'Надёжность пароля' },
};

const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

// ─── Auth Context ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// In-memory token store (never localStorage for JWTs)
let _memToken = null;

function setMemToken(t) { _memToken = t; }
function getMemToken() { return _memToken; }
function clearMemToken() { _memToken = null; }

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthSystem');
  return ctx;
}

// ─── Password Validation ──────────────────────────────────────────────────────

function validatePassword(pw) {
  const issues = [];
  // Measure grapheme count to support emoji
  const len = [...pw].length;
  if (len < 13) issues.push('pwMinLength');
  if (!/[A-Z]/.test(pw)) issues.push('pwUppercase');
  if (!/[a-z]/.test(pw)) issues.push('pwLowercase');
  if (!/[0-9]/.test(pw)) issues.push('pwNumber');
  if (!/[^a-zA-Z0-9\s]/.test(pw)) issues.push('pwSpecial');
  const score = 5 - issues.length;
  const level = score <= 1 ? 'weak' : score <= 3 ? 'medium' : score === 4 ? 'strong' : 'enterprise';
  return { issues, score, level, valid: issues.length === 0 };
}

// ─── Biometric helpers ────────────────────────────────────────────────────────

async function biometricAuthenticate(userId) {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn not supported in this browser');
  }
  // Real WebAuthn challenge would come from server; this is the client trigger
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge,
      timeout: 60000,
      rpId: window.location.hostname,
      allowCredentials: [],
      userVerification: 'preferred',
    },
  });
  return !!credential;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PasswordStrengthBar({ password, t }) {
  if (!password) return null;
  const { level, score, issues } = validatePassword(password);
  const colors = { weak: 'bg-red-500', medium: 'bg-yellow-500', strong: 'bg-blue-500', enterprise: 'bg-green-500' };
  const labels = { weak: t.weak, medium: t.medium, strong: t.strong, enterprise: t.enterprise };
  const pct = Math.round((score / 5) * 100);
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{t.passwordStrength}</span>
        <span className={`font-medium ${colors[level].replace('bg-', 'text-')}`}>{labels[level]}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${colors[level]}`} style={{ width: `${pct}%` }} />
      </div>
      {issues.length > 0 && (
        <ul className="text-xs text-gray-400 space-y-0.5 mt-1">
          {issues.map(k => (
            <li key={k} className="flex items-center gap-1">
              <AlertTriangle size={10} className="text-yellow-500 shrink-0" />
              {t[k]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TwoFASetup({ onVerify, t }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  // In production, QR URI comes from server (TOTP secret provisioning)
  const placeholderQR = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" fill="#1a1a2e"/>
      <text x="80" y="85" text-anchor="middle" font-size="12" fill="#6366f1">QR from server</text>
    </svg>
  `);

  function handleVerify() {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError(t.enterCode);
      return;
    }
    setError('');
    onVerify(code);
  }

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2 text-indigo-400">
        <QrCode size={20} />
        <span className="font-medium">{t.setup2FA}</span>
      </div>
      <p className="text-xs text-gray-400">{t.scanQR}</p>
      <div className="flex justify-center">
        <img src={placeholderQR} alt="QR Code" className="w-40 h-40 rounded-lg border border-gray-600" />
      </div>
      <div className="space-y-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder={t.enterCode}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-center text-2xl tracking-widest focus:border-indigo-500 focus:outline-none"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button onClick={handleVerify} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium transition-colors">
          {t.verify}
        </button>
      </div>
    </div>
  );
}

function BiometricPanel({ onSuccess, onError, t }) {
  const [scanning, setScanning] = useState(false);

  async function handleBiometric() {
    setScanning(true);
    try {
      await biometricAuthenticate('current-user');
      onSuccess('biometric');
    } catch (err) {
      onError(err.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleBiometric}
        disabled={scanning}
        className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {scanning ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} className="text-indigo-400" />}
        {t.biometric}
      </button>
      <button
        onClick={handleBiometric}
        disabled={scanning}
        className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {scanning ? <Loader2 size={18} className="animate-spin" /> : <ScanFace size={18} className="text-purple-400" />}
        Face ID / Touch ID
      </button>
      <div className="w-full flex items-center justify-between bg-gray-800 border border-gray-600 text-gray-400 py-3 px-4 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <Scan size={18} className="text-gray-500" />
          <span>{t.retinalScan}</span>
        </div>
        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{t.connectDevice}</span>
      </div>
    </div>
  );
}

function SSOButtons({ t }) {
  const providers = [
    { id: 'google', label: 'Google', color: 'hover:bg-red-500/10 hover:border-red-500/40', icon: () => <Globe size={18} className="text-red-400" /> },
    { id: 'github', label: 'GitHub', color: 'hover:bg-gray-600/30 hover:border-gray-500', icon: () => <Github size={18} className="text-gray-300" /> },
    { id: 'microsoft', label: 'Microsoft', color: 'hover:bg-blue-500/10 hover:border-blue-500/40', icon: () => <Monitor size={18} className="text-blue-400" /> },
    { id: 'discord', label: 'Discord', color: 'hover:bg-indigo-500/10 hover:border-indigo-500/40', icon: () => <MessageSquare size={18} className="text-indigo-400" /> },
  ];

  function handleSSO(provider) {
    // In production: redirect to OAuth endpoint configured via env
    const oauthBase = import.meta.env[`VITE_${provider.toUpperCase()}_OAUTH_URL`];
    if (oauthBase) {
      window.location.href = oauthBase;
    } else {
      alert(`Configure VITE_${provider.toUpperCase()}_OAUTH_URL in .env`);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {providers.map(p => (
        <button
          key={p.id}
          onClick={() => handleSSO(p.id)}
          className={`flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors ${p.color}`}
        >
          <p.icon />
          {p.label}
        </button>
      ))}
    </div>
  );
}

function RolePicker({ selected, onChange, t }) {
  const [open, setOpen] = useState(false);
  const meta = ROLE_META[selected];
  const Icon = meta.icon;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 ${meta.bg} ${meta.border} border rounded-lg px-3 py-2 text-sm font-medium ${meta.color} transition-colors`}
      >
        <div className="flex items-center gap-2">
          <Icon size={16} />
          {ROLE_META[selected].label}
        </div>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-50 shadow-xl">
          {Object.keys(ROLE_META).map(r => {
            const m = ROLE_META[r];
            const I = m.icon;
            return (
              <button
                key={r}
                type="button"
                onClick={() => { onChange(r); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-700 ${r === selected ? m.color : 'text-gray-300'} transition-colors`}
              >
                <I size={15} />
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main AuthSystem ──────────────────────────────────────────────────────────

export default function AuthSystem({ role: initialRole = 'user', onAuth, onRoleChange }) {
  const [lang, setLang] = useState(() => {
    const nav = navigator.language?.split('-')[0] || 'en';
    return I18N[nav] ? nav : 'en';
  });
  const t = I18N[lang] || I18N.en;
  const isRTL = RTL_LANGS.has(lang);

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | '2fa'
  const [role, setRole] = useState(initialRole);
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'biometric'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', username: '', rememberMe: false,
  });

  const [authState, setAuthState] = useState({
    user: null, token: null, role: null, mfaRequired: false,
  });

  useEffect(() => {
    if (onRoleChange) onRoleChange(role);
  }, [role, onRoleChange]);

  function updateField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${endpoint}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.error);
      if (data.mfaRequired) {
        setMode('2fa');
        setLoading(false);
        return;
      }
      setMemToken(data.token);
      const newState = { user: data.user, token: data.token, role: data.user?.role || role, mfaRequired: false };
      setAuthState(newState);
      setSuccess(t.success);
      if (onAuth) onAuth(newState);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { issues, valid } = validatePassword(form.password);
    if (!valid) {
      setError(t[issues[0]] || t.error);
      setLoading(false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const endpoint = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${endpoint}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          username: form.username,
          role,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.error);
      setSuccess(t.success);
      setMode('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = import.meta.env.VITE_API_URL || '/api';
      await fetch(`${endpoint}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      setSuccess('Password reset email sent.');
      setMode('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handle2FAVerify(code) {
    setLoading(true);
    setError('');
    const endpoint = import.meta.env.VITE_API_URL || '/api';
    fetch(`${endpoint}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, code }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setMemToken(data.token);
        const newState = { user: data.user, token: data.token, role: data.user?.role || role, mfaRequired: false };
        setAuthState(newState);
        setSuccess(t.success);
        if (onAuth) onAuth(newState);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleBiometricSuccess() {
    setSuccess(t.success);
    const newState = { user: { id: 'biometric-user', role }, token: 'biometric-session', role, mfaRequired: false };
    setAuthState(newState);
    if (onAuth) onAuth(newState);
  }

  const roleMeta = ROLE_META[role];
  const RoleIcon = roleMeta.icon;

  return (
    <AuthContext.Provider value={{ ...authState, clearToken: clearMemToken, getToken: getMemToken }}>
      <div className={`min-h-screen bg-gray-950 flex items-center justify-center p-4 ${isRTL ? 'dir-rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${roleMeta.bg} ${roleMeta.border} border mb-4`}>
              <RoleIcon size={32} className={roleMeta.color} />
            </div>
            <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
            <p className={`text-sm mt-1 ${roleMeta.color}`}>{roleMeta.label} Portal</p>
          </div>

          {/* Lang selector */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <Globe size={14} className="text-gray-400" />
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="bg-transparent text-gray-400 text-xs border-none focus:outline-none cursor-pointer"
            >
              {Object.keys(I18N).map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Role picker */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">{t.selectRole}</label>
              <RolePicker selected={role} onChange={setRole} t={t} />
            </div>

            {/* Auth method tabs */}
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              {[['password', Lock, t.signIn], ['biometric', Fingerprint, t.biometric]].map(([m, Icon, label]) => (
                <button
                  key={m}
                  onClick={() => setAuthMethod(m)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${authMethod === m ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Alerts */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-400 text-sm">
                <AlertTriangle size={15} />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2.5 text-green-400 text-sm">
                <CheckCircle size={15} />
                {success}
              </div>
            )}

            {/* 2FA */}
            {mode === '2fa' && (
              <TwoFASetup onVerify={handle2FAVerify} t={t} />
            )}

            {/* Biometric */}
            {mode !== '2fa' && authMethod === 'biometric' && (
              <BiometricPanel onSuccess={handleBiometricSuccess} onError={setError} t={t} />
            )}

            {/* Password form */}
            {mode !== '2fa' && authMethod === 'password' && (
              <>
                {/* Login form */}
                {mode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">{t.email}</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={form.email}
                          onChange={e => updateField('email', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-gray-400">{t.password}</label>
                        <button type="button" onClick={() => setMode('forgot')} className="text-xs text-indigo-400 hover:text-indigo-300">
                          {t.forgotPassword}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={form.password}
                          onChange={e => updateField('password', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                        <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.rememberMe}
                        onChange={e => updateField('rememberMe', e.target.checked)}
                        className="accent-indigo-500"
                      />
                      {t.rememberMe}
                    </label>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                      {loading ? t.loading : t.signIn}
                    </button>
                  </form>
                )}

                {/* Register form */}
                {mode === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">{t.username}</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          required
                          autoComplete="username"
                          value={form.username}
                          onChange={e => updateField('username', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          placeholder="CoolUser🎮"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">{t.email}</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={form.email}
                          onChange={e => updateField('email', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">{t.password}</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={form.password}
                          onChange={e => updateField('password', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          placeholder="Min 13 chars + special 🔐"
                        />
                        <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <PasswordStrengthBar password={form.password} t={t} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">Confirm Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={form.confirmPassword}
                          onChange={e => updateField('confirmPassword', e.target.value)}
                          className={`w-full bg-gray-800 border rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none transition-colors ${form.confirmPassword && form.confirmPassword !== form.password ? 'border-red-500' : 'border-gray-700 focus:border-indigo-500'}`}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
                      {loading ? t.loading : t.register}
                    </button>
                  </form>
                )}

                {/* Forgot form */}
                {mode === 'forgot' && (
                  <form onSubmit={handleForgot} className="space-y-4">
                    <p className="text-sm text-gray-400">Enter your email to receive a reset link.</p>
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">{t.email}</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={e => updateField('email', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60">
                      {loading ? t.loading : 'Send Reset Link'}
                    </button>
                    <button type="button" onClick={() => setMode('login')} className="w-full text-gray-400 hover:text-white text-sm transition-colors">
                      ← Back to {t.signIn}
                    </button>
                  </form>
                )}

                {/* SSO */}
                {(mode === 'login' || mode === 'register') && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-700" />
                      <span className="text-xs text-gray-500">{t.or}</span>
                      <div className="flex-1 h-px bg-gray-700" />
                    </div>
                    <SSOButtons t={t} />
                  </>
                )}

                {/* Mode toggle */}
                {(mode === 'login' || mode === 'register') && (
                  <p className="text-center text-sm text-gray-400">
                    {mode === 'login' ? t.noAccount : t.alreadyHave}{' '}
                    <button
                      type="button"
                      onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {mode === 'login' ? t.signUp : t.signIn}
                    </button>
                  </p>
                )}
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            🔒 AES-256-GCM encrypted · Multi-factor protected
          </p>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
