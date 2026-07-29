/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Project tracking: coding, game dev, AR/VR, 3D projects
 */

import { v4 as uuidv4 } from 'uuid';

const projects = new Map();
const milestones = new Map();
const metrics = new Map();

const PROJECT_TYPES = Object.freeze([
  'coding', 'game_dev', 'ar_vr', '3d_art', 'mobile_app', 'web_app',
  'desktop_app', 'embedded', 'ai_ml', 'data_pipeline', 'devops', 'other'
]);

const TECH_STACKS = Object.freeze({
  coding:     ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'Java', 'C#', 'C++', 'Swift', 'Kotlin'],
  game_dev:   ['Unreal Engine', 'Unity', 'Godot', 'CryEngine', 'C++', 'C#', 'Blueprints'],
  ar_vr:      ['Unity XR', 'Unreal VR', 'WebXR', 'ARKit', 'ARCore', 'OpenXR', 'C++', 'C#'],
  '3d_art':   ['Blender', 'Maya', 'Cinema 4D', 'Houdini', 'ZBrush', 'Substance Painter'],
  mobile_app: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Capacitor', 'Ionic'],
  web_app:    ['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Node.js', 'TypeScript'],
  desktop_app:['Electron', 'Tauri', 'Qt', 'WPF', 'Swift', 'C++'],
  ai_ml:      ['Python', 'TensorFlow', 'PyTorch', 'JAX', 'ONNX', 'CUDA', 'C++']
});

const GAME_PLATFORMS = Object.freeze([
  'pc_windows', 'pc_linux', 'pc_macos', 'ps5', 'ps4', 'xbox_series', 'xbox_one',
  'nintendo_switch', 'mobile_ios', 'mobile_android', 'vr_meta', 'vr_psvr', 'web'
]);

// CRUD
export function createProject(userId, data) {
  const { name, type, description = '', techStack = [], platforms = [], teamSize = 1, estimatedHours } = data;

  if (!name?.trim()) return { error: 'Project name required', status: 400 };
  if (!PROJECT_TYPES.includes(type)) return { error: 'Invalid project type', status: 400 };

  const projectId = uuidv4();
  const project = {
    id: projectId,
    userId,
    name: name.trim(),
    type,
    description,
    techStack,
    platforms,
    teamSize,
    estimatedHours: estimatedHours || null,
    loggedHours: 0,
    status: 'planning',
    progress: 0,
    priority: data.priority || 'medium',
    tags: data.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startDate: data.startDate || null,
    targetDate: data.targetDate || null
  };

  projects.set(projectId, project);
  milestones.set(projectId, []);
  metrics.set(projectId, { commits: 0, linesChanged: 0, bugsFixed: 0, featuresCompleted: 0, testCoverage: 0 });

  return { project, status: 201 };
}

export function updateProject(userId, projectId, updates) {
  const project = projects.get(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  if (project.userId !== userId) return { error: 'Forbidden', status: 403 };

  const allowed = ['name', 'description', 'status', 'progress', 'techStack', 'platforms',
    'teamSize', 'estimatedHours', 'loggedHours', 'priority', 'tags', 'startDate', 'targetDate'];

  for (const key of allowed) {
    if (updates[key] !== undefined) project[key] = updates[key];
  }
  project.updatedAt = new Date().toISOString();

  return { project, status: 200 };
}

export function deleteProject(userId, projectId) {
  const project = projects.get(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  if (project.userId !== userId) return { error: 'Forbidden', status: 403 };

  projects.delete(projectId);
  milestones.delete(projectId);
  metrics.delete(projectId);
  return { status: 200 };
}

export function getProject(userId, projectId) {
  const project = projects.get(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  if (project.userId !== userId) return { error: 'Forbidden', status: 403 };

  return {
    project,
    milestones: milestones.get(projectId) || [],
    metrics: metrics.get(projectId) || {},
    status: 200
  };
}

export function listProjects(userId, filters = {}) {
  const list = [];
  for (const p of projects.values()) {
    if (p.userId !== userId) continue;
    if (filters.type && p.type !== filters.type) continue;
    if (filters.status && p.status !== filters.status) continue;
    list.push(p);
  }
  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return { projects: list, total: list.length, status: 200 };
}

// Milestones
export function addMilestone(userId, projectId, data) {
  const project = projects.get(projectId);
  if (!project || project.userId !== userId) return { error: 'Project not found', status: 404 };

  const milestone = {
    id: uuidv4(),
    projectId,
    title: data.title,
    description: data.description || '',
    dueDate: data.dueDate || null,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString()
  };

  const list = milestones.get(projectId) || [];
  list.push(milestone);
  milestones.set(projectId, list);

  return { milestone, status: 201 };
}

export function completeMilestone(userId, projectId, milestoneId) {
  const project = projects.get(projectId);
  if (!project || project.userId !== userId) return { error: 'Project not found', status: 404 };

  const list = milestones.get(projectId) || [];
  const ms = list.find(m => m.id === milestoneId);
  if (!ms) return { error: 'Milestone not found', status: 404 };

  ms.completed = true;
  ms.completedAt = new Date().toISOString();

  const totalMs = list.length;
  const doneMs = list.filter(m => m.completed).length;
  if (totalMs > 0) {
    project.progress = Math.round((doneMs / totalMs) * 100);
    project.updatedAt = new Date().toISOString();
  }

  return { milestone: ms, progress: project.progress, status: 200 };
}

// Dev metrics
export function updateMetrics(userId, projectId, updates) {
  const project = projects.get(projectId);
  if (!project || project.userId !== userId) return { error: 'Project not found', status: 404 };

  const current = metrics.get(projectId) || {};
  const allowed = ['commits', 'linesChanged', 'bugsFixed', 'featuresCompleted', 'testCoverage',
    'buildTime', 'deployCount', 'openIssues', 'closedIssues', 'pullRequests'];

  for (const key of allowed) {
    if (updates[key] !== undefined) current[key] = updates[key];
  }
  current.updatedAt = new Date().toISOString();
  metrics.set(projectId, current);

  return { metrics: current, status: 200 };
}

export function logHours(userId, projectId, hours, note = '') {
  const project = projects.get(projectId);
  if (!project || project.userId !== userId) return { error: 'Project not found', status: 404 };

  project.loggedHours = (project.loggedHours || 0) + hours;
  project.updatedAt = new Date().toISOString();

  const m = metrics.get(projectId) || {};
  if (!m.timeLog) m.timeLog = [];
  m.timeLog.push({ hours, note, timestamp: new Date().toISOString() });
  if (m.timeLog.length > 200) m.timeLog.splice(0, m.timeLog.length - 200);
  metrics.set(projectId, m);

  return { loggedHours: project.loggedHours, status: 200 };
}

export function getDashboardSummary(userId) {
  const userProjects = [];
  for (const p of projects.values()) {
    if (p.userId === userId) userProjects.push(p);
  }

  const byType = {};
  const byStatus = {};
  let totalHours = 0;

  for (const p of userProjects) {
    byType[p.type] = (byType[p.type] || 0) + 1;
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    totalHours += p.loggedHours || 0;
  }

  return {
    total: userProjects.length,
    byType,
    byStatus,
    totalHours,
    recentProjects: userProjects.slice(0, 5),
    status: 200
  };
}

export { PROJECT_TYPES, TECH_STACKS, GAME_PLATFORMS };
