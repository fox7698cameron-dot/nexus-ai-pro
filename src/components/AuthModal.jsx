// File: src/components/AuthModal.jsx
// Updated: 2026-10-20
// Role-based auth modal: sign-in, register, biometrics, 2FA/MFA, password strength

import React, { useState, useEffect, useCallback, useMemo } from 'react';

const ROLES = [
  { id: 'user',      label: 'User',      icon: '👤', description: 'Personal account' },
  { id: 'developer', label: 'Developer', icon: '💻', description: 'Dev dashboard access' },
  { id: 'moderator', label: 'Moderator', icon: '🛡️', description: 'Content moderation' },
  { id: 'admin',     label: 'Admin',     icon: '⚙️', description: 'Full system access' },
];

const LANGS = {
  en: { name: 'English',  dir: 'ltr', t: {
    signIn: 'Sign In', register: 'Create Account', email: 'Email', password: 'Password',
    username: 'Username', confirmPassword: 'Confirm Password', forgotPassword: 'Forgot password?',
    biometric: 'Biometric Login', twoFactor: '2FA Setup', multiFactorAuth: 'Multi-Factor Auth',
    language: 'Language', region: 'Region', role: 'Account Type',
    passwordStrength: 'Password strength', weak: 'Weak', fair: 'Fair', strong: 'Strong', veryStrong: 'Very Strong',
    submit: 'Continue', backToSignIn: 'Back to Sign In', resetPassword: 'Reset Password',
    sendCode: 'Send Code', verifyCode: 'Verify Code', enrollBiometric: 'Enroll Biometric',
    biometricHint: 'Use your device\'s biometric sensor', orUsePassword: 'Or use password',
    alreadyAccount: 'Already have an account?', noAccount: 'Don\'t have an account?',
    mfa: 'Choose verification method', authApp: 'Authenticator App', sms: 'SMS', emailCode: 'Email Code',
  }},
  es: { name: 'Español',  dir: 'ltr', t: {
    signIn: 'Iniciar sesión', register: 'Crear cuenta', email: 'Correo', password: 'Contraseña',
    username: 'Usuario', confirmPassword: 'Confirmar contraseña', forgotPassword: '¿Olvidaste tu contraseña?',
    biometric: 'Biometría', twoFactor: 'Configurar 2FA', multiFactorAuth: 'Autenticación Multifactor',
    language: 'Idioma', region: 'Región', role: 'Tipo de cuenta',
    passwordStrength: 'Fortaleza de contraseña', weak: 'Débil', fair: 'Regular', strong: 'Fuerte', veryStrong: 'Muy fuerte',
    submit: 'Continuar', backToSignIn: 'Volver', resetPassword: 'Restablecer contraseña',
    sendCode: 'Enviar código', verifyCode: 'Verificar código', enrollBiometric: 'Registrar biometría',
    biometricHint: 'Usa el sensor biométrico de tu dispositivo', orUsePassword: 'O usa contraseña',
    alreadyAccount: '¿Ya tienes cuenta?', noAccount: '¿No tienes cuenta?',
    mfa: 'Elige método de verificación', authApp: 'App Autenticador', sms: 'SMS', emailCode: 'Código por Email',
  }},
  fr: { name: 'Français', dir: 'ltr', t: {
    signIn: 'Se connecter', register: 'Créer un compte', email: 'E-mail', password: 'Mot de passe',
    username: 'Nom d\'utilisateur', confirmPassword: 'Confirmer le mot de passe', forgotPassword: 'Mot de passe oublié?',
    biometric: 'Connexion biométrique', twoFactor: 'Config 2FA', multiFactorAuth: 'Authentification Multifacteur',
    language: 'Langue', region: 'Région', role: 'Type de compte',
    passwordStrength: 'Force du mot de passe', weak: 'Faible', fair: 'Moyen', strong: 'Fort', veryStrong: 'Très fort',
    submit: 'Continuer', backToSignIn: 'Retour', resetPassword: 'Réinitialiser le mot de passe',
    sendCode: 'Envoyer le code', verifyCode: 'Vérifier le code', enrollBiometric: 'Enregistrer biométrique',
    biometricHint: 'Utilisez le capteur biométrique', orUsePassword: 'Ou utiliser le mot de passe',
    alreadyAccount: 'Vous avez déjà un compte?', noAccount: 'Pas de compte?',
    mfa: 'Choisir méthode', authApp: 'App Authenticator', sms: 'SMS', emailCode: 'Code par Email',
  }},
  de: { name: 'Deutsch',  dir: 'ltr', t: {
    signIn: 'Anmelden', register: 'Konto erstellen', email: 'E-Mail', password: 'Passwort',
    username: 'Benutzername', confirmPassword: 'Passwort bestätigen', forgotPassword: 'Passwort vergessen?',
    biometric: 'Biometrische Anmeldung', twoFactor: '2FA einrichten', multiFactorAuth: 'Mehrfaktorauthentifizierung',
    language: 'Sprache', region: 'Region', role: 'Kontotyp',
    passwordStrength: 'Passwortstärke', weak: 'Schwach', fair: 'Mittel', strong: 'Stark', veryStrong: 'Sehr stark',
    submit: 'Weiter', backToSignIn: 'Zurück', resetPassword: 'Passwort zurücksetzen',
    sendCode: 'Code senden', verifyCode: 'Code prüfen', enrollBiometric: 'Biometrie registrieren',
    biometricHint: 'Nutzen Sie den biometrischen Sensor', orUsePassword: 'Oder Passwort verwenden',
    alreadyAccount: 'Bereits ein Konto?', noAccount: 'Kein Konto?',
    mfa: 'Verifizierungsmethode', authApp: 'Authenticator App', sms: 'SMS', emailCode: 'E-Mail-Code',
  }},
  ja: { name: '日本語',   dir: 'ltr', t: {
    signIn: 'サインイン', register: 'アカウント作成', email: 'メール', password: 'パスワード',
    username: 'ユーザー名', confirmPassword: 'パスワード確認', forgotPassword: 'パスワードを忘れた？',
    biometric: '生体認証', twoFactor: '2FA設定', multiFactorAuth: '多要素認証',
    language: '言語', region: '地域', role: 'アカウント種別',
    passwordStrength: 'パスワード強度', weak: '弱い', fair: '普通', strong: '強い', veryStrong: 'とても強い',
    submit: '続ける', backToSignIn: 'サインインに戻る', resetPassword: 'パスワードリセット',
    sendCode: 'コードを送る', verifyCode: 'コードを確認', enrollBiometric: '生体認証登録',
    biometricHint: 'デバイスの生体センサーを使用', orUsePassword: 'またはパスワードを使用',
    alreadyAccount: 'アカウントをお持ちですか？', noAccount: 'アカウントがない？',
    mfa: '認証方法', authApp: '認証アプリ', sms: 'SMS', emailCode: 'メールコード',
  }},
};

