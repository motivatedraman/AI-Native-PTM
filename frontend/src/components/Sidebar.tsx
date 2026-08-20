import React from 'react';
import { 
  Calendar, 
  Inbox, 
  Kanban, 
  GraduationCap, 
  FolderKanban, 
  Clock, 
  Search, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  LogOut,
  X,
  BarChart3,
} from 'lucide-react';
import { ActiveView, AIStatus } from '../types';
import { StreakBadge } from './TaskCompletionBurst';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenQuickAdd: () => void;
  onOpenCommandPalette: () => void;
  aiStatus: AIStatus | null;
  currentUser: string | null;
  onLogout: () => void;
  taskCounts: {
    today: number;
    inbox: number;
    university: number;
  };
  streak?: number;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isCollapsed,
  setIsCollapsed,
  onOpenQuickAdd,
  onOpenCommandPalette,
  aiStatus,
  currentUser,
  onLogout,
  taskCounts,
  streak = 0,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const navItems = [
    { id: 'today', label: 'Today', icon: Calendar, badge: taskCounts.today },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: taskCounts.inbox },
    { id: 'kanban', label: 'Kanban', icon: Kanban },
    { id: 'university', label: 'University', icon: GraduationCap, badge: taskCounts.university },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'dailylog', label: 'Daily Log', icon: Clock },
    { id: 'weeklyreview', label: 'Weekly Review', icon: BarChart3 },
  ];

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId as ActiveView);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          flex flex-col justify-between
          border-r bg-[#0d0d0f]
          transition-all duration-300 select-none
          ${isCollapsed ? 'w-16' : 'w-64'}
          h-screen
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ borderColor: '#2e2e33' }}
      >
        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={onMobileClose}
            className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors z-10 lg:hidden"
            style={{ background: '#1c1c1f' }}
          >
            <X size={18} />
          </button>
        )}

        {/* Top Header */}
        <div>
          <div
            className="flex items-center justify-between p-4"
            style={{ borderBottom: '1px solid #2e2e33' }}
          >
            {!isCollapsed && (
              <div className="flex items-center space-x-2.5">
                {/* Logo */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)',
                  }}
                >
                  ✦
                </div>
                <div>
                  <span className="font-bold text-sm tracking-tight text-white">Nexus OS</span>
                  {streak > 0 && !isCollapsed && (
                    <div className="mt-0.5">
                      <StreakBadge streak={streak} compact />
                    </div>
                  )}
                </div>
              </div>
            )}
            {isCollapsed && streak > 0 && (
              <div className="mx-auto" title={`${streak} day streak!`}>
                <span className="text-lg" style={{ filter: 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.7))' }}>🔥</span>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 transition-colors mx-auto hidden lg:block"
              style={{ background: 'transparent' }}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Action Button & Search */}
          <div className="p-3 space-y-2">
            <button
              onClick={onOpenQuickAdd}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 text-white rounded-xl text-sm font-semibold transition-all group shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 25px rgba(139, 92, 246, 0.5)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Capture Task</span>
                  <span className="kbd-badge text-[10px] bg-violet-700/50 text-violet-200 border-violet-500/40">N</span>
                </div>
              )}
            </button>

            <button
              onClick={onOpenCommandPalette}
              className="w-full flex items-center space-x-2 py-2 px-3 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 transition-all"
              style={{
                background: '#141416',
                border: '1px solid #2e2e33',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#3a3a40';
                (e.currentTarget as HTMLElement).style.background = '#1c1c1f';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#2e2e33';
                (e.currentTarget as HTMLElement).style.background = '#141416';
              }}
            >
              <Search size={15} className="text-zinc-500" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Search / Cmds</span>
                  <span className="kbd-badge text-[10px]">/</span>
                </div>
              )}
            </button>
          </div>

          {/* Navigation list */}
          <nav className="px-2 py-1 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                    isActive
                      ? 'text-violet-300 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.18), rgba(139, 92, 246, 0.06))',
                          borderLeft: '2px solid #8b5cf6',
                          boxShadow: 'inset 0 0 20px rgba(139, 92, 246, 0.04)',
                        }
                      : {}
                  }
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '#1c1c1f';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '';
                    }
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    size={17}
                    className={isActive ? 'text-violet-400' : 'text-zinc-500'}
                  />
                  {!isCollapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="px-2 py-0.5 text-xs rounded-full font-mono font-medium"
                      style={{
                        background: isActive ? 'rgba(139, 92, 246, 0.25)' : '#252528',
                        color: isActive ? '#a78bfa' : '#71717a',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User & AI Status */}
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid #2e2e33' }}>
          {/* User Card */}
          <div
            className={`flex items-center justify-between p-2.5 rounded-xl text-sm ${isCollapsed ? 'justify-center' : ''}`}
            style={{ background: '#141416', border: '1px solid #2e2e33' }}
          >
            <div className="flex items-center space-x-2.5 truncate">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                }}
              >
                {currentUser ? currentUser[0].toUpperCase() : 'U'}
              </div>
              {!isCollapsed && (
                <span className="text-zinc-200 font-medium truncate text-sm">
                  {currentUser || 'Raman'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={onLogout}
                className="p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>

          {/* AI Engine Status */}
          <div
            className={`flex items-center space-x-2.5 p-2.5 rounded-xl text-sm ${isCollapsed ? 'justify-center' : ''}`}
            style={{ background: '#141416', border: '1px solid #2e2e33' }}
            title={aiStatus?.message || 'AI Engine'}
          >
            <div className="relative">
              <Sparkles size={14} className="text-violet-400" />
              <div
                className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300">
                    {aiStatus?.provider ? aiStatus.provider.toUpperCase() : 'AI'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">ACTIVE</span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate">
                  {aiStatus?.is_configured ? aiStatus.model : 'Nexus Core'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
