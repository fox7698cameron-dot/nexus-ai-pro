// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const UserDashboard = lazy(() => import('../pages/UserDashboard.jsx'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard.jsx'));
const DevDashboard = lazy(() => import('../pages/DevDashboard.jsx'));
const ModeratorDashboard = lazy(() => import('../pages/ModeratorDashboard.jsx'));
const AnalyticsDashboard = lazy(() => import('../pages/AnalyticsDashboard.jsx'));
const SecurityDashboardPage = lazy(() => import('../pages/SecurityDashboardPage.jsx'));
const ProjectTracker = lazy(() => import('../pages/ProjectTracker.jsx'));
const GameTracker = lazy(() => import('../pages/GameTracker.jsx'));

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white gap-6">
      <div className="text-8xl font-bold text-purple-500">404</div>
      <p className="text-2xl text-gray-300">Page Not Found</p>
      <p className="text-gray-500">The page you are looking for does not exist.</p>
      <a
        href="/"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition"
      >
        Go Home
      </a>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white gap-6">
      <div className="text-8xl font-bold text-red-500">403</div>
      <p className="text-2xl text-gray-300">Access Denied</p>
      <p className="text-gray-500">You do not have permission to view this page.</p>
      <a
        href="/dashboard"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold hover:opacity-90 transition"
      >
        Go to Dashboard
      </a>
    </div>
  );
}

function AuthModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl text-white">
        <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
        <p className="text-gray-400 mb-6">Please log in to access this page.</p>
        <div className="flex gap-3">
          <a
            href="/"
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-center hover:opacity-90 transition"
          >
            Go to Login
          </a>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <AuthModal />;
  if (roles && !roles.some((r) => hasRole(r))) return <Forbidden />;

  return children;
}

function Checkout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white gap-6">
      <div className="bg-[#111118] border border-white/10 rounded-2xl p-10 w-full max-w-lg shadow-2xl">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Checkout
        </h2>
        <p className="text-gray-400 mb-6">Complete your subscription upgrade.</p>
        <div className="space-y-4">
          <div className="flex justify-between text-gray-300">
            <span>Account</span>
            <span className="font-mono">{user?.email}</span>
          </div>
          <div className="border-t border-white/10 pt-4 flex justify-between font-semibold text-lg">
            <span>Plan</span>
            <span className="text-purple-400">Pro — $29/month</span>
          </div>
        </div>
        <button className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition">
          Proceed to Payment
        </button>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const NexusAI = lazy(() => import('../../app.jsx'));
  return (
    <Suspense fallback={<Spinner />}>
      <NexusAI />
    </Suspense>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <UserDashboard initialTab="settings" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dev"
            element={
              <ProtectedRoute roles={['developer', 'admin']}>
                <DevDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mod"
            element={
              <ProtectedRoute roles={['moderator', 'admin']}>
                <ModeratorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <SecurityDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectTracker />
              </ProtectedRoute>
            }
          />

          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <GameTracker />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
