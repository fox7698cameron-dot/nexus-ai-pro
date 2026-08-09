/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * MFA Setup Wizard — TOTP QR code + backup codes
 * Date: 2026-08-09
 */

import React, { useState, useEffect } from 'react';
import { Shield, Copy, Check, AlertTriangle, Key, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: '20px',
  },
  modal: {
    background: '#13131a', border: '1px solid #2a2a35', borderRadius: '16px',
    width: '100%', maxWidth: '480px', overflow: 'hidden',
  },
  header: {
    padding: '20px 24px', borderBottom: '1px solid #2a2a35',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' },
  body: { padding: '24px' },
  stepRow: { display: 'flex', gap: '8px', marginBottom: '24px' },
  step: (active, done) => ({
    flex: 1, height: '4px', borderRadius: '2px',
    background: done ? '#10b981' : active ? '#6366f1' : '#2a2a35',
    transition: 'all 0.3s',
  }),
  label: { fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' },
  qrBox: {
    background: '#fff', borderRadius: '12px', padding: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '16px', minHeight: '160px',
  },
  qrPlaceholder: { textAlign: 'center', color: '#374151' },
  secretBox: {
    background: '#1e1e28', border: '1px solid #2a2a35', borderRadius: '10px',
    padding: '14px 16px', marginBottom: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '10px', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '2px',
    color: '#a5b4fc', wordBreak: 'break-all',
  },
  copyBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: '#6b7280', padding: '4px', flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
  codesGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px', marginBottom: '16px',
  },
  code: {
    background: '#1e1e28', border: '1px solid #2a2a35', borderRadius: '8px',
    padding: '10px', fontFamily: 'monospace', fontSize: '0.8rem',
    color: '#a5b4fc', textAlign: 'center', letterSpacing: '1px',
  },
  input: {
    width: '100%', background: '#1e1e28', border: '1px solid #2a2a35',
    borderRadius: '10px', padding: '12px 16px', color: '#fff',
    fontSize: '1.2rem', letterSpacing: '6px', textAlign: 'center',
    fontFamily: 'monospace', outline: 'none', marginBottom: '16px',
  },
  alert: {
    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem',
    color: '#fbbf24', display: 'flex', alignItems: 'flex-start', gap: '8px',
    marginBottom: '16px',
  },
  btn: (primary) => ({
    width: '100%', padding: '12px',
    background: primary ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#1e1e28',
    border: primary ? 'none' : '1px solid #2a2a35',
    borderRadius: '10px', color: primary ? '#fff' : '#9ca3af',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
    marginBottom: '8px', transition: 'all 0.2s',
  }),
  success: {
    textAlign: 'center', padding: '20px 0',
  },
  successIcon: {
    width: '70px', height: '70px', borderRadius: '50%',
    background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
};

const STEPS = ['Setup', 'Save Codes', 'Verify'];

export default function MFASetup({ onClose, onSuccess }) {
  const { setupMFA, verifyMFA, authFetch } = useAuth();
  const [step, setStep] = useState(0); // 0=setup, 1=backup codes, 2=verify, 3=done
  const [mfaData, setMfaData] = useState(null); // { secret, backupCodes, qrCodeUrl }
  const [totpToken, setTotpToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initiate MFA setup on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const data = await setupMFA();
        setMfaData(data);
      } catch (err) {
        setError(err.message ?? 'Failed to initialize MFA');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setupMFA]);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(mfaData?.secret ?? '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleVerify = async () => {
    if (!totpToken || totpToken.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyMFA(totpToken);
      setStep(3);
    } catch (err) {
      setError(err.message ?? 'Invalid TOTP code — check your authenticator app');
    } finally {
      setLoading(false);
    }
  };

  // Render steps
  const renderStep = () => {
    if (step === 3) {
      return (
        <div style={S.success}>
          <div style={S.successIcon}><Check size={32} color="#10b981" /></div>
          <h3 style={{ marginBottom: '8px' }}>MFA Enabled!</h3>
          <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '0.875rem' }}>
            Your account is now protected with two-factor authentication.
          </p>
          <button style={S.btn(true)} onClick={onSuccess ?? onClose}>Done</button>
        </div>
      );
    }

    if (step === 0) {
      return (
        <>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '20px' }}>
            Scan the QR code below with your authenticator app (Google Authenticator,
            Authy, 1Password, etc.).
          </p>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
              <div>Generating secret...</div>
            </div>
          ) : mfaData ? (
            <>
              {/* QR code via Google Charts — no external JS dependency, image only */}
              <div style={S.qrBox}>
                {mfaData.qrCodeUrl ? (
                  <img
                    src={`https://chart.googleapis.com/chart?chs=160x160&chld=M|0&cht=qr&chl=${encodeURIComponent(mfaData.qrCodeUrl)}`}
                    alt="TOTP QR Code"
                    width={160}
                    height={160}
                    style={{ borderRadius: '8px' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={S.qrPlaceholder}>
                    <Key size={32} color="#6366f1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.8rem' }}>QR not available — use manual entry</div>
                  </div>
                )}
              </div>

              <div style={S.label}>Or enter manually:</div>
              <div style={S.secretBox}>
                <span>{mfaData.secret}</span>
                <button style={S.copyBtn} onClick={handleCopySecret} title="Copy secret">
                  {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                </button>
              </div>
            </>
          ) : null}

          {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>{error}</div>}
          <button style={S.btn(true)} onClick={() => setStep(1)} disabled={!mfaData || loading}>
            I've scanned the QR code →
          </button>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <div style={S.alert}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>Save these backup codes in a secure location. Each can only be used once
            to regain account access if you lose your authenticator device.</span>
          </div>

          <div style={S.codesGrid}>
            {(mfaData?.backupCodes ?? []).map((code, i) => (
              <div key={i} style={S.code}>{code}</div>
            ))}
          </div>

          <button
            style={{ ...S.btn(false), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={() => {
              const text = mfaData?.backupCodes?.join('\n') ?? '';
              navigator.clipboard.writeText(text);
            }}
          >
            <Copy size={14} /> Copy All Codes
          </button>
          <button style={S.btn(true)} onClick={() => setStep(2)}>
            I've saved the codes →
          </button>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '20px' }}>
            Enter the 6-digit code from your authenticator app to confirm setup.
          </p>
          <input
            style={S.input}
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]*"
            placeholder="000000"
            value={totpToken}
            onChange={(e) => { setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
            autoFocus
          />
          {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>{error}</div>}
          <button style={S.btn(true)} onClick={handleVerify} disabled={loading || totpToken.length !== 6}>
            {loading ? 'Verifying...' : 'Confirm & Enable MFA'}
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={S.modal}>
        <div style={S.header}>
          <div style={S.title}><Shield size={18} color="#6366f1" /> Set Up Two-Factor Auth</div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ×
          </button>
        </div>

        <div style={S.body}>
          {/* Progress */}
          {step < 3 && (
            <div style={S.stepRow}>
              {STEPS.map((s, i) => (
                <div key={s} style={S.step(i === step, i < step)} title={s} />
              ))}
            </div>
          )}

          {renderStep()}
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
