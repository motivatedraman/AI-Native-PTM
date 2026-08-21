import React, { useState } from 'react';
import { 
  FolderKanban,
  Plus,
  Trash2
} from 'lucide-react';
import { Project, Task } from '../types';
import { api } from '../services/api';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onProjectCreated: (project: Project) => void;
  onProjectDeleted: (projectId: number) => void;
  onSelectTask: (task: Task) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  onProjectCreated,
  onProjectDeleted,
  onSelectTask,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('University');
  const [color] = useState('rgb(var(--am-600))');

  const handleDelete = async (projectId: number) => {
    if (!window.confirm('Delete this project? Tasks will be unlinked but not deleted.')) return;
    try {
      await api.deleteProject(projectId);
      onProjectDeleted(projectId);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

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
    <div className="max-w-full space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[rgb(var(--sx-border)/0.8)] gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sm font-mono font-semibold text-amber-400 uppercase tracking-wider">
            <FolderKanban size={18} />
            <span>Workspace Modules</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-stone-100 tracking-tight mt-1">
            Projects & Courses
          </h1>
          <p className="text-sm text-stone-400 mt-2">
            Group related tasks, academic subjects, and software projects under unified contexts.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={17} />
          <span>New Project</span>
        </button>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="p-5 rounded-xl bg-[rgb(var(--sx-modal))] border border-amber-500/40 space-y-3">
          <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">Create New Project</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project / Course name..."
              className="bg-[rgb(var(--sx-header))] border border-[rgb(var(--sx-border))] rounded-lg px-4 py-2.5 text-stone-200 focus:outline-none focus:border-amber-500"
              required
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="bg-[rgb(var(--sx-header))] border border-[rgb(var(--sx-border))] rounded-lg px-4 py-2.5 text-stone-200 focus:outline-none focus:border-amber-500"
            />
            <div className="flex space-x-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[rgb(var(--sx-header))] border border-[rgb(var(--sx-border))] rounded-lg px-4 py-2.5 text-stone-200 focus:outline-none"
              >
                <option value="University">University</option>
                <option value="Project">Project</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
              </select>
              <button
                type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 bg-[rgb(var(--sx-raised))] text-stone-400 hover:text-stone-200 rounded-lg text-sm"
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
              className="p-6 rounded-xl bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] space-y-4 hover:border-stone-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || 'rgb(var(--am-600))' }} />
                    <h3 className="text-base font-bold text-stone-100">{project.name}</h3>
                  </div>
                  {project.description && (
                    <p className="text-sm text-stone-400 mt-1.5">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono px-2.5 py-1 rounded bg-[rgb(var(--sx-header))] border border-[rgb(var(--sx-border))] text-stone-300">
                    {project.category}
                  </span>
                  <button
                    onClick={() => handleDelete(project.id)}
                    title="Delete project"
                    className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-stone-400">
                  <span>Progress</span>
                  <span className="font-mono">{doneTasks.length}/{projectTasks.length} tasks ({percent}%)</span>
                </div>
                <div className="w-full bg-[rgb(var(--sx-raised))] rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>

              {/* Linked Tasks */}
              {projectTasks.length > 0 && (
                <div className="pt-2 border-t border-[rgb(var(--sx-border)/0.6)] space-y-2">
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Recent Project Tasks
                  </div>
                  {projectTasks.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="flex items-center justify-between p-2 rounded hover:bg-[rgb(var(--sx-header))] text-sm cursor-pointer text-stone-300"
                    >
                      <span className="truncate">{t.title}</span>
                      <span className={`text-xs uppercase px-2 py-0.5 rounded font-mono ${
                        t.status === 'done' ? 'text-emerald-400' : 'text-stone-400'
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
