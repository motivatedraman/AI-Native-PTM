import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { LoginScreen } from './components/LoginScreen';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CommandPalette } from './components/CommandPalette';
import { PlanMyDayModal } from './components/PlanMyDayModal';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { FocusModeOverlay } from './components/FocusModeOverlay';
import { StartFocusModal } from './components/StartFocusModal';
import { TodayView } from './views/TodayView';
import { InboxView } from './views/InboxView';
import { KanbanView } from './views/KanbanView';
import { DailyLogView } from './views/DailyLogView';
import { WeeklyReviewView } from './views/WeeklyReviewView';
import { ManualView } from './views/ManualView';
import { Task, Project, Tag, ActiveView, AIStatus, FocusFinishedResult, FocusSession, DailyQuote } from './types';
import { api } from './services/api';
import { Menu } from 'lucide-react';
import { useStreak } from './utils/useStreak';
import { todayNPT, dateStrNPT } from './utils/time';
import { useFocusTimer } from './hooks/useFocusTimer';


export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeView, setActiveView] = useState<ActiveView>('today');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPlanDayOpen, setIsPlanDayOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Focus Timer
  const [focusTargetTask, setFocusTargetTask] = useState<Task | null>(null);
  const focusActiveRef = useRef(false);

  // Computed streak from completed tasks
  const streak = useStreak(tasks);

  const handleFocusFinished = async (result: FocusFinishedResult) => {
    if (result.sessionId) {
      try {
        const ended = await api.endFocusSession(result.sessionId, {
          actual_minutes: result.actualMinutes,
          status: result.status,
          break_taken: result.breakTaken,
        });
        if (ended.task) handleTaskUpdated(ended.task);
        return;
      } catch (err) {
        console.error('Failed to end focus session on server:', err);
      }
    }
    if (result.taskId && result.actualMinutes > 0) {
      try {
        const updated = await api.logTaskTime(result.taskId, result.actualMinutes);
        handleTaskUpdated(updated);
      } catch (err) {
        console.error('Failed to log focus time:', err);
      }
    }
  };

  const focus = useFocusTimer({
    onStarted: (session: FocusSession) => {
      if (session.task) handleTaskUpdated(session.task);
    },
    onFinished: handleFocusFinished,
  });
  useEffect(() => { focusActiveRef.current = focus.isActive; }, [focus.isActive]);

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
      } catch {
        api.clearToken();
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Load workspace data. Two variants because they are not equivalent:
  // `full` is for sign-in and the rare cases where the server may have
  // changed something we did not. `tasksOnly` is for the common case of
  // "the user did one thing" and skips the three requests whose data we
  // already hold. Task mutations previously used the full path, costing
  // 5 requests per click where 1 was needed.
  const loadTasksOnly = async () => {
    try {
      setTasks(await api.getTasks());
    } catch (err) {
      console.error("Failed to refresh tasks:", err);
    }
  };

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
      // Projects and tags can be created outside the app (directly in the
      // Neon console, or by another session), so they are re-fetched when
      // this tab regains focus rather than being frozen at login.
      refreshReferenceData();
      // Background enhancement: a failed quote must never block the page.
      api.getQuote().then(setQuote).catch(() => setQuote(null));
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Projects and tags are reference data: small, rarely edited, but a
  // project created in the database console is invisible until the client
  // refetches. Re-fetch on tab focus so that gap is one blur away, not one
  // redeploy away.
  const refreshReferenceData = async () => {
    try {
      const [projectsRes, tagsRes] = await Promise.all([
        api.getProjects(),
        api.getTags(),
      ]);
      setProjects(projectsRes);
      setTags(tagsRes);
    } catch (err) {
      console.error("Failed to refresh projects/tags:", err);
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

      // Focus mode owns the screen: no app shortcuts while a timer runs
      if (focusActiveRef.current) return;

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

      // Plain keys only. A modifier means the browser or the OS owns it.
      const plain = !e.metaKey && !e.ctrlKey && !e.altKey;

      // Without this the browser opens a new window on Cmd/Ctrl+N.
      if (key === 'n' && !plain) {
        e.preventDefault();
        setIsQuickAddOpen(true);
        return;
      }
      if (!plain) return;

      if (key === 'n') {
        e.preventDefault();
        // Today has an always-present capture field, so focus it instead of
        // opening the modal. Cmd/Ctrl+N still opens the full capture.
        if (activeView === 'today') {
          window.dispatchEvent(new Event('nexus:focus-capture'));
        } else {
          setIsQuickAddOpen(true);
        }
        return;
      }

      if (key === '/') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if (key === 'a') {
        e.preventDefault();
        setIsAIAssistantOpen(true);
        return;
      }

      if (key === 'p') {
        e.preventDefault();
        setIsPlanDayOpen(true);
        return;
      }

      // The manual toggles, so M returns you where you were.
      if (key === 'm') {
        e.preventDefault();
        setActiveView(activeView === 'manual' ? 'today' : 'manual');
        return;
      }

      const NAV_KEYS: Record<string, ActiveView> = {
        t: 'today',
        i: 'inbox',
        k: 'kanban',
        d: 'dailylog',
        w: 'weeklyreview',
      };
      if (NAV_KEYS[key]) {
        e.preventDefault();
        setActiveView(NAV_KEYS[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, activeView]);

  // Refetch reference data whenever the tab regains focus.
  useEffect(() => {
    if (!currentUser) return;
    const onFocus = () => { refreshReferenceData(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [currentUser]);

  // Task Handlers
  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev.filter(t => t.id !== newTask.id)]);
    // The POST response is the authoritative task, so no refetch is needed.
    // Projects, tags, AI status and the quote cannot have changed.
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
      await loadTasksOnly();
    } catch (err) {
      console.error('Failed to start task:', err);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-stone-600 text-xs font-mono" style={{ background: 'rgb(var(--sx-bg))' }}>
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
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden select-none" style={{ background: 'rgb(var(--sx-bg))', color: 'rgb(var(--st-200))' }}>
      
      {/* Collapsible Minimal Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        aiStatus={aiStatus}
        currentUser={currentUser}
        onLogout={handleLogout}
        taskCounts={taskCounts}
        streak={streak}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto p-4 lg:p-6" style={{ background: 'rgb(var(--sx-bg))' }}>
        {/* Desktop top bar, theme toggle, top right */}
        <div className="hidden lg:flex items-center justify-end mb-2">
          <ThemeToggle />
        </div>

        {/* Mobile header with hamburger */}
        <div className="flex items-center justify-between pb-3 mb-2 lg:hidden" style={{ borderBottom: '1px solid rgb(var(--sx-border-2))' }}>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'rgb(var(--st-500))' }}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
              ✦
            </div>
            <span className="font-semibold text-sm text-stone-100">Nexus OS</span>
          </div>
          <ThemeToggle />
        </div>
        {isLoading && tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs font-mono" style={{ color: 'rgb(var(--st-600))' }}>
            Syncing workspace data...
          </div>
        ) : (
          <>
            {activeView === 'today' && (
              <TodayView
                tasks={tasks}
                projects={projects}
                quote={quote}
                onSelectTask={handleSelectTask}
                onToggleComplete={handleToggleComplete}
                onTaskCreated={handleTaskCreated}
                onOpenPlanDay={() => setIsPlanDayOpen(true)}
                onStartFocus={setFocusTargetTask}
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

            {activeView === 'manual' && (
              <ManualView
                tasks={tasks}
                onClose={() => setActiveView('today')}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
                onOpenPlanDay={() => setIsPlanDayOpen(true)}
              />
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
        onStartFocus={(task) => {
          setIsDetailOpen(false);
          setFocusTargetTask(task);
        }}
      />

      {/* Focus Session duration picker */}
      <StartFocusModal
        task={focusTargetTask}
        isOpen={focusTargetTask !== null}
        onClose={() => setFocusTargetTask(null)}
        onStart={(minutes) => {
          const target = focusTargetTask;
          setFocusTargetTask(null);
          if (target) focus.start(target.id, target.title, minutes);
        }}
      />

      {/* Command Palette ('/') */}
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

      {/* Focus Mode fullscreen clock, covers everything while a session runs */}
      <FocusModeOverlay focus={focus} />

    </div>
  );
};

export default App;
