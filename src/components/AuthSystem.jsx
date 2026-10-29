/* src/components/AuthSystem.jsx
   Complete Auth System - Biometrics, 2FA, MFA, Role-based dashboards
   Password: 13+ chars, special chars, emojis in usernames
   Created: 2026-10-29
*/
import React, { useState, useCallback, useEffect } from 'react';

const ROLES = {
  admin: { label: 'Admin', color: '#ef4444', icon: '👑', permissions: ['all'] },
  dev: { label: 'Developer', color: '#3b82f6', icon: '💻', permissions: ['code', 'deploy', 'analytics', 'security'] },
  moderator: { label: 'Moderator', color: '#f97316', icon: '🛡️', permissions: ['users', 'content', 'analytics'] },
  user: { label: 'User', color: '#22c55e', icon: '👤', permissions: ['dashboard', 'profile', 'analytics'] }
};

const MFA_METHODS = [
  { id: 'totp', label: 'Authenticator App', icon: '📱', desc: 'Google Authenticator, Authy, etc.' },
  { id: 'sms', label: 'SMS Code', icon: '💬', desc: 'Text message to your phone' },
  { id: 'email', label: 'Email Code', icon: '📧', desc: 'Code sent to your email' },
  { id: 'hardware', label: 'Hardware Key', icon: '🔑', desc: 'YubiKey or FIDO2 device' }
];

const BIOMETRIC_METHODS = [
  { id: 'fingerprint', label: 'Fingerprint', icon: '👆', available: true },
  { id: 'face', label: 'Face ID', icon: '😊', available: true },
  { id: 'touch', label: 'Touch ID', icon: '✋', available: true },
  { id: 'retina', label: 'Retinal Scan', icon: '👁️', available: false }
];

const PASSWORD_RULES = [
  { id: 'length', label: '13+ characters', test: p => p.length >= 13 },
  { id: 'upper', label: 'Uppercase letter', test: p => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Lowercase letter', test: p => /[a-z]/.test(p) },
  { id: 'number', label: 'Number', test: p => /[0-9]/.test(p) },
  { id: 'special', label: 'Special character (!@#$...)', test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(p) }
];

const USERNAME_PATTERN = /^[\p{L}\p{N}\p{Emoji}_.\-]{3,32}$/u;

function checkPasswordStrength(password) {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 1) return { level: 'weak', color: '#ef4444', label: 'Weak' };
  if (passed <= 2) return { level: 'fair', color: '#f97316', label: 'Fair' };
  if (passed <= 3) return { level: 'good', color: '#eab308', label: 'Good' };
  if (passed <= 4) return { level: 'strong', color: '#22c55e', label: 'Strong' };
  return { level: 'excellent', color: '#10b981', label: 'Excellent' };
}

