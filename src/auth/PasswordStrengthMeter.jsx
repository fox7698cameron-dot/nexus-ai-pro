/**
 * src/auth/PasswordStrengthMeter.jsx
 * Visual password strength indicator component (13+ char minimum)
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 */

import React, { useMemo } from 'react';

// ─── Strength computation ─────────────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  'password123456', 'qwerty123456789', '123456789012345',
  'passwordpassword', 'letmein123456', 'admin1234567890',
]);

/**
 * @param {string} password
 * @returns {{ score: number, label: string, color: string, issues: string[], suggestions: string[] }}
 */
export function computeStrength(password) {
  if (!password) return { score: 0, label: 'empty', color: '#374151', issues: [], suggestions: ['Enter a password to see strength.'] };

  const issues = [];
  const suggestions = [];

  // Length (most important – min 13)
  const len = [...password].length; // grapheme-aware
  if (len < 13) {
    issues.push(`Too short (${len}/13 chars minimum)`);
    suggestions.push(`Add ${13 - len} more character${13 - len !== 1 ? 's' : ''}`);
  }

  if (!/[A-Z]/.test(password)) { issues.push('Missing uppercase letter'); suggestions.push('Add A-Z characters'); }
  if (!/[a-z]/.test(password)) { issues.push('Missing lowercase letter'); suggestions.push('Add a-z characters'); }
  if (!/[0-9]/.test(password)) { issues.push('Missing number'); suggestions.push('Add a digit 0-9'); }
  if (!/[^A-Za-z0-9]/.test(password)) { issues.push('Missing special character'); suggestions.push('Add !@#$%^&* or emoji'); }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) { issues.push('Too common'); suggestions.push('Use a unique passphrase'); }
  if (/(.)\1{4,}/.test(password)) { issues.push('Repeated characters'); suggestions.push('Avoid aaaaaa patterns'); }

  // Score: start at 100, deduct per issue
  const deduction = issues.reduce((acc, _, i) => acc + (i === 0 && len < 13 ? 25 : 15), 0);
  const lengthBonus = Math.min(20, Math.max(0, (len - 13) * 2));
  const score = Math.max(0, Math.min(100, 100 - deduction + lengthBonus));

  let label, color;
  if (score < 30)      { label = 'Weak';       color = '#ef4444'; }
  else if (score < 50) { label = 'Fair';       color = '#f97316'; }
  else if (score < 70) { label = 'Good';       color = '#eab308'; }
  else if (score < 90) { label = 'Strong';     color = '#22c55e'; }
  else                 { label = 'Enterprise'; color = '#6366f1'; }

  return { score, label, color, issues, suggestions };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {{ password: string, showRequirements?: boolean, showSuggestions?: boolean }} props
 */
export function PasswordStrengthMeter({ password, showRequirements = true, showSuggestions = false }) {
  const strength = useMemo(() => computeStrength(password ?? ''), [password]);

  const segments = 5;
  const filledSegments = Math.ceil((strength.score / 100) * segments);

  return (
    <div style={{ marginTop: 8 }}>
      {/* Segmented bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i < filledSegments ? strength.color : '#374151',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Label + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: strength.color }}>
          {password ? strength.label : ''}
        </span>
        {password && (
          <span style={{ fontSize: 11, color: '#6b7280' }}>{strength.score}/100</span>
        )}
      </div>

      {/* Requirements checklist */}
      {showRequirements && password && (
        <div style={{ marginTop: 6 }}>
          {[
            { label: '13+ characters',       met: [...(password ?? '')].length >= 13 },
            { label: 'Uppercase (A-Z)',        met: /[A-Z]/.test(password) },
            { label: 'Lowercase (a-z)',        met: /[a-z]/.test(password) },
            { label: 'Number (0-9)',           met: /[0-9]/.test(password) },
            { label: 'Special / emoji char',   met: /[^A-Za-z0-9]/.test(password) },
          ].map(req => (
            <div
              key={req.label}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        6,
                fontSize:   11,
                color:      req.met ? '#22c55e' : '#6b7280',
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 10 }}>{req.met ? '✓' : '○'}</span>
              {req.label}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && password && strength.suggestions.length > 0 && strength.score < 70 && (
        <div style={{ marginTop: 6, padding: '6px 8px', background: '#1f2937', borderRadius: 6, fontSize: 11, color: '#9ca3af' }}>
          💡 {strength.suggestions[0]}
        </div>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
