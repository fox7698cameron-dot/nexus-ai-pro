// src/components/AuthFlow.jsx
// Date: 2026-10-19
// Full auth flow: login, register, MFA, biometric, i18n, password strength

import React, { useState, useEffect, useCallback } from 'react';

// ---------- i18n ----------
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
];

const I18N = {
  en: {
    login: 'Sign In', register: 'Create Account', username: 'Username', email: 'Email',
    password: 'Password', confirmPassword: 'Confirm Password', rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?', noAccount: "Don't have an account?", hasAccount: 'Already have an account?',
    signUp: 'Sign up', signIn: 'Sign in', mfaTitle: 'Two-Factor Authentication',
    mfaPrompt: 'Enter the 6-digit code from your authenticator app',
    mfaCode: 'Authentication Code', verify: 'Verify', setupMFA: 'Set up 2FA',
    biometric: 'Biometric Login', faceId: 'Face ID', touchId: 'Touch ID', fingerprint: 'Fingerprint',
    usernameNote: 'Username supports letters, numbers, emoji, and special characters (e.g., user_名前🚀)',
    passwordStrength: 'Password strength', weak: 'Weak', moderate: 'Moderate', strong: 'Strong',
    passwordRules: '13+ chars, uppercase, lowercase, number, special character required',
    role: 'Role', language: 'Language', error: 'Error', loading: 'Loading...',
    scanQR: 'Scan this QR code with your authenticator app', secretKey: 'Manual entry key',
    activateMFA: 'Activate 2FA', cancel: 'Cancel', welcomeBack: 'Welcome back',
  },
  es: {
    login: 'Iniciar sesión', register: 'Crear cuenta', username: 'Usuario', email: 'Correo',
    password: 'Contraseña', confirmPassword: 'Confirmar contraseña', rememberMe: 'Recuérdame',
    forgotPassword: '¿Olvidaste tu contraseña?', noAccount: '¿No tienes cuenta?', hasAccount: '¿Ya tienes cuenta?',
    signUp: 'Registrarse', signIn: 'Iniciar sesión', mfaTitle: 'Autenticación de dos factores',
    mfaPrompt: 'Ingresa el código de 6 dígitos', mfaCode: 'Código', verify: 'Verificar',
    setupMFA: 'Configurar 2FA', biometric: 'Acceso biométrico', faceId: 'Face ID',
    touchId: 'Touch ID', fingerprint: 'Huella dactilar',
    usernameNote: 'El usuario admite letras, números, emojis y caracteres especiales',
    passwordStrength: 'Seguridad', weak: 'Débil', moderate: 'Moderada', strong: 'Fuerte',
    passwordRules: 'Mínimo 13 caracteres, mayúsculas, minúsculas, número y carácter especial',
    role: 'Rol', language: 'Idioma', error: 'Error', loading: 'Cargando...',
    scanQR: 'Escanea este código QR', secretKey: 'Clave manual', activateMFA: 'Activar 2FA',
    cancel: 'Cancelar', welcomeBack: 'Bienvenido de vuelta',
  },
  fr: {
    login: 'Se connecter', register: 'Créer un compte', username: "Nom d'utilisateur", email: 'Email',
    password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe', rememberMe: 'Se souvenir',
    forgotPassword: 'Mot de passe oublié ?', noAccount: 'Pas de compte ?', hasAccount: 'Déjà inscrit ?',
    signUp: "S'inscrire", signIn: 'Se connecter', mfaTitle: 'Authentification à deux facteurs',
    mfaPrompt: 'Entrez le code à 6 chiffres', mfaCode: 'Code', verify: 'Vérifier',
    setupMFA: 'Configurer 2FA', biometric: 'Connexion biométrique', faceId: 'Face ID',
    touchId: 'Touch ID', fingerprint: 'Empreinte', usernameNote: "Supporte les emojis et caractères spéciaux",
    passwordStrength: 'Force', weak: 'Faible', moderate: 'Modérée', strong: 'Fort',
    passwordRules: '13+ caractères requis avec majuscule, minuscule, chiffre et caractère spécial',
    role: 'Rôle', language: 'Langue', error: 'Erreur', loading: 'Chargement...',
    scanQR: 'Scannez ce QR code', secretKey: 'Clé manuelle', activateMFA: 'Activer 2FA',
    cancel: 'Annuler', welcomeBack: 'Bon retour',
  },
  de: {
    login: 'Anmelden', register: 'Konto erstellen', username: 'Benutzername', email: 'E-Mail',
    password: 'Passwort', confirmPassword: 'Passwort bestätigen', rememberMe: 'Angemeldet bleiben',
    forgotPassword: 'Passwort vergessen?', noAccount: 'Kein Konto?', hasAccount: 'Bereits registriert?',
    signUp: 'Registrieren', signIn: 'Anmelden', mfaTitle: 'Zwei-Faktor-Authentifizierung',
    mfaPrompt: '6-stelligen Code eingeben', mfaCode: 'Code', verify: 'Bestätigen',
    setupMFA: '2FA einrichten', biometric: 'Biometrische Anmeldung', faceId: 'Gesichtserkennung',
    touchId: 'Touch ID', fingerprint: 'Fingerabdruck', usernameNote: 'Emojis und Sonderzeichen erlaubt',
    passwordStrength: 'Stärke', weak: 'Schwach', moderate: 'Mittel', strong: 'Stark',
    passwordRules: 'Min. 13 Zeichen mit Groß-, Kleinbuchstaben, Zahl und Sonderzeichen',
    role: 'Rolle', language: 'Sprache', error: 'Fehler', loading: 'Laden...',
    scanQR: 'QR-Code scannen', secretKey: 'Manueller Schlüssel', activateMFA: '2FA aktivieren',
    cancel: 'Abbrechen', welcomeBack: 'Willkommen zurück',
  },
  ja: {
    login: 'ログイン', register: 'アカウント作成', username: 'ユーザー名', email: 'メール',
    password: 'パスワード', confirmPassword: 'パスワード確認', rememberMe: 'ログイン状態を保持',
    forgotPassword: 'パスワードを忘れた', noAccount: 'アカウントをお持ちでない方', hasAccount: 'すでにアカウントをお持ちの方',
    signUp: '登録', signIn: 'ログイン', mfaTitle: '二段階認証', mfaPrompt: '6桁のコードを入力',
    mfaCode: 'コード', verify: '確認', setupMFA: '2FA設定', biometric: '生体認証',
    faceId: 'Face ID', touchId: 'Touch ID', fingerprint: '指紋認証',
    usernameNote: '絵文字や特殊文字も使用可能', passwordStrength: 'パスワード強度',
    weak: '弱い', moderate: '普通', strong: '強い',
    passwordRules: '13文字以上、大文字・小文字・数字・特殊文字必須',
    role: '役割', language: '言語', error: 'エラー', loading: '読み込み中...',
    scanQR: 'QRコードをスキャン', secretKey: '手動入力キー', activateMFA: '2FAを有効化',
    cancel: 'キャンセル', welcomeBack: 'おかえりなさい',
  },
  ko: {
    login: '로그인', register: '계정 만들기', username: '사용자 이름', email: '이메일',
    password: '비밀번호', confirmPassword: '비밀번호 확인', rememberMe: '로그인 유지',
    forgotPassword: '비밀번호 찾기', noAccount: '계정이 없으신가요?', hasAccount: '이미 계정이 있으신가요?',
    signUp: '회원가입', signIn: '로그인', mfaTitle: '이중 인증', mfaPrompt: '6자리 코드 입력',
    mfaCode: '인증 코드', verify: '확인', setupMFA: '2FA 설정', biometric: '생체 인증',
    faceId: 'Face ID', touchId: 'Touch ID', fingerprint: '지문',
    usernameNote: '이모지와 특수 문자 지원', passwordStrength: '비밀번호 강도',
    weak: '약함', moderate: '보통', strong: '강함',
    passwordRules: '13자 이상, 대소문자, 숫자, 특수문자 필수',
    role: '역할', language: '언어', error: '오류', loading: '로딩 중...',
    scanQR: 'QR 코드 스캔', secretKey: '수동 입력 키', activateMFA: '2FA 활성화',
    cancel: '취소', welcomeBack: '다시 오셨군요',
  },
  zh: {
    login: '登录', register: '创建账户', username: '用户名', email: '电子邮件',
    password: '密码', confirmPassword: '确认密码', rememberMe: '保持登录',
    forgotPassword: '忘记密码?', noAccount: '没有账户?', hasAccount: '已有账户?',
    signUp: '注册', signIn: '登录', mfaTitle: '双因素认证', mfaPrompt: '输入6位验证码',
    mfaCode: '验证码', verify: '验证', setupMFA: '设置2FA', biometric: '生物识别登录',
    faceId: 'Face ID', touchId: 'Touch ID', fingerprint: '指纹',
    usernameNote: '支持表情符号和特殊字符', passwordStrength: '密码强度',
    weak: '弱', moderate: '中', strong: '强',
    passwordRules: '最少13个字符，包含大小写字母、数字和特殊字符',
    role: '角色', language: '语言', error: '错误', loading: '加载中...',
    scanQR: '扫描二维码', secretKey: '手动输入密钥', activateMFA: '激活2FA',
    cancel: '取消', welcomeBack: '欢迎回来',
  },
};

