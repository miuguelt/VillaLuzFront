import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, X, Menu as MenuIcon, GripVertical } from 'lucide-react';
import { FaSignOutAlt } from 'react-icons/fa';
import ThemeSelector from './ThemeSelector';

interface SidebarItemProps {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ icon, title, children, onClick }) => {

  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-1">
      <button
        className="flex items-center w-full p-2 sm:p-3 text-sidebar-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-all duration-200 group min-h-[2.5rem] sm:min-h-[3rem]"
        onClick={() => {
          setIsOpen(!isOpen)
          onClick && onClick()
        }}
        aria-expanded={isOpen}
        aria-label={children ? `${title} - ${isOpen ? 'Contraer' : 'Expandir'} menú` : title}
      >
        <div className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 text-sidebar-foreground group-hover:text-accent-foreground transition-colors flex-shrink-0">
          {icon}
        </div>
        <span className="ml-2 sm:ml-3 font-medium text-xs sm:text-sm truncate flex-1 text-left">{title}</span>
        {children && (
          <span className="ml-auto transition-transform duration-200 flex-shrink-0">
            {isOpen ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
          </span>
        )}
      </button>
      {children && isOpen && (
        <div className="ml-6 sm:ml-8 mt-1 sm:mt-2 space-y-1 border-l border-border pl-3 sm:pl-4">
          {children}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  children?: React.ReactNode;
  heading: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, isSidebarOpen, setIsSidebarOpen }) => {
  const { logout, role } = useAuth();
  const { sidebarWidth, setSidebarWidth, isResizing, setIsResizing, minWidth, maxWidth } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const resizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const path = location.pathname.split("/")[1];
    if (path === "dashboard") {
      // Redirect based on role
      if (role === "Administrador") {
        navigate("/admin/dashboard");
      } else if (role === "Instructor") {
        navigate("/instructor/dashboard");
      } else if (role === "Aprendiz") {
        navigate("/apprentice/dashboard");
      } else {
        navigate("/login");
      }
    }
  }, [location.pathname, navigate, role]);

  // Lógica de redimensionamiento del sidebar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('resizing-sidebar');
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('resizing-sidebar');
    } else {
      document.body.classList.remove('resizing-sidebar');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing-sidebar');
    };
  }, [isResizing, setSidebarWidth, setIsResizing, minWidth, maxWidth]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  const handleResizeStart = () => {
    if (window.innerWidth >= 1024) { // Solo en desktop
      setIsResizing(true);
    }
  };

  // Navigation is handled through direct links in the sidebar items

  return (
    <>
      {!isSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 lg:hidden"
          onClick={() => setIsSidebarOpen(true)}
        >
          <MenuIcon className="h-6 w-6" />
          <span className="sr-only">Abrir</span>
        </Button>
      )}

      <div 
        ref={resizeRef}
        className={`
          fixed top-0 left-0 z-40 h-screen w-72 lg:w-[var(--sidebar-width)]
          bg-sidebar text-sidebar-foreground border-r border-border lg:border-r-0
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 flex flex-col shadow-lg lg:shadow-none
          ${isResizing ? 'select-none' : ''}
        `}
      >
        {/* Header del sidebar */}
        <div className="p-3 sm:p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="flex-1 justify-start bg-sidebar text-sidebar-foreground hover:bg-accent hover:text-accent-foreground p-2 sm:p-3 h-auto min-h-[3rem]"
              onClick={() => {
                if (role === 'Administrador') navigate('/admin/dashboard');
                else if (role === 'Instructor') navigate('/instructor/dashboard');
                else if (role === 'Aprendiz') navigate('/apprentice/dashboard');
                setIsSidebarOpen(false);
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <span className="font-semibold text-xs sm:text-sm">{role?.charAt?.(0) ?? '?'}</span>
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-semibold text-xs sm:text-sm truncate">{role}</span>
                  <span className="text-xs text-muted-foreground hidden sm:block">Panel de control</span>
                </div>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-accent hover:text-accent-foreground ml-1 sm:ml-2 flex-shrink-0"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="sr-only">Cerrar menú</span>
            </Button>
          </div>
        </div>

        {/* Navegación principal */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <nav className="space-y-1 p-3 sm:p-4">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1 sm:px-2">
                Navegación
              </h3>
            </div>
            {children}
          </nav>
        </div>
        
        {/* Footer del sidebar con tema y logout */}
        <div className="p-3 sm:p-4 border-t border-border bg-sidebar">
          <div className="space-y-2">
            <div className="mb-2 sm:mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Configuración
              </h4>
            </div>
            
            {/* Selector de tema */}
            <div className="w-full">
              <ThemeSelector />
            </div>
            
            {/* Botón de cerrar sesión */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:bg-destructive hover:text-destructive transition-colors p-2 sm:p-3"
              onClick={() => {
                logout();
                navigate('/login');
                setIsSidebarOpen(false);
              }}
            >
              <FaSignOutAlt className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="font-medium text-sm">Cerrar sesión</span>
            </Button>
          </div>
         </div>
         
         {/* Handle de redimensionamiento - Solo visible en desktop */}
         <div 
           className="sidebar-resize-handle hidden lg:block group"
           onMouseDown={handleResizeStart}
           title="Arrastrar para redimensionar el menú"
         >
           <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
             <div className="bg-primary rounded-full p-1 shadow-lg">
               <GripVertical className="h-4 w-4 text-primary-foreground" />
             </div>
           </div>
         </div>
       </div>
     </>
   );
};
