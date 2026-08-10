// ================================================
// NEXUS AI PRO - Authentication System
// Registration | Login | MFA | Biometrics | Roles
// Multi-language | 13+ char passwords | Emoji usernames
// 2026-08-10 | Version 2.1.0
// ================================================

import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';

// ── i18n strings (compact inline) ───────────────
const I18N = {
  en: { login: 'Sign In', register: 'Create Account', email: 'Email', password: 'Password', username: 'Username', displayName: 'Display Name', mfa: 'MFA Code', biometric: 'Use Biometric', submit: 'Continue', loading: 'Loading…', error: 'An error occurred', passWeak: 'Password must be ≥13 chars with upper, lower, digit and special character', confirmPass: 'Confirm Password', passMismatch: 'Passwords do not match', forgotPass: 'Forgot password?', orContinueWith: 'Or continue with', lang: 'Language' },
  es: { login: 'Iniciar sesión', register: 'Crear cuenta', email: 'Correo', password: 'Contraseña', username: 'Usuario', displayName: 'Nombre', mfa: 'Código MFA', biometric: 'Biometría', submit: 'Continuar', loading: 'Cargando…', error: 'Error', passWeak: 'La contraseña debe tener ≥13 caracteres con mayúsculas, minúsculas, dígito y carácter especial', confirmPass: 'Confirmar contraseña', passMismatch: 'Las contraseñas no coinciden', forgotPass: '¿Olvidó la contraseña?', orContinueWith: 'O continúe con', lang: 'Idioma' },
  fr: { login: 'Connexion', register: 'Créer un compte', email: 'E-mail', password: 'Mot de passe', username: "Nom d'utilisateur", displayName: 'Prénom', mfa: 'Code MFA', biometric: 'Biométrique', submit: 'Continuer', loading: 'Chargement…', error: 'Erreur', passWeak: 'Le mot de passe doit contenir ≥13 caractères avec maj, min, chiffre et caractère spécial', confirmPass: 'Confirmer le mot de passe', passMismatch: 'Les mots de passe ne correspondent pas', forgotPass: 'Mot de passe oublié?', orContinueWith: 'Ou continuer avec', lang: 'Langue' },
  de: { login: 'Anmelden', register: 'Konto erstellen', email: 'E-Mail', password: 'Passwort', username: 'Benutzername', displayName: 'Anzeigename', mfa: 'MFA-Code', biometric: 'Biometrie', submit: 'Weiter', loading: 'Laden…', error: 'Fehler', passWeak: 'Passwort muss ≥13 Zeichen haben mit Groß-, Kleinbuchstaben, Zahl und Sonderzeichen', confirmPass: 'Passwort bestätigen', passMismatch: 'Passwörter stimmen nicht überein', forgotPass: 'Passwort vergessen?', orContinueWith: 'Oder weiter mit', lang: 'Sprache' },
  ja: { login: 'ログイン', register: 'アカウント作成', email: 'メール', password: 'パスワード', username: 'ユーザー名', displayName: '表示名', mfa: 'MFAコード', biometric: '生体認証', submit: '続ける', loading: '読み込み中…', error: 'エラー', passWeak: 'パスワードは13文字以上、大文字・小文字・数字・特殊文字を含む必要があります', confirmPass: 'パスワード確認', passMismatch: 'パスワードが一致しません', forgotPass: 'パスワードを忘れた?', orContinueWith: 'または続ける', lang: '言語' },
  zh: { login: '登录', register: '创建账户', email: '邮箱', password: '密码', username: '用户名', displayName: '显示名称', mfa: 'MFA代码', biometric: '生物识别', submit: '继续', loading: '加载中…', error: '错误', passWeak: '密码必须≥13个字符，包含大小写字母、数字和特殊字符', confirmPass: '确认密码', passMismatch: '密码不匹配', forgotPass: '忘记密码?', orContinueWith: '或继续', lang: '语言' },
  ko: { login: '로그인', register: '계정 만들기', email: '이메일', password: '비밀번호', username: '사용자명', displayName: '표시 이름', mfa: 'MFA 코드', biometric: '생체인식', submit: '계속', loading: '로딩 중…', error: '오류', passWeak: '비밀번호는 13자 이상이어야 하며 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다', confirmPass: '비밀번호 확인', passMismatch: '비밀번호가 일치하지 않습니다', forgotPass: '비밀번호 찾기', orContinueWith: '또는 계속', lang: '언어' },
  ar: { login: 'تسجيل الدخول', register: 'إنشاء حساب', email: 'البريد الإلكتروني', password: 'كلمة المرور', username: 'اسم المستخدم', displayName: 'الاسم المعروض', mfa: 'رمز MFA', biometric: 'القياس الحيوي', submit: 'متابعة', loading: 'جاري التحميل…', error: 'خطأ', passWeak: 'كلمة المرور يجب أن تكون ≥13 حرف مع أحرف كبيرة وصغيرة وأرقام ورموز خاصة', confirmPass: 'تأكيد كلمة المرور', passMismatch: 'كلمات المرور غير متطابقة', forgotPass: 'نسيت كلمة المرور؟', orContinueWith: 'أو المتابعة مع', lang: 'اللغة' },
  pt: { login: 'Entrar', register: 'Criar conta', email: 'E-mail', password: 'Senha', username: 'Nome de usuário', displayName: 'Nome de exibição', mfa: 'Código MFA', biometric: 'Biométrico', submit: 'Continuar', loading: 'Carregando…', error: 'Erro', passWeak: 'A senha deve ter ≥13 caracteres com maiúsculas, minúsculas, dígito e caractere especial', confirmPass: 'Confirmar senha', passMismatch: 'As senhas não coincidem', forgotPass: 'Esqueceu a senha?', orContinueWith: 'Ou continue com', lang: 'Idioma' },
  ru: { login: 'Войти', register: 'Создать аккаунт', email: 'Эл. почта', password: 'Пароль', username: 'Имя пользователя', displayName: 'Отображаемое имя', mfa: 'Код MFA', biometric: 'Биометрия', submit: 'Продолжить', loading: 'Загрузка…', error: 'Ошибка', passWeak: 'Пароль должен быть ≥13 символов с заглавными, строчными буквами, цифрой и спецсимволом', confirmPass: 'Подтвердить пароль', passMismatch: 'Пароли не совпадают', forgotPass: 'Забыли пароль?', orContinueWith: 'Или продолжить с', lang: 'Язык' }
};

