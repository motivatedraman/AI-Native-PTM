import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
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
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = async () => {
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
      console.error("Failed to load initial data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
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
  }, []);

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
        taskCounts={taskCounts}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#090a0f] p-6">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            Loading your execution center...
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
