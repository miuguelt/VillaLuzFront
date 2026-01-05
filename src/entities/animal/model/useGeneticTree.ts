import { useAnimals } from "./useAnimals";
import { animalService } from '@/entities/animal/api/animal.service';

interface AnimalNode {
  id?: number;
  record?: string;
  name?: string;
  birth_date?: string;
  sex?: string;
  breed?: any;
  father_id?: number | null;
  mother_id?: number | null;
}

export const useGeneticTree = () => {
  const { animals } = useAnimals();

  const buildGeneticTree = async (animalId: number | undefined, maxDepth = 10) => {
    if (animalId === undefined || animalId === null) return { animal: null, levels: [] };

    console.log(`[geneticTree] === INICIANDO buildGeneticTree para id=${animalId} ===`);
    console.log(`[geneticTree] Total animales disponibles: ${animals.length}`);

    // First, try to build the tree synchronously from the cached `animals` list.
    const buildFromList = (list: any[], id: number | undefined, depth = maxDepth) => {
      if (!id) return { animal: null, levels: [] };
      const rootNode = list.find(a => a.id === id) || null;
      if (!rootNode) {
        console.log(`[geneticTree] buildFromList: Animal raíz NO encontrado para id=${id}`);
        return { animal: null, levels: [] };
      }

      console.log(`[geneticTree] buildFromList: Animal raíz encontrado:`, {
        id: rootNode.id,
        record: rootNode.record,
        idFather: rootNode.idFather,
        father_id: rootNode.father_id,
        idMother: rootNode.idMother,
        mother_id: rootNode.mother_id,
      });

      const levels: any[][] = [];
      levels.push([rootNode]);
      let currentLevel: any[] = [rootNode];

      for (let d = 1; d <= depth; d++) {
        const nextLevel: any[] = [];
        console.log(`[geneticTree] buildFromList: Procesando nivel ${d}, nodos actuales: ${currentLevel.length}`);

        for (const node of currentLevel) {
          // Extraer IDs de padre y madre - PRIORIZAR idFather/idMother
          const fatherId = (node as any)?.idFather ?? (node as any)?.father_id;
          const motherId = (node as any)?.idMother ?? (node as any)?.mother_id;

          console.log(`[geneticTree] buildFromList: Nodo id=${node.id} record=${node.record} -> fatherId=${fatherId}, motherId=${motherId}`);

          // Buscar padre: primero objeto embebido, luego por ID en lista
          const father = (node as any)?.father ?? (fatherId ? list.find((a: any) => a.id === fatherId) : null) ?? null;
          // Buscar madre: primero objeto embebido, luego por ID en lista
          const mother = (node as any)?.mother ?? (motherId ? list.find((a: any) => a.id === motherId) : null) ?? null;

          if (father) {
            console.log(`[geneticTree] buildFromList: Padre encontrado id=${father.id} record=${father.record}`);
            nextLevel.push(father);
          }
          if (mother) {
            console.log(`[geneticTree] buildFromList: Madre encontrada id=${mother.id} record=${mother.record}`);
            nextLevel.push(mother);
          }
        }
        const unique = nextLevel.filter((v, i, arr) => v && v.id && arr.findIndex(x => x.id === v.id) === i);
        console.log(`[geneticTree] buildFromList: Nivel ${d} tiene ${unique.length} padres únicos`);
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
        // Extraer IDs de padre y madre - PRIORIZAR idFather/idMother (formato del backend)
        const fatherId = (node as any)?.idFather ?? (node as any)?.father_id ?? (node as any)?.father?.id ?? (node as any)?.father?.idAnimal ?? null;
        const motherId = (node as any)?.idMother ?? (node as any)?.mother_id ?? (node as any)?.mother?.id ?? (node as any)?.mother?.idAnimal ?? null;

        console.debug(`[geneticTree] node id=${node?.id} record=${node?.record} idFather=${fatherId} idMother=${motherId}`);

        // Validar que los IDs sean números válidos antes de buscar
        const validFatherId = fatherId && Number.isInteger(Number(fatherId)) && Number(fatherId) > 0 ? Number(fatherId) : null;
        const validMotherId = motherId && Number.isInteger(Number(motherId)) && Number(motherId) > 0 ? Number(motherId) : null;

        if (validFatherId) {
          // Buscar padre en caché primero
          let father = animals.find(a => a.id === validFatherId);
          if (father) {
            console.debug(`[geneticTree] father found in cache id=${validFatherId} record=${father.record}`);
            foundAnyParent = true;
          } else {
            // Si no está en caché, intentar buscar por objeto embebido
            const embeddedFather = (node as any)?.father;
            if (embeddedFather && (embeddedFather.id === validFatherId || embeddedFather.idAnimal === validFatherId)) {
              father = embeddedFather;
              console.debug(`[geneticTree] father found embedded id=${validFatherId}`);
              foundAnyParent = true;
            } else {
              // Último recurso: fetch del servidor
              try {
                father = await animalService.getById(validFatherId);
                console.debug(`[geneticTree] father fetched id=${validFatherId} record=${father?.record}`);
                foundAnyParent = true;
              } catch (e) {
                console.debug(`[geneticTree] failed to fetch father id=${validFatherId}`, e);
                father = undefined;
              }
            }
          }
          // Validar que el padre sea macho antes de agregarlo
          if (father) {
            const fatherSex = father.gender;
            if (fatherSex === 'Macho' || !fatherSex) { // Permitir si no hay sexo definido
              nextLevel.push(father);
            } else {
              console.warn(`[geneticTree] father id=${validFatherId} has invalid sex: ${fatherSex}`);
            }
          }
        }

        if (validMotherId) {
          // Buscar madre en caché primero
          let mother = animals.find(a => a.id === validMotherId);
          if (mother) {
            console.debug(`[geneticTree] mother found in cache id=${validMotherId} record=${mother.record}`);
            foundAnyParent = true;
          } else {
            // Si no está en caché, intentar buscar por objeto embebido
            const embeddedMother = (node as any)?.mother;
            if (embeddedMother && (embeddedMother.id === validMotherId || embeddedMother.idAnimal === validMotherId)) {
              mother = embeddedMother;
              console.debug(`[geneticTree] mother found embedded id=${validMotherId}`);
              foundAnyParent = true;
            } else {
              // Último recurso: fetch del servidor
              try {
                mother = await animalService.getById(validMotherId);
                console.debug(`[geneticTree] mother fetched id=${validMotherId} record=${mother?.record}`);
                foundAnyParent = true;
              } catch (e) {
                console.debug(`[geneticTree] failed to fetch mother id=${validMotherId}`, e);
                mother = undefined;
              }
            }
          }
          // Validar que la madre sea hembra antes de agregarla
          if (mother) {
            const motherSex = mother.gender;
            if (motherSex === 'Hembra' || !motherSex) { // Permitir si no hay sexo definido
              nextLevel.push(mother);
            } else {
              console.warn(`[geneticTree] mother id=${validMotherId} has invalid sex: ${motherSex}`);
            }
          }
        }
      }

      // dedupe by id
      const unique = nextLevel.filter((v, i, arr) => v && v.id && arr.findIndex(x => x.id === v.id) === i);

      // Si no encontramos padres en esta iteración, terminamos
      if (!foundAnyParent || unique.length === 0) {
        hasMoreGenerations = false;
      }

      if (unique.length > 0) {
        levels.push(unique);
        currentLevel = unique;
      }
    }

    console.log(`[geneticTree] === ÁRBOL COMPLETO ===`);
    console.log(`[geneticTree] Total niveles construidos: ${levels.length}`);
    levels.forEach((level, idx) => {
      console.log(`[geneticTree] Nivel ${idx}: ${level.length} animales`, level.map(a => `${a.record}(${a.id})`));
    });

    return { animal: root, levels };
  };

  return { buildGeneticTree };
};
