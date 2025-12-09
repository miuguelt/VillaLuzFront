import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sidebarItems, type Role as SidebarRole } from '@/components/dashboard/sidebarConfig';
import { Link } from 'react-router-dom';
import { Loader } from '@/components/ui/Loader';
import { normalizeRole } from '@/services/authService';
import { ChevronDown, ChevronUp, X, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>; // Cambiar a un tipo que tu hook useAuth devuelve para el usuario
}

const RoleBasedSideBar: React.FC<SidebarProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { user, role, loading, isAuthenticated, checkAuthStatus, logout: signOut } = useAuth() as any;

  // Preferir el rol del contexto y, si no existe, usar el del usuario
  const rawRole = role ?? (user as any)?.role ?? null;
  const currentRole = useMemo(() => {
    const norm = (normalizeRole as any)?.(rawRole);
    return norm ?? (typeof rawRole === 'string' ? rawRole : null);
  }, [rawRole]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [sidebarWidth] = useState(288); // Ancho fijo en desktop (w-72 = 288px)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const minWidth = 200;
  const maxWidth = 320;

  useEffect(() => {
    // Exponer ancho a CSS para reservar espacio en desktop desde el layout
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        // setSidebarWidth(newWidth); // Deshabilitado: no permitimos redimensionar
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
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing-sidebar');
    };
  }, [isResizing, minWidth, maxWidth]);

  // En móvil: enfocar el botón de cierre al abrir y permitir cerrar con ESC
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isSidebarOpen && isMobile) {
      closeBtnRef.current?.focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen && isMobile) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen, setIsSidebarOpen]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    // Deshabilitado: no permitimos iniciar redimensionamiento
    setIsResizing(false);
  };

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Si el usuario está autenticado pero el rol aún no está resuelto (p. ej. tras F5),
  // disparar una revalidación y mostrar un loader temporal en lugar del mensaje de error.
  useEffect(() => {
    if (!loading && isAuthenticated && !currentRole) {
      try {
        void (checkAuthStatus as any)?.({ background: true });
      } catch {
        // no-op
      }
    }
  }, [loading, isAuthenticated, currentRole, checkAuthStatus]);

  const filteredCategories = useMemo(() => {
    if (!currentRole) return [];
    return sidebarItems
      .filter((cat) => (cat.roles as SidebarRole[]).includes(currentRole as SidebarRole))
      .map((cat) => ({
        ...cat,
        children: (cat.children || []).filter((child) => (child.roles as SidebarRole[]).includes(currentRole as SidebarRole))
      }))
      .filter((cat) => (cat.children || []).length > 0);
  }, [currentRole]);

  if (loading) {
    return (
      <div
        className={`fixed inset-y-0 left-0 z-40 h-screen flex items-center justify-center transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} bg-gray-900 text-gray-100`}
      >
        <Loader />
        <span className="ml-2 text-sm">Cargando menú...</span>
      </div>
    );
  }

  if (!currentRole) {
    // Si no hay rol y no está autenticado, mostrar invitación a iniciar sesión
    if (!isAuthenticated) {
      return (
        <div
          className={`fixed inset-y-0 left-0 z-40 h-screen flex items-center justify-center transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} bg-gray-900 text-gray-100`}
        >
          <span className="text-gray-400 text-sm">Inicia sesión para acceder al menú.</span>
        </div>
      );
    }
    // Usuario autenticado pero el rol aún no está resuelto: mostrar loader en lugar de error
    return (
      <div
        className={`fixed inset-y-0 left-0 z-40 h-screen flex items-center justify-center transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} bg-gray-900 text-gray-100`}
      >
        <Loader />
        <span className="ml-2 text-sm text-gray-300">Validando sesión y cargando menú...</span>
      </div>
    );
  }

  const getRolePrefix = (r: string): string => {
    switch (r) {
      case 'Administrador': return '/admin';
      case 'Instructor': return '/instructor';
      case 'Aprendiz': return '/apprentice';
      default: return '/';
    }
  };

  const rolePrefix = getRolePrefix(currentRole);

  const handleItemClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const dynamicWidth = `min-w-[${sidebarWidth}px]`;

  return (
    <>
      <aside
        ref={sidebarRef}
        id="dashboard-sidebar"
        className={`fixed inset-y-0 left-0 z-40 h-screen bg-background text-text-primary border-r border-border transform transition-all duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} w-72 ${dynamicWidth} shadow-2xl shadow-black/20 flex flex-col overflow-hidden ${dynamicWidth}`}
        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : 'auto' }}
        aria-hidden={!isSidebarOpen ? "true" : "false"}
        role="navigation"
        aria-label="Menú de navegación principal"
      >
        {/* Capa global de textura tipo papel/grano (sutil) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(hsl(var(--overlay-soft)) 1px, transparent 1px), radial-gradient(hsl(var(--overlay-muted)) 1px, transparent 1px)',
            backgroundSize: '3px 3px, 4px 4px',
            backgroundPosition: '0 0, 1px 1px',
          }}
          aria-hidden="true"
        />

        {/* Header del sidebar */}
        <div className="p-3 sm:p-4 border-b border-border bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 relative z-10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <span className="font-semibold text-xs">{currentRole?.toString?.()?.charAt?.(0) ?? '?'}</span>
              </div>
              <div className="flex flex-col leading-tight z-10">
                <span className="font-semibold text-sm">{currentRole}</span>
                <span className="text-xs text-text-secondary">Panel de control</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle de tema se movió al pie del menú para un diseño más coherente */}
              <button
                type="button"
                ref={closeBtnRef}
                className="lg:hidden p-2 rounded-md hover:bg-state-hover text-text-secondary transition-all duration-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Cerrar menú lateral"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent" role="menu" aria-label="Categorías del menú">
          {filteredCategories.map((category) => {
            const isOpen = openGroups[category.title] ?? false;
            return (
              <div key={category.title} className="mt-1" role="menuitem">
                {/* Encabezado de categoría */}
                <button
                  type="button"
                  onClick={() => toggleGroup(category.title)}
                  className="w-full flex items-center justify-between py-3 px-4 rounded-lg bg-surface-secondary hover:bg-state-hover text-text-primary transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface group"
                  aria-expanded={isOpen}
                  aria-controls={`category-${category.title.replace(/\s+/g, '-').toLowerCase()}`}
                  aria-label={`Toggle ${category.title} category`}
                >
                  <div className="flex items-center gap-3 text-text-primary group-hover:text-primary transition-colors duration-200">
                    <span className="transition-transform duration-200 group-hover:scale-110">{category.icon}</span>
                    <span className="font-medium text-sm">{category.title}</span>
                  </div>
                  <div className="transition-transform duration-200 group-hover:scale-110 text-text-secondary">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {/* Children */}
                {isOpen && (
                  <div
                    id={`category-${category.title.replace(/\s+/g, '-').toLowerCase()}`}
                    className="mt-2 ml-4 border-l border-border pl-4 space-y-1 animate-in slide-in-from-top-2 duration-200"
                    role="menu"
                    aria-label={`${category.title} items`}
                  >
                    {(category.children || []).map(child => (
                      <Link
                        key={`${category.title}-${child.title}-${child.path}`}
                        to={`${rolePrefix}/${child.path}`}
                        onClick={handleItemClick}
                        className="flex items-center py-2.5 px-3 rounded-lg text-text-secondary transition-all duration-200 hover:bg-ghost-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface group"
                        role="menuitem"
                        aria-label={`Ir a ${child.title}`}
                      >
                        <span className="mr-3 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary">{child.icon}</span>
                        <span className="text-sm font-medium">{child.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredCategories.length === 0 && (
            <div className="p-4 text-center text-text-secondary bg-surface rounded-lg border border-border" role="status" aria-live="polite">
              No hay items disponibles para tu rol: {currentRole}
            </div>
          )}
        </nav>

        {/* Pie de menú con acciones (sin elementos decorativos) */}
        <div className="mt-auto border-t border-border bg-surface p-2 sm:p-4">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut?.()}
              className="ml-auto inline-flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Resizer deshabilitado (oculto) */}
        <div
          ref={resizeRef}
          className="hidden"
          onMouseDown={handleResizeStart}
          aria-hidden="true"
        />
      </aside>
    </>
  );
};

export default RoleBasedSideBar;
