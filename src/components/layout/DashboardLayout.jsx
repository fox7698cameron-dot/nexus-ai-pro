// File: DashboardLayout.jsx | Date: 2026-06-16 | Nexus AI Pro
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import LanguageSwitcher from '../common/LanguageSwitcher.jsx';
import {
  BarChart2, Shield, FolderKanban, Gamepad2, CreditCard, Settings,
  Users, Code2, Flag, LogOut, Menu, X, Bell, Search, Sun, Moon,
  Monitor, ChevronDown, Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'analytics', label: 'Analytics', icon: BarChart2, href: '/dashboard/analytics', roles: null },
  { key: 'security', label: 'Security', icon: Shield, href: '/dashboard/security', roles: null },
  { key: 'projects', label: 'Projects', icon: FolderKanban, href: '/dashboard/projects', roles: null },
  { key: 'gaming', label: 'Gaming', icon: Gamepad2, href: '/dashboard/gaming', roles: null },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard, href: '/dashboard/subscriptions', roles: null },
  { key: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings', roles: null },
  { divider: true },
  { key: 'admin', label: 'Admin', icon: Users, href: '/dashboard/admin', roles: ['admin', 'super_admin'] },
  { key: 'developer', label: 'Developer', icon: Code2, href: '/dashboard/developer', roles: ['developer', 'admin', 'super_admin'] },
  { key: 'moderation', label: 'Moderation', icon: Flag, href: '/dashboard/moderation', roles: ['moderator', 'developer', 'admin', 'super_admin'] },
];

const ROLE_COLORS = {
  super_admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  admin: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  developer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  moderator: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  user: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  const current = options.find((o) => o.value === theme) || options[2];
  const Icon = current.icon;

  const cycle = () => {
    const idx = options.findIndex((o) => o.value === theme);
    const next = options[(idx + 1) % options.length];
    setTheme(next.value);
  };

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      aria-label={`Current theme: ${current.label}. Click to cycle.`}
      title={`Theme: ${current.label}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function NotificationBell({ count = 3 }) {
  const [open, setOpen] = useState(false);
  const MOCK_NOTIFS = [
    { id: 1, text: 'Critical security alert detected', time: '5 min ago', type: 'error' },
    { id: 2, text: 'TikTok crossed 4M views this week', time: '1 hr ago', type: 'success' },
    { id: 3, text: 'Pro subscription renewed successfully', time: '2 hr ago', type: 'info' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        aria-label={`${count} notifications`}
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
              <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Mark all read</button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {MOCK_NOTIFS.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      n.type === 'error' ? 'bg-red-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
              <button className="w-full text-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline py-1">
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Sidebar({ onClose, currentPath }) {
  const { user, role, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const hasAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  };

  const isActive = (href) => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === href || window.location.pathname.startsWith(href + '/');
    }
    return currentPath === href;
  };

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/50 w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Nexus AI Pro</p>
          <p className="text-xs text-gray-400 truncate">AI Platform</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          if (item.divider) {
            return <div key={`divider-${i}`} className="my-2 h-px bg-gray-100 dark:bg-gray-700/50" />;
          }
          if (!hasAccess(item)) return null;

          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <a
              key={item.key}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition group ${
                active
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
              {item.label}
              {item.roles && (
                <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded font-mono leading-none">
                  {item.roles[0]}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 dark:border-gray-700/50 p-3">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition group"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.displayName || user?.username || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {userMenuOpen && (
          <div className="mt-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="px-3 py-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[role] || ROLE_COLORS.user}`}>
                {role || 'user'}
              </span>
            </div>
            <a href="/dashboard/settings/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition">
              <Settings className="w-4 h-4" /> Profile Settings
            </a>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children, pageTitle = 'Dashboard' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar currentPath={currentPath} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar onClose={() => setSidebarOpen(false)} currentPath={currentPath} />
          </div>
        </>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex-shrink-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 flex items-center px-4 gap-3">
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <h1 className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block truncate">
            {pageTitle}
          </h1>

          {/* Search */}
          <div className="flex-1 max-w-sm relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 transition"
            />
          </div>

          <div className="flex-1" />

          {/* Header controls */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher compact />
            <NotificationBell count={3} />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-around h-16">
            {[
              { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
              { href: '/dashboard/security', icon: Shield, label: 'Security' },
              { href: '/dashboard/projects', icon: FolderKanban, label: 'Projects' },
              { href: '/dashboard/gaming', icon: Gamepad2, label: 'Gaming' },
              { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
            ].map(({ href, icon: Icon, label }) => {
              const active = typeof window !== 'undefined' && window.location.pathname.startsWith(href);
              return (
                <a
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-1 px-2 py-1 text-xs transition ${
                    active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </a>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
