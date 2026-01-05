export enum Role {
  Administrador = 'Administrador',
  Instructor = 'Instructor',
  Aprendiz = 'Aprendiz',
}

export type role = Role;

export interface User {
  id?: number;
  identification: number;
  fullname: string;
  password: string;
  email: string;
  role: role;
  status: number | boolean | string;
  phone?: string;
  address?: string;
}

export interface AuthContextType {
  user: User | null;
  role: string | null;
  name: string | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
  impersonateRole?: (role: role) => void;
  isAuthenticated: boolean;
  loading: boolean;
  checkAuthStatus: () => Promise<void>;
  refreshUserData?: () => Promise<void>; // Invalida caché y refresca usuario
  hasPermission?: (permission: string) => boolean;
  tokenExpiry?: Date | null;
}

// Definición de los tipos de datos usados en el login
export interface LoginUser { identification: number | string; password: string; }

// Definición de los tipos de respuesta del servidor
export interface ApiResponse<T> { success: boolean; message: string; data: T; }
