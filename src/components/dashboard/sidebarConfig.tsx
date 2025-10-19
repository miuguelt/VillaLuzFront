import {
  Database,
  Users,
  TrendingUp,
  PlusCircle,
  Wheat,
  AlertTriangle,
  Activity,
  Pill,
  Syringe,
  Calendar,
  FileCheck,
  Map,
  Dna,
  TestTube,
  Heart,
  HeartPulse,
  Settings,
  Route,
  UserPlus,
  Leaf,
  Mountain,
  BarChart3,
  Home,
  MapPin,
} from 'lucide-react';
import { ReactNode } from 'react';

export type Role = 'Administrador' | 'Instructor' | 'Aprendiz';

export interface SidebarItemConfig {
  title: string;
  icon: ReactNode;
  path?: string;
  roles: Role[];
  children?: SidebarItemConfig[];
  badge?: string; // Para badges como "Nuevo"
}

export const sidebarItems: SidebarItemConfig[] = [
  // ============================================
  // SECCIÓN DE ANALYTICS (TODOS LOS ROLES)
  // ============================================
  {
    title: 'Dashboard y Analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ['Administrador', 'Instructor', 'Aprendiz'],
    children: [
      {
        title: 'Inicio',
        icon: <Home className="h-4 w-4" />,
        path: 'dashboard',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Analytics Ejecutivo',
        icon: <BarChart3 className="h-4 w-4" />,
        path: 'analytics/executive',
        roles: ['Administrador', 'Instructor', 'Aprendiz'],
        badge: 'Nuevo'
      },
      {
        title: 'Análisis de Potreros',
        icon: <MapPin className="h-4 w-4" />,
        path: 'analytics/fields',
        roles: ['Administrador'],
        badge: 'Nuevo'
      },
    ],
  },

  // ============================================
  // GESTIÓN DE ANIMALES (SIMPLIFICADO)
  // ============================================
  {
    title: 'Gestión de Animales',
    icon: <Heart className="h-4 w-4" />,
    roles: ['Administrador', 'Instructor', 'Aprendiz'],
    children: [
      {
        title: 'Ver Animales',
        icon: <Heart className="h-4 w-4" />,
        path: 'animals',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Especies',
        icon: <Dna className="h-4 w-4" />,
        path: 'species',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Razas',
        icon: <TestTube className="h-4 w-4" />,
        path: 'breeds',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Mejoramiento Genético',
        icon: <TrendingUp className="h-4 w-4" />,
        path: 'genetic-improvements',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Controles Sanitarios',
        icon: <FileCheck className="h-4 w-4" />,
        path: 'controls',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
    ],
  },

  // ============================================
  // SANIDAD Y SALUD (SIMPLIFICADO)
  // ============================================
  {
    title: 'Sanidad y Salud',
    icon: <HeartPulse className="h-4 w-4" />,
    roles: ['Administrador', 'Instructor', 'Aprendiz'],
    children: [
      {
        title: 'Animales Enfermos',
        icon: <HeartPulse className="h-4 w-4" />,
        path: 'disease-animals',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Enfermedades',
        icon: <AlertTriangle className="h-4 w-4" />,
        path: 'diseases',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Tratamientos',
        icon: <Activity className="h-4 w-4" />,
        path: 'treatments',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Medicamentos',
        icon: <Pill className="h-4 w-4" />,
        path: 'medications',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Vacunas',
        icon: <Syringe className="h-4 w-4" />,
        path: 'vaccines',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Vacunaciones',
        icon: <Calendar className="h-4 w-4" />,
        path: 'vaccinations',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
    ],
  },

  // ============================================
  // TERRENOS Y ALIMENTACIÓN
  // ============================================
  {
    title: 'Terrenos y Alimentación',
    icon: <Mountain className="h-4 w-4" />,
    roles: ['Administrador', 'Instructor', 'Aprendiz'],
    children: [
      {
        title: 'Potreros',
        icon: <Mountain className="h-4 w-4" />,
        path: 'fields',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Ubicación de Animales',
        icon: <Map className="h-4 w-4" />,
        path: 'animal-fields',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
      {
        title: 'Tipos de Alimento',
        icon: <Leaf className="h-4 w-4" />,
        path: 'food-types',
        roles: ['Administrador', 'Instructor', 'Aprendiz']
      },
    ],
  },

  // ============================================
  // ADMINISTRACIÓN (SOLO ADMIN)
  // ============================================
  {
    title: 'Administración',
    icon: <Settings className="h-4 w-4" />,
    roles: ['Administrador'],
    children: [
      {
        title: 'Gestión de Usuarios',
        icon: <Users className="h-4 w-4" />,
        path: 'users',
        roles: ['Administrador']
      },
      {
        title: 'Modelos del Sistema',
        icon: <Database className="h-4 w-4" />,
        path: 'base_model',
        roles: ['Administrador']
      },
    ],
  },
];