const LANG_LABELS = { en: '🇺🇸 English', es: '🇪🇸 Español', fr: '🇫🇷 Français', de: '🇩🇪 Deutsch', ja: '🇯🇵 日本語', zh: '🇨🇳 中文', ko: '🇰🇷 한국어', ar: '🇸🇦 العربية', pt: '🇧🇷 Português', ru: '🇷🇺 Русский' };

// ── Password strength checker ─────────────────────
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{13,}$/;
function passwordStrength(p) {
  if (!p) return { score: 0, label: '', color: '#374151' };
  let score = 0;
  if (p.length >= 13) score++;
  if (p.length >= 18) score++;
  if (/[a-z]/.test(p)) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^a-zA-Z0-9]/.test(p)) score++;
  if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 4) return { score, label: 'Fair', color: '#f59e0b' };
  if (score === 5) return { score, label: 'Strong', color: '#10b981' };
  return { score, label: 'Very Strong', color: '#06b6d4' };
}

// ── Auth Context ─────────────────────────────────
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from storage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('nexus_user');
      const storedToken = sessionStorage.getItem('nexus_token');
      if (stored && storedToken) { setUser(JSON.parse(stored)); setAccessToken(storedToken); }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const login = useCallback((userData, token, refresh) => {
    setUser(userData);
    setAccessToken(token);
    try {
      sessionStorage.setItem('nexus_user', JSON.stringify(userData));
      sessionStorage.setItem('nexus_token', token);
      if (refresh) sessionStorage.setItem('nexus_refresh', refresh);
    } catch { /* storage not available */ }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = sessionStorage.getItem('nexus_refresh');
      if (refresh) await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: refresh }) });
    } catch { /* ignore */ }
    setUser(null);
    setAccessToken(null);
    try { sessionStorage.clear(); } catch { /* ignore */ }
  }, []);

  const refreshAccess = useCallback(async () => {
    try {
      const refresh = sessionStorage.getItem('nexus_refresh');
      if (!refresh) return false;
      const res = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: refresh }) });
      if (!res.ok) return false;
      const { accessToken: newToken } = await res.json();
      setAccessToken(newToken);
      sessionStorage.setItem('nexus_token', newToken);
      return true;
    } catch { return false; }
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout, refreshAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ── Biometric helper (WebAuthn) ──────────────────
async function performBiometricAuth(userId) {
  if (!window.PublicKeyCredential) return { error: 'WebAuthn not supported in this browser' };
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const cred = await navigator.credentials.get({
      publicKey: { challenge, rpId: window.location.hostname, timeout: 60000, userVerification: 'required' }
    });
    return { credentialId: btoa(String.fromCharCode(...new Uint8Array(cred.rawId))), success: true };
  } catch (e) {
    return { error: e.message };
  }
}

async function registerBiometric(userId, token) {
  if (!window.PublicKeyCredential) return { error: 'WebAuthn not supported' };
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Nexus AI Pro', id: window.location.hostname },
        user: { id: new TextEncoder().encode(userId), name: userId, displayName: 'Nexus User' },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        timeout: 60000,
        userVerification: 'required',
        authenticatorSelection: { userVerification: 'required' }
      }
    });
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
    const res = await fetch('/api/auth/biometric/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ credentialId, publicKey: credentialId, deviceType: 'webauthn' })
    });
    return res.ok ? { success: true } : { error: 'Server registration failed' };
  } catch (e) {
    return { error: e.message };
  }
}

