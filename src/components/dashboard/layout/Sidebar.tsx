import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Sidebar = () => {
  const { user } = useAuth();

  const getRoleLinks = () => {
    switch (user?.role) {
      case 'Administrador':
        return [
          { path: '/admin/dashboard', name: 'Dashboard' },
          { path: '/admin/users', name: 'Users' },
          { path: '/admin/animals', name: 'Animals' },
          { path: '/admin/fields', name: 'Fields' },
          { path: '/admin/food-types', name: 'Food Types' },
          { path: '/admin/species', name: 'Species' },
          { path: '/admin/breeds', name: 'Breeds' },
        ];
      case 'Instructor':
        return [
          { path: '/instructor/dashboard', name: 'Dashboard' },
          { path: '/instructor/animals', name: 'Animals' },
          { path: '/instructor/fields', name: 'Fields' },
          { path: '/instructor/food-types', name: 'Food Types' },
          { path: '/instructor/vaccines', name: 'Vaccines' },
          { path: '/instructor/vaccinations', name: 'Vaccinations' },
          { path: '/instructor/medications', name: 'Medications' },
          { path: '/instructor/diseases', name: 'Diseases' },
          { path: '/instructor/treatments', name: 'Treatments' },
          { path: '/instructor/controls', name: 'Controls' },
          { path: '/instructor/animal-fields', name: 'Animal Fields' },
          { path: '/instructor/disease-animals', name: 'Animal Diseases' },
          { path: '/instructor/genetic-improvements', name: 'Genetic Improvements' },
          { path: '/instructor/species-breeds', name: 'Species and Breeds' },
        ];
      case 'Aprendiz':
        return [
          { path: '/apprentice/dashboard', name: 'Dashboard' },
          { path: '/apprentice/animals', name: 'Animals' },
          { path: '/apprentice/fields', name: 'Fields' },
          { path: '/apprentice/food-types', name: 'Food Types' },
          { path: '/apprentice/vaccines', name: 'Vaccines' },
          { path: '/apprentice/vaccinations', name: 'Vaccinations' },
          { path: '/apprentice/medications', name: 'Medications' },
          { path: '/apprentice/diseases', name: 'Diseases' },
          { path: '/apprentice/treatments', name: 'Treatments' },
          { path: '/apprentice/controls', name: 'Controls' },
          { path: '/apprentice/animal-fields', name: 'Animal Fields' },
          { path: '/apprentice/disease-animals', name: 'Animal Diseases' },
          { path: '/apprentice/genetic-improvements', name: 'Genetic Improvements' },
          { path: '/apprentice/species-breeds', name: 'Species and Breeds' },
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
            <NavLink to="/login" className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400" tabIndex={0} role="menuitem">Login</NavLink>
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
