import { animalService } from '@/entities/animal/api/animal.service';

/**
 * Servicio para verificar dependencias genealógicas de animales
 * Permite determinar si un animal tiene padres/hijos antes de construir árboles
 */

export interface AnimalDependencies {
  father_id: number;
  mother_id: number;
  children_as_father: number;
  children_as_mother: number;
  total_children: number;
  has_parents: boolean;
  has_children: boolean;
  has_any_relations: boolean;
}

export class AnimalDependenciesService {
  /**
   * Verifica si un animal tiene relaciones genealógicas (padres/hijos)
   * @param animalId ID del animal a verificar
   * @returns Objeto con conteos de relaciones
   */
  async getAnimalDependencies(animalId: number): Promise<AnimalDependencies> {
    try {
      // Nota: Autenticación basada en cookie HttpOnly.
      // No usar hooks de React dentro de servicios ni encabezados Authorization.
      // En su lugar, incluir credenciales para que el backend reciba la cookie.
      const response = await fetch(`/api/v1/animals/${animalId}/dependencies`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Si el usuario no está autenticado vía cookie, intentar verificación manual
        if (response.status === 401) {
          console.warn('[AnimalDependenciesService] 401 al consultar dependencias. Intentando verificación manual.');
          return await this.verifyDependenciesManually(animalId);
        }
        if (response.status === 404) {
          // El animal no existe o no tiene endpoint de dependencias
          return this.getDefaultDependencies();
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        father_id: data.father_id || 0,
        mother_id: data.mother_id || 0,
        children_as_father: data.children_as_father || 0,
        children_as_mother: data.children_as_mother || 0,
        total_children: (data.children_as_father || 0) + (data.children_as_mother || 0),
        has_parents: !!(data.father_id || data.mother_id),
        has_children: !!((data.children_as_father || 0) + (data.children_as_mother || 0)),
        has_any_relations: !!(
          data.father_id || 
          data.mother_id || 
          (data.children_as_father || 0) || 
          (data.children_as_mother || 0)
        )
      };
    } catch (error: any) {
      console.error(`[AnimalDependenciesService] Error verificando dependencias del animal ${animalId}:`, error);
      
      // Si el endpoint no existe, verificar manualmente
      if (error.message.includes('404') || error.message.includes('No encontrado')) {
        return await this.verifyDependenciesManually(animalId);
      }
      
      // Para otros errores, retornar valores por defecto
      return this.getDefaultDependencies();
    }
  }

  /**
   * Verificación manual de dependencias cuando el endpoint no está disponible
   * @param animalId ID del animal a verificar
   * @returns Objeto con conteos de relaciones
   */
  private async verifyDependenciesManually(animalId: number): Promise<AnimalDependencies> {
    try {
      // Obtener el animal para verificar sus padres
      const animal = await animalService.getById(animalId);
      
      // Buscar hijos del animal
      const allAnimals = await animalService.getAnimals({ limit: 10000 });
      const children = allAnimals.filter(a =>
        a.father_id === animalId || a.mother_id === animalId
      );
      
      const childrenAsFather = children.filter(a =>
        a.father_id === animalId
      );
      const childrenAsMother = children.filter(a =>
        a.mother_id === animalId
      );

      return {
        father_id: animal?.father_id || 0,
        mother_id: animal?.mother_id || 0,
        children_as_father: childrenAsFather.length,
        children_as_mother: childrenAsMother.length,
        total_children: children.length,
        has_parents: !!(animal?.father_id || animal?.mother_id),
        has_children: children.length > 0,
        has_any_relations: !!(
          animal?.father_id ||
          animal?.mother_id ||
          children.length > 0
        )
      };
    } catch (error) {
      console.error(`[AnimalDependenciesService] Error en verificación manual para animal ${animalId}:`, error);
      return this.getDefaultDependencies();
    }
  }

  /**
   * Valores por defecto cuando no se pueden verificar las dependencias
   */
  private getDefaultDependencies(): AnimalDependencies {
    return {
      father_id: 0,
      mother_id: 0,
      children_as_father: 0,
      children_as_mother: 0,
      total_children: 0,
      has_parents: false,
      has_children: false,
      has_any_relations: false
    };
  }

  /**
   * Genera un mensaje informativo sobre el estado de las relaciones de un animal
   * @param dependencies Objeto de dependencias del animal
   * @param treeType Tipo de árbol ('ancestors' | 'descendants')
   * @returns Mensaje informativo
   */
  generateDependencyMessage(
    dependencies: AnimalDependencies,
    treeType: 'ancestors' | 'descendants'
  ): string {
    if (treeType === 'ancestors') {
      if (!dependencies.has_parents) {
        return 'Este animal no tiene padres registrados en la base de datos. ' +
               'Para mostrar antepasados, asegúrese de que los campos idFather e idMother estén configurados correctamente.';
      }
      return `Se encontraron ${dependencies.father_id ? '1 padre' : '0 padres'} y ${dependencies.mother_id ? '1 madre' : '0 madres'}.`;
    } else {
      if (!dependencies.has_children) {
        return 'Este animal no tiene hijos registrados en la base de datos. ' +
               'Para mostrar descendientes, asegúrese de que otros animales tengan este animal configurado como padre (idFather) o madre (idMother).';
      }
      return `Se encontraron ${dependencies.total_children} hijos: ${dependencies.children_as_father} como padre y ${dependencies.children_as_mother} como madre.`;
    }
  }
}

export const animalDependenciesService = new AnimalDependenciesService();
