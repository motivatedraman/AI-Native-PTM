export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'nexus-theme';

export function getTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Apply the theme by toggling `html.light` (CSS vars do the rest). */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('light', theme === 'light');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode — session-only theme */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}

/** Call once before React renders to avoid a flash of the wrong theme. */
export function initTheme(): void {
  applyTheme(getTheme());
}
