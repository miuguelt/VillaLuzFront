import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

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

  return (
    <button
      type="button"
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className="
        relative inline-flex items-center justify-center
        w-10 h-10 rounded-lg
        bg-gray-800/50 hover:bg-gray-800
        text-gray-300 hover:text-white
        transition-all duration-300 ease-in-out
        hover:shadow-lg hover:shadow-gray-900/30
        hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900
        group
      "
      aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      aria-pressed={theme === 'dark'}
      role="switch"
    >
      <div className="relative overflow-hidden">
        {/* Icono del Sol (Light mode) */}
        <Sun
          className={`
            h-5 w-5 absolute inset-0 transition-all duration-300 ease-in-out
            ${theme === 'dark' 
              ? 'opacity-0 rotate-90 scale-75' 
              : 'opacity-100 rotate-0 scale-100'
            }
            group-hover:text-yellow-400
          `}
        />
        
        {/* Icono de la Luna (Dark mode) */}
        <Moon
          className={`
            h-5 w-5 absolute inset-0 transition-all duration-300 ease-in-out
            ${theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
            }
            group-hover:text-blue-400
          `}
        />
      </div>
      
      {/* Indicador visual del estado */}
      <span className="sr-only">
        Tema actual: {theme === 'dark' ? 'Oscuro' : 'Claro'}
      </span>
    </button>
  );
};

export default ThemeToggle;