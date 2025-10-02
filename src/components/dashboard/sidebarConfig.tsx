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
} from 'lucide-react';
import { ReactNode } from 'react';

export type Role = 'Administrador' | 'Instructor' | 'Aprendiz';

export interface SidebarItemConfig {
  title: string;
  icon: ReactNode;
  path?: string;
  roles: Role[];
  children?: SidebarItemConfig[];
}

export const sidebarItems: SidebarItemConfig[] = [
  {
    title: 'Modelos',
    icon: <Database className="h-4 w-4" />,
    roles: ['Administrador'],
    children: [
  { title: 'Animales', icon: <Heart className="h-4 w-4" />, path: 'animals', roles: ['Administrador'] },
  { title: 'Potreros', icon: <Map className="h-4 w-4" />, path: 'fields', roles: ['Administrador'] },
  { title: 'Razas', icon: <Dna className="h-4 w-4" />, path: 'breeds', roles: ['Administrador'] },
  { title: 'Controles', icon: <FileCheck className="h-4 w-4" />, path: 'control', roles: ['Administrador'] },
  { title: 'Enfermedades', icon: <AlertTriangle className="h-4 w-4" />, path: 'diseases', roles: ['Administrador'] },
  { title: 'Tipos de Alimento', icon: <Wheat className="h-4 w-4" />, path: 'food-types', roles: ['Administrador'] },
  { title: 'Mejoramientos Genéticos', icon: <TrendingUp className="h-4 w-4" />, path: 'genetic_improvements', roles: ['Administrador'] },
  { title: 'Medicamentos', icon: <Pill className="h-4 w-4" />, path: 'medications', roles: ['Administrador'] },
  { title: 'Rutas de Administración', icon: <Route className="h-4 w-4" />, path: 'route_administration', roles: ['Administrador'] },
  { title: 'Especies', icon: <TestTube className="h-4 w-4" />, path: 'species', roles: ['Administrador'] },
  { title: 'Tratamientos-Medicamentos', icon: <Pill className="h-4 w-4" />, path: 'treatment_medications', roles: ['Administrador'] },
  { title: 'Tratamientos-Vacunas', icon: <Syringe className="h-4 w-4" />, path: 'treatment_vaccines', roles: ['Administrador'] },
  { title: 'Tratamientos', icon: <Activity className="h-4 w-4" />, path: 'treatments', roles: ['Administrador'] },
  { title: 'Usuarios', icon: <Users className="h-4 w-4" />, path: 'users', roles: ['Administrador'] },
  { title: 'Vacunaciones', icon: <Calendar className="h-4 w-4" />, path: 'vaccinations', roles: ['Administrador'] },
  { title: 'Vacunas', icon: <Syringe className="h-4 w-4" />, path: 'vaccines', roles: ['Administrador'] },
  { title: 'Animales Enfermos', icon: <AlertTriangle className="h-4 w-4" />, path: 'disease-animals', roles: ['Administrador'] },
  { title: 'Ubicación', icon: <Map className="h-4 w-4" />, path: 'animal-fields', roles: ['Administrador'] },
  { title: 'Modelo Base', icon: <Database className="h-4 w-4" />, path: 'base_model', roles: ['Administrador'] },
    ],
  },
  {
    title: 'Administración',
    icon: <Settings className="h-4 w-4" />,
    roles: ['Administrador'],
    children: [
      { title: 'Usuarios', icon: <Users className="h-4 w-4" />, path: 'users', roles: ['Administrador'] },
      { title: 'Rutas', icon: <Route className="h-4 w-4" />, path: 'route_administration', roles: ['Administrador'] },
    ],
  },
  {
    title: 'Animales',
    icon: <Heart className="h-4 w-4" />,
    roles: ['Administrador', 'Instructor', 'Aprendiz'],
    children: [
      { title: 'Lista', icon: <Heart className="h-4 w-4" />, path: 'animals', roles: ['Administrador', 'Instructor', 'Aprendiz'] },
      { title: 'Mejoramiento Genético', icon: <TrendingUp className="h-4 w-4" />, path: 'genetic-improvements', roles: ['Instructor', 'Aprendiz'] },
      { title: 'Especies y Razas', icon: <TestTube className="h-4 w-4" />, path: 'species-breeds', roles: ['Instructor', 'Aprendiz'] },
      { title: 'Controles Sanitarios', icon: <FileCheck className="h-4 w-4" />, path: 'controls', roles: ['Instructor', 'Aprendiz'] },
    ],
  },
  {
    title: 'Sanidad',
    icon: <HeartPulse className="h-4 w-4" />,
    roles: ['Administrador', 'Instructor', 'Aprendiz'],
    children: [
      { title: 'Animales Enfermos', icon: <HeartPulse className="h-4 w-4" />, path: 'disease-animals', roles: ['Instructor', 'Aprendiz'] },
      { title: 'Enfermedades', icon: <AlertTriangle className="h-4 w-4" />, path: 'diseases', roles: ['Administrador', 'Instructor'] },
      { title: 'Medicamentos', icon: <Pill className="h-4 w-4" />, path: 'medications', roles: ['Administrador', 'Instructor'] },
      { title: 'Vacunas', icon: <Syringe className="h-4 w-4" />, path: 'vaccines', roles: ['Administrador', 'Instructor'] },
      { title: 'Vacunaciones', icon: <Calendar className="h-4 w-4" />, path: 'vaccinations', roles: ['Administrador', 'Instructor'] },
      { title: 'Tratamientos', icon: <Activity className="h-4 w-4" />, path: 'treatments', roles: ['Administrador', 'Instructor'] },
    ],
  },
  {
    title: 'Terrenos & Alimentación',
    icon: <Mountain className="h-4 w-4" />,
    roles: ['Administrador', 'Instructor', 'Aprendiz'],
    children: [
      { title: 'Terrenos', icon: <Mountain className="h-4 w-4" />, path: 'fields', roles: ['Administrador', 'Instructor', 'Aprendiz'] },
      { title: 'Control Pastoreo', icon: <Map className="h-4 w-4" />, path: 'animal-fields', roles: ['Instructor', 'Aprendiz'] },
      { title: 'Tipos de Alimento', icon: <Leaf className="h-4 w-4" />, path: 'food-types', roles: ['Administrador', 'Instructor', 'Aprendiz'] },
    ],
  },

];
