import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Definición de tipos para los temas
export type ThemeMode = 'light' | 'dark' | 'nature' | 'ocean' | 'forest';

interface ThemeColors {
  // Colores principales
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  
  // Colores de fondo
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  
  // Colores de estado
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  
  // Colores de borde y entrada
  border: string;
  input: string;
  ring: string;
  
  // Colores específicos de la aplicación
  sidebar: string;
  sidebarForeground: string;
  header: string;
  headerForeground: string;
  
  // Colores para gráficos y estadísticas
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

interface ThemeConfig {
  name: string;
  displayName: string;
  colors: ThemeColors;
}

// Configuración de temas
const themes: Record<ThemeMode, ThemeConfig> = {
  light: {
    name: 'light',
    displayName: 'Modo Claro',
    colors: {
      primary: '220 70% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '210 40% 96%',
      secondaryForeground: '222.2 84% 4.9%',
      accent: '210 40% 92%',
      accentForeground: '222.2 84% 4.9%',
      
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      cardForeground: '222.2 84% 4.9%',
      popover: '0 0% 100%',
      popoverForeground: '222.2 84% 4.9%',
      
      muted: '210 40% 96%',
      mutedForeground: '215.4 16.3% 46.9%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 100%',
      success: '142 71% 45%',
      successForeground: '0 0% 100%',
      warning: '43 96% 56%',
      warningForeground: '0 0% 100%',
      info: '217 91% 60%',
      infoForeground: '0 0% 100%',
      
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '220 70% 50%',
      
      sidebar: '0 0% 98%',
      sidebarForeground: '222.2 84% 4.9%',
      header: '0 0% 100%',
      headerForeground: '222.2 84% 4.9%',
      
      chart1: '220 70% 50%',
      chart2: '160 60% 45%',
      chart3: '30 80% 55%',
      chart4: '280 65% 60%',
      chart5: '340 75% 55%'
    }
  },
  dark: {
    name: 'dark',
    displayName: 'Modo Oscuro',
    colors: {
      primary: '217 91% 60%',
      primaryForeground: '222.2 84% 4.9%',
      secondary: '217 32.6% 20%',
      secondaryForeground: '210 40% 98%',
      accent: '217 32.6% 20%',
      accentForeground: '0 0% 98%',
      
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '217.2 32.6% 8%',
      cardForeground: '210 40% 98%',
      popover: '217.2 32.6% 8%',
      popoverForeground: '210 40% 98%',
      
      muted: '217.2 32.6% 15%',
      mutedForeground: '0 0% 75%',
      destructive: '0 84% 60%',
      destructiveForeground: '210 40% 98%',
      success: '142 69% 58%',
      successForeground: '210 40% 98%',
      warning: '43 96% 70%',
      warningForeground: '222.2 84% 4.9%',
      info: '217 91% 70%',
      infoForeground: '222.2 84% 4.9%',
      
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '217 91% 60%',
      
      sidebar: '217.2 32.6% 3%',
      sidebarForeground: '0 0% 98%',
      header: '217.2 32.6% 5%',
      headerForeground: '0 0% 98%',
      
      chart1: '217 91% 60%',
      chart2: '142 76% 45%',
      chart3: '38 92% 60%',
      chart4: '280 65% 60%',
      chart5: '340 75% 55%'
    }
  },
  nature: {
    name: 'nature',
    displayName: 'Verde Naturaleza',
    colors: {
      primary: '142 76% 36%',
      primaryForeground: '0 0% 100%',
      secondary: '138 76% 95%',
      secondaryForeground: '142 76% 16%',
      accent: '138 76% 90%',
      accentForeground: '142 76% 16%',
      
      background: '138 76% 99%',
      foreground: '142 76% 16%',
      card: '0 0% 100%',
      cardForeground: '142 76% 16%',
      popover: '0 0% 100%',
      popoverForeground: '142 76% 16%',
      
      muted: '138 76% 94%',
      mutedForeground: '142 40% 46%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '142 76% 36%',
      successForeground: '0 0% 100%',
      warning: '43 96% 56%',
      warningForeground: '0 0% 100%',
      info: '200 76% 45%',
      infoForeground: '0 0% 100%',
      
      border: '138 76% 85%',
      input: '138 76% 85%',
      ring: '142 76% 36%',
      
      sidebar: '138 76% 96%',
      sidebarForeground: '142 76% 16%',
      header: '138 76% 99%',
      headerForeground: '142 76% 16%',
      
      chart1: '142 76% 36%',
      chart2: '120 76% 36%',
      chart3: '160 76% 36%',
      chart4: '100 76% 36%',
      chart5: '180 76% 36%'
    }
  },
  ocean: {
    name: 'ocean',
    displayName: 'Azul Océano',
    colors: {
      primary: '200 100% 40%',
      primaryForeground: '0 0% 100%',
      secondary: '200 40% 95%',
      secondaryForeground: '200 100% 16%',
      accent: '200 40% 90%',
      accentForeground: '200 100% 16%',
      
      background: '200 40% 99%',
      foreground: '200 100% 16%',
      card: '0 0% 100%',
      cardForeground: '200 100% 16%',
      popover: '0 0% 100%',
      popoverForeground: '200 100% 16%',
      
      muted: '200 40% 94%',
      mutedForeground: '200 40% 46%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '142 76% 36%',
      successForeground: '0 0% 100%',
      warning: '43 96% 56%',
      warningForeground: '0 0% 100%',
      info: '200 100% 50%',
      infoForeground: '0 0% 100%',
      
      border: '200 40% 85%',
      input: '200 40% 85%',
      ring: '200 100% 40%',
      
      sidebar: '200 40% 96%',
      sidebarForeground: '200 100% 16%',
      header: '200 40% 99%',
      headerForeground: '200 100% 16%',
      
      chart1: '200 100% 40%',
      chart2: '220 100% 40%',
      chart3: '180 100% 40%',
      chart4: '240 100% 40%',
      chart5: '160 100% 40%'
    }
  },
  forest: {
    name: 'forest',
    displayName: 'Verde Bosque',
    colors: {
      primary: '120 60% 25%',
      primaryForeground: '0 0% 100%',
      secondary: '120 30% 95%',
      secondaryForeground: '120 60% 15%',
      accent: '120 30% 90%',
      accentForeground: '120 60% 15%',
      
      background: '120 30% 98%',
      foreground: '120 60% 15%',
      card: '0 0% 100%',
      cardForeground: '120 60% 15%',
      popover: '0 0% 100%',
      popoverForeground: '120 60% 15%',
      
      muted: '120 30% 93%',
      mutedForeground: '120 30% 45%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '120 60% 25%',
      successForeground: '0 0% 100%',
      warning: '43 96% 56%',
      warningForeground: '0 0% 100%',
      info: '200 76% 45%',
      infoForeground: '0 0% 100%',
      
      border: '120 30% 85%',
      input: '120 30% 85%',
      ring: '120 60% 25%',
      
      sidebar: '120 30% 95%',
      sidebarForeground: '120 60% 15%',
      header: '120 30% 98%',
      headerForeground: '120 60% 15%',
      
      chart1: '120 60% 25%',
      chart2: '100 60% 25%',
      chart3: '140 60% 25%',
      chart4: '80 60% 25%',
      chart5: '160 60% 25%'
    }
  }
};

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  colors: ThemeColors;
  themeConfig: ThemeConfig;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'nature' 
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Intentar obtener el tema guardado desde sessionStorage
    if (typeof window !== 'undefined') {
      const savedTheme = sessionStorage.getItem('finca-theme') as ThemeMode;
      if (savedTheme && themes[savedTheme]) {
        return savedTheme;
      }
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return defaultTheme;
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('finca-theme', newTheme);
    }
  };

  const themeConfig = themes[theme];
  const availableThemes = Object.values(themes);

  // Aplicar variables CSS cuando cambie el tema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // Aplicar todas las variables CSS
      Object.entries(themeConfig.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
      
      // Agregar clase del tema al body para transiciones
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${theme}`);

      // Toggle dark mode: clase .dark en <html> para variantes de Tailwind
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme, themeConfig]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    colors: themeConfig.colors,
    themeConfig,
    availableThemes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook para obtener clases CSS basadas en el tema actual
export const useThemeClasses = () => {
  const { theme } = useTheme();
  
  return {
    // Clases base
    background: 'bg-background text-foreground',
    card: 'bg-card text-card-foreground border border-border',
    button: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive',
      success: 'bg-success text-success-foreground hover:bg-success',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
    },
    input: 'border border-input bg-background text-foreground placeholder:text-muted-foreground',
    sidebar: 'bg-sidebar text-sidebar-foreground border-r border-border',
    header: 'bg-header text-header-foreground border-b border-border',
    
    // Estados
    muted: 'text-muted-foreground',
    accent: 'bg-accent text-accent-foreground',
    
    // Utilidades específicas del tema
    themeClass: `theme-${theme}`,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isNature: theme === 'nature'
  };
};

export default ThemeContext;