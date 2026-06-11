// src/services/project-tracker.service.js
// Real-time project tracking — coding, game dev, AR/VR/3D, with engine connectors
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { PROJECT_TYPES } from '../config/constants.js';

export const projectEvents = new EventEmitter();

// In-memory project store (backed by DB in production via route layer)
const _projects = new Map();

export function createProject(userId, data) {
  const id = crypto.randomUUID();
  const project = {
    id,
    userId,
    name: data.name,
    description: data.description ?? '',
    type: data.type,
    engine: data.engine ?? null,
    platforms: data.platforms ?? [],
    status: 'active',
    progress: 0,
    milestones: [],
    repoUrl: data.repoUrl ?? null,
    buildUrl: data.buildUrl ?? null,
    buildStatus: null,
    lastCommit: null,
    lastBuild: null,
    tags: data.tags ?? [],
    metrics: {
      linesOfCode: 0,
      commits: 0,
      openIssues: 0,
      closedIssues: 0,
      buildCount: 0,
      testCoverage: 0,
      polygonCount: 0,       // 3D/AR/VR specific
      textureCount: 0,
      sceneCount: 0,
      blueprintCount: 0,     // Unreal specific
      scriptCount: 0,
    },
    collaborators: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  _projects.set(id, project);
  projectEvents.emit('project:created', { userId, project });
  return project;
}

export function getProject(projectId) {
  return _projects.get(projectId) ?? null;
}

export function getUserProjects(userId, type = null) {
  const all = [..._projects.values()].filter(p => p.userId === userId);
  return type ? all.filter(p => p.type === type) : all;
}

export function updateProjectMetrics(projectId, metrics) {
  const project = _projects.get(projectId);
  if (!project) return null;
  project.metrics = { ...project.metrics, ...metrics };
  project.updatedAt = new Date().toISOString();
  projectEvents.emit('project:metrics', { projectId, metrics: project.metrics });
  return project;
}

export function updateProgress(projectId, progress, buildStatus = null) {
  const project = _projects.get(projectId);
  if (!project) return null;
  project.progress = Math.min(100, Math.max(0, progress));
  if (buildStatus) project.buildStatus = buildStatus;
  project.lastBuild = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  projectEvents.emit('project:progress', { projectId, progress: project.progress, buildStatus });
  return project;
}

export function addMilestone(projectId, milestone) {
  const project = _projects.get(projectId);
  if (!project) return null;
  const m = {
    id: crypto.randomUUID(),
    title: milestone.title,
    description: milestone.description ?? '',
    dueDate: milestone.dueDate ?? null,
    completedAt: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  project.milestones.push(m);
  project.updatedAt = new Date().toISOString();
  projectEvents.emit('project:milestone_added', { projectId, milestone: m });
  return m;
}

export function completeMilestone(projectId, milestoneId) {
  const project = _projects.get(projectId);
  if (!project) return null;
  const m = project.milestones.find(x => x.id === milestoneId);
  if (!m) return null;
  m.status = 'completed';
  m.completedAt = new Date().toISOString();
  const completed = project.milestones.filter(x => x.status === 'completed').length;
  project.progress = project.milestones.length
    ? Math.round((completed / project.milestones.length) * 100)
    : project.progress;
  project.updatedAt = new Date().toISOString();
  projectEvents.emit('project:milestone_completed', { projectId, milestoneId });
  return m;
}

// Game engine specific webhook ingestion
export function ingestEngineEvent(projectId, engine, eventType, payload) {
  const project = _projects.get(projectId);
  if (!project) return null;
  const event = {
    id: crypto.randomUUID(),
    projectId,
    engine,
    eventType,
    payload,
    receivedAt: new Date().toISOString(),
  };

  // Update metrics based on event type
  if (eventType === 'build.complete') {
    project.metrics.buildCount = (project.metrics.buildCount ?? 0) + 1;
    project.lastBuild = event.receivedAt;
    project.buildStatus = payload.success ? 'success' : 'failed';
  } else if (eventType === 'commit') {
    project.metrics.commits = (project.metrics.commits ?? 0) + 1;
    project.lastCommit = event.receivedAt;
  } else if (eventType === 'test.run') {
    project.metrics.testCoverage = payload.coverage ?? project.metrics.testCoverage;
  }

  project.updatedAt = event.receivedAt;
  projectEvents.emit('engine:event', event);
  return event;
}

// AR/VR/3D asset tracking
export function updateAssetMetrics(projectId, assetMetrics) {
  const project = _projects.get(projectId);
  if (!project) return null;
  const { polygons, textures, scenes, shaders } = assetMetrics;
  if (polygons !== undefined) project.metrics.polygonCount = polygons;
  if (textures !== undefined) project.metrics.textureCount = textures;
  if (scenes !== undefined) project.metrics.sceneCount = scenes;
  if (shaders !== undefined) project.metrics.shaderCount = shaders;
  project.updatedAt = new Date().toISOString();
  projectEvents.emit('project:assets', { projectId, assetMetrics });
  return project;
}

export function deleteProject(projectId, userId) {
  const project = _projects.get(projectId);
  if (!project || project.userId !== userId) return false;
  _projects.delete(projectId);
  projectEvents.emit('project:deleted', { projectId, userId });
  return true;
}
