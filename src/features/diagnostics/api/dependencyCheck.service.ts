/**
 * Servicio centralizado para verificar dependencias antes de eliminar registros
 * Respeta la integridad referencial y proporciona mensajes detallados al usuario
 *
 * IMPORTANTE: Este servicio compensa bugs del backend que no filtra correctamente
 * las relaciones. El frontend valida y filtra los resultados para asegurar que
 * solo se muestren dependencias reales.
 */

import { animalsService } from '@/entities/animal/api/animal.service';
import { breedsService } from '@/entities/breed/api/breeds.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { geneticImprovementsService } from '@/entities/genetic-improvement/api/geneticImprovements.service';

interface CacheEntry {
  result: DependencyCheckResult;
  timestamp: number;
}

class DependencyCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 60000; // 60 segundos para animales

  private getKey(entityType: string, entityId: number): string {
    return `${entityType}:${entityId}`;
  }

  get(entityType: string, entityId: number): DependencyCheckResult | null {
    const key = this.getKey(entityType, entityId);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  set(entityType: string, entityId: number, result: DependencyCheckResult): void {
    const key = this.getKey(entityType, entityId);
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  clearEntity(entityType: string, entityId: number): void {
    const key = this.getKey(entityType, entityId);
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

const dependencyCache = new DependencyCache();

/**
 * Limpia la caché de dependencias para un animal específico
 * Útil para animales recién creados para evitar dependencias falsas
 */
export function clearAnimalDependencyCache(animalId: number): void {
  console.log(`[clearAnimalDependencyCache] Limpiando caché para animal ID: ${animalId}`);
  dependencyCache.clearEntity('animal', animalId);
}

/**
 * Limpia toda la caché de dependencias
 */
export function clearDependencyCache(): void {
  dependencyCache.clear();
}

export interface DependencyCheckResult {
  hasDependencies: boolean;
  message?: string;
  detailedMessage?: string;
  dependencies?: {
    entity: string;
    count: number;
    samples?: string[]; // Muestra de registros dependientes (primeros 3-5)
  }[];
}

/**
 * Helper para validar y filtrar dependencias, compensando bugs del backend
 * que no filtra correctamente las relaciones.
 *
 * @param items - Items devueltos por el backend
 * @param filterKey - Campo a verificar (ej: 'breed_id', 'species_id')
 * @param expectedValue - Valor esperado del campo
 * @param context - Contexto para logging (ej: 'checkBreedDependencies')
 * @returns Items que realmente pertenecen a la entidad padre
 */
function validateAndFilterDependencies<T extends Record<string, any>>(
  items: T[],
  filterKey: string,
  expectedValue: any,
  context: string
): T[] {
  // Soportar múltiples variantes del campo (breed_id, breeds_id, etc.)
  const filterKeys = [filterKey, `${filterKey}s`, filterKey.replace('_id', 's_id')];

  const validItems = items.filter(item => {
    // Buscar el valor en cualquiera de las variantes del campo
    const itemValue = filterKeys.map(k => item[k]).find(v => v != null);
    // Comparación loose para manejar string vs number
    return itemValue == expectedValue;
  });

  const invalidCount = items.length - validItems.length;
  if (invalidCount > 0) {
    const invalidItems = items.filter(item => {
      const itemValue = filterKeys.map(k => item[k]).find(v => v != null);
      return itemValue != expectedValue;
    });

    console.error(`[${context}] ⚠️ BACKEND BUG DETECTADO: Filtrado incorrecto`, {
      filterKey,
      expectedValue,
      expectedType: typeof expectedValue,
      totalFromBackend: items.length,
      validItems: validItems.length,
      invalidItems: invalidCount,
      problema: `El backend devolvió ${invalidCount} items que NO pertenecen a ${filterKey}=${expectedValue}`,
      solucion: 'El frontend ha filtrado automáticamente los items inválidos',
      muestraInvalida: invalidItems.slice(0, 2).map(item => ({
        id: item.id,
        ...Object.fromEntries(filterKeys.map(k => [k, item[k]])),
        expected: expectedValue
      }))
    });

    console.warn(`[${context}] ⚠️ ACCIÓN REQUERIDA: Revisar endpoint del backend que devuelve estos datos`);
  }

  return validItems;
}

/**
 * Verifica dependencias de una Especie antes de eliminarla
 */
export async function checkSpeciesDependencies(speciesId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar razas asociadas
    const breedsResp = await breedsService.getPaginated({ species_id: speciesId, limit: 5, page: 1, fields: 'id,name', cache_bust: Date.now() });
    const breeds = Array.isArray(breedsResp?.data) ? breedsResp.data : [];
    const breedsCount = breedsResp?.total || breeds.length;

    if (breedsCount > 0) {
      const breedNames = breeds.slice(0, 3).map((b: any) => b.name).filter(Boolean);
      const moreText = breedsCount > 3 ? ` y ${breedsCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta especie porque tiene ${breedsCount} raza(s) asociada(s).`,
        detailedMessage: `Esta especie tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `📋 **Razas (${breedsCount})**: ${breedNames.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Eliminar o reasignar todas las razas asociadas a otra especie\n` +
          `2. Luego podrá eliminar esta especie`,
        dependencies: [{
          entity: 'Razas',
          count: breedsCount,
          samples: breedNames
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkSpeciesDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de una Raza antes de eliminarla
 */
export async function checkBreedDependencies(breedId: number): Promise<DependencyCheckResult> {
  try {
    console.log('[checkBreedDependencies] ========================================');
    console.log('[checkBreedDependencies] Verificando dependencias para breedId:', breedId);

    // Verificar animales asociados
    const animalsResp = await animalsService.getAnimalsPaginated({
      breed_id: breedId,
      limit: 1000, // Aumentar límite para obtener todos los dependientes
      page: 1,
      fields: 'id,record,breed_id,breeds_id',
      cache_bust: Date.now()
    });

    const allAnimals = Array.isArray(animalsResp?.data) ? animalsResp.data : [];

    console.log('[checkBreedDependencies] Respuesta del backend:', {
      breedId,
      totalAnimalsFromBackend: allAnimals.length,
      totalReportedByBackend: animalsResp?.total,
      firstFewAnimals: allAnimals.slice(0, 3).map(a => ({
        id: a.id,
        breed_id: (a as any).breed_id,
        breeds_id: (a as any).breeds_id
      }))
    });

    // DETECTAR BUG DEL BACKEND: si devuelve muchos animales pero ninguno con el breed_id correcto
    if (allAnimals.length > 0) {
      const allHaveWrongBreedId = allAnimals.every(a => {
        const animalBreedId = (a as any).breed_id ?? (a as any).breeds_id;
        return animalBreedId != breedId;
      });

      if (allHaveWrongBreedId) {
        // No bloquear: continuar con filtrado client-side y permitir eliminación si no hay coincidencias reales
        console.warn('[checkBreedDependencies] ⚠️ Verificación de integridad: el backend no filtró por breed_id. Se valida en frontend y se permite eliminar solo si no existen dependencias reales.', {
          detalle: `El backend devolvió ${allAnimals.length} animales pero NINGUNO tiene breed_id=${breedId}`,
          motivo: 'La función verifica integridad referencial para evitar eliminar registros usados en otras tablas',
          accion: 'Corregir el filtro en /api/v1/animals para el parámetro breed_id en el backend'
        });
      }
    }

    // USAR HELPER para validar y filtrar (compensa bugs del backend)
    const animals = validateAndFilterDependencies(
      allAnimals,
      'breed_id',
      breedId,
      'checkBreedDependencies'
    );

    const actualCount = animals.length;

    if (actualCount > 0) {
      const animalRecords = animals.slice(0, 5).map((a: any) => a.record || `ID ${a.id}`).filter(Boolean);
      const moreText = actualCount > 5 ? ` y ${actualCount - 5} más` : '';

      console.log('[checkBreedDependencies] ❌ Bloqueando eliminación:', {
        breedId,
        dependencyCount: actualCount,
        samples: animalRecords
      });

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta raza porque tiene ${actualCount} animal(es) asociado(s).`,
        detailedMessage: `Esta raza tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `🐄 **Animales (${actualCount})**: ${animalRecords.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los animales a otra raza\n` +
          `2. O eliminar los animales si ya no son necesarios\n` +
          `3. Luego podrá eliminar esta raza`,
        dependencies: [{
          entity: 'Animales',
          count: actualCount,
          samples: animalRecords
        }]
      };
    }

    console.log('[checkBreedDependencies] ✅ Sin dependencias, se puede eliminar');
    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkBreedDependencies] ❌ Error al verificar dependencias:', error);
    // En caso de error, permitir eliminación (fail-open) para no bloquear al usuario
    // El backend debería tener sus propias validaciones de integridad
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Animal antes de eliminarlo
 */
export async function checkAnimalDependencies(animalId: number): Promise<DependencyCheckResult> {
  console.log(`[checkAnimalDependencies] Verificando dependencias para animal ID: ${animalId}`);

  // NOTA: Caché de lectura DESHABILITADA para evitar falsos positivos
  // cuando los registros relacionados han sido eliminados recientemente.
  // Siempre consultamos datos frescos del servidor.
  // Si se necesita optimizar en el futuro, revisar la lógica de invalidación.

  // Limpiar cualquier caché existente para este animal antes de verificar
  dependencyCache.clearEntity('animal', animalId);

  // Verificar si es un animal recién creado para evitar falsas advertencias
  try {
    const animal = await animalsService.getAnimalById(animalId);
    if (animal?.created_at) {
      const createdAt = new Date(animal.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      // Considerar recién creado si tiene menos de 5 minutos
      if (diffMinutes < 5) {
        console.log(`[checkAnimalDependencies] Animal recién creado detectado (ID: ${animalId}), omitiendo verificación de dependencias`);
        const result = { hasDependencies: false };
        dependencyCache.set('animal', animalId, result);
        return result;
      }
    }
  } catch (error) {
    console.error('[checkAnimalDependencies] Error verificando si es recién creado:', error);
  }

  try {
    const dependencies: DependencyCheckResult['dependencies'] = [];
    let totalDeps = 0;
    const detailParts: string[] = [];

    // EJECUTAR TODAS LAS VERIFICACIONES EN PARALELO PARA OPTIMIZAR RENDIMIENTO
    const [
      childrenResp,
      offspringResp,
      treatmentsResp,
      vaccinationsResp,
      diseasesResp,
      fieldsResp,
      improvementsResp
    ] = await Promise.all([
      // Optimizado: límite reducido a 3 para early exit
      // IMPORTANTE: Usar cache_bust para evitar falsos positivos con datos cacheados
      animalsService.getAnimalsPaginated({ father_id: animalId, limit: 3, page: 1, fields: 'id,record', cache_bust: Date.now() }),
      animalsService.getAnimalsPaginated({ mother_id: animalId, limit: 3, page: 1, fields: 'id,record', cache_bust: Date.now() }),
      treatmentsService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,treatment_date', cache_bust: Date.now() }),
      vaccinationsService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,vaccination_date', cache_bust: Date.now() }),
      animalDiseasesService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,diagnosis_date', cache_bust: Date.now() }),
      animalFieldsService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,assignment_date', cache_bust: Date.now() }),
      geneticImprovementsService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,improvement_date', cache_bust: Date.now() })
    ]);

    // Helper local para filtrar soft-deletes y loggear inspección
    const filterActiveItems = (items: any[], type: string) => {
      if (!Array.isArray(items)) return [];

      const activeItems = items.filter(item => {
        // Filtrar si tiene deleted_at (Soft Delete estándar)
        if (item.deleted_at) return false;
        // Filtrar si status es 'deleted' o 'inactivo' (algunos modelos)
        if (item.status === 'deleted' || item.status === 'inactive') return false;
        return true;
      });

      if (items.length !== activeItems.length) {
        console.log(`[checkAnimalDependencies] 🧹 Filtrados ${items.length - activeItems.length} items eliminados (soft-deleted) de tipo ${type}`);
      }

      if (activeItems.length > 0) {
        // console.log(`[checkAnimalDependencies] 🔍 Dependencias encontradas para ${type}:`, activeItems.map(i => ({ id: i.id, date: i.date || i.created_at || 'N/A' })));
      }

      return activeItems;
    };

    // Procesar hijos (padre)
    const childrenRaw = Array.isArray(childrenResp?.data) ? childrenResp.data : [];
    const children = filterActiveItems(childrenRaw, 'Hijos (Padre)');
    const childrenCount = children.length; // Usar el count filtrado, no el total del backend
    if (childrenCount > 0) {
      const childRecords = children.slice(0, 3).map((a: any) => a.record || `ID ${a.id}`);
      const moreText = childrenCount > 3 ? ` y ${childrenCount - 3} más` : '';
      dependencies.push({ entity: 'Hijos (como padre)', count: childrenCount, samples: childRecords });
      detailParts.push(`👨‍👦 **Hijos (como padre) (${childrenCount})**: ${childRecords.join(', ')}${moreText}`);
      totalDeps += childrenCount;
    }

    // Procesar hijos (madre)
    const offspringRaw = Array.isArray(offspringResp?.data) ? offspringResp.data : [];
    const offspring = filterActiveItems(offspringRaw, 'Hijos (Madre)');
    const offspringCount = offspring.length;
    if (offspringCount > 0) {
      const offspringRecords = offspring.slice(0, 3).map((a: any) => a.record || `ID ${a.id}`);
      const moreText = offspringCount > 3 ? ` y ${offspringCount - 3} más` : '';
      dependencies.push({ entity: 'Hijos (como madre)', count: offspringCount, samples: offspringRecords });
      detailParts.push(`👩‍👦 **Hijos (como madre) (${offspringCount})**: ${offspringRecords.join(', ')}${moreText}`);
      totalDeps += offspringCount;
    }

    // Procesar tratamientos
    const treatmentsRaw = Array.isArray(treatmentsResp?.data) ? treatmentsResp.data : [];
    const treatments = filterActiveItems(treatmentsRaw, 'Tratamientos');
    const treatmentsCount = treatments.length;
    if (treatmentsCount > 0) {
      const treatmentDates = treatments.slice(0, 3).map((t: any) => {
        const date = t.treatment_date ? new Date(t.treatment_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${t.id})`;
      });
      const moreText = treatmentsCount > 3 ? ` y ${treatmentsCount - 3} más` : '';
      dependencies.push({ entity: 'Tratamientos', count: treatmentsCount, samples: treatmentDates });
      detailParts.push(`💉 **Tratamientos (${treatmentsCount})**: ${treatmentDates.join(', ')}${moreText}`);
      totalDeps += treatmentsCount;
    }

    // Procesar vacunaciones
    const vaccinationsRaw = Array.isArray(vaccinationsResp?.data) ? vaccinationsResp.data : [];
    const vaccinations = filterActiveItems(vaccinationsRaw, 'Vacunaciones');
    const vaccinationsCount = vaccinations.length;
    if (vaccinationsCount > 0) {
      const vaccinationDates = vaccinations.slice(0, 3).map((v: any) => {
        const date = v.vaccination_date ? new Date(v.vaccination_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${v.id})`;
      });
      const moreText = vaccinationsCount > 3 ? ` y ${vaccinationsCount - 3} más` : '';
      dependencies.push({ entity: 'Vacunaciones', count: vaccinationsCount, samples: vaccinationDates });
      detailParts.push(`💊 **Vacunaciones (${vaccinationsCount})**: ${vaccinationDates.join(', ')}${moreText}`);
      totalDeps += vaccinationsCount;
    }

    // Procesar enfermedades
    const diseasesRaw = Array.isArray(diseasesResp?.data) ? diseasesResp.data : [];
    const diseases = filterActiveItems(diseasesRaw, 'Enfermedades');
    const diseasesCount = diseases.length;
    if (diseasesCount > 0) {
      const diseaseDates = diseases.slice(0, 3).map((d: any) => {
        const date = d.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${d.id})`;
      });
      const moreText = diseasesCount > 3 ? ` y ${diseasesCount - 3} más` : '';
      dependencies.push({ entity: 'Enfermedades', count: diseasesCount, samples: diseaseDates });
      detailParts.push(`🏥 **Enfermedades (${diseasesCount})**: ${diseaseDates.join(', ')}${moreText}`);
      totalDeps += diseasesCount;
    }

    // Procesar asignaciones a potreros
    const fieldsRaw = Array.isArray(fieldsResp?.data) ? fieldsResp.data : [];
    const fields = filterActiveItems(fieldsRaw, 'Campos');
    const fieldsCount = fields.length;
    if (fieldsCount > 0) {
      const fieldDates = fields.slice(0, 3).map((f: any) => {
        const date = f.assignment_date ? new Date(f.assignment_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${f.id})`;
      });
      const moreText = fieldsCount > 3 ? ` y ${fieldsCount - 3} más` : '';
      dependencies.push({ entity: 'Asignaciones a Potreros', count: fieldsCount, samples: fieldDates });
      detailParts.push(`🌾 **Asignaciones a Potreros (${fieldsCount})**: ${fieldDates.join(', ')}${moreText}`);
      totalDeps += fieldsCount;
    }

    // Procesar mejoras genéticas
    const improvementsRaw = Array.isArray(improvementsResp?.data) ? improvementsResp.data : [];
    const improvements = filterActiveItems(improvementsRaw, 'Mejoras G.');
    const improvementsCount = improvements.length;
    if (improvementsCount > 0) {
      const improvementDates = improvements.slice(0, 3).map((i: any) => {
        const date = i.improvement_date ? new Date(i.improvement_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${i.id})`;
      });
      const moreText = improvementsCount > 3 ? ` y ${improvementsCount - 3} más` : '';
      dependencies.push({ entity: 'Mejoras Genéticas', count: improvementsCount, samples: improvementDates });
      detailParts.push(`🧬 **Mejoras Genéticas (${improvementsCount})**: ${improvementDates.join(', ')}${moreText}`);
      totalDeps += improvementsCount;
    }

    // Construir resultado
    const result: DependencyCheckResult = {
      hasDependencies: totalDeps > 0,
      ...(totalDeps > 0 && {
        message: `⚠️ No se puede eliminar este animal porque tiene ${totalDeps} dependencia(s).`,
        detailedMessage: `Este animal tiene las siguientes dependencias que deben ser eliminadas primero:\n\n` +
          detailParts.join('\n\n') +
          `\n\n**Acciones sugeridas:**\n` +
          `1. Eliminar o reasignar todas las dependencias listadas\n` +
          `2. Luego podrá eliminar este animal`,
        dependencies
      })
    };

    // Guardar en caché
    dependencyCache.set('animal', animalId, result);

    console.log(`[checkAnimalDependencies] Verificación completada para animal ID: ${animalId}`, {
      hasDependencies: result.hasDependencies,
      totalDependencies: totalDeps,
      cached: true
    });

    return result;

  } catch (error) {
    console.error('[checkAnimalDependencies] ❌ Error en verificación optimizada:', error);
    // En caso de error, permitir eliminación (fail-open) para no bloquear al usuario
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Potrero antes de eliminarlo
 */
export async function checkFieldDependencies(fieldId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar asignaciones de animales
    const assignmentsResp = await animalFieldsService.getPaginated({ field_id: fieldId, limit: 5, page: 1, fields: 'id,animal_id,assignment_date', cache_bust: Date.now() });
    const assignments = Array.isArray(assignmentsResp?.data) ? assignmentsResp.data : [];
    const assignmentsCount = assignmentsResp?.total || assignments.length;

    if (assignmentsCount > 0) {
      const assignmentDetails = await Promise.all(
        assignments.slice(0, 3).map(async (a: any) => {
          try {
            const animal = await animalsService.getAnimalById(a.animal_id);
            const date = a.assignment_date ? new Date(a.assignment_date).toLocaleDateString('es-ES') : 'Sin fecha';
            return `${animal?.record || `Animal ID ${a.animal_id}`} (${date})`;
          } catch {
            return `Animal ID ${a.animal_id}`;
          }
        })
      );
      const moreText = assignmentsCount > 3 ? ` y ${assignmentsCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este potrero porque tiene ${assignmentsCount} asignación(es) de animales.`,
        detailedMessage: `Este potrero tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `🐄 **Asignaciones de Animales (${assignmentsCount})**: ${assignmentDetails.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los animales a otro potrero\n` +
          `2. O eliminar las asignaciones si ya no son válidas\n` +
          `3. Luego podrá eliminar este potrero`,
        dependencies: [{
          entity: 'Asignaciones de Animales',
          count: assignmentsCount,
          samples: assignmentDetails
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkFieldDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de una Enfermedad antes de eliminarla
 */
export async function checkDiseaseDependencies(diseaseId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar diagnósticos de animales
    const diagnosesResp = await animalDiseasesService.getPaginated({ disease_id: diseaseId, limit: 5, page: 1, fields: 'id,animal_id,diagnosis_date', cache_bust: Date.now() });
    const diagnoses = Array.isArray(diagnosesResp?.data) ? diagnosesResp.data : [];
    const diagnosesCount = diagnosesResp?.total || diagnoses.length;

    let diagnosisDetails: string[] = [];
    let diagnosisMoreText = '';

    if (diagnosesCount > 0) {
      diagnosisDetails = await Promise.all(
        diagnoses.slice(0, 3).map(async (d: any) => {
          try {
            const animal = await animalsService.getAnimalById(d.animal_id);
            const date = d.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString('es-ES') : 'Sin fecha';
            return `${animal?.record || `Animal ID ${d.animal_id}`} (${date})`;
          } catch {
            return `Diagnóstico ID ${d.id}`;
          }
        })
      );
      diagnosisMoreText = diagnosesCount > 3 ? ` y ${diagnosesCount - 3} más` : '';
    }

    // Verificar vacunas que tienen esta enfermedad como objetivo (target_disease_id)
    const vaccinesResp = await vaccinesService.getPaginated({ target_disease_id: diseaseId, limit: 5, page: 1, fields: 'id,name', cache_bust: Date.now() });
    const vaccines = Array.isArray(vaccinesResp?.data) ? vaccinesResp.data : [];
    const vaccinesCount = vaccinesResp?.total || vaccines.length;

    if (vaccinesCount > 0) {
      const vaccineDetails = vaccines.slice(0, 3).map((v: any) => `${v.name || 'Vacuna'} (ID ${v.id})`);
      const vaccineMoreText = vaccinesCount > 3 ? ` y ${vaccinesCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta enfermedad porque es el objetivo de ${vaccinesCount} vacuna(s).`,
        detailedMessage: `Esta enfermedad tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `💉 **Vacunas Objetivo (${vaccinesCount})**: ${vaccineDetails.join(', ')}${vaccineMoreText}\n\n` +
          `((También verifique Diagnósticos: ${diagnosesCount > 0 ? diagnosesCount : '0'}))\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar o eliminar las vacunas que apuntan a esta enfermedad\n` +
          `2. Eliminar los diagnósticos si existen\n` +
          `3. Luego podrá eliminar esta enfermedad`,
        dependencies: [
          {
            entity: 'Vacunas Objetivo',
            count: vaccinesCount,
            samples: vaccineDetails
          },
          ...(diagnosesCount > 0 ? [{
            entity: 'Diagnósticos',
            count: diagnosesCount,
            samples: diagnosisDetails
          }] : [])
        ]
      };
    }

    if (diagnosesCount > 0) {
      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta enfermedad porque tiene ${diagnosesCount} diagnóstico(s) asociado(s).`,
        detailedMessage: `Esta enfermedad tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `🏥 **Diagnósticos (${diagnosesCount})**: ${diagnosisDetails.join(', ')}${diagnosisMoreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los diagnósticos a otra enfermedad\n` +
          `2. O eliminar los diagnósticos si ya no son relevantes\n` +
          `3. Luego podrá eliminar esta enfermedad`,
        dependencies: [{
          entity: 'Diagnósticos',
          count: diagnosesCount,
          samples: diagnosisDetails
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkDiseaseDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Medicamento antes de eliminarlo
 */
export async function checkMedicationDependencies(medicationId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar asociaciones con tratamientos
    const treatmentMedsResp = await treatmentMedicationService.getPaginated({ medication_id: medicationId, limit: 5, page: 1, fields: 'id,treatment_id', cache_bust: Date.now() });
    const treatmentMeds = Array.isArray(treatmentMedsResp?.data) ? treatmentMedsResp.data : [];
    const treatmentMedsCount = treatmentMedsResp?.total || treatmentMeds.length;

    if (treatmentMedsCount > 0) {
      const treatmentDetails = treatmentMeds.slice(0, 3).map((tm: any) => `Tratamiento ID ${tm.treatment_id}`);
      const moreText = treatmentMedsCount > 3 ? ` y ${treatmentMedsCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este medicamento porque está asociado a ${treatmentMedsCount} tratamiento(s).`,
        detailedMessage: `Este medicamento tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `💉 **Tratamientos (${treatmentMedsCount})**: ${treatmentDetails.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar los tratamientos a otro medicamento\n` +
          `2. O eliminar las asociaciones si ya no son necesarias\n` +
          `3. Luego podrá eliminar este medicamento`,
        dependencies: [{
          entity: 'Tratamientos',
          count: treatmentMedsCount,
          samples: treatmentDetails
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkMedicationDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de una Vacuna antes de eliminarla
 */
export async function checkVaccineDependencies(vaccineId: number): Promise<DependencyCheckResult> {
  try {
    const dependencies: DependencyCheckResult['dependencies'] = [];
    let totalDeps = 0;
    const detailParts: string[] = [];

    // 1. Verificar vacunaciones
    const vaccinationsResp = await vaccinationsService.getPaginated({ vaccine_id: vaccineId, limit: 5, page: 1, fields: 'id,animal_id,vaccination_date', cache_bust: Date.now() });
    const vaccinations = Array.isArray(vaccinationsResp?.data) ? vaccinationsResp.data : [];
    const vaccinationsCount = vaccinationsResp?.total || vaccinations.length;

    if (vaccinationsCount > 0) {
      const vaccinationDetails = vaccinations.slice(0, 3).map((v: any) => {
        const date = v.vaccination_date ? new Date(v.vaccination_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${v.id})`;
      });
      const moreText = vaccinationsCount > 3 ? ` y ${vaccinationsCount - 3} más` : '';
      dependencies.push({ entity: 'Vacunaciones', count: vaccinationsCount, samples: vaccinationDetails });
      detailParts.push(`💊 **Vacunaciones (${vaccinationsCount})**: ${vaccinationDetails.join(', ')}${moreText}`);
      totalDeps += vaccinationsCount;
    }

    // 2. Verificar asociaciones con tratamientos
    const treatmentVacsResp = await treatmentVaccinesService.getPaginated({ vaccine_id: vaccineId, limit: 5, page: 1, fields: 'id,treatment_id' });
    const treatmentVacs = Array.isArray(treatmentVacsResp?.data) ? treatmentVacsResp.data : [];
    const treatmentVacsCount = treatmentVacsResp?.total || treatmentVacs.length;

    if (treatmentVacsCount > 0) {
      const treatmentDetails = treatmentVacs.slice(0, 3).map((tv: any) => `Tratamiento ID ${tv.treatment_id}`);
      const moreText = treatmentVacsCount > 3 ? ` y ${treatmentVacsCount - 3} más` : '';
      dependencies.push({ entity: 'Tratamientos', count: treatmentVacsCount, samples: treatmentDetails });
      detailParts.push(`💉 **Tratamientos (${treatmentVacsCount})**: ${treatmentDetails.join(', ')}${moreText}`);
      totalDeps += treatmentVacsCount;
    }

    if (totalDeps > 0) {
      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta vacuna porque tiene ${totalDeps} registro(s) relacionado(s).`,
        detailedMessage: `Esta vacuna tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          detailParts.join('\n\n') + '\n\n' +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todas las vacunaciones y tratamientos a otra vacuna\n` +
          `2. O eliminar los registros si ya no son necesarios\n` +
          `3. Luego podrá eliminar esta vacuna`,
        dependencies
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkVaccineDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Tipo de Alimento antes de eliminarlo
 */
export async function checkFoodTypeDependencies(foodTypeId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar controles asociados
    const controlService = await import('@/entities/control/api/control.service').then(m => m.controlService);
    const controlsResp = await controlService.getPaginated({ food_type_id: foodTypeId, limit: 5, page: 1, fields: 'id,control_date' });
    const controls = Array.isArray(controlsResp?.data) ? controlsResp.data : [];
    const controlsCount = controlsResp?.total || controls.length;

    if (controlsCount > 0) {
      const controlDetails = controls.slice(0, 3).map((c: any) => {
        const date = c.control_date ? new Date(c.control_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${c.id})`;
      });
      const moreText = controlsCount > 3 ? ` y ${controlsCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este tipo de alimento porque tiene ${controlsCount} control(es) asociado(s).`,
        detailedMessage: `Este tipo de alimento tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `📊 **Controles (${controlsCount})**: ${controlDetails.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los controles a otro tipo de alimento\n` +
          `2. O eliminar los controles si ya no son necesarios\n` +
          `3. Luego podrá eliminar este tipo de alimento`,
        dependencies: [{
          entity: 'Controles',
          count: controlsCount,
          samples: controlDetails
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkFoodTypeDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Función helper para verificar dependencias según el tipo de entidad
 */
export async function checkDependencies(
  entityType: string,
  entityId: number
): Promise<DependencyCheckResult> {
  const normalizedType = entityType.toLowerCase();

  switch (normalizedType) {
    case 'species':
    case 'especie':
    case 'especies':
      return checkSpeciesDependencies(entityId);

    case 'breed':
    case 'breeds':
    case 'raza':
    case 'razas':
      return checkBreedDependencies(entityId);

    case 'animal':
    case 'animals':
    case 'animales':
      return checkAnimalDependencies(entityId);

    case 'field':
    case 'fields':
    case 'potrero':
    case 'potreros':
      return checkFieldDependencies(entityId);

    case 'disease':
    case 'diseases':
    case 'enfermedad':
    case 'enfermedades':
      return checkDiseaseDependencies(entityId);

    case 'medication':
    case 'medications':
    case 'medicamento':
    case 'medicamentos':
      return checkMedicationDependencies(entityId);

    case 'vaccine':
    case 'vaccines':
    case 'vacuna':
    case 'vacunas':
      return checkVaccineDependencies(entityId);

    case 'foodtype':
    case 'foodtypes':
    case 'food_type':
    case 'food_types':
    case 'tipoalimento':
    case 'tiposalimento':
      return checkFoodTypeDependencies(entityId);

    case 'treatment':
    case 'treatments':
    case 'tratamiento':
    case 'tratamientos':
      return checkTreatmentDependencies(entityId);

    case 'routeadministration':
    case 'route_administration':
    case 'ruta':
    case 'rutaadministracion':
      return checkRouteAdministrationDependencies(entityId);

    case 'user':
    case 'users':
    case 'usuario':
    case 'usuarios':
      return checkUserDependencies(entityId);

    default:
      // Para entidades no configuradas, retornar sin dependencias
      return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Tratamiento antes de eliminarlo
 */
export async function checkTreatmentDependencies(treatmentId: number): Promise<DependencyCheckResult> {
  try {
    const dependencies: DependencyCheckResult['dependencies'] = [];
    let totalDeps = 0;
    const detailParts: string[] = [];

    // 1. Verificar medicamentos asociados
    // 1. Verificar medicamentos asociados
    const treatmentMedsResp = await treatmentMedicationService.getPaginated({ treatment_id: treatmentId, limit: 5, page: 1, fields: 'id,medication_id', cache_bust: Date.now() });
    const treatmentMeds = Array.isArray(treatmentMedsResp?.data) ? treatmentMedsResp.data : [];
    const treatmentMedsCount = treatmentMedsResp?.total || treatmentMeds.length;

    if (treatmentMedsCount > 0) {
      const medDetails = treatmentMeds.slice(0, 3).map((tm: any) => `Medicamento ID ${tm.medication_id}`);
      const moreText = treatmentMedsCount > 3 ? ` y ${treatmentMedsCount - 3} más` : '';
      dependencies.push({ entity: 'Medicamentos Aplicados', count: treatmentMedsCount, samples: medDetails });
      detailParts.push(`💊 **Medicamentos Aplicados (${treatmentMedsCount})**: ${medDetails.join(', ')}${moreText}`);
      totalDeps += treatmentMedsCount;
    }

    // 2. Verificar vacunas asociadas
    // 2. Verificar vacunas asociadas
    const treatmentVacsResp = await treatmentVaccinesService.getPaginated({ treatment_id: treatmentId, limit: 5, page: 1, fields: 'id,vaccine_id', cache_bust: Date.now() });
    const treatmentVacs = Array.isArray(treatmentVacsResp?.data) ? treatmentVacsResp.data : [];
    const treatmentVacsCount = treatmentVacsResp?.total || treatmentVacs.length;

    if (treatmentVacsCount > 0) {
      const vacDetails = treatmentVacs.slice(0, 3).map((tv: any) => `Vacuna ID ${tv.vaccine_id}`);
      const moreText = treatmentVacsCount > 3 ? ` y ${treatmentVacsCount - 3} más` : '';
      dependencies.push({ entity: 'Vacunas Aplicadas', count: treatmentVacsCount, samples: vacDetails });
      detailParts.push(`💉 **Vacunas Aplicadas (${treatmentVacsCount})**: ${vacDetails.join(', ')}${moreText}`);
      totalDeps += treatmentVacsCount;
    }

    if (totalDeps > 0) {
      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este tratamiento porque tiene ${totalDeps} aplicación(es) asociada(s).`,
        detailedMessage: `Este tratamiento tiene las siguientes dependencias que deben ser eliminadas primero:\n\n` +
          detailParts.join('\n\n') + '\n\n' +
          `**Acciones sugeridas:**\n` +
          `1. Eliminar todas las aplicaciones de medicamentos y vacunas asociadas\n` +
          `2. Luego podrá eliminar este tratamiento`,
        dependencies
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkTreatmentDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de una Ruta de Administración antes de eliminarla
 */
export async function checkRouteAdministrationDependencies(routeId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar vacunas que usan esta ruta
    // Verificar vacunas que usan esta ruta
    const vaccinesResp = await vaccinesService.getPaginated({ route_administration_id: routeId, limit: 5, page: 1, fields: 'id,name', cache_bust: Date.now() });
    const vaccines = Array.isArray(vaccinesResp?.data) ? vaccinesResp.data : [];
    const vaccinesCount = vaccinesResp?.total || vaccines.length;

    if (vaccinesCount > 0) {
      const vaccineNames = vaccines.slice(0, 3).map((v: any) => v.name || `ID ${v.id}`);
      const moreText = vaccinesCount > 3 ? ` y ${vaccinesCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta ruta de administración porque ${vaccinesCount} vacuna(s) la utiliza(n).`,
        detailedMessage: `Esta ruta de administración tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `💉 **Vacunas (${vaccinesCount})**: ${vaccineNames.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todas las vacunas a otra ruta de administración\n` +
          `2. O eliminar las vacunas si ya no son necesarias\n` +
          `3. Luego podrá eliminar esta ruta de administración`,
        dependencies: [{
          entity: 'Vacunas',
          count: vaccinesCount,
          samples: vaccineNames
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkRouteAdministrationDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Usuario antes de eliminarlo
 */
export async function checkUserDependencies(userId: number): Promise<DependencyCheckResult> {
  try {
    const dependencies: DependencyCheckResult['dependencies'] = [];
    let totalDeps = 0;
    const detailParts: string[] = [];

    console.log(`[checkUserDependencies] Verificando dependencias para usuario ID: ${userId}`);

    // 1. Verificar tratamientos como instructor
    const treatmentsResp = await treatmentsService.getPaginated({
      instructor_id: userId,
      limit: 100, // Aumentamos límite para client-side filtering
      page: 1,
      fields: 'id,treatment_date,instructor_id',
      cache_bust: Date.now()
    });
    const allTreatments = Array.isArray(treatmentsResp?.data) ? treatmentsResp.data : [];

    // Filtrado client-side robusto
    const treatments = validateAndFilterDependencies(
      allTreatments,
      'instructor_id',
      userId,
      'checkUserDependencies.treatments'
    );
    const treatmentsCount = treatments.length;

    if (treatmentsCount > 0) {
      const treatmentDates = treatments.slice(0, 3).map((t: any) => {
        const date = t.treatment_date ? new Date(t.treatment_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${t.id})`;
      });
      const moreText = treatmentsCount > 3 ? ` y ${treatmentsCount - 3} más` : '';
      dependencies.push({ entity: 'Tratamientos', count: treatmentsCount, samples: treatmentDates });
      detailParts.push(`💉 **Tratamientos Realizados (${treatmentsCount})**: ${treatmentDates.join(', ')}${moreText}`);
      totalDeps += treatmentsCount;
    }

    // 2. Verificar vacunaciones como instructor
    const vaccinationsResp = await vaccinationsService.getPaginated({
      instructor_id: userId,
      limit: 100,
      page: 1,
      fields: 'id,vaccination_date,instructor_id',
      cache_bust: Date.now()
    });
    const allVaccinations = Array.isArray(vaccinationsResp?.data) ? vaccinationsResp.data : [];

    const vaccinations = validateAndFilterDependencies(
      allVaccinations,
      'instructor_id',
      userId,
      'checkUserDependencies.vaccinations'
    );
    const vaccinationsCount = vaccinations.length;

    if (vaccinationsCount > 0) {
      const vaccinationDates = vaccinations.slice(0, 3).map((v: any) => {
        const date = v.vaccination_date ? new Date(v.vaccination_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${v.id})`;
      });
      const moreText = vaccinationsCount > 3 ? ` y ${vaccinationsCount - 3} más` : '';
      dependencies.push({ entity: 'Vacunaciones', count: vaccinationsCount, samples: vaccinationDates });
      detailParts.push(`💊 **Vacunaciones Realizadas (${vaccinationsCount})**: ${vaccinationDates.join(', ')}${moreText}`);
      totalDeps += vaccinationsCount;
    }

    // 3. Verificar diagnósticos como instructor
    const diseasesResp = await animalDiseasesService.getPaginated({
      instructor_id: userId,
      limit: 100,
      page: 1,
      fields: 'id,diagnosis_date,instructor_id',
      cache_bust: Date.now()
    });
    const allDiseases = Array.isArray(diseasesResp?.data) ? diseasesResp.data : [];

    const diseases = validateAndFilterDependencies(
      allDiseases,
      'instructor_id',
      userId,
      'checkUserDependencies.diseases'
    );
    const diseasesCount = diseases.length;

    if (diseasesCount > 0) {
      const diseaseDates = diseases.slice(0, 3).map((d: any) => {
        const date = d.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${d.id})`;
      });
      const moreText = diseasesCount > 3 ? ` y ${diseasesCount - 3} más` : '';
      dependencies.push({ entity: 'Diagnósticos', count: diseasesCount, samples: diseaseDates });
      detailParts.push(`🏥 **Diagnósticos Realizados (${diseasesCount})**: ${diseaseDates.join(', ')}${moreText}`);
      totalDeps += diseasesCount;
    }

    if (totalDeps > 0) {
      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este usuario porque tiene ${totalDeps} registro(s) médico(s) asociado(s).`,
        detailedMessage: `Este usuario (instructor) tiene las siguientes dependencias que deben ser reasignadas primero:\n\n` +
          detailParts.join('\n\n') + '\n\n' +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los registros médicos a otro instructor\n` +
          `2. Los registros históricos son importantes para trazabilidad\n` +
          `3. NO se recomienda eliminar, considere desactivar el usuario\n` +
          `4. Si debe eliminar, reasigne todos los registros primero`,
        dependencies
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkUserDependencies] Error:', error);
    return { hasDependencies: false };
  }
}