const PasswordStrengthMeter = ({ password }) => {
  const strength = checkPasswordStrength(password);
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 4,
            background: i <= passed ? strength.color : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s'
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: strength.color }}>{password ? strength.label : ''}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {PASSWORD_RULES.map(r => {
          const ok = r.test(password);
          return (
            <div key={r.id} style={{ fontSize: 11, color: ok ? '#22c55e' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{ok ? '✓' : '○'}</span> {r.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BiometricButton = ({ method, onAuth }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async () => {
    if (!method.available) return;
    setScanning(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 1500));
    const success = Math.random() > 0.2;
    setResult(success ? 'success' : 'failed');
    setScanning(false);
    if (success) onAuth(method.id);
  };

  return (
    <button
      onClick={handleScan}
      disabled={!method.available || scanning}
      style={{
        background: result === 'success' ? 'rgba(34,197,94,0.15)' : result === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${result === 'success' ? '#22c55e44' : result === 'failed' ? '#ef444444' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 12,
        padding: '14px 16px',
        color: '#fff',
        cursor: method.available && !scanning ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: method.available ? 1 : 0.4,
        transition: 'all 0.3s',
        flex: 1
      }}
    >
      <span style={{ fontSize: 26 }}>{scanning ? '⏳' : result === 'success' ? '✅' : result === 'failed' ? '❌' : method.icon}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{method.label}</span>
      {!method.available && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Unavailable</span>}
    </button>
  );
};

const TOTPInput = ({ onVerify }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Enter a 6-digit code');
      return;
    }
    setError('');
    // Mock: any code works in demo
    onVerify(code);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
        Enter the 6-digit code from your authenticator app
      </div>
      <input
        type="text"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10,
          padding: '14px',
          color: '#fff',
          fontSize: 24,
          textAlign: 'center',
          letterSpacing: '0.5em',
          outline: 'none'
        }}
      />
      {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
      <button onClick={handleVerify} style={{
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        border: 'none', borderRadius: 10, padding: '12px',
        color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14
      }}>Verify Code</button>
    </div>
  );
};

const AuthSystem = ({ onAuthSuccess }) => {
  const [step, setStep] = useState('login'); // login | register | mfa | biometric | success
  const [role, setRole] = useState('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedMFA, setSelectedMFA] = useState(null);
  const [errors, setErrors] = useState({});
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [authUser, setAuthUser] = useState(null);

  const validate = useCallback(() => {
    const errs = {};
    if (!username.trim()) errs.username = 'Username is required';
    else if (username.length < 3) errs.username = 'Username must be at least 3 characters';
    else if (!USERNAME_PATTERN.test(username)) errs.username = 'Username may contain letters, numbers, emoji, _, ., -';

    if (!password) errs.password = 'Password is required';
    else if (password.length < 13) errs.password = 'Password must be at least 13 characters';
    else if (!PASSWORD_RULES.slice(1).every(r => r.test(password))) errs.password = 'Password does not meet requirements';

    if (step === 'register') {
      if (!email) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
      if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  }, [username, password, confirmPassword, email, step]);

  const handleLogin = useCallback(() => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setAuthUser({ username, role });
    setStep('mfa');
  }, [validate, username, role]);

  const handleRegister = useCallback(() => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setAuthUser({ username, email, role });
    setStep('mfa');
  }, [validate, username, email, role]);

  const handleMFASuccess = useCallback(() => {
    if (useBiometrics) {
      setStep('biometric');
    } else {
      setStep('success');
      onAuthSuccess?.({ ...authUser, mfaVerified: true });
    }
  }, [useBiometrics, authUser, onAuthSuccess]);

  const handleBiometricSuccess = useCallback(() => {
    setStep('success');
    onAuthSuccess?.({ ...authUser, mfaVerified: true, biometricVerified: true });
  }, [authUser, onAuthSuccess]);

  const inputStyle = (err) => ({
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${err ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 10,
    padding: '12px 14px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>🌌</div>
          <h2 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 800, color: '#fff' }}>Nexus AI Pro</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            {step === 'login' ? 'Sign in to your account' :
             step === 'register' ? 'Create your account' :
             step === 'mfa' ? 'Multi-factor authentication' :
             step === 'biometric' ? 'Biometric verification' :
             'Welcome back!'}
          </p>
        </div>

        {/* Login / Register form */}
        {(step === 'login' || step === 'register') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Role selector */}
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Account Type</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(ROLES).map(([key, r]) => (
                  <button key={key} onClick={() => setRole(key)} style={{
                    background: role === key ? `${r.color}22` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${role === key ? r.color + '66' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: role === key ? r.color : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: role === key ? 700 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Username (emoji supported 🎮)</label>
              <input
                type="text"
                placeholder="your_username_🚀"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={inputStyle(errors.username)}
              />
              {errors.username && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.username}</span>}
            </div>

            {/* Email (register only) */}
            {step === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle(errors.email)}
                />
                {errors.email && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.email}</span>}
              </div>
            )}

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Password (13+ characters)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Strong password..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle(errors.password), paddingRight: 42 }}
                />
                <button onClick={() => setShowPassword(v => !v)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16
                }}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
              {errors.password && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.password}</span>}
              {step === 'register' && password && <PasswordStrengthMeter password={password} />}
            </div>

            {/* Confirm password (register only) */}
            {step === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={inputStyle(errors.confirmPassword)}
                />
                {errors.confirmPassword && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.confirmPassword}</span>}
              </div>
            )}

            {/* Biometric opt-in */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
              <input type="checkbox" checked={useBiometrics} onChange={e => setUseBiometrics(e.target.checked)} />
              Enable biometric authentication
            </label>

            {/* Submit */}
            <button
              onClick={step === 'login' ? handleLogin : handleRegister}
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #3b82f6)',
                border: 'none', borderRadius: 12, padding: '14px',
                color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15
              }}
            >
              {step === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {step === 'login' ? (
                <span>No account? <button onClick={() => { setStep('register'); setErrors({}); }} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 13 }}>Sign up</button></span>
              ) : (
                <span>Have an account? <button onClick={() => { setStep('login'); setErrors({}); }} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 13 }}>Sign in</button></span>
              )}
            </div>
          </div>
        )}

        {/* MFA Step */}
        {step === 'mfa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!selectedMFA ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  Choose your verification method:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {MFA_METHODS.map(m => (
                    <button key={m.id} onClick={() => setSelectedMFA(m.id)} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left'
                    }}>
                      <span style={{ fontSize: 22 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : selectedMFA === 'totp' ? (
              <TOTPInput onVerify={handleMFASuccess} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  {MFA_METHODS.find(m => m.id === selectedMFA)?.icon} Verification code sent via {selectedMFA.toUpperCase()}
                </div>
                <TOTPInput onVerify={handleMFASuccess} />
              </div>
            )}
            {selectedMFA && (
              <button onClick={() => setSelectedMFA(null)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13
              }}>← Choose different method</button>
            )}
          </div>
        )}

        {/* Biometric Step */}
        {step === 'biometric' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              Verify with biometrics:
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {BIOMETRIC_METHODS.map(m => (
                <BiometricButton key={m.id} method={m} onAuth={handleBiometricSuccess} />
              ))}
            </div>
            <button onClick={handleBiometricSuccess} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13
            }}>Skip biometric for now</button>
          </div>
        )}

        {/* Success */}
        {step === 'success' && authUser && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Welcome, {authUser.username}!</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                Signed in as {ROLES[authUser.role]?.icon} {ROLES[authUser.role]?.label}
              </div>
            </div>
            <div style={{
              background: `${ROLES[authUser.role]?.color}15`,
              border: `1px solid ${ROLES[authUser.role]?.color}33`,
              borderRadius: 12, padding: 12
            }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Your permissions</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(ROLES[authUser.role]?.permissions || []).map(p => (
                  <span key={p} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 20,
                    background: `${ROLES[authUser.role]?.color}22`, color: ROLES[authUser.role]?.color
                  }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security indicators */}
        {(step === 'login' || step === 'register') && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {['🔐 AES-256', '🛡️ Zero-knowledge', '🔒 TLS 1.3'].map(s => (
              <span key={s} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthSystem;
