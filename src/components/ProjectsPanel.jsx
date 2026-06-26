/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Project tracking panel: create/select/delete projects, manage their tasks,
 * live-updated via the project:event socket channel.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2, ListChecks } from 'lucide-react';
import { projectService } from '../project-service.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useProjectSocket } from '../projects/useProjectSocket.js';

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'];
const TASK_STATUSES = ['todo', 'in_progress', 'done'];

export function ProjectsPanel() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.listProjects();
      setProjects(data.projects);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const upsertProject = useCallback((project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      return exists ? prev.map((p) => (p.id === project.id ? project : p)) : [...prev, project];
    });
  }, []);

  useProjectSocket(token, useCallback((event) => {
    if (event.type === 'PROJECT_DELETED') {
      setProjects((prev) => prev.filter((p) => p.id !== event.projectId));
      setSelectedId((id) => (id === event.projectId ? null : id));
    } else if (event.project) {
      upsertProject(event.project);
    }
  }, [upsertProject]));

  const selectedProject = projects.find((p) => p.id === selectedId) || null;

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setError(null);
    try {
      const data = await projectService.createProject({ name: newProjectName.trim() });
      upsertProject(data.project);
      setNewProjectName('');
      setSelectedId(data.project.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    setError(null);
    try {
      await projectService.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setSelectedId((id) => (id === projectId ? null : id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (projectId, status) => {
    setError(null);
    try {
      const data = await projectService.updateProject(projectId, { status });
      upsertProject(data.project);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!selectedProject || !newTaskTitle.trim()) return;
    setError(null);
    try {
      const data = await projectService.addTask(selectedProject.id, { title: newTaskTitle.trim() });
      upsertProject(data.project);
      setNewTaskTitle('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTaskStatusChange = async (taskId, status) => {
    if (!selectedProject) return;
    setError(null);
    try {
      const data = await projectService.updateTask(selectedProject.id, taskId, { status });
      upsertProject(data.project);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!selectedProject) return;
    setError(null);
    try {
      const data = await projectService.deleteTask(selectedProject.id, taskId);
      upsertProject(data.project);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="tool-content">
      <div className="panel-header">
        <ListChecks size={18} />
        <h3>Project Tracking</h3>
      </div>

      {error && <div className="empty-state" style={{ color: '#ef4444' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
          <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="New project name"
              style={{
                flex: 1, background: 'var(--bg-3)', color: 'var(--text-1)',
                border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px'
              }}
            />
            <button type="submit" className="template-card" style={{ padding: '6px 12px' }}>
              <Plus size={16} />
            </button>
          </form>

          {loading ? (
            <div className="empty-state"><Loader2 size={16} className="spin" /> Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="empty-state">No projects yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                    background: selectedId === p.id ? 'var(--bg-4)' : 'var(--bg-3)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      {p.status} · {p.tasks.length} task{p.tasks.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: '2 1 320px', minWidth: '280px' }}>
          {!selectedProject ? (
            <div className="empty-state">Select a project to view its tasks</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.9rem' }}>{selectedProject.name}</h4>
                <select
                  value={selectedProject.status}
                  onChange={(e) => handleStatusChange(selectedProject.id, e.target.value)}
                  style={{
                    background: 'var(--bg-3)', color: 'var(--text-1)',
                    border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px'
                  }}
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="New task title"
                  style={{
                    flex: 1, background: 'var(--bg-3)', color: 'var(--text-1)',
                    border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px'
                  }}
                />
                <button type="submit" className="template-card" style={{ padding: '6px 12px' }}>
                  <Plus size={16} />
                </button>
              </form>

              {selectedProject.tasks.length === 0 ? (
                <div className="empty-state">No tasks yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedProject.tasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: '6px',
                        background: 'var(--bg-3)', border: '1px solid var(--border)'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem' }}>{t.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={t.status}
                          onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                          style={{
                            background: 'var(--bg-2)', color: 'var(--text-1)',
                            border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 6px',
                            fontSize: '0.75rem'
                          }}
                        >
                          {TASK_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
