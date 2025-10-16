import api, { unwrapApi } from './api';
import {
	DashboardData,
	AnimalStatistics,
	HealthStatistics,
	ProductionStatistics,
	SystemAlert,
	FilterOptions,
} from '@/types/swaggerTypes';

// --- Micro-cache in-memory para endpoints analíticos (amortiza ráfagas en 300–1000ms) ---
const MICROCACHE_TTL_MS = 600; // ventana corta
const microCache = new Map<string, { ts: number; data: any }>();
const stableStringify = (obj: any) => {
	if (!obj || typeof obj !== 'object') return '';
	const keys = Object.keys(obj).sort();
	const norm: Record<string, any> = {};
	for (const k of keys) norm[k] = obj[k];
	return JSON.stringify(norm);
};
const buildKey = (path: string, params?: any) => `${path}?${stableStringify(params)}`;

async function getWithMicroCache<T>(path: string, params?: Partial<FilterOptions>): Promise<T> {
	const key = buildKey(path, params);
	const now = Date.now();
	const hit = microCache.get(key);
	if (hit && (now - hit.ts) <= MICROCACHE_TTL_MS) {
		return hit.data as T;
	}
	try {
		const res = await api.get(path, { params });
		const data = unwrapApi<T>(res);
		microCache.set(key, { ts: now, data });
		return data;
	} catch (e) {
		// En error, limpiar posible entrada obsoleta
		microCache.delete(key);
		throw e;
	}
}

/**
 * Servicio de Analíticas y Métricas
 * Centraliza llamados a endpoints estadísticos/analíticos.
 * Se mantiene minimalista y alineado al contrato tipado existente.
 */
class AnalyticsService {
	private base = '/analytics';

	/** Compatibilidad legacy: health check simple si backend expone /analytics/health/statistics */
	async getHealthCheck(): Promise<any> {
		try {
			const res = await api.get(`${this.base}/health/statistics`);
			return unwrapApi(res);
		} catch (e) {
			return { status: 'unhealthy' };
		}
	}

	/** Obtiene datos consolidados para dashboard administrativo */
	async getDashboard(params?: Partial<FilterOptions>): Promise<DashboardData> {
		return getWithMicroCache<DashboardData>(`${this.base}/dashboard`, params);
	}

	/** Estadísticas globales de animales */
	async getAnimalStatistics(params?: Partial<FilterOptions>): Promise<AnimalStatistics> {
		return getWithMicroCache<AnimalStatistics>(`${this.base}/animals/statistics`, params);
	}

	/** Estadísticas de salud (tratamientos, vacunas, enfermedades) */
	async getHealthStatistics(params?: Partial<FilterOptions>): Promise<HealthStatistics> {
		return getWithMicroCache<HealthStatistics>(`${this.base}/health/statistics`, params);
	}

	/** Estadísticas de producción / operación */
	async getProductionStatistics(params?: Partial<FilterOptions>): Promise<ProductionStatistics> {
		return getWithMicroCache<ProductionStatistics>(`${this.base}/production/statistics`, params);
	}

	/** Historial médico consolidado de un animal */
	async getAnimalMedicalHistory(animalId: number, params?: Partial<FilterOptions>): Promise<import('@/types/analytics').MedicalHistory> {
		const path = `${this.base}/animals/${animalId}/medical-history`;
		return getWithMicroCache<import('@/types/analytics').MedicalHistory>(path, params);
	}

	/**
	 * Obtiene TODAS las estadísticas del dashboard en una sola llamada optimizada
	 * Endpoint: GET /api/v1/analytics/dashboard/complete
	 * Incluye: usuarios, animales, tratamientos, alertas, catálogos, relaciones, etc.
	 * Caché del backend: 2 minutos
	 */
	async getCompleteDashboardStats(): Promise<any> {
		try {
			const res = await api.get(`${this.base}/dashboard/complete`);
			return unwrapApi(res);
		} catch (error) {
			console.error('Error fetching complete dashboard stats:', error);
			throw error;
		}
	}

	// ========== ENDPOINTS ADICIONALES DE ANALYTICS ==========

	/** Obtiene inventario de animales (distribución por especie, raza, sexo) */
	async getAnimalInventory(): Promise<any> {
		const res = await api.get(`${this.base}/animals/inventory`);
		return unwrapApi(res);
	}

	/** Obtiene pirámide de edad de animales */
	async getAgePyramid(): Promise<any> {
		const res = await api.get(`${this.base}/animals/age-pyramid`);
		return unwrapApi(res);
	}

	/** Obtiene tendencias de animales (nacimientos, muertes, ventas) */
	async getAnimalTrends(months: number = 12): Promise<any> {
		const res = await api.get(`${this.base}/animals/trends`, { params: { months } });
		return unwrapApi(res);
	}

	/** Obtiene eficiencia reproductiva */
	async getReproductiveEfficiency(): Promise<any> {
		const res = await api.get(`${this.base}/animals/reproductive-efficiency`);
		return unwrapApi(res);
	}

	/** Obtiene resumen de salud general */
	async getHealthSummary(): Promise<any> {
		const res = await api.get(`${this.base}/health/summary`);
		return unwrapApi(res);
	}

	/** Obtiene estadísticas de enfermedades */
	async getDiseaseStatistics(months: number = 12): Promise<any> {
		const res = await api.get(`${this.base}/health/diseases`, { params: { months } });
		return unwrapApi(res);
	}

	/** Obtiene cobertura de vacunación */
	async getVaccinationCoverage(): Promise<any> {
		const res = await api.get(`${this.base}/health/vaccination-coverage`);
		return unwrapApi(res);
	}

	/** Obtiene ocupación de potreros */
	async getFieldOccupation(): Promise<any> {
		const res = await api.get(`${this.base}/fields/occupation`);
		return unwrapApi(res);
	}

	/** Obtiene mapa de salud de potreros */
	async getFieldHealthMap(): Promise<any> {
		const res = await api.get(`${this.base}/fields/health-map`);
		return unwrapApi(res);
	}

	/** Obtiene alertas del sistema */
	async getAlerts(params?: any): Promise<any> {
		const res = await api.get(`${this.base}/alerts`, { params });
		return unwrapApi(res);
	}

	/** Obtiene distribución de animales para gráficos */
	async getAnimalDistribution(): Promise<any> {
		const res = await api.get(`${this.base}/charts/animal-distribution`);
		return unwrapApi(res);
	}

	/** Obtiene heatmap de salud */
	async getHealthHeatmap(): Promise<any> {
		const res = await api.get(`${this.base}/charts/health-heatmap`);
		return unwrapApi(res);
	}
}

export const analyticsService = new AnalyticsService();
export default analyticsService;