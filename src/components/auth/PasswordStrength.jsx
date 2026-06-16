// File: PasswordStrength.jsx | Date: 2026-06-16 | Nexus AI Pro
import { useMemo } from 'react';

const checks = [
  { label: '13+ characters', test: (p) => p.length >= 13 },
  { label: 'Uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'Number (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'Special character (@$!%*?&#^_-+=)', test: (p) => /[@$!%*?&#^_\-+=]/.test(p) },
];

function getStrengthColor(score) {
  if (score < 40) return { bar: 'bg-red-500', text: 'text-red-500', label: 'Weak' };
  if (score < 70) return { bar: 'bg-orange-500', text: 'text-orange-500', label: 'Fair' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-500', label: 'Strong' };
}

export default function PasswordStrength({ password }) {
  const results = useMemo(() => checks.map((c) => ({ ...c, passed: c.test(password || '') })), [password]);

  const score = useMemo(() => {
    if (!password) return 0;
    const passed = results.filter((r) => r.passed).length;
    return Math.round((passed / checks.length) * 100);
  }, [password, results]);

  const { bar, text, label } = getStrengthColor(score);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${bar}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-xs font-medium w-12 text-right ${text}`}>{label}</span>
      </div>

      {/* Checklist */}
      <ul className="space-y-1">
        {results.map(({ label: checkLabel, passed }) => (
          <li key={checkLabel} className="flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-xs font-bold flex-shrink-0 ${
                passed ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              {passed ? '✓' : '·'}
            </span>
            <span className={passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}>
              {checkLabel}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