// ---------- password strength checker ----------
function checkPasswordStrength(pw) {
  if (!pw) return { score: 0, label: 'weak', color: '#ef4444' };
  let score = 0;
  if (pw.length >= 13) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) score++;
  if (score <= 2) return { score, label: 'weak', color: '#ef4444', pct: Math.round(score * 20) };
  if (score <= 3) return { score, label: 'moderate', color: '#f59e0b', pct: Math.round(score * 20) };
  return { score, label: 'strong', color: '#10b981', pct: 100 };
}

// ---------- platform detection for biometrics ----------
function detectBiometricPlatform() {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua);
  const mac = /Mac/.test(ua);
  const android = /Android/.test(ua);
  const windows = /Windows/.test(ua);
  if (ios || mac) return { faceId: true, touchId: true, fingerprint: false };
  if (android) return { faceId: false, touchId: false, fingerprint: true };
  if (windows) return { faceId: false, touchId: true, fingerprint: true };
  return { faceId: false, touchId: false, fingerprint: true };
}

const API_BASE = '';

async function apiPost(path, body) {
  const token = localStorage.getItem('nexus:token');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---------- sub-components ----------

function PasswordStrengthBar({ password, t }) {
  const strength = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-1">
      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{ width: `${strength.pct}%`, backgroundColor: strength.color }}
        />
      </div>
      <p className="text-xs mt-0.5" style={{ color: strength.color }}>
        {t.passwordStrength}: {t[strength.label]}
      </p>
    </div>
  );
}

