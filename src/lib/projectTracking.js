// /home/user/nexus-ai-pro/src/lib/projectTracking.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

/**
 * In-memory project tracking with EventEmitter-based Socket.IO broadcasts.
 * Supports project types: coding, game-dev, ar-vr, 3d-modeling.
 * @module projectTracking
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROJECT_TYPES = Object.freeze(['coding', 'game-dev', 'ar-vr', '3d-modeling']);

export const PROJECT_STATUS = Object.freeze(['planning', 'in-progress', 'testing', 'done']);

export const GAME_ENGINES = Object.freeze(['Unreal', 'Unity', 'Godot', 'custom']);

export const AR_VR_PLATFORMS = Object.freeze(['Quest', 'PSVR', 'HoloLens', 'ARKit', 'ARCore']);

// ─── Typed Errors ─────────────────────────────────────────────────────────────

export class ProjectError extends Error {
  /** @param {string} message @param {string} [code] */
  constructor(message, code = 'PROJECT_ERROR') {
    super(message);
    this.name = 'ProjectError';
    this.code = code;
  }
}

export class ProjectNotFoundError extends ProjectError {
  /** @param {string} id */
  constructor(id) {
    super(`Project not found: ${id}`, 'PROJECT_NOT_FOUND');
    this.name = 'ProjectNotFoundError';
    this.id = id;
  }
}

export class ValidationError extends ProjectError {
  /** @param {string} message @param {string} [field] */
  constructor(message, field) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field ?? null;
  }
}

export class MilestoneNotFoundError extends ProjectError {
  /** @param {string} milestoneId @param {string} projectId */
  constructor(milestoneId, projectId) {
    super(`Milestone ${milestoneId} not found in project ${projectId}`, 'MILESTONE_NOT_FOUND');
    this.name = 'MilestoneNotFoundError';
    this.milestoneId = milestoneId;
    this.projectId = projectId;
  }
}

// ─── Type Definitions ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} Milestone
 * @property {string}  id
 * @property {string}  title
 * @property {number}  completion  0-100
 * @property {string}  dueDate     ISO 8601
 * @property {boolean} done
 */

/**
 * @typedef {Object} CodingMetrics
 * @property {Record<string, number>} locByLanguage  Lines of code keyed by language
 * @property {number}                 commitCount
 * @property {number}                 openPRs
 * @property {number}                 testCoverage    0-100
 * @property {'passing'|'failing'|'pending'|'unknown'} buildStatus
 */

/**
 * @typedef {Object} GameDevMetrics
 * @property {string}      engine         Unreal | Unity | Godot | custom
 * @property {string[]}    platformTargets
 * @property {Milestone[]} milestones
 * @property {number}      assetCount
 * @property {Record<string, number>} buildSizes  Bytes keyed by platform
 */

/**
 * @typedef {Object} ArVrMetrics
 * @property {number}   polygonBudgetUsed
 * @property {number}   polygonBudgetTotal
 * @property {number}   textureMemoryMB
 * @property {number}   sceneObjectCount
 * @property {string}   targetPlatform     Quest | PSVR | HoloLens | ARKit | ARCore
 * @property {number}   renderTargetFps
 */

/**
 * @typedef {Object} Project
 * @property {string}   id
 * @property {string}   name
 * @property {string}   description
 * @property {'coding'|'game-dev'|'ar-vr'|'3d-modeling'} type
 * @property {'planning'|'in-progress'|'testing'|'done'}  status
 * @property {string}   createdAt   ISO 8601
 * @property {string}   updatedAt   ISO 8601
 * @property {CodingMetrics|GameDevMetrics|ArVrMetrics|null} metrics
 */

// ─── Default Metrics Factories ────────────────────────────────────────────────

/**
 * Build default CodingMetrics.
 * @param {Partial<CodingMetrics>} [overrides]
 * @returns {CodingMetrics}
 */
function defaultCodingMetrics(overrides = {}) {
  return {
    locByLanguage: {},
    commitCount:   0,
    openPRs:       0,
    testCoverage:  0,
    buildStatus:   'unknown',
    ...overrides
  };
}

/**
 * Build default GameDevMetrics.
 * @param {Partial<GameDevMetrics>} [overrides]
 * @returns {GameDevMetrics}
 */
