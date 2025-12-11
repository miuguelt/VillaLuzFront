import { BaseService } from './baseService';
import api from './api';
import { UserResponse, UserInput, PaginatedResponse } from '@/types/swaggerTypes';
import { UserStatistics, BulkResponse } from '@/types/commonTypes';

class UsersService extends BaseService<UserResponse> {
  constructor() {
    super('users');
  }

  async getUsers(params?: Record<string, any>): Promise<PaginatedResponse<UserResponse>> {
    return this.getPaginated(params);
  }

  async getUserById(id: number): Promise<UserResponse> {
    return this.getById(id);
  }

  async createUser(userData: UserInput): Promise<UserResponse> {
    return this.create(userData);
  }

  async updateUser(id: number, userData: Partial<UserInput>): Promise<UserResponse> {
    return this.update(id, userData);
  }

  async patchUser(id: number, userData: Partial<UserInput>): Promise<UserResponse> {
    return this.patch(id, userData);
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.delete(id);
  }

  async createBulk(data: UserInput[]): Promise<BulkResponse<UserResponse>> {
    return this.customRequest('bulk', 'POST', data);
  }

  async createPublicUser(userData: UserInput): Promise<UserResponse> {
    // Preparar payload con created_at para evitar fallos en BD sin default
    const createdAt = (await import('@/utils/dateUtils')).getNowColombiaISO?.() || new Date().toISOString();
    // Normalizar a formato 'YYYY-MM-DD HH:mm:ss' si viene con 'T'
    const normalizedCreatedAt = String(createdAt).replace('T', ' ').split('.')[0];
    const payload = {
      ...(userData as any),
      created_at: normalizedCreatedAt,
      password_confirmation:
        (userData as any).password_confirmation ?? (userData as any).password,
    } as any;

    const requestConfig = {
      method: 'POST',
      data: payload,
      // Forzar request pública sin credenciales/session cookies
      withCredentials: false,
      skipAuth: true,
      __skipAuthHeader: true,
      __skipAuthGate: true,
      disableAuth: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    } as const;

    try {
      const response = await api.request({
        url: `${this.endpoint}`,
        ...requestConfig,
      });
      return response.data?.data || response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;

      // Compatibilidad: si el backend aún expone /users/public, reintentar sin auth
      if (status === 401 || status === 403) {
        try {
          const response = await api.request({
            url: `${this.endpoint}/public`,
            ...requestConfig,
          });
          return response.data?.data || response.data;
        } catch (fallbackError: any) {
          // usar este como error final
          error = fallbackError;
        }
      }

      if (status === 409) {
        const message = errorData?.message || errorData?.detail || 'Usuario ya existe';
        error.message = message;
      } else if (status === 400) {
        const message = errorData?.message || errorData?.detail || errorData?.error;
        if (message) error.message = message;
      } else if (status === 403) {
        const message = errorData?.message || errorData?.detail;
        if (message) error.message = message;
      }

      throw error;
    }
  }

  async getUserRoles(): Promise<{
    roles: Record<string, { count: number; percentage: number }>;
    total_users: number;
  }> {
    return this.customRequest('roles', 'GET');
  }

  async getUserStatistics(): Promise<UserStatistics> {
    return this.customRequest('statistics', 'GET');
  }

  async getUserStats(): Promise<UserStatistics> {
    return this.customRequest('stats', 'GET');
  }

  async getUserStatus(): Promise<UserStatistics> {
    return this.customRequest('status', 'GET');
  }

  // Chequeos ligeros con HEAD
  async checkAvailability(): Promise<{ ok: boolean; status?: number; headers?: Record<string, any> }> {
    try {
      const res = await (await import('./api')).default.request({ url: this.endpoint, method: 'HEAD', validateStatus: () => true });
      return { ok: res.status >= 200 && res.status < 300, status: res.status, headers: res.headers };
    } catch (e: any) {
      return { ok: false, status: e?.response?.status, headers: e?.response?.headers };
    }
  }

  async checkItemAvailability(id: number | string): Promise<{ ok: boolean; status?: number; headers?: Record<string, any> }> {
    try {
      const res = await (await import('./api')).default.request({ url: `${this.endpoint}/${id}`, method: 'HEAD', validateStatus: () => true });
      return { ok: res.status >= 200 && res.status < 300, status: res.status, headers: res.headers };
    } catch (e: any) {
      return { ok: false, status: e?.response?.status, headers: e?.response?.headers };
    }
  }
}

export const usersService = new UsersService();

// Simple retry helpers emulating older API expected by hooks
async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 1000): Promise<T> {
  let lastErr: any;
  for (let i=0;i<attempts;i++) {
    try { return await fn(); } catch (e) { 
      lastErr = e; 
      if (i<attempts-1) {
        // Aumentar delay exponencialmente para evitar spam
        await new Promise(r=>setTimeout(r, delayMs * Math.pow(2, i))); 
      }
    }
  }
  throw lastErr;
}

export const getUsersWithRetry = (params?: any) => withRetry(()=> usersService.getUsers(params) as any);
export const getUserRolesWithRetry = () => withRetry(()=> usersService.getUserRoles());
export const getUserStatusWithRetry = () => withRetry(()=> usersService.getUserStatus());
