import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';

const Sidebar = () => {
  const { user } = useAuth();

  const getRoleLinks = () => {
    switch (user?.role) {
      case 'Administrador':
        return [
          { path: '/dashboard/admin', name: '🏠 Inicio', icon: '🏠' },
          { path: '/dashboard/admin/analytics/executive', name: '📊 Analíticas', icon: '📊' },
          { path: '/dashboard/admin/users', name: 'Usuarios', icon: '👥' },
          { path: '/admin/animals', name: 'Animales', icon: '🐄' },
          { path: '/admin/fields', name: 'Potreros', icon: '🗺️' },
          { path: '/admin/food-types', name: 'Tipos de Alimento', icon: '🌾' },
          { path: '/admin/species', name: 'Especies', icon: '🦌' },
          { path: '/admin/breeds', name: 'Razas', icon: '🧬' },
        ];
      case 'Instructor':
        return [
          { path: '/dashboard/instructor', name: '🏠 Inicio', icon: '🏠' },
          { path: '/dashboard/instructor/analytics', name: '📊 Analíticas', icon: '📊' },
          { path: '/instructor/animals', name: 'Animales', icon: '🐄' },
          { path: '/instructor/fields', name: 'Potreros', icon: '🗺️' },
          { path: '/instructor/food-types', name: 'Alimentos', icon: '🌾' },
          { path: '/instructor/vaccines', name: 'Vacunas', icon: '💉' },
          { path: '/instructor/vaccinations', name: 'Vacunaciones', icon: '💊' },
          { path: '/instructor/medications', name: 'Medicamentos', icon: '💊' },
          { path: '/instructor/diseases', name: 'Enfermedades', icon: '🦠' },
          { path: '/instructor/treatments', name: 'Tratamientos', icon: '🏥' },
          { path: '/instructor/controls', name: 'Controles', icon: '📋' },
          { path: '/instructor/animal-fields', name: 'Ubicación Animales', icon: '📍' },
          { path: '/instructor/disease-animals', name: 'Enfermedades Animales', icon: '🩺' },
          { path: '/instructor/genetic-improvements', name: 'Mejoras Genéticas', icon: '🧬' },
          { path: '/instructor/species-breeds', name: 'Especies y Razas', icon: '🦌' },
        ];
      case 'Aprendiz':
        return [
          { path: '/dashboard/apprentice', name: '🏠 Inicio', icon: '🏠' },
          { path: '/dashboard/apprentice/analytics', name: '📊 Analíticas', icon: '📊' },
          { path: '/apprentice/animals', name: 'Animales', icon: '🐄' },
          { path: '/apprentice/fields', name: 'Potreros', icon: '🗺️' },
          { path: '/apprentice/food-types', name: 'Alimentos', icon: '🌾' },
          { path: '/apprentice/vaccines', name: 'Vacunas', icon: '💉' },
          { path: '/apprentice/vaccinations', name: 'Vacunaciones', icon: '💊' },
          { path: '/apprentice/medications', name: 'Medicamentos', icon: '💊' },
          { path: '/apprentice/diseases', name: 'Enfermedades', icon: '🦠' },
          { path: '/apprentice/treatments', name: 'Tratamientos', icon: '🏥' },
          { path: '/apprentice/controls', name: 'Controles', icon: '📋' },
          { path: '/apprentice/animal-fields', name: 'Ubicación Animales', icon: '📍' },
          { path: '/apprentice/disease-animals', name: 'Enfermedades Animales', icon: '🩺' },
          { path: '/apprentice/genetic-improvements', name: 'Mejoras Genéticas', icon: '🧬' },
          { path: '/apprentice/species-breeds', name: 'Especies y Razas', icon: '🦌' },
        ];
      default:
        return [];
    }
  };

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col" aria-label="Barra lateral de navegación" role="complementary">
      <div className="p-4 text-2xl font-bold" tabIndex={0} aria-label="Nombre de la aplicación">FincaApp</div>
      <nav className="flex-1 px-2 py-4 space-y-2" aria-label="Navegación principal" role="navigation">
        {getRoleLinks().map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isActive ? 'bg-gray-900' : 'hover:bg-gray-700'
              }`
            }
            aria-current={window.location.pathname === link.path ? 'page' : undefined}
            tabIndex={0}
            role="menuitem"
          >
            {link.name}
          </NavLink>
        ))}
        {getRoleLinks().length === 0 && (
          <>
            <NavLink to="/login" className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400" tabIndex={0} role="menuitem">Iniciar sesión</NavLink>
            <NavLink to="/signup" className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400" tabIndex={0} role="menuitem">Registrarse</NavLink>
            <NavLink to="/public/users" className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400" tabIndex={0} role="menuitem">Listado de Usuarios (público)</NavLink>
            <NavLink to="/public/animals" className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400" tabIndex={0} role="menuitem">Listado de Animales (público)</NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
