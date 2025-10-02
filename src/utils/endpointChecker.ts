/**
 * Utilidad para verificar la conectividad con todos los endpoints del backend
 * Verifica que finca.isladigital.xyz esté respondiendo correctamente
 */

import api from '@/services/api';
import { getBackendBaseURL } from '@/utils/envConfig';

// Resolved base URL for logging
const env: Record<string, any> = ((globalThis as any)?.import?.meta?.env)
  ?? ((typeof (globalThis as any).process !== 'undefined' ? ((globalThis as any).process as any).env : undefined) as any)
  ?? {};
const FORCE_ABSOLUTE = String(env?.VITE_FORCE_ABSOLUTE_BASE_URL ?? '').toLowerCase() === 'true';
const resolvedApiBaseURL = FORCE_ABSOLUTE ? (env?.VITE_API_BASE_URL || '/api/v1/') : '/api/v1/';

// Helper: obtiene base root sin el sufijo /api/... para llamadas como /health
const getRootBaseURL = (base?: string) => {
  const b = base || '';
  // Si termina con /api/v1 o /api, recortar ese sufijo
  return b.replace(/\/?api\/?v\d+$/i, '').replace(/\/?api$/i, '');
};

interface EndpointTest {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  requiresAuth?: boolean;
  testData?: any;
}

const endpoints: EndpointTest[] = [
  // Endpoints de autenticación
  { name: 'Health Check', endpoint: 'health', method: 'GET' },
  { name: 'Login', endpoint: 'auth/login', method: 'POST', testData: { identification: 'test', password: 'test' } },
  
  // Endpoints principales (requieren autenticación)
  { name: 'Animals', endpoint: 'animals', method: 'GET', requiresAuth: true },
  { name: 'Animal Status', endpoint: 'animals/status', method: 'GET', requiresAuth: true },
  { name: 'Users', endpoint: 'users', method: 'GET', requiresAuth: true },
  { name: 'User Roles', endpoint: 'users/roles', method: 'GET', requiresAuth: true },
  { name: 'User Status', endpoint: 'users/status', method: 'GET', requiresAuth: true },
  { name: 'Fields', endpoint: 'fields', method: 'GET', requiresAuth: true },
  { name: 'Animal Fields', endpoint: 'animal-fields', method: 'GET', requiresAuth: true },
  { name: 'Species', endpoint: 'species', method: 'GET', requiresAuth: true },
  { name: 'Breeds', endpoint: 'breeds', method: 'GET', requiresAuth: true },
  { name: 'Diseases', endpoint: 'diseases', method: 'GET', requiresAuth: true },
  { name: 'Animal Diseases', endpoint: 'animal-diseases', method: 'GET', requiresAuth: true },
  { name: 'Medications', endpoint: 'medications', method: 'GET', requiresAuth: true },
  { name: 'Vaccines', endpoint: 'vaccines', method: 'GET', requiresAuth: true },
  { name: 'Vaccinations', endpoint: 'vaccinations', method: 'GET', requiresAuth: true },
  { name: 'Treatments', endpoint: 'treatments', method: 'GET', requiresAuth: true },
  { name: 'Controls', endpoint: 'controls', method: 'GET', requiresAuth: true },
  { name: 'Food Types', endpoint: 'food_types', method: 'GET', requiresAuth: true },
  { name: 'Genetic Improvements', endpoint: 'genetic-improvements', method: 'GET', requiresAuth: true },
];

interface TestResult {
  name: string;
  endpoint: string;
  status: 'success' | 'error' | 'skipped';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  message?: string;
}

