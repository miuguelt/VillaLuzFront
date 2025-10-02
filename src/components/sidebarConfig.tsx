interface SidebarNavItem {
  title: string;
  href: string;
  icon: any; // Lucide icon component type
  roles: string[];
  divider?: boolean;
}
import { Home, Users, Stethoscope, Syringe, FileText, Package, CreditCard } from 'lucide-react';

export const sidebarConfig: SidebarNavItem[] = [
  {
    title: 'Inicio',
    href: '/',
    icon: Home,
    roles: ['all'],
  },
  {
    title: 'Usuarios',
    href: '/users',
    icon: Users,
    roles: ['Administrador'],
  },
  {
    title: 'Animales',
    href: '/animals',
    icon: Stethoscope,
    roles: ['all'],
  },
  {
    title: 'Tratamientos',
    href: '/treatments',
    icon: Syringe,
    roles: ['all'],
  },
  {
    title: 'Reportes',
    href: '/reports',
    icon: FileText,
    roles: ['Administrador'],
  },
  {
    title: 'Configuración',
    href: '/config',
    icon: Package,
    roles: ['Administrador'],
    divider: true,
  },
  {
    title: 'Pagos',
    href: '/payments',
    icon: CreditCard,
    roles: ['Administrador'],
  },
];