/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Admin user-management table: lists accounts, allows role changes.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../admin-service.js';
import { useAuth } from '../auth/AuthContext.jsx';

const ROLES = ['admin', 'developer', 'moderator', 'user'];

export function AdminUserTable() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.listUsers();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId, role) => {
    setUpdatingId(userId);
    setError(null);
    try {
      const data = await adminService.updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p style={{ color: '#6b7280' }}>Loading users…</p>;
  }

  return (
    <div>
      {error && <p style={{ color: '#f87171', marginBottom: '12px' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #26262e' }}>
            <th style={{ padding: '8px 4px', color: '#6b7280' }}>Name</th>
            <th style={{ padding: '8px 4px', color: '#6b7280' }}>Email</th>
            <th style={{ padding: '8px 4px', color: '#6b7280' }}>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #1c1c22' }}>
              <td style={{ padding: '8px 4px' }}>{u.displayName}</td>
              <td style={{ padding: '8px 4px', color: '#9ca3af' }}>{u.email}</td>
              <td style={{ padding: '8px 4px' }}>
                <select
                  value={u.role}
                  disabled={u.id === currentUser?.id || updatingId === u.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  style={{
                    background: '#0a0a0c',
                    color: '#ffffff',
                    border: '1px solid #26262e',
                    borderRadius: '6px',
                    padding: '4px 8px'
                  }}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
