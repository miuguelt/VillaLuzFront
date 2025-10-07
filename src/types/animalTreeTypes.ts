export type TreeRelation = 'father' | 'mother';

export interface AnimalTreeNode {
  id: number;
  record?: string;
  sex?: string; // "Macho" | "Hembra" | otros
  breeds_id?: number;
  idFather?: number | null;
  idMother?: number | null;
}

export interface AnimalTreeEdge {
  from: number; // origen de la relación (p.ej., padre/madre)
  to: number;   // destino de la relación (p.ej., hijo)
  relation: TreeRelation;
}

// Campos adicionales provistos por el backend para resúmenes y ejemplos
export interface AnimalTreeSummary {
  text?: string; // texto preformateado para mostrar directamente en UI
  sex: { Macho: number; Hembra: number; Unknown: number };
  species: Record<string, number>; // species_id -> cantidad, o "Unknown"
  relations: { father: number; mother: number };
}

export interface AnimalTreeEdgeExample {
  from: number;
  to: number;
  relation: TreeRelation; // 'father' | 'mother'
}

export interface AnimalTreeEdgeExamples {
  bySex: { Macho: AnimalTreeEdgeExample[]; Hembra: AnimalTreeEdgeExample[]; Unknown: AnimalTreeEdgeExample[] };
  bySpecies: Record<string, AnimalTreeEdgeExample[]>; // species_id -> ejemplos
}

export interface AnimalTreeGraph {
  rootId: number;
  nodes: Record<number, AnimalTreeNode>;
  edges: AnimalTreeEdge[];
  depth: number; // profundidad alcanzada por el backend al generar el grafo
  counts: { nodes: number; edges: number };
  generated_at: number; // timestamp UNIX
  // opcional: para diferenciar rápidamente
  type?: 'ancestors' | 'descendants';
  // nuevos campos opcionales según el backend ampliado
  summary?: AnimalTreeSummary;
  edge_examples?: AnimalTreeEdgeExamples;
}

export interface TreeQueryParams {
  animal_id: number;
  max_depth?: number; // default 5
  fields?: string;    // lista separada por comas (id,record,sex,...)
}

export interface TreeLoadMoreOptions {
  increment?: number; // niveles adicionales a cargar
  fields?: string;    // campos a solicitar en la expansión
}