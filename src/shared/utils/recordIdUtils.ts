const CANDIDATE_KEYS = [
  'id',
  'record_id',
  'recordId',
  'relation_id',
  'relationId',
  'pivot_id',
  'pivotId',
  // Específicos de algunas tablas
  'genetic_improvement_id',
  'animal_disease_id',
  'animal_field_id',
  'vaccination_id',
  'treatment_id',
  'control_id',
];

/**
 * Intenta resolver el identificador único de un registro recibido desde el backend
 * teniendo en cuenta las múltiples variantes de nombre utilizadas por las tablas.
 */
export function resolveRecordId(item: any): number | string | null {
  if (!item || typeof item !== 'object') return null;

  for (const key of CANDIDATE_KEYS) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return null;
}
