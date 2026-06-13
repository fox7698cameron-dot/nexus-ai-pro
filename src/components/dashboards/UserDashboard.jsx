// ================================================
// NEXUS AI PRO - User Dashboard
// Updated: 2026-06-13
// Role: user (profile, chats, projects, analytics)
// ================================================

import React, { useState, useEffect } from 'react';
import {
  User, MessageSquare, Folder, BarChart3, Settings,
  Star, Zap, Crown, ChevronRight, TrendingUp, Clock,
  Shield, Fingerprint, Bell
} from 'lucide-react';

export default function UserDashboard({ user, onNavigate }) {
  const [recentChats] = useState([
    { id: '1', title: 'Game development ideas', model: 'claude-opus', updatedAt: new Date(Date.now()-300000).toISOString() },
    { id: '2', title: 'React component help',   model: 'gpt-4o',     updatedAt: new Date(Date.now()-3600000).toISOString() },
    { id: '3', title: 'Marketing analytics',    model: 'gemini-pro', updatedAt: new Date(Date.now()-86400000).toISOString() },
  ]);

  const tierInfo = {
    free:       { label: 'Free',       icon: Zap,   color: 'text-gray-400', bg: 'from-gray-700 to-gray-800' },
    pro:        { label: 'Pro',        icon: Star,  color: 'text-blue-400', bg: 'from-blue-900 to-indigo-900' },
    enterprise: { label: 'Enterprise', icon: Crown, color: 'text-purple-400', bg: 'from-purple-900 to-pink-900' },
  };
  const tier = tierInfo[user?.tier || user?.subscriptionTier || 'free'] || tierInfo.free;
  const TierIcon = tier.icon;

  const quickLinks = [
    { label: 'New Chat',    icon: MessageSquare, action: () => onNavigate?.('chat'),          hint: 'Start an AI conversation' },
    { label: 'Projects',    icon: Folder,        action: () => onNavigate?.('projects'),       hint: 'Track your work' },
    { label: 'Analytics',   icon: BarChart3,     action: () => onNavigate?.('analytics'),      hint: 'Social media metrics' },
    { label: 'Security',    icon: Shield,        action: () => onNavigate?.('security'),       hint: 'Account safety' },
    { label: 'Upgrade',     icon: Crown,         action: () => onNavigate?.('subscription'),   hint: 'Get more features' },
    { label: 'Settings',    icon: Settings,      action: () => onNavigate?.('settings'),       hint: 'Account preferences' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className={`bg-gradient-to-r ${tier.bg} border border-gray-700 rounded-xl p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <User size={20} className="text-gray-300" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">
                Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
              </h1>
              <p className="text-gray-400 text-xs">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black bg-opacity-30 rounded-lg px-3 py-1.5">
            <TierIcon size={14} className={tier.color} />
            <span className={`text-xs font-bold ${tier.color}`}>{tier.label}</span>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {quickLinks.map(l => (
          <button
            key={l.label}
            onClick={l.action}
            className="bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl p-4 text-left transition-all group"
          >
            <l.icon size={18} className="text-indigo-400 mb-2" />
            <div className="text-white text-sm font-semibold">{l.label}</div>
            <div className="text-gray-500 text-xs">{l.hint}</div>
          </button>
        ))}
      </div>

      {/* Recent chats */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Clock size={14} className="text-indigo-400" /> Recent Conversations
          </h2>
        </div>
        <div className="divide-y divide-gray-700">
          {recentChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => onNavigate?.('chat', chat.id)}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-700 transition-colors text-left"
            >
              <MessageSquare size={16} className="text-indigo-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-gray-200 text-sm font-medium truncate">{chat.title}</div>
                <div className="text-gray-500 text-xs">{chat.model} · {new Date(chat.updatedAt).toLocaleDateString()}</div>
              </div>
              <ChevronRight size={14} className="text-gray-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Security nudge */}
      <div className="bg-gray-800 border border-indigo-800 rounded-xl p-4 flex items-center gap-4">
        <Fingerprint size={24} className="text-indigo-400 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-white font-medium text-sm">Secure your account</div>
          <div className="text-gray-400 text-xs">Enable 2FA and biometric login for maximum protection</div>
        </div>
        <button
          onClick={() => onNavigate?.('settings', 'security')}
          className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold whitespace-nowrap"
        >
          Set up →
        </button>
      </div>
    </div>
  );
}
