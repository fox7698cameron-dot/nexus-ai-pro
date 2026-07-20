// middleware/validation.js - 2026-07-20
import { body, param, query, validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

export const passwordRules = body('password')
  .isLength({ min: 13 })
  .withMessage('Password must be at least 13 characters')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
  .matches(/[0-9]/).withMessage('Password must contain a number')
  .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character');

export const emailRules = body('email')
  .isEmail().withMessage('Valid email required')
  .normalizeEmail();

// Username: allow any unicode grapheme including emoji, 2-64 chars
export const displayNameRules = body('displayName')
  .trim()
  .isLength({ min: 2, max: 64 })
  .withMessage('Display name must be 2-64 characters');