function defaultGameDevMetrics(overrides = {}) {
  return {
    engine:          'custom',
    platformTargets: [],
    milestones:      [],
    assetCount:      0,
    buildSizes:      {},
    ...overrides
  };
}

/**
 * Build default ArVr/3D metrics.
 * @param {Partial<ArVrMetrics>} [overrides]
 * @returns {ArVrMetrics}
 */
function defaultArVrMetrics(overrides = {}) {
  return {
    polygonBudgetUsed:  0,
    polygonBudgetTotal: 500000,
    textureMemoryMB:    0,
    sceneObjectCount:   0,
    targetPlatform:     'Quest',
    renderTargetFps:    72,
    ...overrides
  };
}

/**
 * Return the default metrics object for a given project type.
 * @param {'coding'|'game-dev'|'ar-vr'|'3d-modeling'} type
 * @param {object} [overrides]
 * @returns {CodingMetrics|GameDevMetrics|ArVrMetrics}
 */
function buildDefaultMetrics(type, overrides = {}) {
  if (type === 'coding')     return defaultCodingMetrics(overrides);
  if (type === 'game-dev')   return defaultGameDevMetrics(overrides);
  if (type === 'ar-vr')      return defaultArVrMetrics(overrides);
  if (type === '3d-modeling') return defaultArVrMetrics(overrides);
  return null;
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Validate that a string is non-empty.
 * @param {unknown} value
 * @param {string}  fieldName
 */
function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`Field "${fieldName}" must be a non-empty string`, fieldName);
  }
}

/**
 * Validate project type.
 * @param {unknown} type
 */
function requireProjectType(type) {
  if (!PROJECT_TYPES.includes(type)) {
    throw new ValidationError(
      `Invalid project type "${type}". Must be one of: ${PROJECT_TYPES.join(', ')}`,
      'type'
    );
  }
}

/**
 * Validate project status.
 * @param {unknown} status
 */
function requireProjectStatus(status) {
  if (!PROJECT_STATUS.includes(status)) {
    throw new ValidationError(
      `Invalid status "${status}". Must be one of: ${PROJECT_STATUS.join(', ')}`,
      'status'
    );
  }
}

// ─── Event Bus ────────────────────────────────────────────────────────────────

/** Shared EventEmitter used to broadcast project updates. */
export const projectEvents = new EventEmitter();
projectEvents.setMaxListeners(50);

/** Reference to the Socket.IO server instance (set via attachSocketIO). */
let _io = null;

/**
 * Attach a Socket.IO server so that project updates are broadcast over WebSockets.
 * @param {import('socket.io').Server} io
 */
export function attachSocketIO(io) {
  _io = io;
}

/**
 * Emit a 'project:update' event for the given project, both locally and over Socket.IO.
 * @param {string} projectId
 */
