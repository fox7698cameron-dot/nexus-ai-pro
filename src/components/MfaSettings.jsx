/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Two-factor authentication setup/disable UI, backed by the real
 * TOTP enrollment flow in server.js (no client-side mock state).
 */
import React, { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

export function MfaSettings() {
  const { user, startMfaSetup, confirmMfaSetup, disableMfa } = useAuth();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleStartSetup = async () => {
    setBusy(true);
    setError(null);
    const result = await startMfaSetup();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSetup(result);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await confirmMfaSetup(code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBackupCodes(result.backupCodes);
    setSetup(null);
    setCode('');
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await disableMfa(disablePassword, disableCode);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowDisableForm(false);
    setDisablePassword('');
    setDisableCode('');
  };

  if (backupCodes) {
    return (
      <div className="setting-group">
        <h4>Two-Factor Authentication Enabled</h4>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          Save these one-time backup codes somewhere safe. Each can be used once to sign in if you lose access
          to your authenticator app. They will not be shown again.
        </p>
        <pre style={{
          background: '#0a0a0c', border: '1px solid #26262e', borderRadius: '8px',
          padding: '12px', fontSize: '0.85rem', lineHeight: '1.6'
        }}>
          {backupCodes.join('\n')}
        </pre>
        <button className="mfa-btn secondary" onClick={() => setBackupCodes(null)}>Done</button>
      </div>
    );
  }

  if (setup) {
    return (
      <div className="setting-group">
        <h4>Set Up Two-Factor Authentication</h4>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter
          the 6-digit code it generates.
        </p>
        <img src={setup.qrCodeDataUrl} alt="MFA QR code" style={{ width: '180px', height: '180px', background: '#fff', borderRadius: '8px' }} />
        <p style={{ color: '#6b7280', fontSize: '0.75rem', wordBreak: 'break-all' }}>
          Can't scan? Enter this secret manually: {setup.secret}
        </p>
        {error && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</p>}
        <form onSubmit={handleVerify} className="setting-item">
          <input
            type="text"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" className="mfa-btn" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify & Enable'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="setting-group">
      <h4>Two-Factor Authentication</h4>
      {error && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</p>}
      {user?.mfaEnabled ? (
        <div className="setting-item">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
            <ShieldCheck size={16} /> Enabled
          </span>
          {!showDisableForm ? (
            <button className="mfa-btn secondary" onClick={() => setShowDisableForm(true)}>Disable</button>
          ) : null}
        </div>
      ) : (
        <div className="setting-item">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af' }}>
            <ShieldOff size={16} /> Not enabled
          </span>
          <button className="mfa-btn" onClick={handleStartSetup} disabled={busy}>
            {busy ? 'Starting…' : 'Enable 2FA'}
          </button>
        </div>
      )}

      {showDisableForm && (
        <form onSubmit={handleDisable}>
          <div className="setting-item">
            <label>Current password</label>
            <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} required />
          </div>
          <div className="setting-item">
            <label>Authentication or backup code</label>
            <input type="text" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} required />
          </div>
          <button type="submit" className="mfa-btn secondary" disabled={busy}>
            {busy ? 'Disabling…' : 'Confirm disable'}
          </button>
        </form>
      )}
    </div>
  );
}
