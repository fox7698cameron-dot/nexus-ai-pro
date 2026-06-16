// File: MFASetup.jsx | Date: 2026-06-16 | Nexus AI Pro
import { useState, useEffect } from 'react';
import { Shield, Copy, Check, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const STEPS = ['Scan QR Code', 'Verify Code', 'Save Backup Codes', 'Done'];

export default function MFASetup({ onComplete }) {
  const { setupMFA, verifyMFA } = useAuth();
  const [step, setStep] = useState(0);
  const [setupData, setSetupData] = useState(null); // { qrCode, secret, backupCodes }
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  useEffect(() => {
    const initSetup = async () => {
      setIsLoading(true);
      try {
        const data = await setupMFA();
        setSetupData(data);
      } catch (err) {
        setError(err.message || 'Failed to initialize MFA setup');
      } finally {
        setIsLoading(false);
      }
    };
    initSetup();
  }, []);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter a 6-digit code');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await verifyMFA(code);
      setStep(2); // Move to backup codes
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    if (onComplete) onComplete();
    else window.location.href = '/dashboard';
  };

  if (isLoading && !setupData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Setting up MFA…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Add an extra layer of security to your account</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    i < step
                      ? 'bg-emerald-500 text-white'
                      : i === step
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="hidden sm:block mt-1 text-xs text-gray-500 dark:text-gray-400 text-center w-20">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mb-5 transition ${i < step ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Step 0: Scan QR */}
          {step === 0 && setupData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scan QR Code</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code.
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl border-2 border-gray-100 dark:border-gray-700">
                  {setupData.qrCode ? (
                    <img
                      src={setupData.qrCode}
                      alt="MFA QR Code"
                      className="w-48 h-48 block"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <p className="text-xs text-gray-400 text-center px-4">QR Code unavailable</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual entry */}
              {setupData.secret && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Can't scan? Enter this key manually:
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                      {setupData.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupData.secret, 'secret')}
                      className="flex-shrink-0 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      aria-label="Copy secret"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition"
              >
                I've scanned the QR code
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Enter code */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Verify Your Code</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter the 6-digit code shown in your authenticator app to confirm setup.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-2xl text-center font-mono tracking-[0.5em] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={isLoading || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm transition"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Verify Code
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(0)}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                ← Back to QR code
              </button>
            </div>
          )}

          {/* Step 2: Backup codes */}
          {step === 2 && setupData?.backupCodes && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Save Your Backup Codes</h2>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <strong>Important:</strong> Store these backup codes in a safe place. Each code can only be used once. You'll need them if you lose access to your authenticator app.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                {setupData.backupCodes.map((backupCode, i) => (
                  <code key={i} className="text-sm font-mono text-gray-800 dark:text-gray-200 text-center py-1 px-2 bg-white dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600">
                    {backupCode}
                  </code>
                ))}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(setupData.backupCodes.join('\n'), 'codes')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition"
              >
                {copiedCodes ? (
                  <><Check className="w-4 h-4 text-emerald-500" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy all backup codes</>
                )}
              </button>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={savedConfirmed}
                  onChange={(e) => setSavedConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  I have saved my backup codes in a secure location
                </span>
              </label>

              <button
                onClick={() => setStep(3)}
                disabled={!savedConfirmed}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm transition"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center space-y-6 py-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">MFA Enabled!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Two-factor authentication has been successfully set up. Your account is now more secure.
                </p>
              </div>
              <button
                onClick={handleDone}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
