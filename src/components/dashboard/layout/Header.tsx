import { useAuth } from '@/hooks/useAuth';
import { Menu, Shield, GraduationCap, User } from 'lucide-react';
import { Role } from '../../../types/userTypes';
import { useNavigate } from 'react-router-dom';

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

  // Determina qué iconos de acceso a dashboards mostrar según el rol del usuario
  const visibleRoleIcons: Role[] = (() => {
    switch (user?.role) {
      case Role.Administrador:
        return [Role.Administrador, Role.Instructor, Role.Aprendiz];
      case Role.Instructor:
        return [Role.Instructor, Role.Aprendiz];
      case Role.Aprendiz:
        return [Role.Aprendiz];
      default:
        return [];
    }
  })();

  return (
    <header className="flex items-center justify-between py-1 px-4 bg-white border-b" role="banner">
      <div className="flex items-center space-x-3">
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
        <h1 className="text-xl font-bold" tabIndex={0} aria-label="Título de la sección">Dashboard</h1>
        {impersonateRole && (
          <div className="hidden md:flex items-center space-x-2 ml-4">
            <span className="text-sm text-gray-500">Change role (DEV):</span>
            <button onClick={() => impersonateRole(Role.Administrador)} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Admin</button>
            <button onClick={() => impersonateRole(Role.Aprendiz)} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Apprentice</button>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <span tabIndex={0} aria-label={`Usuario actual: ${user?.fullname}, rol: ${user?.role}`}>{user?.fullname} ({user?.role})</span>
        
        {/* Navegación por roles con iconos */}
        <div className="flex items-center space-x-2">
          {visibleRoleIcons.includes(Role.Administrador) && (
            <button
              onClick={() => handleRoleNavigation(Role.Administrador)}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
              aria-label="Dashboard Administrador"
              title="Dashboard Administrador"
            >
              <Shield className="h-4 w-4 text-blue-600" />
            </button>
          )}
          {visibleRoleIcons.includes(Role.Instructor) && (
            <button
              onClick={() => handleRoleNavigation(Role.Instructor)}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
              aria-label="Dashboard Instructor"
              title="Dashboard Instructor"
            >
              <GraduationCap className="h-4 w-4 text-green-600" />
            </button>
          )}
          {visibleRoleIcons.includes(Role.Aprendiz) && (
            <button
              onClick={() => handleRoleNavigation(Role.Aprendiz)}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
              aria-label="Dashboard Aprendiz"
              title="Dashboard Aprendiz"
            >
              <User className="h-4 w-4 text-purple-600" />
            </button>
          )}
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Cerrar sesión"
        >
          Cerrar
        </button>
      </div>
    </header>
  );
};

export default Header;
