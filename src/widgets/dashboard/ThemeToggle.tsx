import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleTheme();
    }
  };

  // Estilo coherente con los demás iconos del header
  const baseBtn = 'p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors';
  const iconClasses = 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className={baseBtn}
      aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'dark' ? (
        <Sun className={`${iconClasses} text-yellow-500`} />
      ) : (
        <Moon className={`${iconClasses} text-blue-700`} />
      )}
    </button>
  );
};

export default ThemeToggle;