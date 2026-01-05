import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
  minWidth: number;
  maxWidth: number;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: React.ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [sidebarWidth, setSidebarWidth] = useState(288); // 18rem = 288px por defecto
  const [isResizing, setIsResizing] = useState(false);
  
  const minWidth = 240; // 15rem mínimo
  const maxWidth = 400; // 25rem máximo

  // Cargar ancho guardado desde sessionStorage
  useEffect(() => {
    const savedWidth = sessionStorage.getItem('sidebar-width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= minWidth && width <= maxWidth) {
        setSidebarWidth(width);
      }
    }
  }, [minWidth, maxWidth]);

  // Guardar ancho en sessionStorage cuando cambie
  useEffect(() => {
    sessionStorage.setItem('sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  const value = {
    sidebarWidth,
    setSidebarWidth,
    isResizing,
    setIsResizing,
    minWidth,
    maxWidth,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};