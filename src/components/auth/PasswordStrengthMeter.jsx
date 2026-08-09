/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Password Strength Meter
 * Enforces 13+ character minimum, uppercase, lowercase, digits, special chars
 * Supports emoji and full Unicode in passwords
 * Date: 2026-08-09
 */

import React, { useMemo } from 'react';

const MIN_LENGTH = 13;

function calcStrength(password) {
  if (!password) return { score: 0, label: '', level: 0, color: '#374151', checks: {} };

  const checks = {
    length: password.length >= MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password), // includes emoji and special chars
    extraLength: password.length >= 20,
  };

  let score = Object.values(checks).filter(Boolean).length;
  if (password.length < 8) score = Math.min(score, 1);

  const levels = [
    { min: 0, label: 'Too Short', color: '#ef4444' },
    { min: 1, label: 'Weak', color: '#f97316' },
    { min: 2, label: 'Fair', color: '#eab308' },
    { min: 3, label: 'Fair', color: '#eab308' },
    { min: 4, label: 'Good', color: '#22c55e' },
    { min: 5, label: 'Strong', color: '#10b981' },
    { min: 6, label: 'Very Strong', color: '#6366f1' },
  ];

  const levelMeta = [...levels].reverse().find(l => score >= l.min) ?? levels[0];
  return { score, label: levelMeta.label, color: levelMeta.color, checks };
}

const styles = {
  container: { marginTop: '8px' },
  barRow: { display: 'flex', gap: '4px', marginBottom: '6px' },
  bar: (filled, color) => ({
    flex: 1,
    height: '4px',
    borderRadius: '4px',
    background: filled ? color : 'rgba(255,255,255,0.08)',
    transition: 'background 0.3s',
  }),
  label: (color) => ({
    fontSize: '0.75rem',
    color,
    fontWeight: '500',
    marginBottom: '8px',
  }),
  checks: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  check: (ok) => ({
    fontSize: '0.7rem',
    color: ok ? '#10b981' : '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }),
};

const CHECK_LABELS = {
  length: `${MIN_LENGTH}+ chars`,
  uppercase: 'A-Z',
  lowercase: 'a-z',
  digit: '0-9',
  special: '!@#$ emoji',
  extraLength: '20+ chars',
};

export default function PasswordStrengthMeter({ password }) {
  const { score, label, color, checks } = useMemo(() => calcStrength(password), [password]);

  if (!password) return null;

  const totalBars = 6;
  const filledBars = score;

  return (
    <div style={styles.container}>
      <div style={styles.barRow}>
        {Array.from({ length: totalBars }, (_, i) => (
          <div key={i} style={styles.bar(i < filledBars, color)} />
        ))}
      </div>
      <div style={styles.label(color)}>{label}</div>
      <div style={styles.checks}>
        {Object.entries(checks).map(([key, ok]) => (
          <span key={key} style={styles.check(ok)}>
            {ok ? '✓' : '○'} {CHECK_LABELS[key]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Validate password returns array of error strings (empty = valid) */
export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < MIN_LENGTH) errors.push(`At least ${MIN_LENGTH} characters required`);
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter required');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter required');
  if (!/[0-9]/.test(password)) errors.push('At least one number required');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character required');
  return errors;
}
