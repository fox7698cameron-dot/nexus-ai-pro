// 2026-07-20
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export default function MFASetup({ enabled: initialEnabled = false, onToggle }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [phase, setPhase] = useState('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const startSetup = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Setup failed');
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setPhase('scan');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyCode = useCallback(async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: code, secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      setBackupCodes(data.backupCodes || []);
      setEnabled(true);
      setPhase('backup');
      onToggle?.(true);
    } catch (err) {
      setError(err.message || t('auth.errorMFA'));
    } finally {
      setLoading(false);
    }
  }, [code, secret, t, onToggle]);

  const disableMFA = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Disable failed');
      setEnabled(false);
      setPhase('idle');
      setQrCodeUrl('');
      setSecret('');
      setBackupCodes([]);
      setCode('');
      onToggle?.(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onToggle]);

  const dismiss = useCallback(() => {
    setPhase('idle');
    setCode('');
    setError('');
  }, []);

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{t('auth.mfaSetup')}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {enabled ? t('auth.mfaEnabled') : t('auth.mfaDisabled')}
          </p>
        </div>
        <button
          onClick={enabled ? disableMFA : startSetup}
          disabled={loading || phase === 'scan'}
          className={[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            enabled ? 'bg-purple-600' : 'bg-gray-600',
          ].join(' ')}
          aria-label={enabled ? t('auth.mfaDisable') : t('auth.mfaEnable')}
        >
          <span
            className={[
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
              enabled ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {phase === 'scan' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-300">{t('auth.mfaScanQR')}</p>

          {qrCodeUrl && (
            <div className="flex justify-center">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="rounded-xl border-4 border-white"
                style={{ width: 180, height: 180 }}
              />
            </div>
          )}

          {secret && (
            <p className="text-xs text-gray-500 text-center font-mono break-all">
              {secret}
            </p>
          )}

          <p className="text-sm text-gray-300">{t('auth.mfaEnterCode')}</p>

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-center text-lg tracking-widest placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '...' : t('auth.mfaVerify')}
            </button>
          </div>

          <button
            onClick={dismiss}
            className="w-full text-xs text-gray-500 hover:text-gray-400 py-1 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'backup' && backupCodes.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-yellow-400">{t('auth.mfaBackupCodes')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('auth.mfaBackupInfo')}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <code
                key={i}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs font-mono text-green-400 text-center tracking-wider"
              >
                {code}
              </code>
            ))}
          </div>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(backupCodes.join('\n'));
            }}
            className="w-full text-xs text-purple-400 hover:text-purple-300 py-1 transition-colors"
          >
            Copy all codes
          </button>

          <button
            onClick={dismiss}
            className="w-full py-2 rounded-xl border border-gray-600 text-gray-300 hover:border-gray-500 text-sm transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
