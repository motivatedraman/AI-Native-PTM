import React, { useState } from 'react';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  /** Upsert into App state. The POST response is authoritative, so there is
   *  no refetch: the only other project-shaped thing that could have
   *  changed meanwhile is a deletion in another tab, and that is covered
   *  by the focus refetch. */
  onProjectCreated: (project: Project) => void;
  onProjectDeleted: (projectId: number) => void;
}

/** Colours offered when creating a project.
 *
 *  These are the palette's own values rather than a free colour picker.
 *  A hex input would let a project arrive in a colour that is invisible on
 *  both the light and dark backgrounds, and picking one is faster than
 *  typing a value anyway. */
const SWATCHES = [
  { name: 'Slate', value: '#6366f1' },
  { name: 'Teal', value: '#4a9d8f' },
  { name: 'Amber', value: '#d8a657' },
  { name: 'Rose', value: '#c96a7a' },
  { name: 'Sage', value: '#7d9b76' },
  { name: 'Steel', value: '#5b7c99' },
];

const CATEGORIES = ['General', 'Personal', 'University', 'Work', 'Project'];

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  onProjectCreated,
  onProjectDeleted,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(SWATCHES[0].value);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setName('');
    setDescription('');
    setColor(SWATCHES[0].value);
    setCategory(CATEGORIES[0]);
    setError('');
  };

  const handleClose = () => {
    reset();
    setPendingDelete(null);
    onClose();
  };

  /* No character restrictions on the name.
   *
   * The backend takes any string up to 100 characters and treats a name as
   * a name: "#reading", "!urgent", "50% off", "C++ & Rust" are all ordinary
   * project names. Stripping leading # or ! would silently rename them,
   * and the field does not need to be restricted for the request to be
   * valid -- the database rejects anything over 100 characters anyway. */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;

    if (trimmed.length > 100) {
      setError('Keep the name under 100 characters.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const created = await api.createProject({
        name: trimmed,
        description: description.trim() || undefined,
        color,
        category,
      });
      onProjectCreated(created);
      reset();
    } catch (err) {
      // The API rejects a duplicate name with a 400 and a message worth
      // showing verbatim; a network failure does not have one.
      const message = err instanceof Error ? err.message : 'Could not create the project.';
      setError(
        message.includes('already exists')
          ? 'A project with that name already exists.'
          : message.replace('Failed to create project', 'Could not create the project.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (pendingDelete?.id !== project.id) {
      setPendingDelete(project);
      return;
    }
    try {
      await api.deleteProject(project.id);
      onProjectDeleted(project.id);
      setPendingDelete(null);
    } catch {
      setError('Could not delete that project.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-[10vh] overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-xl space-y-4 view-enter"
        style={{
          background: 'rgb(var(--sx-modal))',
          border: '1px solid rgb(var(--sx-border-2))',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgb(var(--sx-border))' }}
        >
          <h2 className="text-sm font-semibold text-stone-100">Projects</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'rgb(var(--st-500))' }}
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Create */}
        <form onSubmit={handleCreate} className="px-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name, e.g. #reading or !urgent"
              maxLength={100}
              autoFocus
              className="flex-1 bg-[rgb(var(--sx-card))] border border-[rgb(var(--sx-border-2))] rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              style={{ color: 'rgb(var(--st-100))' }}
            />
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
              style={{ background: 'rgb(var(--sx-raised))', color: 'rgb(var(--st-300))' }}
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
          </div>

          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={500}
            className="w-full bg-[rgb(var(--sx-card))] border border-[rgb(var(--sx-border-2))] rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            style={{ color: 'rgb(var(--st-100))' }}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              {SWATCHES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setColor(s.value)}
                  title={s.name}
                  aria-label={s.name}
                  aria-pressed={color === s.value}
                  className="w-5 h-5 rounded-full transition-transform"
                  style={{
                    background: s.value,
                    outline: color === s.value ? '2px solid rgb(var(--st-300))' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-[rgb(var(--sx-card))] border border-[rgb(var(--sx-border-2))] rounded-lg px-2 py-1.5 text-xs focus:outline-none"
              style={{ color: 'rgb(var(--st-300))' }}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--rose)' }}>{error}</p>
          )}
        </form>

        {/* List */}
        <ul className="px-2 pb-2 space-y-px max-h-[45vh] overflow-y-auto">
          {projects.length === 0 ? (
            <li className="text-sm py-6 text-center" style={{ color: 'rgb(var(--st-600))' }}>
              No projects yet.
            </li>
          ) : (
            projects.map(p => (
              <li
                key={p.id}
                className="group flex items-center gap-3 px-2 py-2 rounded-lg transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-header))'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: p.color || '#6366f1' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: 'rgb(var(--st-100))' }}>
                    {p.name}
                  </div>
                  {p.description && (
                    <div className="text-xs truncate" style={{ color: 'rgb(var(--st-600))' }}>
                      {p.description}
                    </div>
                  )}
                </div>
                <span
                  className="text-xs font-mono flex-shrink-0"
                  style={{ color: 'rgb(var(--st-600))' }}
                >
                  {p.task_count ?? 0}
                </span>
                <button
                  onClick={() => handleDelete(p)}
                  className="p-1.5 rounded transition-colors flex-shrink-0"
                  style={{
                    color: pendingDelete?.id === p.id ? 'var(--rose)' : 'rgb(var(--st-600))',
                  }}
                  title={
                    pendingDelete?.id === p.id
                      ? 'Click again to confirm'
                      : 'Delete project (tasks are unlinked, not deleted)'
                  }
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};