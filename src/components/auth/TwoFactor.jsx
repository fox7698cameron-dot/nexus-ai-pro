// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Smartphone, Mail, Fingerprint, Shield } from 'lucide-react';

const DIGIT_COUNT = 6;

function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  const digits = value.split('').concat(Array(DIGIT_COUNT).fill('')).slice(0, DIGIT_COUNT);

  const handleChange = (i, e) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = ch;
    onChange(next.join(''));
    if (ch && i < DIGIT_COUNT - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      const next = [...digits];
      next[i - 1] = '';
      onChange(next.join(''));
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    if (pasted.length > 0) {
      onChange(pasted.padEnd(DIGIT_COUNT, '').slice(0, DIGIT_COUNT));
      inputs.current[Math.min(pasted.length, DIGIT_COUNT - 1)]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-10 h-12 text-center text-xl font-bold bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
        />
      ))}
    </div>
  );
}

function TotpSection({ email, onSuccess, setupMode }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);

  useEffect(() => {
    if (setupMode) fetchQr();
  }, [setupMode]);

  const fetchQr = async () => {
    try {
      const resp = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setQr(data.qrCode);
        setBackupCodes(data.backupCodes || []);
      }
    } catch { /* silently skip */ }
  };

  const handleVerify = async () => {
    if (code.length !== DIGIT_COUNT) return;
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Invalid code'); return; }
      onSuccess(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === DIGIT_COUNT) handleVerify();
  }, [code]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-purple-400">
        <Smartphone size={20} />
        <span className="font-semibold text-white">Authenticator App</span>
      </div>
      {setupMode && qr && (
        <div className="flex flex-col items-center gap-3 p-4 bg-gray-800 rounded-xl">
          <p className="text-sm text-gray-400 text-center">Scan this QR code with your authenticator app</p>
          <img src={qr} alt="TOTP QR Code" className="w-40 h-40 bg-white p-2 rounded-lg" />
          {backupCodes.length > 0 && (
            <div className="w-full mt-2">
              <p className="text-xs text-yellow-400 font-semibold mb-1">Backup codes — save these now:</p>
              <div className="grid grid-cols-2 gap-1">
                {backupCodes.map((bc, i) => (
                  <code key={i} className="text-xs bg-gray-700 rounded px-2 py-1 text-gray-200 font-mono">{bc}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-gray-400 text-center">
        {setupMode ? 'Then enter the 6-digit code from your app' : 'Enter the 6-digit code from your authenticator app'}
      </p>
      <OtpInput value={code} onChange={setCode} disabled={loading} />
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <button
        onClick={handleVerify}
        disabled={loading || code.length !== DIGIT_COUNT}
        className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        {loading ? 'Verifying…' : 'Verify'}
      </button>
    </div>
  );
}

function EmailOtpSection({ email, onSuccess }) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/mfa/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Failed to send code'); return; }
      setSent(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== DIGIT_COUNT) return;
    setError('');
    setVerifying(true);
    try {
      const resp = await fetch('/api/auth/mfa/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || 'Invalid code'); return; }
      onSuccess(data);
    } catch {
      setError('Network error');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (code.length === DIGIT_COUNT) verifyCode();
  }, [code]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Mail size={20} className="text-purple-400" />
        <span className="font-semibold text-white">Email OTP</span>
      </div>
      {!sent ? (
        <>
          <p className="text-sm text-gray-400">We'll send a 6-digit code to <strong className="text-white">{email}</strong></p>
          <button
            onClick={sendCode}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {loading ? 'Sending…' : 'Send Code to Email'}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-400 text-center">Enter the code sent to <strong className="text-white">{email}</strong></p>
          <OtpInput value={code} onChange={setCode} disabled={verifying} />
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <button
            onClick={verifyCode}
            disabled={verifying || code.length !== DIGIT_COUNT}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {verifying ? 'Verifying…' : 'Verify Code'}
          </button>
          <button onClick={() => { setSent(false); setCode(''); }} className="text-sm text-gray-500 hover:text-gray-300 text-center">
            Resend code
          </button>
        </>
      )}
      {error && !sent && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}

function BiometricSection({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const platform = detectPlatform();

  const handleWebAuthn = async () => {
    setError('');
    setLoading(true);
    try {
      if (!navigator.credentials) throw new Error('WebAuthn not supported');
      const challengeResp = await fetch('/api/auth/webauthn/challenge', { method: 'POST' });
      const { challenge, allowCredentials, rpId } = await challengeResp.json();

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge), (c) => c.charCodeAt(0)),
          allowCredentials: (allowCredentials || []).map((c) => ({
            ...c,
            id: Uint8Array.from(atob(c.id), (ch) => ch.charCodeAt(0)),
          })),
          rpId,
          userVerification: 'preferred',
          timeout: 60000,
        },
      });

      const verifyResp = await fetch('/api/auth/webauthn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assertion.id,
          rawId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
          type: assertion.type,
        }),
      });
      const data = await verifyResp.json();
      if (!verifyResp.ok) throw new Error(data.error || 'Verification failed');
      onSuccess(data);
    } catch (err) {
      setError(err.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleIos = () => {
    setError('');
    try {
      window.webkit?.messageHandlers?.biometric?.postMessage({ action: 'authenticate' });
      window.addEventListener('biometricResult', (e) => {
        if (e.detail?.success) onSuccess(e.detail);
        else setError(e.detail?.error || 'Biometric failed');
      }, { once: true });
    } catch {
      setError('Face ID / Touch ID not available');
    }
  };

  const handleAndroid = () => {
    setError('');
    try {
      window.AndroidBridge?.authenticateBiometric?.();
      window.addEventListener('androidBiometricResult', (e) => {
        if (e.detail?.success) onSuccess(e.detail);
        else setError(e.detail?.error || 'Biometric failed');
      }, { once: true });
    } catch {
      setError('Fingerprint authentication not available');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Fingerprint size={20} className="text-purple-400" />
        <span className="font-semibold text-white">Biometric</span>
      </div>
      <div className="flex justify-center gap-6 py-4">
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-3xl">🖐</span>
          <span className="text-xs">Fingerprint</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-3xl">👤</span>
          <span className="text-xs">Face Scan</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-3xl">👁</span>
          <span className="text-xs">Retinal</span>
        </div>
      </div>
      {platform === 'ios' && (
        <button
          onClick={handleIos}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span>👤</span> Face ID / Touch ID
        </button>
      )}
      {platform === 'android' && (
        <button
          onClick={handleAndroid}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span>🖐</span> Fingerprint
        </button>
      )}
      {platform === 'web' && (
        <button
          onClick={handleWebAuthn}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Fingerprint size={16} />
          {loading ? 'Waiting for biometric…' : 'Use Biometric (WebAuthn)'}
        </button>
      )}
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}

const METHOD_TABS = [
  { id: 'totp', label: '🔐 App' },
  { id: 'email', label: '📧 Email' },
  { id: 'biometric', label: '🖐 Biometric' },
];

export default function TwoFactor({ onSuccess, onBack, email, setupMode = false }) {
  const [method, setMethod] = useState('totp');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Shield size={18} className="text-purple-400" />
            {setupMode ? 'Set Up Two-Factor Auth' : 'Two-Factor Verification'}
          </h3>
          {email && <p className="text-xs text-gray-500">{email}</p>}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {METHOD_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setMethod(t.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              method === t.id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {method === 'totp' && <TotpSection email={email} onSuccess={onSuccess} setupMode={setupMode} />}
      {method === 'email' && <EmailOtpSection email={email} onSuccess={onSuccess} />}
      {method === 'biometric' && <BiometricSection onSuccess={onSuccess} />}
    </div>
  );
}
