import { useAuth } from '@/hooks/useAuth';
import { Menu, Shield, GraduationCap, User, LogOut } from 'lucide-react';
import { Role } from '../../../types/userTypes';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '@/components/dashboard/ThemeToggle';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  const { user, logout, impersonateRole } = useAuth();
  const navigate = useNavigate();

  const handleRoleNavigation = (role: Role) => {
    switch (role) {
      case Role.Administrador:
        navigate('/admin/dashboard');
        break;
      case Role.Instructor:
        navigate('/instructor/dashboard');
        break;
      case Role.Aprendiz:
        navigate('/apprentice/dashboard');
        break;
      default:
        navigate('/unauthorized');
    }
  };

  // Determina visibilidad de iconos según el rol del usuario (reglas explícitas)
  const roleValue = user?.role as Role | undefined;
  const showAdminIcon = roleValue === Role.Administrador;
  const showInstructorIcon = roleValue === Role.Instructor || roleValue === Role.Administrador;
  const showApprenticeIcon = roleValue === Role.Aprendiz || roleValue === Role.Instructor || roleValue === Role.Administrador;

  return (
    <header className="flex items-center justify-between py-1 px-2 sm:px-4 bg-white border-b" role="banner">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-9 h-9 rounded-md border bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          aria-label={isSidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
          aria-controls="dashboard-sidebar"
          aria-expanded={!!isSidebarOpen}
          title={isSidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        {/* Título eliminado para maximizar área */}
        {/* Controles DEV eliminados para evitar ruido visual */}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-nowrap ml-auto min-w-0">
        {/* Información de usuario/rol ocultada para aprovechar espacio */}
        
        {/* Navegación por roles con iconos */}
        <div className="flex items-center gap-2">
          {showAdminIcon && (
            <button
              onClick={() => handleRoleNavigation(Role.Administrador)}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
              aria-label="Panel de administrador"
              title="Panel de administrador"
            >
              <Shield className="h-4 w-4 text-blue-600" />
            </button>
          )}
          {showInstructorIcon && (
            <button
              onClick={() => handleRoleNavigation(Role.Instructor)}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
              aria-label="Panel de instructor"
              title="Panel de instructor"
            >
              <GraduationCap className="h-4 w-4 text-green-600" />
            </button>
          )}
          {showApprenticeIcon && (
            <button
              onClick={() => handleRoleNavigation(Role.Aprendiz)}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
              aria-label="Panel de aprendiz"
              title="Panel de aprendiz"
            >
              <User className="h-4 w-4 text-purple-600" />
            </button>
          )}
        </div>
        {/* Ícono de modo oscuro */}
        <ThemeToggle />
        {/* Botón de cerrar compacto */}
        <button
          onClick={logout}
          className="inline-flex items-center justify-center p-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
