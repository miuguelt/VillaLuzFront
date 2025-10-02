/**
 * Genera un reporte de cobertura entre routes.json y los servicios/uso en páginas.
 * Este archivo es generado para transparencia y puede regenerarse manualmente.
 */
// Intentamos cargar routes.json de forma opcional. Si no existe, continuamos con un stub.
let routes: any = { namespaces: [] };
try {
  routes = await import('../../routes.json');
} catch (err) {
  // Archivo ausente: se genera reporte vacío con nota.
  // console.warn('routes.json not found, route coverage report will be empty');
}

interface RouteDef { path: string; methods: string[] }
interface NamespaceDef { name: string; path: string; routes: RouteDef[] }
interface CoverageEntry {
  namespace: string;
  endpoint: string;
  methods: string[];
  serviceImplemented: boolean;
  uiUsage: boolean;
  notes?: string;
}

// Mapeo manual mínimo (se puede extender con análisis estático real si se requiere)
const serviceFiles = {
  users: 'userService.ts',
  animals: 'animalService.ts',
  medications: 'medicationsService.ts',
  vaccines: 'vaccinesService.ts',
  analytics: 'analyticsService.ts',
  'animal-diseases': 'animalDiseasesService.ts',
  'animal-fields': 'animalFieldsService.ts',
  breeds: 'breedsService.ts',
  controls: 'controlService.ts',
  diseases: 'diseaseService.ts',
  fields: 'fieldService.ts',
  'food_types': 'foodTypesService.ts',
  'genetic-improvements': 'geneticImprovementsService.ts',
  security: 'securityService.ts',
  species: 'speciesService.ts',
  'treatment-medications': 'treatmentMedicationService.ts',
  'treatment-vaccines': 'treatmentVaccinesService.ts',
  // Added aliases to match route slugs present in routes.json
  'food-types': 'foodTypesService.ts',
  'route-administrations': 'routeAdministrationsService.ts'
};

// Heurísticas de endpoints especiales ya implementados a nivel service
const specialImplemented = new Set([
  'vaccines:by-route',
  'vaccines:with-route-administration',
  'medications:by-route',
  'medications:with-route-administration',
  'breeds:by-species'
]);

function deriveNamespacesFromFlatRoutes(raw: any): NamespaceDef[] {
  const list = Array.isArray(raw?.routes) ? raw.routes : [];
  const index = new Map<string, { nsPath: string; routes: Map<string, Set<string>> }>();
  for (const item of list) {
    const fullPath = String(item?.path || '');
    if (!fullPath.startsWith('/')) continue;
    const segments = fullPath.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    const nsName = segments[0];
    const nsPath = '/' + nsName;
    let routePath = '/' + segments.slice(1).join('/');
    if (routePath !== '/' && routePath.endsWith('/')) routePath = routePath.slice(0, -1);
    if (!index.has(nsName)) {
      index.set(nsName, { nsPath, routes: new Map() });
    }
    const methodsRaw = Array.isArray(item?.methods) ? item.methods : [];
    const methods = methodsRaw
      .map((m: any) => (typeof m === 'string' ? m : m?.method))
      .filter(Boolean);
    const nsRec = index.get(nsName)!;
    if (!nsRec.routes.has(routePath)) nsRec.routes.set(routePath, new Set());
    const set = nsRec.routes.get(routePath)!;
    for (const m of methods) set.add(m);
  }
  const namespaces: NamespaceDef[] = [];
  for (const [nsName, rec] of index) {
    const routes: RouteDef[] = [];
    for (const [rPath, mset] of rec.routes) {
      routes.push({ path: rPath, methods: Array.from(mset) });
    }
    namespaces.push({ name: nsName, path: rec.nsPath, routes });
  }
  return namespaces;
}

export function generateCoverageReport(): CoverageEntry[] {
  try {
    const raw: any = (routes as any)?.default ?? routes ?? {};
    const namespaces: NamespaceDef[] = Array.isArray(raw?.namespaces)
      ? raw.namespaces
      : deriveNamespacesFromFlatRoutes(raw);

    const report: CoverageEntry[] = [];
    const seen = new Set<string>();
    for (const n of namespaces) {
      const nRoutes = Array.isArray(n.routes) ? n.routes : [];
      for (const r of nRoutes) {
        const serviceImplemented = !!(serviceFiles as any)[n.name];
        const rPath = String(r.path || '/');
        const methods = (Array.isArray(r.methods) ? r.methods : []).filter(Boolean);
        const isSpecial = /by-|with-/.test(rPath);
        const specialKey = `${n.name}:${rPath.replace(/\/<.*$/, '').replace(/\//g,'').replace(/<.*>/,'')}`;
        const specialImpl = isSpecial && Array.from(specialImplemented).some(k=>specialKey.startsWith(k));
        const uiUsage = false; // No análisis de AST (optimizable futuro)
        const endpoint = `${n.path}${rPath}`;
        const key = `${n.name}|${endpoint}`;
        if (seen.has(key)) continue; // dedupe
        seen.add(key);
        report.push({
          namespace: n.name,
          endpoint,
          methods,
          serviceImplemented: serviceImplemented || specialImpl,
          uiUsage,
          notes: isSpecial && !specialImpl ? 'Falta método service específico' : undefined
        });
      }
    }
    return report;
  } catch (e) {
    console.warn('[routeCoverageReport] Failed to generate coverage report:', e);
    return [];
  }
}

// Export simple para inspección manual en consola si se importa
export const routeCoverage = generateCoverageReport();
