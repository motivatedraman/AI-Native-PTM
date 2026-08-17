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
  Plus
} from 'lucide-react';
import { ActiveView, AIStatus } from '../types';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenQuickAdd: () => void;
  onOpenCommandPalette: () => void;
  aiStatus: AIStatus | null;
  taskCounts: {
    today: number;
    inbox: number;
    university: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isCollapsed,
  setIsCollapsed,
  onOpenQuickAdd,
  onOpenCommandPalette,
  aiStatus,
  taskCounts
}) => {
  const navItems = [
    { id: 'today', label: 'Today', icon: Calendar, badge: taskCounts.today },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: taskCounts.inbox },
    { id: 'kanban', label: 'Kanban', icon: Kanban },
    { id: 'university', label: 'University', icon: GraduationCap, badge: taskCounts.university },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'dailylog', label: 'Daily Log', icon: Clock },
  ];

  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-[#262a3c] bg-[#12141c] transition-all duration-200 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      } h-screen`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-[#262a3c]/60">
          {!isCollapsed && (
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
                ✦
              </div>
              <span className="font-semibold text-sm tracking-tight text-slate-100">
                Nexus OS
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md hover:bg-[#212433] text-slate-400 hover:text-slate-200 transition-colors mx-auto"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Action Button & Search */}
        <div className="p-3 space-y-2">
          <button
            onClick={onOpenQuickAdd}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all shadow-sm group"
          >
            <Plus size={15} className="group-hover:scale-110 transition-transform" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Capture Task</span>
                <span className="kbd-badge text-[10px] bg-indigo-700/50 text-indigo-200 border-indigo-500/40">N</span>
              </div>
            )}
          </button>

          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center space-x-2 py-1.5 px-3 rounded-lg text-xs text-slate-400 hover:bg-[#212433] hover:text-slate-200 transition-colors border border-[#262a3c]"
          >
            <Search size={14} className="text-slate-400" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Search / Cmds</span>
                <span className="kbd-badge text-[10px]">/</span>
              </div>
            )}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="px-2 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ActiveView)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative ${
                  isActive
                    ? 'bg-[#212433] text-indigo-400 font-semibold'
                    : 'text-slate-400 hover:bg-[#181a24] hover:text-slate-200'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                {!isCollapsed && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[#262a3c] text-slate-300 font-mono">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-500 rounded-r" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status */}
      <div className="p-3 border-t border-[#262a3c]/60">
        <div
          className={`flex items-center space-x-2.5 p-2 rounded-lg bg-[#181a24] border border-[#262a3c] text-xs ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={aiStatus?.message || "AI Engine"}
        >
          <div className="relative">
            <Sparkles size={14} className={aiStatus?.is_configured ? "text-amber-400" : "text-emerald-400"} />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-300">
                  {aiStatus?.provider ? aiStatus.provider.toUpperCase() : 'AI'}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">ACTIVE</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {aiStatus?.is_configured ? aiStatus.model : 'Heuristic Engine'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