function MFASetupView({ userId, token, t, onComplete, onCancel }) {
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setup = async () => {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.secret) {
        setSecret(data.secret);
        setOtpauthUrl(data.otpauthUrl);
      }
    };
    setup();
  }, [token]);

  const handleActivate = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    const data = await apiPost('/api/auth/mfa/verify', { identifier: userId, code, activate: true });
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    onComplete(data);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.setupMFA}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t.scanQR}</p>

      {otpauthUrl && (
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(otpauthUrl)}&size=160x160`}
              alt="QR Code for 2FA"
              width={160} height={160}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>
      )}

      {secret && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.secretKey}:</p>
          <code className="block bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs rounded px-3 py-2 break-all font-mono select-all">
            {secret}
          </code>
        </div>
      )}

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-center text-xl tracking-widest bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          {t.cancel}
        </button>
        <button
          onClick={handleActivate}
          disabled={loading || code.length !== 6}
          className="flex-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {loading ? t.loading : t.activateMFA}
        </button>
      </div>
    </div>
  );
}

function MFAVerifyView({ identifier, t, onComplete }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) { setError('Enter a 6-digit code'); return; }
    setLoading(true);
    const data = await apiPost('/api/auth/mfa/verify', { identifier, code });
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    if (data.token) {
      localStorage.setItem('nexus:token', data.token);
      onComplete(data);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.mfaTitle}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t.mfaPrompt}</p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-center text-2xl tracking-widest bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={handleVerify}
        disabled={loading || code.length !== 6}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors"
      >
        {loading ? t.loading : t.verify}
      </button>
    </div>
  );
}

// ---------- main component ----------

export default function AuthFlow({ onLogin, onRegister, initialView = 'login' }) {
  const [view, setView] = useState(initialView); // 'login' | 'register' | 'mfa-verify' | 'mfa-setup'
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('nexus:language') || 'en'; } catch { return 'en'; }
  });
  const t = I18N[lang] || I18N.en;

  const [form, setForm] = useState({ identifier: '', email: '', username: '', password: '', confirmPassword: '', rememberMe: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaIdentifier, setMfaIdentifier] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricPlatform, setBiometricPlatform] = useState({ faceId: false, touchId: false, fingerprint: false });
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  useEffect(() => {
    setBiometricPlatform(detectBiometricPlatform());
    setWebAuthnSupported(typeof window !== 'undefined' && !!window.PublicKeyCredential);
  }, []);

  const setLangAndPersist = useCallback((code) => {
    setLang(code);
    try { localStorage.setItem('nexus:language', code); } catch {}
  }, []);

  const handleField = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/api/auth/login', { identifier: form.identifier, password: form.password });
      if (data.error) { setError(data.error); return; }
      if (data.requiresMFA) {
        setMfaIdentifier(form.identifier);
        setView('mfa-verify');
        return;
      }
      if (data.token) {
        localStorage.setItem('nexus:token', data.token);
        onLogin?.(data.user);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/api/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
        language: lang,
      });
      if (data.error) { setError(data.error); return; }
      if (data.token) {
        localStorage.setItem('nexus:token', data.token);
        setPendingToken(data.token);
        onRegister?.(data.user);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!webAuthnSupported) { setError('Biometric authentication not supported on this device'); return; }
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32).map(() => Math.random() * 256),
          rpId: window.location.hostname,
          allowCredentials: [],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (credential) {
        const data = await apiPost('/api/auth/biometric/verify', {
          credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          userId: localStorage.getItem('nexus:userId') || '',
        });
        if (data.token) {
          localStorage.setItem('nexus:token', data.token);
          onLogin?.(data.user);
        } else {
          setError(data.error || 'Biometric authentication failed');
        }
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') setError('Biometric authentication cancelled');
      else setError('Biometric authentication failed');
    }
  };

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors";
  const btnClass = "w-full py-2.5 px-4 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md">

        {/* Language selector */}
        <div className="flex justify-end mb-4">
          <select
            value={lang}
            onChange={e => setLangAndPersist(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-2xl font-bold">N</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nexus AI Pro</h1>
          </div>

          {/* MFA verify */}
          {view === 'mfa-verify' && (
            <MFAVerifyView
              identifier={mfaIdentifier}
              t={t}
              onComplete={(data) => { onLogin?.(data.user); }}
            />
          )}

          {/* MFA setup */}
          {view === 'mfa-setup' && (
            <MFASetupView
              userId={mfaIdentifier}
              token={pendingToken}
              t={t}
              onComplete={(data) => { onLogin?.(data.user); }}
              onCancel={() => setView('login')}
            />
          )}

          {/* Login */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.login}</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.email} / {t.username}
                </label>
                <input name="identifier" type="text" value={form.identifier} onChange={handleField}
                  placeholder="you@example.com or username🚀" className={inputClass} required autoComplete="username" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.password}</label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={handleField} className={`${inputClass} pr-10`} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input type="checkbox" name="rememberMe" checked={form.rememberMe} onChange={handleField}
                    className="rounded border-gray-300 text-blue-600" />
                  {t.rememberMe}
                </label>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  {t.forgotPassword}
                </button>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={loading} className={`${btnClass} bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white`}>
                {loading ? t.loading : t.signIn}
              </button>

              {/* Biometric options */}
              {webAuthnSupported && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-2">{t.biometric}</p>
                  <div className="flex gap-2 justify-center">
                    {biometricPlatform.faceId && (
                      <button type="button" onClick={handleBiometric}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm transition-colors">
                        🫣 {t.faceId}
                      </button>
                    )}
                    {biometricPlatform.touchId && (
                      <button type="button" onClick={handleBiometric}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm transition-colors">
                        👆 {t.touchId}
                      </button>
                    )}
                    {biometricPlatform.fingerprint && (
                      <button type="button" onClick={handleBiometric}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm transition-colors">
                        🔏 {t.fingerprint}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t.noAccount}{' '}
                <button type="button" onClick={() => setView('register')} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                  {t.signUp}
                </button>
              </p>
            </form>
          )}

          {/* Register */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.register}</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.username}</label>
                <input name="username" type="text" value={form.username} onChange={handleField}
                  placeholder="your_name🚀" className={inputClass} required autoComplete="username" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.usernameNote}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.email}</label>
                <input name="email" type="email" value={form.email} onChange={handleField}
                  placeholder="you@example.com" className={inputClass} required autoComplete="email" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.password}</label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={handleField} className={`${inputClass} pr-10`} required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <PasswordStrengthBar password={form.password} t={t} />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.passwordRules}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.confirmPassword}</label>
                <input name="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword}
                  onChange={handleField} className={inputClass} required autoComplete="new-password" />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={loading} className={`${btnClass} bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white`}>
                {loading ? t.loading : t.signUp}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t.hasAccount}{' '}
                <button type="button" onClick={() => setView('login')} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                  {t.signIn}
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
