// File: BiometricAuth.jsx | Date: 2026-06-16 | Nexus AI Pro
import { useState, useEffect } from 'react';
import { Fingerprint, ScanFace, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

function base64ToBuffer(base64) {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str);
}

export default function BiometricAuth({ mode = 'login', userId, onSuccess, onError }) {
  const [supported, setSupported] = useState(false);
  const [platformType, setPlatformType] = useState('fingerprint'); // 'fingerprint' | 'face'
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkSupport = async () => {
      if (!window.PublicKeyCredential) {
        setSupported(false);
        return;
      }
      setSupported(true);

      // Detect platform authenticator type (heuristic)
      try {
        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (isAvailable) {
          const ua = navigator.userAgent.toLowerCase();
          // Rough heuristic for Face ID vs Touch ID / Fingerprint
          if (ua.includes('iphone') || ua.includes('mac')) {
            setPlatformType('face');
          } else {
            setPlatformType('fingerprint');
          }
        }
      } catch {
        // Ignore detection errors
      }
    };

    checkSupport();
  }, []);

  const handleSetup = async () => {
    setStatus('loading');
    setMessage('');
    try {
      // Get registration options from server
      const optRes = await fetch('/api/auth/biometric/setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!optRes.ok) {
        const err = await optRes.json();
        throw new Error(err.message || 'Failed to get setup options');
      }

      const options = await optRes.json();

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: base64ToBuffer(options.challenge),
          user: {
            ...options.user,
            id: base64ToBuffer(options.user.id),
          },
          excludeCredentials: (options.excludeCredentials || []).map((c) => ({
            ...c,
            id: base64ToBuffer(c.id),
          })),
        },
      });

      // Verify with server
      const verifyRes = await fetch('/api/auth/biometric/setup/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: bufferToBase64(credential.rawId),
          response: {
            clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
            attestationObject: bufferToBase64(credential.response.attestationObject),
          },
          type: credential.type,
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.message || 'Setup verification failed');
      }

      setStatus('success');
      setMessage('Biometric authentication set up successfully!');
      onSuccess?.({ type: 'setup' });
    } catch (err) {
      setStatus('error');
      if (err.name === 'NotAllowedError') {
        setMessage('Authentication was cancelled or timed out');
      } else if (err.name === 'InvalidStateError') {
        setMessage('This device is already registered');
      } else {
        setMessage(err.message || 'Setup failed');
      }
      onError?.(err);
    }
  };

  const handleLogin = async () => {
    setStatus('loading');
    setMessage('');
    try {
      // Get authentication options
      const optRes = await fetch('/api/auth/biometric/challenge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!optRes.ok) {
        const err = await optRes.json();
        throw new Error(err.message || 'Failed to get authentication options');
      }

      const options = await optRes.json();

      // Get assertion
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: base64ToBuffer(options.challenge),
          rpId: options.rpId || window.location.hostname,
          allowCredentials: (options.allowCredentials || []).map((c) => ({
            ...c,
            id: base64ToBuffer(c.id),
          })),
          userVerification: 'preferred',
          timeout: 60000,
        },
      });

      // Verify with server
      const verifyRes = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assertion.id,
          rawId: bufferToBase64(assertion.rawId),
          response: {
            clientDataJSON: bufferToBase64(assertion.response.clientDataJSON),
            authenticatorData: bufferToBase64(assertion.response.authenticatorData),
            signature: bufferToBase64(assertion.response.signature),
            userHandle: assertion.response.userHandle
              ? bufferToBase64(assertion.response.userHandle)
              : null,
          },
          type: assertion.type,
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.message || 'Authentication failed');
      }

      const data = await verifyRes.json();
      setStatus('success');
      setMessage('Authenticated successfully!');
      onSuccess?.(data);
    } catch (err) {
      setStatus('error');
      if (err.name === 'NotAllowedError') {
        setMessage('Authentication was cancelled or timed out');
      } else {
        setMessage(err.message || 'Authentication failed');
      }
      onError?.(err);
    }
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
        <Fingerprint className="w-4 h-4" />
        Biometric authentication is not supported on this device
      </div>
    );
  }

  const Icon = platformType === 'face' ? ScanFace : Fingerprint;
  const label =
    platformType === 'face'
      ? mode === 'setup' ? 'Set up Face ID' : 'Sign in with Face ID'
      : mode === 'setup' ? 'Set up Fingerprint' : 'Sign in with Fingerprint';

  const handleClick = mode === 'setup' ? handleSetup : handleLogin;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'loading' || status === 'success'}
        className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          status === 'success'
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 cursor-default focus:ring-emerald-500'
            : status === 'error'
            ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:border-red-400 focus:ring-red-500'
            : 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:border-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 disabled:opacity-60 disabled:cursor-not-allowed focus:ring-indigo-500'
        }`}
      >
        {status === 'loading' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
        <span>
          {status === 'loading'
            ? 'Waiting for biometric…'
            : status === 'success'
            ? 'Verified!'
            : label}
        </span>
      </button>

      {message && (
        <div
          className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
            status === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {status === 'error' && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
          {status === 'success' && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
          {message}
          {status === 'error' && (
            <button
              type="button"
              onClick={() => { setStatus('idle'); setMessage(''); }}
              className="ml-auto underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
