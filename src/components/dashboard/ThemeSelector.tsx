import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, Leaf, Palette, Check, Waves, Trees } from 'lucide-react';

const ThemeSelector: React.FC = () => {
  const { theme, setTheme, availableThemes } = useTheme();

  const getThemeIcon = (themeName: string) => {
    switch (themeName) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'nature':
        return <Leaf className="w-4 h-4" />;
      case 'ocean':
        return <Waves className="w-4 h-4" />;
      case 'forest':
        return <Trees className="w-4 h-4" />;
      default:
        return <Palette className="w-4 h-4" />;
    }
  };

  const getThemeDescription = (themeName: string) => {
    switch (themeName) {
      case 'light':
        return 'Colores claros y luminosos para mejor visibilidad diurna';
      case 'dark':
        return 'Tonos oscuros que reducen la fatiga visual en ambientes con poca luz';
      case 'nature':
        return 'Inspirado en la naturaleza con tonos verdes relajantes';
      case 'ocean':
        return 'Azules oceánicos frescos y profesionales';
      case 'forest':
        return 'Verdes profundos del bosque, elegante';
      default:
        return 'Tema personalizado';
    }
  };

  const currentTheme = availableThemes.find(t => t.name === theme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {getThemeIcon(theme)}
          <span className="hidden sm:inline">{currentTheme?.displayName}</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {(theme as string | undefined)?.charAt?.(0)?.toUpperCase?.() ?? '?'}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 bg-popover text-popover-foreground border-border shadow-lg"
      >
        <div className="p-2">
          <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Seleccionar Tema
          </h3>
          
          {availableThemes.map((themeOption) => (
            <DropdownMenuItem
              key={themeOption.name}
              onClick={() => setTheme(themeOption.name as any)}
              className={`flex flex-col items-start p-3 cursor-pointer rounded-md transition-all ${theme === themeOption.name ? 'bg-accent text-accent-foreground border border-primary' : 'hover:bg-accent hover:text-accent-foreground'}`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    theme === themeOption.name 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {getThemeIcon(themeOption.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{themeOption.displayName}</span>
                      {theme === themeOption.name && (
                        <Check className="w-4 h-4 text-success" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed ml-11">
                {getThemeDescription(themeOption.name)}
              </p>
              
              {/* Preview de colores del tema */}
              <div className="flex items-center gap-1 mt-2 ml-11">
                <div 
                  className="w-3 h-3 rounded-full border border-border shadow-sm bg-[hsl(var(--primary))]`" 
                  title="Color primario"
                />
                <div 
                  className="w-3 h-3 rounded-full border border-border shadow-sm bg-[hsl(var(--secondary))]`" 
                  title="Color secundario"
                />
                <div 
                  className="w-3 h-3 rounded-full border border-border shadow-sm bg-[hsl(var(--accent))]`" 
                  title="Color de acento"
                />
                <div 
                  className="w-3 h-3 rounded-full border border-border shadow-sm bg-[hsl(var(--success))]`" 
                  title="Color de éxito"
                />
                <div 
                  className="w-3 h-3 rounded-full border border-border shadow-sm bg-[hsl(var(--warning))]`" 
                  title="Color de advertencia"
                />
              </div>
            </DropdownMenuItem>
          ))}
          
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Los cambios se aplican inmediatamente y se guardan automáticamente
            </p>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSelector;