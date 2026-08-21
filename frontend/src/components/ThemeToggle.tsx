import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getTheme, toggleTheme } from '../utils/theme';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(getTheme());

  return (
    <button
      onClick={() => setTheme(toggleTheme())}
      className={`p-2 rounded-xl transition-all ${className}`}
      style={{
        background: 'rgb(var(--sx-card))',
        border: '1px solid rgb(var(--sx-border-2))',
        color: 'rgb(var(--st-400))',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-200))';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-3))';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-400))';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-2))';
      }}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
};
