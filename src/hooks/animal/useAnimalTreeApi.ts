import { useState, useCallback } from 'react';
import { animalsService } from '@/services/animalService';
import type { AnimalTreeGraph, TreeQueryParams, TreeLoadMoreOptions } from '@/types/animalTreeTypes';
import { getIndexedDBCache, setIndexedDBCache } from '@/utils/indexedDBCache';

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
  const levels: any[][] = [];
  const root = graph.nodes[graph.rootId];
  if (!root) return [];
  levels.push([root]);
  let current = [root];
  const getNode = (id?: number) => (id ? graph.nodes[id] : undefined);
  for (let d = 1; d <= graph.depth; d++) {
    const next: any[] = [];
    for (const node of current) {
      const nodeId = node?.id;
      if (!nodeId) continue;
      const parentsEdges = (graph.edges || []).filter(e => e.to === nodeId);
      for (const e of parentsEdges) {
        const parent = getNode(e.from);
        if (parent) next.push(parent);
      }
    }
    // Uniq por id
    const uniq = next.filter((n, i, arr) => n && n.id && arr.findIndex(x => x.id === n.id) === i);
    if (uniq.length === 0) break;
    levels.push(uniq);
    current = uniq;
  }
  return levels;
}

// Construye niveles descendente (hijos) desde grafo plano
export function graphToDescendantLevels(graph: AnimalTreeGraph): any[][] {
  const levels: any[][] = [];
  const root = graph.nodes[graph.rootId];
  if (!root) return [];
  levels.push([root]);
  let current = [root];
  const getNode = (id?: number) => (id ? graph.nodes[id] : undefined);
  for (let d = 1; d <= graph.depth; d++) {
    const next: any[] = [];
    for (const node of current) {
      const nodeId = node?.id;
      if (!nodeId) continue;
      const childrenEdges = (graph.edges || []).filter(e => e.from === nodeId);
      for (const e of childrenEdges) {
        const child = getNode(e.to);
        if (child) next.push(child);
      }
    }
    const uniq = next.filter((n, i, arr) => n && n.id && arr.findIndex(x => x.id === n.id) === i);
    if (uniq.length === 0) break;
    levels.push(uniq);
    current = uniq;
  }
  return levels;
}

export function useAnimalTreeApi() {
  const [graph, setGraph] = useState<AnimalTreeGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAncestors = useCallback(async (rootId: number, maxDepth: number = 3, fields: string = 'id,record,sex') => {
    setLoading(true); setError(null);
    const key = cacheKey('ancestors', rootId, maxDepth, fields);
    try {
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
      setGraph(resp);
      await setIndexedDBCache(key, resp, DEFAULT_TTL_MS);
      return resp;
    } catch (e: any) {
      setError(e?.message || 'Error cargando árbol de ancestros');
      return null;
    } finally {
      setLoading(false);
    }
  }, [graph]);

  const fetchDescendants = useCallback(async (rootId: number, maxDepth: number = 3, fields: string = 'id,record,sex') => {
    setLoading(true); setError(null);
    const key = cacheKey('descendants', rootId, maxDepth, fields);
    try {
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
      setGraph(resp);
      await setIndexedDBCache(key, resp, DEFAULT_TTL_MS);
      return resp;
    } catch (e: any) {
      setError(e?.message || 'Error cargando árbol de descendientes');
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

  return {
    graph,
    loading,
    error,
    fetchAncestors,
    fetchDescendants,
    loadMore,
  };
}