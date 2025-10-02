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
  const buildDescendantsTree = async (animalId: number | undefined, maxDepth = 10) => {
    if (animalId === undefined || animalId === null) return { animal: null, levels: [] };

    // Buscar el nodo raíz por idAnimal o id
    const rootNode = animals.find(a => (a as any).idAnimal === animalId || a.id === animalId) || null;
    if (!rootNode) return { animal: null, levels: [] };

    const levels: any[][] = [];
    levels.push([rootNode]); // nivel 0

    let currentLevel: any[] = [rootNode];
    for (let depth = 1; depth <= maxDepth; depth++) {
      const nextLevel: any[] = [];

      for (const node of currentLevel) {
        const id = (node as any).idAnimal ?? (node as any).id;
        if (!id) continue;
        // Hijos: animales cuyo father_id/idFather o mother_id/idMother coincide con id
        const children = animals.filter(a => {
          const fId = (a as any).father_id ?? (a as any).idFather;
          const mId = (a as any).mother_id ?? (a as any).idMother;
          return fId === id || mId === id;
        });
        nextLevel.push(...children);
      }

      // Quitar duplicados por idAnimal/id
      const unique = nextLevel.filter((v, i, arr) => {
        const vid = (v as any).idAnimal ?? (v as any).id;
        return vid && arr.findIndex(x => ((x as any).idAnimal ?? (x as any).id) === vid) === i;
      });

      if (unique.length === 0) break;
      levels.push(unique);
      currentLevel = unique;
    }

    return { animal: rootNode, levels };
  };

  return { buildDescendantsTree };
};