export function emitUpdate(projectId) {
  const project = _store.get(projectId);
  if (!project) return;

  projectEvents.emit('project:update', { projectId, project });

  if (_io) {
    _io.emit('project:update', { projectId, project });
  }
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

// TODO: Replace with DB persistence (e.g. Postgres via pg or Prisma)
const _store = new Map();

// ─── CRUD Operations ──────────────────────────────────────────────────────────

/**
 * Create a new project.
 * @param {{ name: string, description?: string, type: string, status?: string, metrics?: object }} input
 * @returns {Project}
 */
export function createProject(input) {
  requireString(input.name, 'name');
  requireProjectType(input.type);

  const status = input.status ?? 'planning';
  requireProjectStatus(status);

  const now = new Date().toISOString();
  const id  = randomUUID();

  /** @type {Project} */
  const project = {
    id,
    name:        input.name.trim(),
    description: String(input.description ?? '').trim(),
    type:        input.type,
    status,
    createdAt:   now,
    updatedAt:   now,
    // TODO: Persist metrics as a separate DB relation
    metrics:     buildDefaultMetrics(input.type, input.metrics ?? {})
  };

  _store.set(id, project);
  emitUpdate(id);
  return project;
}

/**
 * Retrieve a project by ID.
 * @param {string} id
 * @returns {Project}
 */
export function getProject(id) {
  const project = _store.get(id);
  if (!project) throw new ProjectNotFoundError(id);
  return project;
}

/**
 * List all projects, optionally filtered by type or status.
 * @param {{ type?: string, status?: string }} [filters]
 * @returns {Project[]}
 */
export function listProjects(filters = {}) {
  let results = [..._store.values()];

  if (filters.type)   results = results.filter(p => p.type === filters.type);
  if (filters.status) results = results.filter(p => p.status === filters.status);

  // TODO: Replace with DB ORDER BY createdAt DESC
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Update an existing project's top-level fields and/or metrics.
 * @param {string} id
 * @param {{ name?: string, description?: string, status?: string, metrics?: object }} patch
 * @returns {Project}
 */
export function updateProject(id, patch) {
  const project = getProject(id);

  if (patch.name !== undefined) {
    requireString(patch.name, 'name');
    project.name = patch.name.trim();
  }

  if (patch.description !== undefined) {
    project.description = String(patch.description).trim();
  }

  if (patch.status !== undefined) {
    requireProjectStatus(patch.status);
    project.status = patch.status;
  }

  if (patch.metrics !== undefined && typeof patch.metrics === 'object') {
    project.metrics = { ...project.metrics, ...patch.metrics };
  }

  project.updatedAt = new Date().toISOString();

  // TODO: Persist to DB
  _store.set(id, project);
  emitUpdate(id);
  return project;
}

/**
 * Delete a project by ID.
 * @param {string} id
 * @returns {{ deleted: boolean, id: string }}
 */
export function deleteProject(id) {
  if (!_store.has(id)) throw new ProjectNotFoundError(id);

  _store.delete(id);

  // Notify listeners that project was removed
  projectEvents.emit('project:delete', { projectId: id });
  if (_io) _io.emit('project:delete', { projectId: id });

  // TODO: Remove from DB
  return { deleted: true, id };
}

/**
 * Update a specific milestone within a game-dev project's metrics.
 * @param {string} projectId
 * @param {string} milestoneId
 * @param {{ title?: string, completion?: number, dueDate?: string, done?: boolean }} patch
 * @returns {Project}
 */
export function updateMilestone(projectId, milestoneId, patch) {
  const project = getProject(projectId);

  if (project.type !== 'game-dev') {
    throw new ValidationError('Milestones are only supported on game-dev projects', 'milestones');
  }

  const milestones = project.metrics?.milestones ?? [];
  const idx = milestones.findIndex(m => m.id === milestoneId);

  if (idx === -1) throw new MilestoneNotFoundError(milestoneId, projectId);

  const milestone = milestones[idx];

  if (patch.title      !== undefined) milestone.title      = String(patch.title).trim();
  if (patch.completion !== undefined) milestone.completion = Math.min(100, Math.max(0, Number(patch.completion)));
  if (patch.dueDate    !== undefined) milestone.dueDate    = String(patch.dueDate);
  if (patch.done       !== undefined) milestone.done       = Boolean(patch.done);

  if (milestone.completion >= 100) milestone.done = true;

  milestones[idx]        = milestone;
  project.metrics.milestones = milestones;
  project.updatedAt      = new Date().toISOString();

  // TODO: Persist to DB
  _store.set(projectId, project);
  emitUpdate(projectId);
  return project;
}

/**
 * Add a new milestone to a game-dev project.
 * @param {string} projectId
 * @param {{ title: string, dueDate?: string }} milestoneInput
 * @returns {Project}
 */
export function addMilestone(projectId, milestoneInput) {
  const project = getProject(projectId);

  if (project.type !== 'game-dev') {
    throw new ValidationError('Milestones are only supported on game-dev projects', 'milestones');
  }

  requireString(milestoneInput.title, 'title');

  /** @type {Milestone} */
  const milestone = {
    id:         randomUUID(),
    title:      milestoneInput.title.trim(),
    completion: 0,
    dueDate:    milestoneInput.dueDate ?? '',
    done:       false
  };

  project.metrics.milestones.push(milestone);
  project.updatedAt = new Date().toISOString();

  // TODO: Persist to DB
  _store.set(projectId, project);
  emitUpdate(projectId);
  return project;
}

/**
 * Return a summary count of projects grouped by status.
 * @returns {Record<string, number>}
 */
export function getProjectSummary() {
  const summary = Object.fromEntries(PROJECT_STATUS.map(s => [s, 0]));

  for (const project of _store.values()) {
    summary[project.status] = (summary[project.status] ?? 0) + 1;
  }

  return summary;
}
