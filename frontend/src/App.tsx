import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CommandPalette } from './components/CommandPalette';
import { PlanMyDayModal } from './components/PlanMyDayModal';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { TodayView } from './views/TodayView';
import { InboxView } from './views/InboxView';
import { KanbanView } from './views/KanbanView';
import { UniversityView } from './views/UniversityView';
import { ProjectsView } from './views/ProjectsView';
import { DailyLogView } from './views/DailyLogView';
import { WeeklyReviewView } from './views/WeeklyReviewView';
import { Task, Project, Tag, ActiveView, AIStatus } from './types';
import { api } from './services/api';
import { Menu } from 'lucide-react';
import { useStreak } from './utils/useStreak';
import { todayNPT, dateStrNPT } from './utils/time';


export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeView, setActiveView] = useState<ActiveView>('today');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPlanDayOpen, setIsPlanDayOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Computed streak from completed tasks
  const streak = useStreak(tasks);

  // Check auth session
  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (!token) {
        setIsAuthChecking(false);
        return;
      }
      try {
        const user = await api.getMe();
        setCurrentUser(user.username);
        loadData();
      } catch (err) {
        api.clearToken();
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Load workspace data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, projectsRes, tagsRes, aiStatusRes] = await Promise.all([
        api.getTasks(),
        api.getProjects(),
        api.getTags(),
        api.getAIStatus().catch(() => null),
      ]);
      setTasks(tasksRes);
      setProjects(projectsRes);
      setTags(tagsRes);
      if (aiStatusRes) setAiStatus(aiStatusRes);
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    loadData();
  };

  const handleLogout = () => {
    api.clearToken();
    setCurrentUser(null);
    setTasks([]);
    setProjects([]);
    setTags([]);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!currentUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Escape closes any open modal even when focus is inside an
      // input/textarea (e.g. the AI assistant chat box).
      if (key === 'escape') {
        setIsQuickAddOpen(false);
        setIsCommandPaletteOpen(false);
        setIsPlanDayOpen(false);
        setIsAIAssistantOpen(false);
        return;
      }

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsQuickAddOpen(true);
      } else if (key === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsAIAssistantOpen(true);
      } else if (key === 'p' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsPlanDayOpen(true);
      } else if (key === 't' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setActiveView('today');
      } else if (key === 'k' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setActiveView('kanban');
      } else if (key === 'd' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setActiveView('dailylog');
      } else if (key === '/' || ((e.metaKey || e.ctrlKey) && key === 'k')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  // Task Handlers
  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev.filter(t => t.id !== newTask.id)]);
    loadData();
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const handleTaskDeleted = (taskId: number) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setIsDetailOpen(false);
      setSelectedTask(null);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updated = task.status === 'done'
        ? await api.reopenTask(task.id)
        : await api.completeTask(task.id);
      handleTaskUpdated(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  // V2: Start a task (move to doing) by ID
  const handleStartTask = async (taskId: number) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== 'doing') {
        const updated = await api.updateTask(taskId, { status: 'doing' });
        handleTaskUpdated(updated);
      }
      // Open task detail
      const freshTask = tasks.find(t => t.id === taskId);
      if (freshTask) {
        setSelectedTask(freshTask);
        setIsDetailOpen(true);
      }
      loadData();
    } catch (err) {
      console.error('Failed to start task:', err);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-zinc-600 text-xs font-mono" style={{ background: '#0d0d0f' }}>
        Verifying session...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const todayStr = todayNPT();
  const taskCounts = {
    today: tasks.filter(t => t.status !== 'done' && dateStrNPT(t.due_date) === todayStr).length,
    inbox: tasks.filter(t => t.status === 'inbox').length,
    university: tasks.filter(t => t.category?.toLowerCase() === 'university' && t.status !== 'done').length,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden select-none" style={{ background: '#0d0d0f', color: '#f8fafc' }}>
      
      {/* Collapsible Minimal Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        aiStatus={aiStatus}
        currentUser={currentUser}
        onLogout={handleLogout}
        taskCounts={taskCounts}
        streak={streak}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto p-4 lg:p-6" style={{ background: '#0d0d0f' }}>
        {/* Mobile header with hamburger */}
        <div className="flex items-center justify-between pb-3 mb-2 lg:hidden" style={{ borderBottom: '1px solid #2e2e33' }}>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: '#71717a' }}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-xs">
              ✦
            </div>
            <span className="font-semibold text-sm text-slate-100">Nexus OS</span>
          </div>
          <div className="w-9" />
        </div>
        {isLoading && tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs font-mono" style={{ color: '#52525b' }}>
            Syncing workspace data...
          </div>
        ) : (
          <>
            {activeView === 'today' && (
              <TodayView
                tasks={tasks}
                projects={projects}
                onSelectTask={handleSelectTask}
                onToggleComplete={handleToggleComplete}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onOpenPlanDay={() => setIsPlanDayOpen(true)}
              />
            )}

            {activeView === 'inbox' && (
              <InboxView
                tasks={tasks}
                projects={projects}
                onSelectTask={handleSelectTask}
                onToggleComplete={handleToggleComplete}
                onTaskCreated={handleTaskCreated}
                onTaskDeleted={handleTaskDeleted}
              />
            )}

            {activeView === 'kanban' && (
              <KanbanView
                tasks={tasks}
                projects={projects}
                onSelectTask={handleSelectTask}
                onTaskUpdated={handleTaskUpdated}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              />
            )}

            {activeView === 'university' && (
              <UniversityView
                tasks={tasks}
                projects={projects}
                onSelectTask={handleSelectTask}
                onToggleComplete={handleToggleComplete}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              />
            )}

            {activeView === 'projects' && (
              <ProjectsView
                projects={projects}
                tasks={tasks}
                onProjectCreated={(p) => setProjects(prev => [...prev, p])}
                onProjectDeleted={(id) => setProjects(prev => prev.filter(p => p.id !== id))}
                onSelectTask={handleSelectTask}
              />
            )}

            {activeView === 'dailylog' && (
              <DailyLogView
                onSelectTask={handleSelectTask}
              />
            )}

            {activeView === 'weeklyreview' && (
              <WeeklyReviewView />
            )}
          </>
        )}
      </main>

      {/* Quick Task Capture Modal ('N' shortcut) */}
      <QuickCaptureModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      {/* Task Details Drawer/Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        projects={projects}
        tags={tags}
      />

      {/* Command Palette ('/' or 'Cmd+K') */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveView={setActiveView}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenPlanDay={() => setIsPlanDayOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        tasks={tasks}
        onSelectTask={handleSelectTask}
      />

      {/* V2: Plan My Day Modal ('P' shortcut) */}
      <PlanMyDayModal
        isOpen={isPlanDayOpen}
        onClose={() => setIsPlanDayOpen(false)}
        onApplyPlan={(taskIds) => {
          // Move all planned tasks to 'planned' status
          taskIds.forEach(id => {
            api.updateTask(id, { status: 'planned' }).then(handleTaskUpdated).catch(console.error);
          });
          setIsPlanDayOpen(false);
        }}
        onStartTask={handleStartTask}
      />

      {/* V2: AI Assistant Panel ('A' shortcut) */}
      <AIAssistantPanel
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onStartTask={handleStartTask}
      />

    </div>
  );
};

export default App;
