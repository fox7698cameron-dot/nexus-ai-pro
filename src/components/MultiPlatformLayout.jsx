// src/components/MultiPlatformLayout.jsx
// 2026-10-23 - Responsive multi-platform layout wrapper (mobile/tablet/desktop/electron)

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, TrendingUp, Shield, Layers, Settings, Menu, X } from 'lucide-react';
import { t, detectLang, LANGUAGES } from '../i18n/translations.js';

// ─── Platform detection ───────────────────────────────────────────────────────
function detectPlatform() {
  if (typeof window === 'undefined') return 'browser';
  if (window.electron) return 'electron';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'browser';
}

function detectThemePreference() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 'chat',      icon: MessageSquare, labelKey: 'nav.chat',      minRole: 'user' },
  { id: 'analytics', icon: TrendingUp,    labelKey: 'nav.analytics', minRole: 'user' },
  { id: 'security',  icon: Shield,        labelKey: 'nav.security',  minRole: 'moderator' },
  { id: 'projects',  icon: Layers,        labelKey: 'nav.projects',  minRole: 'user' },
  { id: 'settings',  icon: Settings,      labelKey: 'common.settings', minRole: 'user' },
];

const ROLE_RANK = { user: 0, moderator: 1, developer: 2, admin: 3 };

function tabsForRole(role) {
  const rank = ROLE_RANK[role] ?? 0;
  return ALL_TABS.filter(tab => (ROLE_RANK[tab.minRole] ?? 0) <= rank);
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────
function Sidebar({ tabs, activeTab, onTabChange, lang, role, collapsed, onToggle }) {
  return (
    <aside className={`hidden sm:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all ${collapsed ? 'w-16' : 'w-56'} min-h-screen flex-shrink-0`}>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && <span className="text-sm font-bold text-gray-800 dark:text-white truncate">Nexus AI Pro</span>}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 ml-auto">
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{t(tab.labelKey, lang)}</span>}
            </button>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-400 capitalize">{role}</span>
        </div>
      )}
    </aside>
  );
}

// ─── Bottom tab bar (mobile) ──────────────────────────────────────────────────
function BottomTabBar({ tabs, activeTab, onTabChange, lang }) {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex z-40 safe-area-inset-bottom">
      {tabs.slice(0, 5).map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <Icon size={20} />
            <span>{t(tab.labelKey, lang)}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Electron hint bar ────────────────────────────────────────────────────────
function ElectronHints() {
  return (
    <div className="hidden sm:flex items-center gap-4 px-4 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-400">
      <span>Ctrl+N: New chat</span>
      <span>Ctrl+S: Save</span>
      <span>Ctrl+,: Settings</span>
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
/**
 * @param {{ children: React.ReactNode, activeTab: string, onTabChange: (tab:string)=>void, userRole: string, theme?: 'light'|'dark'|'system' }} props
 */
export default function MultiPlatformLayout({ children, activeTab, onTabChange, userRole = 'user', theme = 'system' }) {
  const lang = detectLang();
  const platform = detectPlatform();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const tabs = tabsForRole(userRole);
  const currentLang = detectLang();
  const isRtl = LANGUAGES[currentLang]?.rtl || false;

  useEffect(() => {
    const resolved = theme === 'system' ? detectThemePreference() : theme;
    setResolvedTheme(resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (isRtl) {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  }, [isRtl]);

  return (
    <div className={`flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 ${isRtl ? 'font-arabic' : ''}`}>
      {platform === 'electron' && <ElectronHints />}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          lang={lang}
          role={userRole}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
        />

        <main className="flex-1 overflow-auto pb-16 sm:pb-0 min-w-0">
          {children}
        </main>
      </div>

      <BottomTabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} lang={lang} />
    </div>
  );
}
