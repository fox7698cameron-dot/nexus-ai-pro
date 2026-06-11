// src/auth/auth.service.js
// JWT issuance, refresh, and revocation; role-based token claims
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { ROLE_PERMISSIONS } from '../config/constants.js';

const ACCESS_TOKEN_TTL = env.JWT_EXPIRES_IN;
const REFRESH_TOKEN_TTL = env.JWT_REFRESH_EXPIRES_IN;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET || env.JWT_SECRET + '_refresh';

// Enumerate token types — never compare raw strings in switch statements
export const TOKEN_TYPE = Object.freeze({ ACCESS: 'access', REFRESH: 'refresh', EMAIL: 'email', RESET: 'reset' });

export function signAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role] ?? [],
    plan: user.plan ?? 'free',
    type: TOKEN_TYPE.ACCESS,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    algorithm: 'HS512',
    issuer: 'nexus-ai-pro',
    audience: 'nexus-app',
  });
}

export function signRefreshToken(userId) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const payload = { sub: userId, type: TOKEN_TYPE.REFRESH, jti: crypto.randomUUID() };
  const signed = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
    algorithm: 'HS512',
    issuer: 'nexus-ai-pro',
  });
  return { rawToken, hash, signed };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS512'],
    issuer: 'nexus-ai-pro',
    audience: 'nexus-app',
  });
}

export function verifyRefreshTokenJwt(token) {
  return jwt.verify(token, REFRESH_SECRET, {
    algorithms: ['HS512'],
    issuer: 'nexus-ai-pro',
  });
}

export function signShortLivedToken(userId, type, ttlMinutes = 60) {
  return jwt.sign(
    { sub: userId, type, jti: crypto.randomUUID() },
    env.JWT_SECRET,
    { expiresIn: `${ttlMinutes}m`, algorithm: 'HS512', issuer: 'nexus-ai-pro' }
  );
}

export function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
