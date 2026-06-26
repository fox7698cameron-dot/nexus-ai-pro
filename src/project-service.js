/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Project tracking service (projects + tasks, owned by the logged-in user).
 */

export class ProjectService {
  constructor(apiBaseUrl = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  authHeaders() {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('nexus:authToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async handle(response, fallbackError) {
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || fallbackError);
    }
    return response.json();
  }

  async listProjects() {
    const response = await fetch(`${this.apiBaseUrl}/projects`, { headers: this.authHeaders() });
    return this.handle(response, 'Failed to fetch projects');
  }

  async createProject({ name, description, status }) {
    const response = await fetch(`${this.apiBaseUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ name, description, status })
    });
    return this.handle(response, 'Failed to create project');
  }

  async updateProject(projectId, updates) {
    const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify(updates)
    });
    return this.handle(response, 'Failed to update project');
  }

  async deleteProject(projectId) {
    const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.authHeaders()
    });
    return this.handle(response, 'Failed to delete project');
  }

  async addTask(projectId, { title, status }) {
    const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ title, status })
    });
    return this.handle(response, 'Failed to add task');
  }

  async updateTask(projectId, taskId, updates) {
    const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify(updates)
    });
    return this.handle(response, 'Failed to update task');
  }

  async deleteTask(projectId, taskId) {
    const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.authHeaders()
    });
    return this.handle(response, 'Failed to delete task');
  }
}

export const projectService = new ProjectService();
