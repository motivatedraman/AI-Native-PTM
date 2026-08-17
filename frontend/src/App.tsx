import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CommandPalette } from './components/CommandPalette';
import { TodayView } from './views/TodayView';
import { InboxView } from './views/InboxView';
import { KanbanView } from './views/KanbanView';
import { UniversityView } from './views/UniversityView';
import { ProjectsView } from './views/ProjectsView';
import { DailyLogView } from './views/DailyLogView';
import { Task, Project, Tag, ActiveView, AIStatus } from './types';
import { api } from './services/api';

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
  const [isLoading, setIsLoading] = useState(false);

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
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsQuickAddOpen(true);
      } else if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
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

  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen bg-[#090a0f] flex items-center justify-center text-slate-500 text-xs font-mono">
        Verifying security session...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const taskCounts = {
    today: tasks.filter(t => t.status !== 'done').length,
    inbox: tasks.filter(t => t.status === 'inbox').length,
    university: tasks.filter(t => t.category.toLowerCase() === 'university' && t.status !== 'done').length,
  };

  return (
    <div className="flex h-screen w-screen bg-[#090a0f] text-slate-100 overflow-hidden select-none">
      
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
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#090a0f] p-6">
        {isLoading && tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
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
        tasks={tasks}
        onSelectTask={handleSelectTask}
      />

    </div>
  );
};

export default App;
