/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Full-viewport login/register screen shown while unauthenticated.
 */
import React, { useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0c',
    color: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: '#15151a',
    border: '1px solid #26262e',
    borderRadius: '16px',
    padding: '32px'
  },
  logo: {
    width: '56px',
    height: '56px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    borderRadius: '14px',
    margin: '0 auto 20px'
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '24px'
  },
  field: {
    marginBottom: '14px'
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#9ca3af',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#0a0a0c',
    border: '1px solid #26262e',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '0.95rem',
    boxSizing: 'border-box'
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '14px'
  },
  errorText: {
    color: '#f87171',
    fontSize: '0.85rem',
    margin: 0
  },
  submit: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px'
  },
  toggle: {
    textAlign: 'center',
    marginTop: '18px',
    fontSize: '0.85rem',
    color: '#6b7280'
  },
  toggleLink: {
    color: '#8b5cf6',
    cursor: 'pointer',
    fontWeight: 500
  }
};

export function LoginScreen() {
  const { login, register, completeMfaChallenge, error } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fieldErrors, setFieldErrors] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState('');

  const isRegister = mode === 'register';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors(null);
    const result = isRegister
      ? await register(email, password, displayName)
      : await login(email, password);
    setSubmitting(false);
    if (!result.ok && result.errors) {
      setFieldErrors(result.errors);
      return;
    }
    if (result.ok && result.mfaRequired) {
      setMfaChallenge(result.challengeToken);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await completeMfaChallenge(mfaChallenge, mfaCode);
    setSubmitting(false);
    if (!result.ok) {
      setMfaCode('');
    }
  };

  if (mfaChallenge) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo} />
          <h1 style={styles.title}>Two-factor verification</h1>
          <p style={styles.subtitle}>Enter the 6-digit code from your authenticator app, or a backup code.</p>

          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <form onSubmit={handleMfaSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>Authentication code</label>
              <input
                style={styles.input}
                type="text"
                inputMode="text"
                autoFocus
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
              />
            </div>
            <button type="submit" style={styles.submit} disabled={submitting || !mfaCode.trim()}>
              {submitting ? 'Verifying…' : 'Verify'}
            </button>
          </form>

          <p style={styles.toggle}>
            <span style={styles.toggleLink} onClick={() => { setMfaChallenge(null); setMfaCode(''); }}>
              Back to sign in
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo} />
        <h1 style={styles.title}>{isRegister ? 'Create account' : 'Welcome back'}</h1>
        <p style={styles.subtitle}>
          {isRegister ? 'Set up your Nexus AI account' : 'Sign in to your Nexus AI account'}
        </p>

        {(error || fieldErrors) && (
          <div style={styles.errorBox}>
            {error && <p style={styles.errorText}>{error}</p>}
            {fieldErrors && fieldErrors.map((msg, i) => (
              <p key={i} style={styles.errorText}>{msg}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={styles.field}>
              <label style={styles.label}>Display name</label>
              <input
                style={styles.input}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" style={styles.submit} disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p style={styles.toggle}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span
            style={styles.toggleLink}
            onClick={() => setMode(isRegister ? 'login' : 'register')}
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </span>
        </p>
      </div>
    </div>
  );
}