export const checkAllEndpoints = async (skipAuth: boolean = false): Promise<TestResult[]> => {
  const results: TestResult[] = [];
  
  console.group('🔍 Verificando conectividad con finca.isladigital.xyz');
  console.log(`🌐 Base URL (api.defaults): ${api.defaults.baseURL}`);
  // Removed redundant resolvedApiBaseURL log
  console.log(`⏰ Timeout: ${api.defaults.timeout}ms`);
  console.log('\n');
  
  for (const test of endpoints) {
    const startTime = Date.now();
    
    try {
      // Saltar endpoints que requieren autenticación si se especifica
      if (skipAuth && test.requiresAuth) {
        results.push({
          name: test.name,
          endpoint: test.endpoint,
          status: 'skipped',
          message: 'Requiere autenticación - saltado'
        });
        continue;
      }
      
      let response;
      
      if (test.method === 'GET') {
        if (test.endpoint === 'health') {
          // Usar base root desde variable de entorno
          response = await api.get('/health', { baseURL: getRootBaseURL(api.defaults.baseURL) || getBackendBaseURL() });
        } else {
          response = await api.get(test.endpoint);
        }
      } else if (test.method === 'POST') {
        response = await api.post(test.endpoint, test.testData || {});
      }
      
      const responseTime = Date.now() - startTime;
      
      results.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'success',
        statusCode: response!.status,
        responseTime,
        message: `✅ OK (${response!.status})`
      });
      
      console.log(`✅ ${test.name}: ${response!.status} (${responseTime}ms)`);
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      results.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'error',
        statusCode,
        responseTime,
        error: errorMessage,
        message: `❌ Error ${statusCode || 'Network'}: ${errorMessage}`
      });
      
      console.error(`❌ ${test.name}: ${statusCode || 'Network Error'} (${responseTime}ms) - ${errorMessage}`);
    }
  }
  
  console.groupEnd();
  return results;
};

export const checkCriticalEndpoints = async (): Promise<TestResult[]> => {
  const criticalEndpoints = endpoints.filter(e => 
    ['Health Check', 'Login', 'Animals', 'Users', 'Fields'].includes(e.name)
  );
  
  const results: TestResult[] = [];
  
  console.group('🎯 Verificando endpoints críticos');
  
  for (const test of criticalEndpoints) {
    const startTime = Date.now();
    
    try {
      let response;
      
      if (test.method === 'GET') {
        response = await api.get(test.endpoint);
      } else if (test.method === 'POST') {
        response = await api.post(test.endpoint, test.testData || {});
      }
      
      const responseTime = Date.now() - startTime;
      
      results.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'success',
        statusCode: response!.status,
        responseTime,
        message: `✅ OK`
      });
      
      console.log(`✅ ${test.name}: OK (${responseTime}ms)`);
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      results.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'error',
        statusCode,
        responseTime,
        error: errorMessage,
        message: `❌ Error`
      });
      
      console.error(`❌ ${test.name}: ${statusCode || 'Network Error'} - ${errorMessage}`);
    }
  }
  
  console.groupEnd();
  return results;
};

export const generateConnectivityReport = (results: TestResult[]): string => {
  const total = results.length;
  const successful = results.filter(r => r.status === 'success').length;
  const errors = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((acc, r) => acc + (r.responseTime || 0), 0) / 
    results.filter(r => r.responseTime).length;
  
  return `
📊 REPORTE DE CONECTIVIDAD - finca.isladigital.xyz
${'='.repeat(60)}

📈 Resumen:
  • Total de endpoints: ${total}
  • Exitosos: ${successful} (${((successful/total)*100).toFixed(1)}%)
  • Con errores: ${errors} (${((errors/total)*100).toFixed(1)}%)
  • Saltados: ${skipped} (${((skipped/total)*100).toFixed(1)}%)
  • Tiempo promedio de respuesta: ${avgResponseTime.toFixed(0)}ms

📋 Detalles por endpoint:
${results.map(r => 
  `  ${r.status === 'success' ? '✅' : r.status === 'error' ? '❌' : '⏭️'} ${r.name}: ${r.message}`
).join('\n')}

${errors > 0 ? 
  `⚠️  ENDPOINTS CON PROBLEMAS:\n${results
    .filter(r => r.status === 'error')
    .map(r => `  • ${r.name} (${r.endpoint}): ${r.error}`)
    .join('\n')}\n` : 
  '✅ Todos los endpoints están funcionando correctamente\n'
}
${'='.repeat(60)}
  `;
};

// Función para uso en consola del navegador
export const runConnectivityTest = async (includeAuth: boolean = false) => {
  const results = await checkAllEndpoints(!includeAuth);
  const report = generateConnectivityReport(results);
  console.log(report);
  return results;
};


export async function pingEndpoint(path: string) {
  try {
    const res = await api.get(path.startsWith('http') ? path : path);
    return { ok: true, status: res.status };
  } catch (e: any) {
    return { ok: false, status: e?.response?.status ?? 0 };
  }
}