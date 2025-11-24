import { useAnimals } from "./useAnimals";

interface AnimalNode {
  idAnimal?: number;
  id?: number;
  record?: string;
  name?: string;
  birth_date?: string;
  sex?: string;
  gender?: 'Macho' | 'Hembra';
  breed?: any;
  idFather?: number | null;
  father_id?: number | null;
  idMother?: number | null;
  mother_id?: number | null;
}

export const useDescendantsTree = () => {
  const { animals } = useAnimals();

  // Construye el árbol hacia abajo (descendientes) a partir de un animal raíz
  const buildDescendantsTree = async (
    animalId: number | undefined,
    maxDepth = 10
  ): Promise<{ animal: AnimalNode | null; levels: AnimalNode[][] }> => {
    if (animalId === undefined || animalId === null) return { animal: null, levels: [] };

    console.log(`[descendantsTree] === INICIANDO buildDescendantsTree para id=${animalId} ===`);
    console.log(`[descendantsTree] Total animales disponibles: ${animals.length}`);

    // Buscar el nodo raíz por idAnimal o id
    const rootNode = animals.find(a => (a as any).idAnimal === animalId || a.id === animalId) || null;
    if (!rootNode) {
      console.log(`[descendantsTree] ❌ Animal raíz NO encontrado para id=${animalId}`);
      return { animal: null, levels: [] };
    }

    console.log(`[descendantsTree] ✅ Animal raíz encontrado:`, {
      id: rootNode.id,
      record: rootNode.record,
      sex: rootNode.gender,
      idFather: rootNode.father_id,
      idMother: rootNode.mother_id,
    });

    const levels: AnimalNode[][] = [];
    levels.push([rootNode as AnimalNode]); // nivel 0

    let currentLevel: AnimalNode[] = [rootNode as AnimalNode];
    for (let depth = 1; depth <= maxDepth; depth++) {
      const nextLevel: AnimalNode[] = [];
      console.log(`[descendantsTree] --- Procesando nivel ${depth}, nodos padres actuales: ${currentLevel.length} ---`);

      for (const node of currentLevel) {
        // Obtener el ID del nodo actual con múltiples fallbacks
        const id = (node as any).idAnimal ?? (node as any).id;
        if (!id) {
          console.log(`[descendantsTree] ⚠️ Nodo sin ID, omitiendo`);
          continue;
        }

        // Validar que el ID sea un número válido
        const validId = Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null;
        if (!validId) {
          console.log(`[descendantsTree] ⚠️ ID inválido: ${id}, omitiendo`);
          continue;
        }

        console.log(`[descendantsTree] 🔍 Buscando hijos de: id=${validId} record=${node.record}`);

        // Buscar hijos: animales cuyo idFather o idMother coinciden con el ID del nodo actual
        const children = animals.filter(a => {
          // Extraer IDs de padre y madre - PRIORIZAR idFather/idMother (formato del backend)
          const fId = (a as any).idFather ?? (a as any).father_id ?? (a as any).father?.id ?? (a as any).father?.idAnimal;
          const mId = (a as any).idMother ?? (a as any).mother_id ?? (a as any).mother?.id ?? (a as any).mother?.idAnimal;

          // Validar que los IDs sean números válidos antes de comparar
          const validFId = fId && Number.isInteger(Number(fId)) && Number(fId) > 0 ? Number(fId) : null;
          const validMId = mId && Number.isInteger(Number(mId)) && Number(mId) > 0 ? Number(mId) : null;

          const isChild = validFId === validId || validMId === validId;

          if (isChild) {
            console.log(`[descendantsTree] ✅ Hijo encontrado: id=${a.id} record=${a.record} (idFather=${validFId}, idMother=${validMId})`);
          }

          return isChild;
        }) as AnimalNode[];

        if (children.length > 0) {
          console.log(`[descendantsTree] 👶 Total hijos de id=${validId}: ${children.length}`);
        } else {
          console.log(`[descendantsTree] ❌ No se encontraron hijos para id=${validId}`);
        }

        nextLevel.push(...children);
      }

      // Quitar duplicados por idAnimal/id
      const unique = nextLevel.filter((v, i, arr) => {
        const vid = (v as any).idAnimal ?? (v as any).id;
        return vid && arr.findIndex(x => ((x as any).idAnimal ?? (x as any).id) === vid) === i;
      });

      console.log(`[descendantsTree] Nivel ${depth}: ${unique.length} descendientes únicos`);

      if (unique.length === 0) break;
      levels.push(unique);
      currentLevel = unique;
    }

    console.log(`[descendantsTree] === ÁRBOL DE DESCENDIENTES COMPLETO ===`);
    console.log(`[descendantsTree] Total niveles construidos: ${levels.length}`);
    levels.forEach((level, idx) => {
      console.log(`[descendantsTree] Nivel ${idx}: ${level.length} animales`, level.map(a => `${a.record}(${a.id})`));
    });

    return { animal: rootNode, levels };
  };

  return { buildDescendantsTree };
};
