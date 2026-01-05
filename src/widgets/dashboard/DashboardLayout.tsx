import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import { ToastProvider } from '@/app/providers/ToastContext';
import { ToastContainer } from '@/shared/ui/ToastContainer';
import { useSidebar } from '@/app/providers/SidebarContext';
import { cn } from '@/shared/ui/cn.ts';
import RoleBasedSideBar from "./RoleBasedSideBar";
import Footer from '../landing/Footer';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';
const PerformanceMonitor = lazy(() => import('./PerformanceMonitor'));

// Safe accessor for Vite env that works under Jest (no ESM import.meta parsing)
const viteEnv: Record<string, any> = ((globalThis as any)?.['import']?.['meta']?.['env'])
  || ((typeof (globalThis as any).process !== 'undefined' ? ((globalThis as any).process as any).env : undefined) as any)
  || {};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { sidebarWidth } = useSidebar();

  const sidebarProps = { isSidebarOpen, setIsSidebarOpen };

  // Detectar si estamos en desktop
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);

    return () => {
      window.removeEventListener('resize', checkIsDesktop);
    };
  }, []);

  // Mostrar loading hasta que el auth esté listo
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ToastProvider>
      <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-gray-100">
        <div className="flex flex-1 min-h-0">
          <RoleBasedSideBar {...sidebarProps} />

          <main
            className={cn(
              "flex-1 min-h-0 overflow-auto scrollbar-hide transition-all duration-300 ease-in-out flex flex-col",
              isDesktop ? `ml-[${sidebarWidth + 4}px]` : "ml-0"
            )}
          >
            {/* Contenido principal con gradiente */}
            <div className="flex-1 min-h-full bg-gradient-to-b from-gray-300">
              {children}
            </div>

            {/* Footer pegado al final sin espacios ni margen */}
            <Footer />
          </main>

          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-background lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            ></div>
          )}

          {/* Monitor de rendimiento solo en desarrollo */}
          {viteEnv.DEV && viteEnv.VITE_ENABLE_PERFORMANCE_MONITORING === 'true' && (
            <Suspense fallback={<div className="flex justify-center items-center p-4"><span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></span> Cargando monitor...</div>}>
              <PerformanceMonitor />
            </Suspense>
          )}
        </div>
        <ToastContainer />
      </div>
    </ToastProvider>
  );
};

export default DashboardLayout;
