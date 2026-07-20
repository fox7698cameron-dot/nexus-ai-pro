// src/AppRouter.jsx - 2026-07-20
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './auth/useAuth.jsx';
import '../src/i18n/index.js';

// Auth pages (eager loaded — small)
import LoginPage from './auth/LoginPage.jsx';
import RegisterPage from './auth/RegisterPage.jsx';

// Main app (lazy loaded)
const NexusApp = lazy(() => import('../app.jsx'));
const AnalyticsDashboard = lazy(() => import('./dashboards/analytics/AnalyticsDashboard.jsx'));
const EnhancedSecurityDashboard = lazy(() => import('./dashboards/security/EnhancedSecurityDashboard.jsx'));
const ProjectDashboard = lazy(() => import('./dashboards/projects/ProjectDashboard.jsx'));
const GameDevTracker = lazy(() => import('./dashboards/projects/GameDevTracker.jsx'));
const ARVRTracker = lazy(() => import('./dashboards/projects/ARVRTracker.jsx'));
const AdminDashboard = lazy(() => import('./dashboards/roles/AdminDashboard.jsx'));
const DevDashboard = lazy(() => import('./dashboards/roles/DevDashboard.jsx'));
const ModeratorDashboard = lazy(() => import('./dashboards/roles/ModeratorDashboard.jsx'));
const UserDashboard = lazy(() => import('./dashboards/roles/UserDashboard.jsx'));
const SubscriptionPlans = lazy(() => import('./payments/SubscriptionPlans.jsx'));
const GamingConnectors = lazy(() => import('./connectors/gaming/GamingConnectors.jsx'));
const AchievementTracker = lazy(() => import('./connectors/gaming/AchievementTracker.jsx'));
const CloudConnectors = lazy(() => import('./connectors/cloud/CloudConnectors.jsx'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading Nexus AI Pro...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated, hasRole } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (roles && !roles.some(r => hasRole(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const roleRoutes = {
    admin: '/admin',
    dev: '/dev',
    moderator: '/moderator',
    user: '/dashboard'
  };

  return <Navigate to={roleRoutes[user.role] || '/dashboard'} replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Role redirect */}
          <Route path="/" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

          {/* User dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />

          {/* Admin-only */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

          {/* Dev-only */}
          <Route path="/dev" element={<ProtectedRoute roles={['admin', 'dev']}><DevDashboard /></ProtectedRoute>} />

          {/* Moderator */}
          <Route path="/moderation" element={<ProtectedRoute roles={['admin', 'moderator']}><ModeratorDashboard /></ProtectedRoute>} />

          {/* Analytics */}
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />

          {/* Security */}
          <Route path="/security" element={<ProtectedRoute><EnhancedSecurityDashboard /></ProtectedRoute>} />

          {/* Projects */}
          <Route path="/projects" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
          <Route path="/projects/gamedev" element={<ProtectedRoute><GameDevTracker /></ProtectedRoute>} />
          <Route path="/projects/arvr" element={<ProtectedRoute><ARVRTracker /></ProtectedRoute>} />

          {/* Subscriptions */}
          <Route path="/pricing" element={<SubscriptionPlans />} />
          <Route path="/billing" element={<ProtectedRoute><SubscriptionPlans /></ProtectedRoute>} />

          {/* Connectors */}
          <Route path="/connectors/gaming" element={<ProtectedRoute><GamingConnectors /></ProtectedRoute>} />
          <Route path="/connectors/gaming/achievements" element={<ProtectedRoute><AchievementTracker /></ProtectedRoute>} />
          <Route path="/connectors/cloud" element={<ProtectedRoute><CloudConnectors /></ProtectedRoute>} />

          {/* Main AI chat app */}
          <Route path="/app/*" element={<ProtectedRoute><NexusApp /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
