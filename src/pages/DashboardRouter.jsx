// File: DashboardRouter.jsx | Date: 2026-06-16 | Nexus AI Pro
import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { Shield, Lock, Loader2 } from 'lucide-react';

// Lazy load dashboards for code splitting
const AdminDashboard = lazy(() => import('../dashboards/AdminDashboard.jsx'));
const DevDashboard = lazy(() => import('../dashboards/DevDashboard.jsx'));
const ModeratorDashboard = lazy(() => import('../dashboards/ModeratorDashboard.jsx'));
const AnalyticsDashboard = lazy(() => import('../dashboards/AnalyticsDashboard.jsx'));
const SecurityDashboard = lazy(() => import('../dashboards/SecurityDashboard.jsx'));
const ProjectDashboard = lazy(() => import('../dashboards/ProjectDashboard.jsx'));
const GamingDashboard = lazy(() => import('../dashboards/GamingDashboard.jsx'));

const ROLE_HIERARCHY = {
  super_admin: 5,
  admin: 4,
  developer: 3,
  moderator: 2,
  user: 1,
};

function hasRole(userRole, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

function LoadingSpinner({ message = 'Loading dashboard…' }) {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

function AccessDenied({ requiredRole }) {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You need the <strong className="text-gray-700 dark:text-gray-300">{requiredRole}</strong> role or higher to access this dashboard.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
        >
          Go to Main Dashboard
        </a>
      </div>
    </div>
  );
}

// User home page shown to regular users
function UserHome({ user, role }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.displayName || user?.username || 'there'} 👋
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Here's an overview of your Nexus AI Pro account.
        </p>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Analytics', desc: 'Social media metrics', href: '/dashboard/analytics', emoji: '📊', color: 'indigo' },
          { label: 'Security', desc: 'Account protection', href: '/dashboard/security', emoji: '🛡️', color: 'emerald' },
          { label: 'Projects', desc: 'Dev project tracking', href: '/dashboard/projects', emoji: '📁', color: 'purple' },
          { label: 'Gaming', desc: 'Game dev & achievements', href: '/dashboard/gaming', emoji: '🎮', color: 'orange' },
        ].map(({ label, desc, href, emoji, color }) => (
          <a
            key={href}
            href={href}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition group"
          >
            <div className="text-3xl mb-3">{emoji}</div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {label}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
          </a>
        ))}
      </div>

      {/* Inline preview of analytics section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Quick Stats</h3>
          <a href="/dashboard/analytics" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            View full analytics →
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Followers', value: '284.7K', change: '+2.1%', up: true },
            { label: 'Total Views', value: '8.92M', change: '+12.4%', up: true },
            { label: 'Engagement', value: '4.7%', change: '+0.3%', up: true },
            { label: 'Total Reach', value: '1.24M', change: '-0.8%', up: false },
          ].map(({ label, value, change, up }) => (
            <div key={label} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className={`text-xs font-medium mt-0.5 ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {change}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription reminder */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Upgrade to Pro</h3>
            <p className="text-indigo-100 text-sm mt-0.5">Unlock all 8 social platforms, advanced security, and real-time analytics.</p>
          </div>
          <a
            href="/dashboard/subscriptions"
            className="flex-shrink-0 px-4 py-2 bg-white text-indigo-600 font-semibold text-sm rounded-lg hover:bg-indigo-50 transition"
          >
            View Plans
          </a>
        </div>
      </div>
    </div>
  );
}

// Parse current path from window.location
function getSubPath() {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname;
  const match = path.match(/^\/dashboard\/?(.*)$/);
  return match ? match[1] : '';
}

export default function DashboardRouter() {
  const { user, role, isLoading, isAuthenticated } = useAuth();
  const [currentPath, setCurrentPath] = useState(getSubPath);

  // Listen for navigation (simple popstate-based router)
  useEffect(() => {
    const handler = () => setCurrentPath(getSubPath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner message="Loading your workspace…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  // Determine page title and component based on path and role
  let pageTitle = 'Dashboard';
  let DashboardComponent = null;
  let requiredRoles = null;

  const segment = currentPath.split('/')[0] || '';

  switch (segment) {
    case 'analytics':
      pageTitle = 'Analytics';
      DashboardComponent = AnalyticsDashboard;
      break;
    case 'security':
      pageTitle = 'Security';
      DashboardComponent = SecurityDashboard;
      break;
    case 'projects':
      pageTitle = 'Projects';
      DashboardComponent = ProjectDashboard;
      break;
    case 'gaming':
      pageTitle = 'Gaming';
      DashboardComponent = GamingDashboard;
      break;
    case 'subscriptions':
      pageTitle = 'Subscriptions';
      DashboardComponent = null; // inline below
      break;
    case 'settings':
      pageTitle = 'Settings';
      DashboardComponent = null; // inline below
      break;
    case 'admin':
      pageTitle = 'Admin Dashboard';
      DashboardComponent = AdminDashboard;
      requiredRoles = ['admin', 'super_admin'];
      break;
    case 'developer':
      pageTitle = 'Developer Dashboard';
      DashboardComponent = DevDashboard;
      requiredRoles = ['developer', 'admin', 'super_admin'];
      break;
    case 'moderation':
      pageTitle = 'Moderation Center';
      DashboardComponent = ModeratorDashboard;
      requiredRoles = ['moderator', 'developer', 'admin', 'super_admin'];
      break;
    default:
      // Root /dashboard — route by role
      if (role === 'super_admin' || role === 'admin') {
        pageTitle = 'Admin Dashboard';
        DashboardComponent = AdminDashboard;
      } else if (role === 'developer') {
        pageTitle = 'Developer Dashboard';
        DashboardComponent = DevDashboard;
      } else {
        pageTitle = 'Dashboard';
        DashboardComponent = null; // UserHome
      }
  }

  const renderContent = () => {
    // Role check
    if (requiredRoles && !hasRole(role, requiredRoles)) {
      return <AccessDenied requiredRole={requiredRoles[0]} />;
    }

    if (!DashboardComponent) {
      // Special pages
      if (segment === 'subscriptions') {
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Manage Subscription</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Current plan: <strong className="text-gray-700 dark:text-gray-300">{user?.subscription || 'Free'}</strong>
            </p>
            <a href="/pricing" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition">
              View Pricing Plans
            </a>
          </div>
        );
      }
      if (segment === 'settings') {
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Settings</h2>
            <p className="text-gray-500 dark:text-gray-400">Profile, security, and app preferences coming soon.</p>
          </div>
        );
      }
      // Default: user home
      return <UserHome user={user} role={role} />;
    }

    return (
      <Suspense fallback={<LoadingSpinner />}>
        <DashboardComponent />
      </Suspense>
    );
  };

  return (
    <DashboardLayout pageTitle={pageTitle}>
      {renderContent()}
    </DashboardLayout>
  );
}
