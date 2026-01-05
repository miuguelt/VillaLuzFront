import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import RoleBasedSideBar from '@/widgets/dashboard/RoleBasedSideBar';
import Header from './Header';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';

const DashboardLayout: React.FC = () => {
  const { loading, isAuthenticated } = useAuth();
  const { pathname: path } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detectar si estamos en desktop para aplicar apertura por defecto del sidebar
  useEffect(() => {
    const applyLayoutByViewport = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setIsSidebarOpen(desktop);
    };
    applyLayoutByViewport();
    window.addEventListener('resize', applyLayoutByViewport);
    return () => window.removeEventListener('resize', applyLayoutByViewport);
  }, []);

  // Cuando cambie el estado de apertura en móvil, bloquear/desbloquear el scroll del body
  useEffect(() => {
    const desktop = window.innerWidth >= 1024;
    if (!desktop) {
      if (isSidebarOpen) {
        document.documentElement.classList.add('overflow-hidden');
        document.body.classList.add('overflow-hidden');
      } else {
        document.documentElement.classList.remove('overflow-hidden');
        document.body.classList.remove('overflow-hidden');
      }
    }
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }, [isSidebarOpen]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Estándar de pantallas CRUD full-bleed: usar prefijos canónicos por rol y módulo
  const roles = ['/admin', '/apprentice', '/instructor'] as const;
  const modules = [
    'animals',
    'fields',
    'species',
    'breeds',
    'diseases',
    'medications',
    'vaccines',
    'vaccinations',
    'treatments',
    'controls',
    'animal-fields',
    'disease-animals',
    'genetic-improvements',
    'species-breeds',
    'food-types',
    'users',
    'treatment_medications',
    'treatment_vaccines',
    'route_administration',
    'base_model',
  ] as const;
  const crudPrefixes = roles.flatMap((r) => modules.map((m) => `${r}/${m}`));
  const isCRUDFullBleed = crudPrefixes.some((p) => path.startsWith(p));

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground transition-colors duration-300">
      <RoleBasedSideBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden relative transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: isDesktop && isSidebarOpen ? 'var(--sidebar-width)' : 0 }}
      >
        <Header isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
        <main
          className={`flex-1 min-h-0 overflow-x-auto ${isCRUDFullBleed ? 'overflow-y-hidden' : 'overflow-y-auto'}
                     bg-background transition-all duration-300 ease-in-out
                     px-2 sm:px-3 md:px-4 lg:px-6 pt-1 md:pt-2
                     ${isCRUDFullBleed ? 'pb-0' : 'pb-3 md:pb-4'}
                     relative`}
        >
          <Outlet />
        </main>
        {!isDesktop && isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