// ── Input field ──────────────────────────────────
function Field({ label, type = 'text', value, onChange, error, hint, rtl }) {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 500 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPass ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          dir={rtl ? 'rtl' : 'ltr'}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15,
            outline: 'none', boxSizing: 'border-box', paddingRight: isPass ? 42 : 14, transition: 'border-color .2s'
          }}
          autoComplete={isPass ? 'current-password' : type === 'email' ? 'email' : 'off'}
        />
        {isPass && (
          <button
            onClick={() => setShow(!show)} type="button"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 16, padding: 0 }}
          >{show ? '🙈' : '👁'}</button>
        )}
      </div>
      {hint && !error && <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{hint}</div>}
      {error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>⚠ {error}</div>}
    </div>
  );
}

// ── Strength meter ───────────────────────────────
function StrengthMeter({ password }) {
  const { score, label, color } = passwordStrength(password);
  const pct = (score / 6) * 100;
  if (!password) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 4 }}>
        <span>Password strength</span><span style={{ color }}>{label}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'all .3s' }} />
      </div>
      {score < 4 && (
        <ul style={{ fontSize: 11, color: '#666', margin: '6px 0 0 16px', padding: 0 }}>
          {!/[A-Z]/.test(password) && <li>Add uppercase letters</li>}
          {!/[a-z]/.test(password) && <li>Add lowercase letters</li>}
          {!/\d/.test(password) && <li>Add numbers</li>}
          {!/[^a-zA-Z0-9]/.test(password) && <li>Add special characters (!@#$…)</li>}
          {password.length < 13 && <li>Use at least 13 characters</li>}
        </ul>
      )}
    </div>
  );
}