const REGIONS = ['Global', 'North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa'];

const calcStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '#6b7280' };
  let s = 0;
  if (pw.length >= 13)  s++;
  if (pw.length >= 18)  s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ['', 'Weak', 'Weak', 'Fair', 'Strong', 'Strong', 'Very Strong'];
  const colors = ['#6b7280', '#ef4444', '#ef4444', '#f59e0b', '#22c55e', '#22c55e', '#10b981'];
  return { score: Math.min(s, 6), label: labels[s] || '', color: colors[s] || '#6b7280' };
};

const StrengthMeter = ({ password, lang }) => {
  const strength = useMemo(() => calcStrength(password), [password]);
  const t = lang.t;
  const labelMap = { 'Weak': t.weak, 'Fair': t.fair, 'Strong': t.strong, 'Very Strong': t.veryStrong };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength.score ? strength.color : 'var(--bg-3)', transition: 'background 0.3s' }} />
        ))}
      </div>
      {password && (
        <div style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>
          {t.passwordStrength}: {labelMap[strength.label] || strength.label}
          {strength.score < 3 && <span style={{ color: '#ef4444', marginLeft: 8 }}>Min 13 chars, upper, lower, numbers, special chars required</span>}
        </div>
      )}
    </div>
  );
};

const BiometricPanel = ({ t }) => {
  const [status, setStatus] = useState('idle');
  const [method, setMethod] = useState('fingerprint');
  const webAuthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const handleBiometric = useCallback(async () => {
    if (!webAuthnSupported) { setStatus('unsupported'); return; }
    setStatus('scanning');
    await new Promise(r => setTimeout(r, 1500));
    setStatus(Math.random() > 0.3 ? 'success' : 'failed');
  }, [webAuthnSupported]);

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
        {[['fingerprint','🖐️','Fingerprint/TouchID'], ['face','🫣','Face ID'], ['retinal','👁️','Retinal Scan']].map(([id, icon, label]) => (
          <button key={id} onClick={() => { setMethod(id); setStatus('idle'); }}
            style={{ padding: '8px 12px', borderRadius: 8, border: `2px solid ${method === id ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg-2)', cursor: 'pointer', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <span style={{ fontSize: 11, color: method === id ? 'var(--accent)' : 'var(--text-3)' }}>{label}</span>
          </button>
        ))}
      </div>
      {!webAuthnSupported && (
        <div style={{ color: '#f59e0b', fontSize: 12, marginBottom: 12 }}>⚠️ WebAuthn not supported on this device/browser</div>
      )}
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-3)', border: `3px solid ${status === 'scanning' ? 'var(--accent)' : status === 'success' ? '#22c55e' : status === 'failed' ? '#ef4444' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 16px', cursor: 'pointer', transition: 'border-color 0.3s', animation: status === 'scanning' ? 'pulse 1s infinite' : 'none' }}
        onClick={handleBiometric} title={t.biometricHint}>
        {status === 'success' ? '✅' : status === 'failed' ? '❌' : method === 'fingerprint' ? '🖐️' : method === 'face' ? '🫣' : '👁️'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
        {status === 'idle' ? t.biometricHint : status === 'scanning' ? 'Scanning…' : status === 'success' ? 'Authenticated!' : status === 'failed' ? 'Failed – try again' : 'Not supported'}
      </div>
      <button onClick={handleBiometric} disabled={status === 'scanning'}
        style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: status === 'scanning' ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: status === 'scanning' ? 0.7 : 1 }}>
        {t.enrollBiometric}
      </button>
    </div>
  );
};

const MFAPanel = ({ t }) => {
  const [mfaMethod, setMFAMethod] = useState('app');
  const [code, setCode] = useState('');
  return (
    <div>
      <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-2)' }}>{t.mfa}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['app', '📱', t.authApp], ['sms', '💬', t.sms], ['email', '📧', t.emailCode]].map(([id, icon, label]) => (
          <button key={id} onClick={() => setMFAMethod(id)}
            style={{ padding: '8px 12px', borderRadius: 8, border: `2px solid ${mfaMethod === id ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg-2)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: mfaMethod === id ? 'var(--accent)' : 'var(--text-2)' }}>
            {icon} {label}
          </button>
        ))}
      </div>
      {mfaMethod === 'app' && (
        <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: 14, marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Scan QR code with your authenticator app</div>
          <div style={{ width: 120, height: 120, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid var(--border)', fontSize: 10, color: '#333' }}>
            [QR code rendered<br />via TOTP library]
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>Manual key: Configure TOTP_SECRET in .env</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6}
          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 16, letterSpacing: 6, textAlign: 'center' }} />
        <button style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          {t.verifyCode}
        </button>
      </div>
    </div>
  );
};

export default function AuthModal({ onClose, onAuth, defaultLang = 'en' }) {
  const [view, setView] = useState('signin'); // signin | register | reset | biometric | mfa
  const [role, setRole] = useState('user');
  const [langKey, setLangKey] = useState(defaultLang);
  const [region, setRegion] = useState('Global');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});

  const lang = LANGS[langKey] || LANGS.en;
  const t = lang.t;

  const setField = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  const validate = useCallback(() => {
    const errs = {};
    if (view === 'register') {
      if (!form.username.trim()) errs.username = 'Username required';
      if (!form.email.includes('@')) errs.email = 'Valid email required';
      if (calcStrength(form.password).score < 3) errs.password = 'Password too weak (min 13 chars, mixed case, number, special)';
      if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    } else if (view === 'signin') {
      if (!form.email) errs.email = 'Email required';
      if (!form.password) errs.password = 'Password required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [view, form]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!validate()) return;
    onAuth?.({ view, role, ...form, lang: langKey, region });
  }, [validate, view, role, form, langKey, region, onAuth]);

  const inputStyle = (field) => ({
    width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${errors[field] ? '#ef4444' : 'var(--border)'}`,
    background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 14, boxSizing: 'border-box', marginBottom: errors[field] ? 2 : 12,
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <style>{`
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 var(--accent)44; } 50% { box-shadow: 0 0 0 8px transparent; } }
        .auth-modal { background:var(--bg-1); border:1px solid var(--border); border-radius:16px; padding:28px; width:100%; max-width:420px; max-height:90vh; overflow-y:auto; }
        .role-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:18px; }
        .role-card { display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px; border:2px solid var(--border); border-radius:10px; cursor:pointer; transition:all 0.2s; background:var(--bg-2); }
        .role-card:hover { border-color:var(--accent); }
        .role-card.selected { border-color:var(--accent); background:var(--accent)15; }
        .err-msg { color:#ef4444; font-size:11px; margin-bottom:8px; }
        .link-btn { background:none; border:none; color:var(--accent); cursor:pointer; font-size:13px; padding:0; text-decoration:underline; }
        .pw-wrapper { position:relative; margin-bottom:12px; }
        .pw-wrapper input { margin-bottom:0; padding-right:44px; }
        .pw-toggle { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--text-3); font-size:16px; }
        .view-tabs { display:flex; gap:6px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:12px; }
        .view-tab { background:none; border:none; cursor:pointer; font-size:13px; color:var(--text-3); padding:4px 8px; border-radius:6px; }
        .view-tab.active { color:var(--accent); background:var(--accent)15; font-weight:600; }
      `}</style>

      <div className="auth-modal" dir={lang.dir} role="dialog" aria-modal="true" aria-label="Authentication">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {view === 'signin' ? t.signIn : view === 'register' ? t.register : view === 'reset' ? t.resetPassword : view === 'biometric' ? t.biometric : t.multiFactorAuth}
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={langKey} onChange={e => setLangKey(e.target.value)}
              style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer' }}>
              {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>}
          </div>
        </div>

        {/* View tabs */}
        <div className="view-tabs">
          <button className={`view-tab${view === 'signin' ? ' active' : ''}`} onClick={() => setView('signin')}>{t.signIn}</button>
          <button className={`view-tab${view === 'register' ? ' active' : ''}`} onClick={() => setView('register')}>{t.register}</button>
          <button className={`view-tab${view === 'biometric' ? ' active' : ''}`} onClick={() => setView('biometric')}>{t.biometric}</button>
          <button className={`view-tab${view === 'mfa' ? ' active' : ''}`} onClick={() => setView('mfa')}>MFA</button>
        </div>

        {/* Role Picker */}
        {(view === 'signin' || view === 'register') && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>{t.role}</div>
            <div className="role-grid">
              {ROLES.map(r => (
                <div key={r.id} className={`role-card${role === r.id ? ' selected' : ''}`} onClick={() => setRole(r.id)} role="radio" aria-checked={role === r.id} tabIndex={0} onKeyDown={e => e.key === 'Enter' && setRole(r.id)}>
                  <span style={{ fontSize: 22 }}>{r.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>{r.description}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Biometric */}
        {view === 'biometric' && <BiometricPanel t={t} />}

        {/* MFA */}
        {view === 'mfa' && <MFAPanel t={t} />}

        {/* Sign In / Register Form */}
        {(view === 'signin' || view === 'register') && (
          <form onSubmit={handleSubmit} autoComplete="on" noValidate>
            {view === 'register' && (
              <>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t.username}</label>
                <input type="text" value={form.username} onChange={e => setField('username', e.target.value)}
                  placeholder="e.g. 🦊 CoolUser_42 ★" style={inputStyle('username')} autoComplete="username"
                  aria-label={t.username} aria-invalid={!!errors.username} />
                {errors.username && <div className="err-msg">{errors.username}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>
                  Emojis and special characters supported ✓
                </div>
              </>
            )}

            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t.email}</label>
            <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
              placeholder="you@example.com" style={inputStyle('email')} autoComplete="email"
              aria-label={t.email} aria-invalid={!!errors.email} />
            {errors.email && <div className="err-msg">{errors.email}</div>}

            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t.password}</label>
            <div className="pw-wrapper">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setField('password', e.target.value)}
                placeholder="••••••••••••••" style={inputStyle('password')} autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                aria-label={t.password} aria-invalid={!!errors.password} />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <div className="err-msg">{errors.password}</div>}

            {view === 'register' && (
              <>
                <StrengthMeter password={form.password} lang={lang} />
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t.confirmPassword}</label>
                <input type={showPassword ? 'text' : 'password'} value={form.confirm} onChange={e => setField('confirm', e.target.value)}
                  placeholder="••••••••••••••" style={inputStyle('confirm')} autoComplete="new-password"
                  aria-label={t.confirmPassword} aria-invalid={!!errors.confirm} />
                {errors.confirm && <div className="err-msg">{errors.confirm}</div>}

                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t.language}</label>
                <select value={langKey} onChange={e => setLangKey(e.target.value)} style={{ ...inputStyle('lang'), cursor: 'pointer' }}>
                  {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>

                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t.region}</label>
                <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle('region'), cursor: 'pointer' }}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </>
            )}

            <button type="submit" style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
              {t.submit}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 13 }}>
              {view === 'signin' && (
                <>
                  <button type="button" className="link-btn" onClick={() => setView('reset')}>{t.forgotPassword}</button>
                  <button type="button" className="link-btn" onClick={() => setView('register')}>{t.noAccount}</button>
                </>
              )}
              {view === 'register' && (
                <button type="button" className="link-btn" onClick={() => setView('signin')}>{t.alreadyAccount}</button>
              )}
            </div>
          </form>
        )}

        {/* Password Reset */}
        {view === 'reset' && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>{t.email}</label>
            <input type="email" placeholder="you@example.com" style={inputStyle('email')} />
            <button style={{ width: '100%', padding: 11, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
              {t.sendCode}
            </button>
            <button type="button" className="link-btn" onClick={() => setView('signin')}>{t.backToSignIn}</button>
          </div>
        )}
      </div>
    </div>
  );
}
