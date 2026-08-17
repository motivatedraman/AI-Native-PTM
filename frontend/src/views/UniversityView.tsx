import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  TrendingUp,
  FolderKanban
} from 'lucide-react';
import { Task, Project } from '../types';

interface UniversityViewProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onOpenQuickAdd: () => void;
}

export const UniversityView: React.FC<UniversityViewProps> = ({
  tasks,
  projects,
  onSelectTask,
  onToggleComplete,
  onOpenQuickAdd,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');

  // Filter tasks belonging to University category
  const universityTasks = tasks.filter(t => 
    t.category.toLowerCase() === 'university' ||
    (t.project && t.project.category.toLowerCase() === 'university')
  );

  const universityProjects = projects.filter(p => p.category.toLowerCase() === 'university');

  const filteredTasks = selectedProjectId === 'all'
    ? universityTasks
    : universityTasks.filter(t => t.project_id === selectedProjectId);

  const doneTasks = filteredTasks.filter(t => t.status === 'done');
  const pendingTasks = filteredTasks.filter(t => t.status !== 'done');
  const completionRate = filteredTasks.length > 0 ? Math.round((doneTasks.length / filteredTasks.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-[#262a3c]/80 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">
            <GraduationCap size={16} />
            <span>Academic Command Center</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
            University Work & Courses
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Filtered unified view across DBMS, Computer Networks, AI, and Operating Systems courses.
          </p>
        </div>

        {/* Academic Progress Meter */}
        <div className="p-3 bg-[#12141c] border border-[#262a3c] rounded-xl flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Semester Progress</div>
            <div className="text-sm font-bold text-emerald-400">{doneTasks.length} / {filteredTasks.length} done ({completionRate}%)</div>
          </div>
          <div className="w-16 h-2 bg-[#1e2230] rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
      </div>

      {/* Course Subject Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedProjectId('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedProjectId === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#12141c] text-slate-400 hover:text-slate-200 border border-[#262a3c]'
          }`}
        >
          All Subjects ({universityTasks.length})
        </button>

        {universityProjects.map(p => {
          const count = universityTasks.filter(t => t.project_id === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                selectedProjectId === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#12141c] text-slate-400 hover:text-slate-200 border border-[#262a3c]'
              }`}
            >
              <BookOpen size={13} />
              <span>{p.name}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* University Deadlines & Assignments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            Upcoming Assignments & Study Sessions
          </span>
          <span>{pendingTasks.length} active</span>
        </div>

        <div className="space-y-2">
          {filteredTasks.map(task => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`flex items-center justify-between p-3.5 rounded-xl bg-[#12141c] hover:bg-[#181a24] border border-[#262a3c] transition-all cursor-pointer group ${
                  isDone ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task);
                    }}
                    className="text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    {isDone ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} />}
                  </button>
                  <div>
                    <div className={`text-xs font-medium ${isDone ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-white'}`}>
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-400 truncate max-w-lg mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400 flex-shrink-0">
                  {task.project && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                      {task.project.name}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="flex items-center space-x-1 text-slate-300">
                      <Calendar size={12} className="text-indigo-400" />
                      <span>{new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </span>
                  )}
                  {task.estimated_minutes && (
                    <span className="font-mono text-slate-400">~{task.estimated_minutes}m</span>
                  )}
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                    task.status === 'done' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                    task.status === 'doing' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                    'bg-[#1e2230] text-slate-400 border-slate-700'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