// ── Main AuthSystem component ────────────────────
export default function AuthSystem({ onSuccess, defaultLang = 'en' }) {
  const [mode, setMode] = useState('login'); // login | register | mfa
  const [lang, setLang] = useState(defaultLang);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', displayName: '', mfaCode: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [pendingMFA, setPendingMFA] = useState(false);

  const t = I18N[lang] || I18N.en;
  const rtl = lang === 'ar';

  useEffect(() => {
    if (window.PublicKeyCredential) setBiometricSupported(true);
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const setErr = (k, v) => setErrors(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const errs = {};
    if (mode === 'register') {
      if (!form.username.trim()) errs.username = 'Required';
      if (!form.email.includes('@')) errs.email = 'Valid email required';
      if (!PASSWORD_REGEX.test(form.password)) errs.password = t.passWeak;
      if (form.password !== form.confirmPassword) errs.confirmPassword = t.passMismatch;
    } else {
      if (!form.email.includes('@')) errs.email = 'Valid email required';
      if (!form.password) errs.password = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, email: form.email, password: form.password, displayName: form.displayName || form.username, lang })
        });
        const data = await res.json();
        if (!res.ok) { setServerError(data.error || t.error); return; }
        onSuccess?.(data);
      } else {
        const body = { email: form.email, password: form.password };
        if (pendingMFA) body.totpToken = form.mfaCode;
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { setServerError(data.error || t.error); return; }
        if (data.mfaRequired) { setPendingMFA(true); setMode('mfa'); return; }
        onSuccess?.(data);
      }
    } catch (e) {
      setServerError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setLoading(true);
    setServerError('');
    try {
      const result = await performBiometricAuth(form.email);
      if (result.error) { setServerError(result.error); return; }
      // In production: send credential to backend for challenge-response verification
      setServerError('Biometric verification not yet configured on the server');
    } finally {
      setLoading(false);
    }
  };

  const card = {
    position: 'fixed' , inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 9999
  };
  const box = {
    background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
    padding: '32px 36px', width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    fontFamily: 'system-ui,-apple-system,sans-serif', direction: rtl ? 'rtl' : 'ltr'
  };

  return (
    <div style={card}>
      <div style={box}>
        {/* Language picker */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#aaa', padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
          >
            {Object.entries(LANG_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>Nexus AI Pro</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {mode === 'register' ? t.register : mode === 'mfa' ? t.mfa : t.login}
          </p>
        </div>

        {serverError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
            ⚠ {serverError}
          </div>
        )}

        {/* MFA step */}
        {mode === 'mfa' ? (
          <>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
              Enter the 6-digit code from your authenticator app.
            </p>
            <Field label={t.mfa} type="text" value={form.mfaCode} onChange={v => set('mfaCode', v)} error={errors.mfaCode} />
            <button onClick={handleSubmit} disabled={loading} style={btnStyle('#4f46e5')}>
              {loading ? t.loading : t.submit}
            </button>
          </>
        ) : (
          <>
            {/* Register extras */}
            {mode === 'register' && (
              <>
                <Field label={t.username} value={form.username} onChange={v => set('username', v)} error={errors.username} hint="Emojis and special characters welcome 🎉" rtl={rtl} />
                <Field label={t.displayName} value={form.displayName} onChange={v => set('displayName', v)} error={errors.displayName} hint="How you appear to others" rtl={rtl} />
              </>
            )}

            <Field label={t.email} type="email" value={form.email} onChange={v => set('email', v)} error={errors.email} rtl={rtl} />
            <Field label={t.password} type="password" value={form.password} onChange={v => set('password', v)} error={errors.password} rtl={rtl} />

            {mode === 'register' && (
              <>
                <StrengthMeter password={form.password} />
                <Field label={t.confirmPass} type="password" value={form.confirmPassword} onChange={v => set('confirmPassword', v)} error={errors.confirmPassword} rtl={rtl} />
              </>
            )}

            <button onClick={handleSubmit} disabled={loading} style={btnStyle('#4f46e5')}>
              {loading ? t.loading : mode === 'register' ? t.register : t.login}
            </button>

            {/* Biometric */}
            {biometricSupported && mode === 'login' && (
              <>
                <div style={{ textAlign: 'center', color: '#444', fontSize: 12, margin: '12px 0' }}>{t.orContinueWith}</div>
                <button onClick={handleBiometric} disabled={loading} style={btnStyle('#1e293b', { border: '1px solid rgba(255,255,255,0.1)' })}>
                  🔑 {t.biometric} (Touch ID / Face ID)
                </button>
              </>
            )}

            {mode === 'login' && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <a href="#" style={{ color: '#555', fontSize: 12 }} onClick={e => e.preventDefault()}>{t.forgotPass}</a>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}); setServerError(''); }}
                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                {mode === 'login' ? t.register : t.login}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg, extra = {}) {
  return {
    width: '100%', padding: '11px', borderRadius: 10, border: 'none',
    background: bg, color: '#fff', fontWeight: 600, fontSize: 15,
    cursor: 'pointer', marginBottom: 8, transition: 'opacity .2s',
    ...extra
  };
}

// ── Role guard HOC ───────────────────────────────
export function withRole(WrappedComponent, requiredRole) {
  const ROLE_LEVELS = { admin: 4, dev: 3, moderator: 2, user: 1 };
  return function RoleGuard(props) {
    const { user } = useAuth() || {};
    if (!user) return <div style={{ color: '#ef4444', padding: 20 }}>Authentication required</div>;
    if (ROLE_LEVELS[user.role] < ROLE_LEVELS[requiredRole]) {
      return <div style={{ color: '#ef4444', padding: 20 }}>Access denied: {requiredRole} role required</div>;
    }
    return <WrappedComponent {...props} user={user} />;
  };
}

// ── MFA Setup component (for account settings) ───
export function MFASetup({ authToken, onComplete }) {
  const [step, setStep] = useState('idle');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setStep('scan');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verifyCode = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', { method: 'POST', headers, body: JSON.stringify({ token: code }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setStep('done');
      onComplete?.();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 20, color: '#e2e8f0', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <h3 style={{ marginTop: 0, color: '#a78bfa' }}>🔐 Two-Factor Authentication Setup</h3>
      {error && <div style={{ color: '#f87171', marginBottom: 12, fontSize: 13 }}>⚠ {error}</div>}
      {step === 'idle' && (
        <div>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Secure your account with an authenticator app (Google Authenticator, Authy, 1Password, etc.)</p>
          <button onClick={startSetup} disabled={loading} style={btnStyle('#4f46e5', { maxWidth: 200 })}>
            {loading ? 'Setting up…' : 'Enable 2FA'}
          </button>
        </div>
      )}
      {step === 'scan' && (
        <div>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Scan the QR code with your authenticator app or enter the secret manually:</p>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8, display: 'inline-block', marginBottom: 12 }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`} alt="QR Code" style={{ display: 'block' }} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#94a3b8', marginBottom: 16, wordBreak: 'break-all' }}>
            Secret: <strong style={{ color: '#e2e8f0' }}>{secret}</strong>
          </div>
          <Field label="Enter the 6-digit code from your app" value={code} onChange={setCode} />
          <button onClick={verifyCode} disabled={loading || code.length !== 6} style={btnStyle('#4f46e5', { maxWidth: 200 })}>
            {loading ? 'Verifying…' : 'Verify & Enable'}
          </button>
        </div>
      )}
      {step === 'done' && (
        <div style={{ color: '#4ade80', fontSize: 16 }}>✅ Two-factor authentication enabled successfully!</div>
      )}
    </div>
  );
}
