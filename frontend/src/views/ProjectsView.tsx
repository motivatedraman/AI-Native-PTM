import React, { useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  ListFilter,
  Circle,
  Clock
} from 'lucide-react';
import { Project, Task } from '../types';
import { api } from '../services/api';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onProjectCreated: (project: Project) => void;
  onSelectTask: (task: Task) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  onProjectCreated,
  onSelectTask,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('University');
  const [color, setColor] = useState('#6366f1');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const created = await api.createProject({
        name: name.trim(),
        description: description.trim(),
        category,
        color,
      });
      onProjectCreated(created);
      setName('');
      setDescription('');
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#262a3c]/80 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">
            <FolderKanban size={16} />
            <span>Workspace Modules</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
            Projects & Courses
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Group related tasks, academic subjects, and software projects under unified contexts.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Plus size={15} />
          <span>New Project</span>
        </button>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="p-4 rounded-xl bg-[#12141c] border border-indigo-500/40 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Create New Project</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project / Course name..."
              className="bg-[#181a24] border border-[#262a3c] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="bg-[#181a24] border border-[#262a3c] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex space-x-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[#181a24] border border-[#262a3c] rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
              >
                <option value="University">University</option>
                <option value="Project">Project</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
              </select>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 bg-[#1e2230] text-slate-400 hover:text-slate-200 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map(project => {
          const projectTasks = tasks.filter(t => t.project_id === project.id);
          const doneTasks = projectTasks.filter(t => t.status === 'done');
          const percent = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;

          return (
            <div
              key={project.id}
              className="p-5 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color || '#6366f1' }} />
                    <h3 className="text-sm font-bold text-slate-100">{project.name}</h3>
                  </div>
                  {project.description && (
                    <p className="text-xs text-slate-400 mt-1">{project.description}</p>
                  )}
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#181a24] border border-[#262a3c] text-slate-300">
                  {project.category}
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Progress</span>
                  <span className="font-mono">{doneTasks.length}/{projectTasks.length} tasks ({percent}%)</span>
                </div>
                <div className="w-full bg-[#1e2230] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>

              {/* Linked Tasks */}
              {projectTasks.length > 0 && (
                <div className="pt-2 border-t border-[#262a3c]/60 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Recent Project Tasks
                  </div>
                  {projectTasks.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-[#181a24] text-xs cursor-pointer text-slate-300"
                    >
                      <span className="truncate">{t.title}</span>
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono ${
                        t.status === 'done' ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
