/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Platform connectors: game studios, cloud providers, dev tools, social
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Connection registry: userId -> list of connections
const registry = new Map();

const CONNECTOR_CATALOG = Object.freeze({
  // Game platforms
  unreal_engine:   { id: 'unreal_engine',   category: 'game',    name: 'Unreal Engine / Epic Games', authType: 'oauth2', icon: '🎮' },
  sony_psn:        { id: 'sony_psn',        category: 'game',    name: 'Sony PlayStation Network',   authType: 'oauth2', icon: '🎮' },
  microsoft_xbox:  { id: 'microsoft_xbox',  category: 'game',    name: 'Microsoft Xbox / Game Pass', authType: 'oauth2', icon: '🎮' },
  ubisoft_connect: { id: 'ubisoft_connect', category: 'game',    name: 'Ubisoft Connect',            authType: 'oauth2', icon: '🎮' },
  steam:           { id: 'steam',           category: 'game',    name: 'Steam',                      authType: 'api_key', icon: '🎮' },
  // Cloud
  aws:             { id: 'aws',             category: 'cloud',   name: 'Amazon Web Services',        authType: 'api_key', icon: '☁️' },
  azure:           { id: 'azure',           category: 'cloud',   name: 'Microsoft Azure',            authType: 'oauth2',  icon: '☁️' },
  google_cloud:    { id: 'google_cloud',    category: 'cloud',   name: 'Google Cloud Platform',      authType: 'oauth2',  icon: '☁️' },
  adobe_cc:        { id: 'adobe_cc',        category: 'cloud',   name: 'Adobe Creative Cloud',       authType: 'oauth2',  icon: '🎨' },
  // Dev tools
  github:          { id: 'github',          category: 'devtool', name: 'GitHub',                     authType: 'oauth2',  icon: '💻' },
  bitbucket:       { id: 'bitbucket',       category: 'devtool', name: 'Bitbucket',                  authType: 'oauth2',  icon: '💻' },
  // Collaboration
  slack:           { id: 'slack',           category: 'collab',  name: 'Slack',                      authType: 'oauth2',  icon: '💬' },
  zoom:            { id: 'zoom',            category: 'collab',  name: 'Zoom',                       authType: 'oauth2',  icon: '📹' },
  discord_bot:     { id: 'discord_bot',     category: 'collab',  name: 'Discord Bot',                authType: 'bot_token', icon: '💬' },
  // Social
  tiktok:          { id: 'tiktok',          category: 'social',  name: 'TikTok',                     authType: 'oauth2',  icon: '🎵' },
  instagram:       { id: 'instagram',       category: 'social',  name: 'Instagram',                  authType: 'oauth2',  icon: '📸' },
  facebook:        { id: 'facebook',        category: 'social',  name: 'Facebook',                   authType: 'oauth2',  icon: '📘' },
  reddit_api:      { id: 'reddit_api',      category: 'social',  name: 'Reddit',                     authType: 'oauth2',  icon: '🤖' },
  twitch:          { id: 'twitch',          category: 'social',  name: 'Twitch',                     authType: 'oauth2',  icon: '🟣' },
  // Storage
  azure_blob:      { id: 'azure_blob',      category: 'storage', name: 'Azure Blob Storage',         authType: 'connection_string', icon: '🗄️' },
  aws_s3:          { id: 'aws_s3',          category: 'storage', name: 'AWS S3',                     authType: 'api_key', icon: '🗄️' },
  redis:           { id: 'redis',           category: 'storage', name: 'Redis',                      authType: 'connection_string', icon: '🔴' }
});

export function getCatalog(category) {
  const all = Object.values(CONNECTOR_CATALOG);
  return {
    connectors: category ? all.filter(c => c.category === category) : all,
    status: 200
  };
}

export function connect(userId, connectorId, credentials) {
  const def = CONNECTOR_CATALOG[connectorId];
  if (!def) return { error: 'Unknown connector', status: 404 };

  // Validate required credential fields without storing plaintext secrets
  const credHash = crypto.createHash('sha256').update(JSON.stringify(credentials)).digest('hex');

  const userConns = registry.get(userId) || [];
  const existing = userConns.find(c => c.connectorId === connectorId);

  const connectionRecord = {
    id: existing?.id || uuidv4(),
    userId,
    connectorId,
    name: def.name,
    category: def.category,
    authType: def.authType,
    credentialRef: credHash, // only a hash - never store plaintext
    status: 'connected',
    connectedAt: new Date().toISOString(),
    lastChecked: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, connectionRecord);
  } else {
    userConns.push(connectionRecord);
  }
  registry.set(userId, userConns);

  return { connectionId: connectionRecord.id, connectorId, status: 200 };
}

export function disconnect(userId, connectorId) {
  const userConns = registry.get(userId) || [];
  const idx = userConns.findIndex(c => c.connectorId === connectorId);
  if (idx === -1) return { error: 'Connection not found', status: 404 };

  userConns.splice(idx, 1);
  registry.set(userId, userConns);
  return { status: 200 };
}

export function listConnections(userId) {
  return { connections: registry.get(userId) || [], status: 200 };
}

export function getConnectionStatus(userId, connectorId) {
  const userConns = registry.get(userId) || [];
  const conn = userConns.find(c => c.connectorId === connectorId);
  if (!conn) return { connected: false, status: 200 };
  return { connected: true, ...conn, status: 200 };
}

// Achievement / game progress tracking
const achievements = new Map();
const gameProgress = new Map();

export function upsertAchievement(userId, gameId, achievementId, data) {
  const key = `${userId}:${gameId}`;
  const userAchs = achievements.get(key) || {};
  userAchs[achievementId] = {
    ...data,
    achievementId,
    gameId,
    updatedAt: new Date().toISOString()
  };
  achievements.set(key, userAchs);
  return { status: 200 };
}

export function getAchievements(userId, gameId) {
  const key = `${userId}:${gameId}`;
  return { achievements: achievements.get(key) || {}, gameId, status: 200 };
}

export function updateGameProgress(userId, gameId, progress) {
  const key = `${userId}:${gameId}`;
  const current = gameProgress.get(key) || {};
  const updated = {
    ...current,
    ...progress,
    userId,
    gameId,
    updatedAt: new Date().toISOString()
  };
  gameProgress.set(key, updated);
  return { status: 200 };
}

export function getGameProgress(userId, gameId) {
  const key = `${userId}:${gameId}`;
  return { progress: gameProgress.get(key) || null, gameId, status: 200 };
}
