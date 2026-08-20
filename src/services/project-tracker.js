// ================================================
// File:        src/services/project-tracker.js
// Purpose:     Real-time project tracking for coding, game development, and
//              AR/VR/3D projects. Emits milestone, achievement, build and
//              telemetry events for the analytics + achievement dashboards.
// Created:     2026-08-20
// Last-edit:   2026-08-20
// Owner:       Nexus AI Pro platform team
// ================================================

import crypto from 'crypto';
import { EventEmitter } from 'events';

const PROJECT_KINDS = Object.freeze([
  'coding',       // generic software project
  'gamedev',      // game (any engine)
  'ar',           // augmented reality
  'vr',           // virtual reality
  '3d'           // 3D asset / modelling pipeline
]);

const BUILD_STATES = Object.freeze(['queued', 'building', 'passing', 'failing', 'cancelled']);

/**
 * Real-time project tracker.
 * Every mutation goes through _mutate() so subscribers always receive the
 * latest normalized state.
 */
export class ProjectTracker extends EventEmitter {
  constructor({ logger = console } = {}) {
    super();
    this.logger = logger;
    this.projects = new Map(); // id → Project
    this.timelines = new Map(); // id → event[]
  }

  createProject({ name, kind, ownerId, engine = null, platforms = [] }) {
    if (!PROJECT_KINDS.includes(kind)) throw new Error(`Invalid project kind: ${kind}`);
    const id = crypto.randomUUID();
    const project = {
      id,
      name,
      kind,
      engine,
      platforms,
      ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      progress: 0,
      milestones: [],
      achievements: [],
      build: { state: 'queued', updatedAt: Date.now(), history: [] },
      telemetry: { fps: null, memoryMb: null, drawCalls: null, lastSampleAt: null }
    };
    this.projects.set(id, project);
    this.timelines.set(id, [{ type: 'project.created', at: Date.now(), payload: { name, kind } }]);
    this.emit('project.created', project);
    return project;
  }

  addMilestone(projectId, { title, dueAt = null, weight = 1 }) {
    return this._mutate(projectId, (p) => {
      const milestone = {
        id: crypto.randomUUID(),
        title,
        weight,
        dueAt,
        completedAt: null
      };
      p.milestones.push(milestone);
      this._push(projectId, 'milestone.added', milestone);
      return milestone;
    });
  }

  completeMilestone(projectId, milestoneId) {
    return this._mutate(projectId, (p) => {
      const m = p.milestones.find((x) => x.id === milestoneId);
      if (!m) throw new Error('milestone not found');
      m.completedAt = Date.now();
      p.progress = weightedProgress(p.milestones);
      this._push(projectId, 'milestone.completed', { id: milestoneId });
      return m;
    });
  }

  /**
   * Record an achievement (used for gamedev + ar/vr as well as coding streaks).
   */
  unlockAchievement(projectId, { code, name, points = 10, platform = null }) {
    return this._mutate(projectId, (p) => {
      const ach = {
        id: crypto.randomUUID(),
        code,
        name,
        points,
        platform,
        unlockedAt: Date.now()
      };
      p.achievements.push(ach);
      this._push(projectId, 'achievement.unlocked', ach);
      this.emit('achievement', { projectId, achievement: ach });
      return ach;
    });
  }

  reportBuild(projectId, state, meta = {}) {
    if (!BUILD_STATES.includes(state)) throw new Error(`invalid build state: ${state}`);
    return this._mutate(projectId, (p) => {
      p.build.state = state;
      p.build.updatedAt = Date.now();
      p.build.history.push({ state, at: Date.now(), meta });
      while (p.build.history.length > 200) p.build.history.shift();
      this._push(projectId, 'build.updated', { state, meta });
      return p.build;
    });
  }

  reportTelemetry(projectId, sample) {
    return this._mutate(projectId, (p) => {
      p.telemetry = {
        ...p.telemetry,
        ...sample,
        lastSampleAt: Date.now()
      };
      this._push(projectId, 'telemetry.sample', sample);
      return p.telemetry;
    });
  }

  snapshot(filter = {}) {
    const rows = [];
    for (const p of this.projects.values()) {
      if (filter.kind && p.kind !== filter.kind) continue;
      if (filter.ownerId && p.ownerId !== filter.ownerId) continue;
      rows.push(p);
    }
    return {
      generatedAt: Date.now(),
      projectCount: rows.length,
      supportedKinds: PROJECT_KINDS,
      projects: rows
    };
  }

  timeline(projectId, limit = 100) {
    const t = this.timelines.get(projectId) || [];
    return t.slice(-limit);
  }

  _mutate(projectId, fn) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('project not found');
    const result = fn(project);
    project.updatedAt = Date.now();
    this.emit('project.updated', project);
    return result;
  }

  _push(projectId, type, payload) {
    const t = this.timelines.get(projectId) || [];
    t.push({ type, at: Date.now(), payload });
    while (t.length > 1000) t.shift();
    this.timelines.set(projectId, t);
  }

  wireSocket(io) {
    const relay = (event) => (payload) => io.to(`project:${payload.id || payload.projectId}`).emit(event, payload);
    this.on('project.created', relay('project:created'));
    this.on('project.updated', relay('project:updated'));
    this.on('achievement', relay('project:achievement'));
  }
}

function weightedProgress(milestones) {
  if (!milestones.length) return 0;
  const total = milestones.reduce((s, m) => s + m.weight, 0);
  const done = milestones.filter((m) => m.completedAt).reduce((s, m) => s + m.weight, 0);
  return total ? done / total : 0;
}

export const PROJECT_TRACKER_KINDS = PROJECT_KINDS;
export const PROJECT_BUILD_STATES = BUILD_STATES;
