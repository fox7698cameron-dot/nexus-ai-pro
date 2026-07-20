// 2026-07-20
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const isWebAuthnSupported = () =>
  typeof window !== 'undefined' &&
  !!window.PublicKeyCredential &&
  typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

export default function BiometricAuth({ mode = 'authenticate', userId = null, onSuccess, onError }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle');
  const supported = isWebAuthnSupported();

  const handleRegister = useCallback(async () => {
    setStatus('loading');
    try {
      const optRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.message || 'Registration challenge failed');

      const options = {
        ...optData,
        challenge: base64urlToBuffer(optData.challenge),
        user: {
          ...optData.user,
          id: base64urlToBuffer(optData.user.id),
        },
        excludeCredentials: (optData.excludeCredentials || []).map((c) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })),
      };

      const credential = await navigator.credentials.create({ publicKey: options });

      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          type: credential.type,
          response: {
            attestationObject: bufferToBase64url(credential.response.attestationObject),
            clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          },
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message || 'Verification failed');

      setStatus('success');
      onSuccess?.(verifyData);
    } catch (err) {
      setStatus('error');
      onError?.(err);
    }
  }, [userId, onSuccess, onError]);

  const handleAuthenticate = useCallback(async () => {
    setStatus('loading');
    try {
      const optRes = await fetch('/api/auth/webauthn/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.message || 'Authentication challenge failed');

      const options = {
        ...optData,
        challenge: base64urlToBuffer(optData.challenge),
        allowCredentials: (optData.allowCredentials || []).map((c) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })),
      };

      const assertion = await navigator.credentials.get({ publicKey: options });

      const verifyRes = await fetch('/api/auth/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: assertion.id,
          rawId: bufferToBase64url(assertion.rawId),
          type: assertion.type,
          response: {
            authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
            clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
            signature: bufferToBase64url(assertion.response.signature),
            userHandle: assertion.response.userHandle
              ? bufferToBase64url(assertion.response.userHandle)
              : null,
          },
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message || 'Authentication failed');

      setStatus('success');
      onSuccess?.(verifyData);
    } catch (err) {
      setStatus('error');
      onError?.(err);
    }
  }, [onSuccess, onError]);

  const handleAction = mode === 'register' ? handleRegister : handleAuthenticate;

  if (!supported) {
    return (
      <p className="text-xs text-gray-500 text-center mt-2">
        {t('auth.biometricNotSupported')}
      </p>
    );
  }

  const biometricOptions = [
    { key: 'fingerprint', icon: '⬡', labelKey: 'auth.biometricFingerprint' },
    { key: 'face', icon: '◉', labelKey: 'auth.biometricFace' },
    { key: 'retinal', icon: '◎', labelKey: 'auth.biometricRetinal' },
  ];

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-400 text-center mb-3">{t('auth.biometricPrompt')}</p>
      <div className="flex justify-center gap-4">
        {biometricOptions.map(({ key, icon, labelKey }) => (
          <button
            key={key}
            onClick={handleAction}
            disabled={status === 'loading'}
            className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 hover:border-purple-500 hover:bg-gray-750 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            title={t(labelKey)}
          >
            <span
              className="text-2xl group-hover:scale-110 transition-transform duration-200"
              style={{ filter: 'grayscale(0.3)' }}
            >
              {icon}
            </span>
            <span className="text-xs text-gray-400 group-hover:text-purple-400 transition-colors">
              {t(labelKey)}
            </span>
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <p className="text-xs text-purple-400 text-center mt-2 animate-pulse">
          {t('auth.verifying')}
        </p>
      )}
      {status === 'success' && (
        <p className="text-xs text-green-400 text-center mt-2">&#10003;</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-400 text-center mt-2">{t('auth.errorGeneric')}</p>
      )}
    </div>
  );
}
