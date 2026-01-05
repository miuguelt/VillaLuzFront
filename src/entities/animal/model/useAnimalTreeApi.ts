import { useState, useCallback } from 'react';
import { animalsService } from '@/entities/animal/api/animal.service';
import { animalDependenciesService } from '@/entities/animal/api/animalDependencies.service';
import type { AnimalTreeGraph, TreeLoadMoreOptions } from '@/entities/animal/model/tree.types';
import { getIndexedDBCache, setIndexedDBCache } from '@/shared/api/cache/indexedDBCache';

const DEFAULT_TTL_MS = 8 * 60 * 1000; // 8 minutos (recomendado 5–10 min)

function normalizeFieldsSig(fields?: string): string {
  if (!fields) return 'all';
  const list = fields.split(',').map(s => s.trim()).filter(Boolean).sort();
  return list.join(',');
}

function cacheKey(type: 'ancestors' | 'descendants', rootId: number, maxDepth: number, fields?: string): string {
  const sig = normalizeFieldsSig(fields);
  return `animal_tree:${type}:${rootId}:d${maxDepth}:f${sig}`;
}

function dedupeEdges(edges: AnimalTreeGraph['edges']): AnimalTreeGraph['edges'] {
  const seen = new Set<string>();
  const out: AnimalTreeGraph['edges'] = [];
  for (const e of edges) {
    const key = `${e.from}-${e.to}-${e.relation}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

function mergeGraphs(a: AnimalTreeGraph, b: AnimalTreeGraph): AnimalTreeGraph {
  const nodes = { ...a.nodes, ...b.nodes };
  const edges = dedupeEdges([...(a.edges || []), ...(b.edges || [])]);
  return {
    rootId: a.rootId,
    nodes,
    edges,
    depth: Math.max(a.depth || 0, b.depth || 0),
    counts: { nodes: Object.keys(nodes).length, edges: edges.length },
    generated_at: Math.max(a.generated_at || 0, b.generated_at || 0),
    type: a.type || b.type,
  };
}

// Construye niveles ascendente (padres) desde grafo plano
export function graphToAncestorLevels(graph: AnimalTreeGraph): any[][] {
  if (!graph || !graph.nodes || !graph.rootId) return [];

  const levels: any[][] = [];
  const root = graph.nodes[graph.rootId];
  if (!root) return [];

  levels.push([root]);
  let current = [root];

  // Pre-construir mapas de relaciones para mejor rendimiento
  const parentsMap = new Map<number, any[]>();
  const getNode = (id?: number) => (id ? graph.nodes[id] : undefined);

  // Detectar orientación de aristas: padre->hijo (esperada) vs hijo->padre (invertida)
  const edges = graph.edges || [];
  const towardRoot = edges.filter(e => e.to === graph.rootId).length;
  const fromRoot = edges.filter(e => e.from === graph.rootId).length;
  const inverted = fromRoot > towardRoot; // si hay más aristas desde la raíz que hacia la raíz, asumimos invertidas

  // Construir mapa de padres para cada nodo según orientación
  for (const edge of edges) {
    // childId es el nodo para el cual buscaremos sus padres en el mapa
    const childId = inverted ? edge.from : edge.to;
    const parentId = inverted ? edge.to : edge.from;
    if (!parentsMap.has(childId)) parentsMap.set(childId, []);
    const parent = getNode(parentId);
    if (parent && parent.id) {
      parentsMap.get(childId)!.push(parent);
    }
  }

  // Si el backend reporta depth=0, usamos un fallback razonable (10)
  const maxDepth = graph.depth && graph.depth > 0 ? graph.depth : 10;
  for (let d = 1; d <= maxDepth; d++) {
    const next: any[] = [];
    const seen = new Set<number>();

    for (const node of current) {
      const nodeId = node?.id;
      if (!nodeId) continue;

      const parents = parentsMap.get(nodeId) || [];
      for (const parent of parents) {
        if (parent.id && !seen.has(parent.id)) {
          seen.add(parent.id);
          next.push(parent);
        }
      }
    }

    if (next.length === 0) break;
    levels.push(next);
    current = next;
  }

  return levels;
}

// Construye niveles descendente (hijos) desde grafo plano
export function graphToDescendantLevels(graph: AnimalTreeGraph): any[][] {
  if (!graph || !graph.nodes || !graph.rootId) return [];

  const levels: any[][] = [];
  const root = graph.nodes[graph.rootId];
  if (!root) return [];

  levels.push([root]);
  let current = [root];

  // Pre-construir mapas de relaciones para mejor rendimiento
  const childrenMap = new Map<number, any[]>();
  const getNode = (id?: number) => (id ? graph.nodes[id] : undefined);

  // Detectar orientación de aristas
  const edges = graph.edges || [];
  const towardRoot = edges.filter(e => e.to === graph.rootId).length;
  const fromRoot = edges.filter(e => e.from === graph.rootId).length;
  const inverted = towardRoot > fromRoot; // si hay más aristas hacia la raíz (hijo->padre), asumimos invertidas

  // Construir mapa de hijos según orientación
  for (const edge of edges) {
    // parentId es el nodo desde el que obtendremos sus hijos
    const parentId = inverted ? edge.to : edge.from;
    const childId = inverted ? edge.from : edge.to;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    const child = getNode(childId);
    if (child && child.id) {
      childrenMap.get(parentId)!.push(child);
    }
  }

  // Si el backend reporta depth=0, usamos un fallback razonable (10)
  const maxDepth = graph.depth && graph.depth > 0 ? graph.depth : 10;
  for (let d = 1; d <= maxDepth; d++) {
    const next: any[] = [];
    const seen = new Set<number>();

    for (const node of current) {
      const nodeId = node?.id;
      if (!nodeId) continue;

      const children = childrenMap.get(nodeId) || [];
      for (const child of children) {
        if (child.id && !seen.has(child.id)) {
          seen.add(child.id);
          next.push(child);
        }
      }
    }

    if (next.length === 0) break;
    levels.push(next);
    current = next;
  }

  return levels;
}

export function useAnimalTreeApi() {
  const [graph, setGraph] = useState<AnimalTreeGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dependencyInfo, setDependencyInfo] = useState<any>(null);

  const fetchAncestors = useCallback(async (rootId: number, maxDepth: number = 3, fields: string = 'id,record,sex') => {
    setLoading(true); setError(null);
    const key = cacheKey('ancestors', rootId, maxDepth, fields);
    
    try {
      // Primero verificar dependencias para dar mejor retroalimentación
      const dependencies = await animalDependenciesService.getAnimalDependencies(rootId);
      setDependencyInfo(dependencies);
      
      // Si no hay padres, podemos anticipar que el árbol estará vacío
      if (!dependencies.has_parents) {
        console.warn(`[useAnimalTreeApi] Este animal no tiene padres registrados. El árbol de ancestros mostrará solo la raíz.`);
        // No retornamos error, solo registramos la advertencia
      }
      
      const cached = await getIndexedDBCache<AnimalTreeGraph>(key);
      if (cached) {
        setGraph(cached);
        setLoading(false);
        // Refresh en background por si el backend tiene generated_at más reciente
        void animalsService.getAncestorTree({ animal_id: rootId, max_depth: maxDepth, fields }).then(fresh => {
          if (!graph || (fresh.generated_at > (cached.generated_at || 0))) {
            setGraph(fresh);
            void setIndexedDBCache(key, fresh, DEFAULT_TTL_MS);
          }
        }).catch(() => {/* noop */});
        return cached;
      }

      const resp = await animalsService.getAncestorTree({ animal_id: rootId, max_depth: maxDepth, fields });
      
      // Verificar si el árbol solo contiene la raíz
      if (resp && resp.counts && resp.counts.edges === 0 && dependencies.has_parents) {
        console.warn(`[useAnimalTreeApi] El backend indicó padres en BD pero el árbol no tiene aristas. Posible inconsistencia de datos o max_depth demasiado bajo.`);
      }
      
      setGraph(resp);
      await setIndexedDBCache(key, resp, DEFAULT_TTL_MS);
      return resp;
    } catch (e: any) {
      console.error(`[useAnimalTreeApi] Error cargando ancestros para animal ${rootId}:`, e);
      
      // Proporcionar mensajes de error más específicos
      if (e?.message?.includes('401')) {
        setError('No autorizado: inicie sesión nuevamente');
      } else if (e?.message?.includes('404')) {
        setError('Animal no encontrado o sin datos genealógicos disponibles');
      } else if (e?.message?.includes('500')) {
        setError('Error del servidor al cargar datos genealógicos');
      } else {
        setError(e?.message || 'Error cargando árbol de ancestros');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [graph]);

  const fetchDescendants = useCallback(async (rootId: number, maxDepth: number = 3, fields: string = 'id,record,sex') => {
    setLoading(true); setError(null);
    const key = cacheKey('descendants', rootId, maxDepth, fields);
    
    try {
      // Primero verificar dependencias para dar mejor retroalimentación
      const dependencies = await animalDependenciesService.getAnimalDependencies(rootId);
      setDependencyInfo(dependencies);
      
      // Si no hay hijos, podemos anticipar que el árbol estará vacío
      if (!dependencies.has_children) {
        console.warn(`[useAnimalTreeApi] Este animal no tiene hijos registrados. El árbol de descendientes mostrará solo la raíz.`);
        // No retornamos error, solo registramos la advertencia
      }
      
      const cached = await getIndexedDBCache<AnimalTreeGraph>(key);
      if (cached) {
        setGraph(cached);
        setLoading(false);
        void animalsService.getDescendantTree({ animal_id: rootId, max_depth: maxDepth, fields }).then(fresh => {
          if (!graph || (fresh.generated_at > (cached.generated_at || 0))) {
            setGraph(fresh);
            void setIndexedDBCache(key, fresh, DEFAULT_TTL_MS);
          }
        }).catch(() => {/* noop */});
        return cached;
      }

      const resp = await animalsService.getDescendantTree({ animal_id: rootId, max_depth: maxDepth, fields });
      
      // Verificar si el árbol solo contiene la raíz
      if (resp && resp.counts && resp.counts.edges === 0 && dependencies.has_children) {
        console.warn(`[useAnimalTreeApi] El backend indicó hijos en BD pero el árbol no tiene aristas. Posible inconsistencia de datos o max_depth demasiado bajo.`);
      }
      
      setGraph(resp);
      await setIndexedDBCache(key, resp, DEFAULT_TTL_MS);
      return resp;
    } catch (e: any) {
      console.error(`[useAnimalTreeApi] Error cargando descendientes para animal ${rootId}:`, e);
      
      // Proporcionar mensajes de error más específicos
      if (e?.message?.includes('401')) {
        setError('No autorizado: inicie sesión nuevamente');
      } else if (e?.message?.includes('404')) {
        setError('Animal no encontrado o sin datos genealógicos disponibles');
      } else if (e?.message?.includes('500')) {
        setError('Error del servidor al cargar datos genealógicos');
      } else {
        setError(e?.message || 'Error cargando árbol de descendientes');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [graph]);

  const loadMore = useCallback(async (
    type: 'ancestors' | 'descendants',
    rootId: number,
    current: AnimalTreeGraph,
    opts: TreeLoadMoreOptions = { increment: 2 }
  ) => {
    const nextDepth = (current?.depth || 0) + (opts.increment || 2);
    const fields = opts.fields || 'id,record,sex';
    const key = cacheKey(type, rootId, nextDepth, fields);
    try {
      const fresh = type === 'ancestors'
        ? await animalsService.getAncestorTree({ animal_id: rootId, max_depth: nextDepth, fields })
        : await animalsService.getDescendantTree({ animal_id: rootId, max_depth: nextDepth, fields });
      const merged = mergeGraphs(current, fresh);
      setGraph(merged);
      await setIndexedDBCache(key, merged, DEFAULT_TTL_MS);
      return merged;
    } catch (e: any) {
      setError(e?.message || 'Error expandiendo profundidad del árbol');
      return current;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    graph,
    loading,
    error,
    dependencyInfo,
    fetchAncestors,
    fetchDescendants,
    loadMore,
    clearError,
  };
}
