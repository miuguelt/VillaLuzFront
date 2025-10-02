import { useAnimals } from "./useAnimals";
import { animalService } from '@/services/animalService';

interface AnimalNode {
  idAnimal?: number;
  record?: string;
  name?: string;
  birth_date?: string;
  sex?: string;
  breed?: any;
  idFather?: number | null;
  idMother?: number | null;
}

export const useGeneticTree = () => {
  const { animals } = useAnimals();

  const buildGeneticTree = async (animalId: number | undefined, maxDepth = 10) => {
    if (animalId === undefined || animalId === null) return { animal: null, levels: [] };

    // First, try to build the tree synchronously from the cached `animals` list.
    const buildFromList = (list: any[], id: number | undefined, depth = maxDepth) => {
      if (!id) return { animal: null, levels: [] };
      const rootNode = list.find(a => a.idAnimal === id) || null;
      if (!rootNode) return { animal: null, levels: [] };

      const levels: any[][] = [];
      levels.push([rootNode]);
      let currentLevel: any[] = [rootNode];

      for (let d = 1; d <= depth; d++) {
        const nextLevel: any[] = [];
        for (const node of currentLevel) {
          // prefer embedded parent objects, fall back to lookup by id
          const father = (node as any)?.father ?? list.find((a: any) => a.idAnimal === (node as any)?.idFather) ?? null;
          const mother = (node as any)?.mother ?? list.find((a: any) => a.idAnimal === (node as any)?.idMother) ?? null;
          if (father) nextLevel.push(father);
          if (mother) nextLevel.push(mother);
        }
        const unique = nextLevel.filter((v, i, arr) => v && v.idAnimal && arr.findIndex(x => x.idAnimal === v.idAnimal) === i);
        levels.push(unique);
        currentLevel = unique;
        if (!unique || unique.length === 0) break;
      }

      return { animal: rootNode, levels };
    };

    // Try local list first (no network). If it yields parents, return early.
    try {
      const local = buildFromList(animals, animalId, maxDepth);
      if (local && local.animal && local.levels && local.levels.length > 1) {
        console.debug(`[geneticTree] built from local list for id=${animalId}`);
        return local;
      }
    } catch (e) {
      console.debug('[geneticTree] local build failed', e);
    }

    // find root animal in cached list first, otherwise fetch
    let root = animals.find(a => a.id === animalId) || null as any;
    if (root) {
      console.debug(`[geneticTree] root found in cache id=${root.id} record=${root.record}`);
    } else {
      try {
        root = await animalService.getById(animalId as number);
        console.debug(`[geneticTree] root fetched id=${animalId} -> ${root ? `record=${root.record}` : 'null'}`);
      } catch (e) {
        console.debug(`[geneticTree] failed to fetch root id=${animalId}`, e);
        return { animal: null, levels: [] };
      }
    }
    if (!root) {
      console.debug(`[geneticTree] no root found for id=${animalId}`);
      return { animal: null, levels: [] };
    }

    const levels: AnimalNode[][] = [];
    levels.push([root]); // level 0

    let currentLevel: any[] = [root];
    let hasMoreGenerations = true;

    // Continuar buscando generaciones hasta que no haya más padres o alcanzemos el máximo
    for (let depth = 1; depth <= maxDepth && hasMoreGenerations; depth++) {
      const nextLevel: any[] = [];
      let foundAnyParent = false;

      for (const node of currentLevel) {
        const fatherId = (node as any)?.idFather ?? (node as any)?.father?.id ?? null;
        const motherId = (node as any)?.idMother ?? (node as any)?.mother?.id ?? null;
        console.debug(`[geneticTree] node id=${node?.id} record=${node?.record} fatherId=${fatherId} motherId=${motherId}`);

        if (fatherId) {
          let father = animals.find(a => a.id === fatherId);
          if (father) {
            console.debug(`[geneticTree] father found in cache id=${fatherId} record=${father.record}`);
            foundAnyParent = true;
          } else {
            try {
              father = await animalService.getById(fatherId);
              console.debug(`[geneticTree] father fetched id=${fatherId} record=${father?.record}`);
              foundAnyParent = true;
            } catch (e) {
              console.debug(`[geneticTree] failed to fetch father id=${fatherId}`, e);
              father = undefined;
            }
          }
          if (father) nextLevel.push(father);
        }

        if (motherId) {
          let mother = animals.find(a => a.id === motherId);
          if (mother) {
            console.debug(`[geneticTree] mother found in cache id=${motherId} record=${mother.record}`);
            foundAnyParent = true;
          } else {
            try {
              mother = await animalService.getById(motherId);
              console.debug(`[geneticTree] mother fetched id=${motherId} record=${mother?.record}`);
              foundAnyParent = true;
            } catch (e) {
              console.debug(`[geneticTree] failed to fetch mother id=${motherId}`, e);
              mother = undefined;
            }
          }
          if (mother) nextLevel.push(mother);
        }
      }

      // dedupe by idAnimal
      const unique = nextLevel.filter((v, i, arr) => v && v.idAnimal && arr.findIndex(x => x.idAnimal === v.idAnimal) === i);
      
      // Si no encontramos padres en esta iteración, terminamos
      if (!foundAnyParent || unique.length === 0) {
        hasMoreGenerations = false;
      }
      
      if (unique.length > 0) {
        levels.push(unique);
        currentLevel = unique;
      }
    }

    return { animal: root, levels };
  };

  return { buildGeneticTree };
};
