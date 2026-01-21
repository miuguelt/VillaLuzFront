import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import RoleBasedSideBar from '@/widgets/dashboard/RoleBasedSideBar';
import Header from './Header';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';

const DashboardLayout: React.FC = () => {
  const { loading, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detectar escritorio para abrir sidebar por defecto
  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      // Solo auto-abrir si pasamos de mobile a desktop y no estaba ya abierto
      if (desktop && !isDesktop) {
        setIsSidebarOpen(true);
      }
      // Auto-cerrar si pasamos de desktop a mobile
      if (!desktop && isDesktop) {
        setIsSidebarOpen(false);
      }
    };

    // Check inicial
    const initialDesktop = window.innerWidth >= 1024;
    setIsDesktop(initialDesktop);
    // En el montaje inicial, si es desktop, abrimos sidebar.
    if (initialDesktop) setIsSidebarOpen(true);

    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    // CONTENEDOR PRINCIPAL: Flex Row, ocupa toda la pantalla, sin scroll global
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">

      {/* 1. SIDEBAR: Lógica de visualización */}
      {/* 
          En desktop: Es un elemento flex normal (relative por defecto). 
          Su ancho empuja al contenido.
          
          En móvil: Es fixed (flotante) y z-indexed sobre el contenido.
      */}
      <div
        className={`
          flex-shrink-0 transition-all duration-300 ease-in-out h-full border-r border-border/40
          ${isDesktop
            ? (isSidebarOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden border-none')
            : `fixed inset-y-0 left-0 z-50 w-[280px] shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          }
        `}
      >
        <RoleBasedSideBar
          isSidebarOpen={true} // Siempre renderiza contenido interno
          setIsSidebarOpen={setIsSidebarOpen}
        />
      </div>

      {/* Overlay para móvil */}
      {!isDesktop && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. AREA DE CONTENIDO: Ocupa el espacio restante */}
      <div className="flex flex-col flex-1 min-w-0 h-full relative">

        {/* Header siempre visible arriba */}
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* 
            MAIN CANVAS: El lienzo donde se pintan las páginas.
            - flex-1: Ocupa todo el alto vertical restante.
            - min-h-0: Obligatorio para permitir scroll interno si el hijo lo pide.
            - overflow-hidden: Por defecto CORTA contenido. 
              Las páginas hijas (Outlet) son responsables de decir 
              si quieren scrollear ("overflow-auto") o ser fijas ("h-full").
         */}
        <main className="flex-1 min-h-0 relative overflow-hidden bg-background/50">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default DashboardLayout;
