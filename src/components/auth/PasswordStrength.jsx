// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

const COMMON_PATTERNS = [
  /password/i,
  /12345/,
  /qwerty/i,
  /abc123/i,
  /letmein/i,
  /welcome/i,
  /monkey/i,
  /dragon/i,
  /master/i,
  /admin/i,
];

// Unicode-aware character category checks
function hasUppercase(str) {
  return [...str].some((ch) => ch !== ch.toLowerCase() && ch === ch.toUpperCase() && ch.toUpperCase() !== ch.toLowerCase());
}

function hasLowercase(str) {
  return [...str].some((ch) => ch !== ch.toUpperCase() && ch === ch.toLowerCase() && ch.toUpperCase() !== ch.toLowerCase());
}

function hasDigit(str) {
  return /\p{Nd}/u.test(str);
}

function hasSpecial(str) {
  return /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/u.test(str) || /\p{S}/u.test(str);
}

function charLength(str) {
  return [...str].length;
}

function noCommonPatterns(str) {
  return !COMMON_PATTERNS.some((re) => re.test(str));
}

function evaluate(password) {
  const checks = {
    length: charLength(password) >= 13,
    uppercase: hasUppercase(password),
    lowercase: hasLowercase(password),
    digit: hasDigit(password),
    special: hasSpecial(password),
    noCommon: noCommonPatterns(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

const LEVELS = [
  { label: 'Very Weak', color: 'bg-red-500', text: 'text-red-400' },
  { label: 'Weak', color: 'bg-orange-500', text: 'text-orange-400' },
  { label: 'Fair', color: 'bg-yellow-500', text: 'text-yellow-400' },
  { label: 'Strong', color: 'bg-lime-500', text: 'text-lime-400' },
  { label: 'Very Strong', color: 'bg-green-500', text: 'text-green-400' },
];

function getLevel(score) {
  if (score <= 1) return LEVELS[0];
  if (score === 2) return LEVELS[1];
  if (score === 3) return LEVELS[2];
  if (score === 4) return LEVELS[3];
  return LEVELS[4];
}

const CHECK_LABELS = [
  { key: 'length', label: 'At least 13 characters' },
  { key: 'uppercase', label: 'Uppercase letter' },
  { key: 'lowercase', label: 'Lowercase letter' },
  { key: 'digit', label: 'Number' },
  { key: 'special', label: 'Special character' },
  { key: 'noCommon', label: 'No common patterns' },
];

export default function PasswordStrength({ password }) {
  if (!password) return null;

  const { checks, score } = evaluate(password);
  const level = getLevel(score);
  const pct = Math.round((score / 6) * 100);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${level.color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-medium w-20 text-right ${level.text}`}>{level.label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {CHECK_LABELS.map(({ key, label }) => (
          <li key={key} className={`flex items-center gap-1 text-xs ${checks[key] ? 'text-green-400' : 'text-gray-500'}`}>
            <span>{checks[key] ? '✓' : '○'}</span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
