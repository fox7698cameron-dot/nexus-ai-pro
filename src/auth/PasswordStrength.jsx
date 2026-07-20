// 2026-07-20
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function checkRequirements(password) {
  return {
    length: password.length >= 13,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function computeScore(reqs) {
  return Object.values(reqs).filter(Boolean).length;
}

const STRENGTH_LEVELS = [
  { score: 0, labelKey: 'auth.passwordStrengthWeak', color: '#ef4444', width: '0%' },
  { score: 1, labelKey: 'auth.passwordStrengthWeak', color: '#ef4444', width: '20%' },
  { score: 2, labelKey: 'auth.passwordStrengthFair', color: '#f97316', width: '40%' },
  { score: 3, labelKey: 'auth.passwordStrengthFair', color: '#eab308', width: '60%' },
  { score: 4, labelKey: 'auth.passwordStrengthStrong', color: '#22c55e', width: '80%' },
  { score: 5, labelKey: 'auth.passwordStrengthVeryStrong', color: '#10b981', width: '100%' },
];

export default function PasswordStrength({ password }) {
  const { t } = useTranslation();

  const { reqs, score, level } = useMemo(() => {
    const reqs = checkRequirements(password || '');
    const score = password ? computeScore(reqs) : 0;
    const level = STRENGTH_LEVELS[score] || STRENGTH_LEVELS[0];
    return { reqs, score, level };
  }, [password]);

  if (!password) return null;

  const requirementItems = [
    { key: 'length', labelKey: 'auth.reqLength', met: reqs.length },
    { key: 'upper', labelKey: 'auth.reqUpper', met: reqs.upper },
    { key: 'lower', labelKey: 'auth.reqLower', met: reqs.lower },
    { key: 'number', labelKey: 'auth.reqNumber', met: reqs.number },
    { key: 'special', labelKey: 'auth.reqSpecial', met: reqs.special },
  ];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{t('auth.passwordRequirements')}</span>
        <span className="text-xs font-medium" style={{ color: level.color }}>
          {t(level.labelKey)}
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: level.width, backgroundColor: level.color }}
        />
      </div>

      <ul className="space-y-1 pt-1">
        {requirementItems.map(({ key, labelKey, met }) => (
          <li key={key} className="flex items-center gap-2 text-xs">
            <span
              className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs"
              style={{
                backgroundColor: met ? '#10b981' : '#374151',
                color: met ? '#fff' : '#9ca3af',
              }}
            >
              {met ? '✓' : '·'}
            </span>
            <span className={met ? 'text-green-400' : 'text-gray-400'}>{t(labelKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { checkRequirements, computeScore };
