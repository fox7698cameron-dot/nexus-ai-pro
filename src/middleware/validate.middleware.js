// src/middleware/validate.middleware.js
// Input sanitisation and Zod schema validation
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { z } from 'zod';

// Wrap a Zod schema into Express middleware that validates req.body
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    req.body = result.data; // use parsed + coerced values
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(422).json({
        error: 'Query validation failed',
        issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    req.query = result.data;
    next();
  };
}

// Common reusable field schemas
export const Schemas = {
  register: z.object({
    username: z.string().min(2).max(64),
    email: z.string().email(),
    password: z.string().min(13),
    displayName: z.string().max(128).optional(),
    locale: z.string().max(10).optional(),
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    mfaToken: z.string().optional(),
    mfaMethod: z.enum(['totp', 'backup_code', 'email', 'sms']).optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(13),
  }),

  projectCreate: z.object({
    name: z.string().min(1).max(128),
    description: z.string().max(2000).optional(),
    type: z.enum(['coding', 'game_dev', 'ar_vr', '3d', 'app_dev', 'web_dev']),
    engine: z.string().max(64).optional(),
    platforms: z.array(z.string()).optional(),
    repoUrl: z.string().url().optional(),
    tags: z.array(z.string().max(32)).max(20).optional(),
  }),

  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};
