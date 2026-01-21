import type { FieldErrors } from '@/shared/utils/formValidation';
import type { CRUDFormField, CRUDFormSection } from '@/shared/ui/common/AdminCRUDPage';

export function buildFieldLabelMap(sections: CRUDFormSection<any>[]): Record<string, string> {
  const map: Record<string, string> = {};
  (sections || []).forEach((section) => {
    (section.fields || []).forEach((field) => {
      map[String(field.name)] = field.label || String(field.name);
    });
  });
  return map;
}

export function mapBackendFieldErrorsToLabels(
  fieldErrors: Record<string, any>,
  sections: CRUDFormSection<any>[]
): { errors: FieldErrors; messages: string[] } {
  const labelMap = buildFieldLabelMap(sections);
  const errors: FieldErrors = {};
  const messages: string[] = [];

  Object.entries(fieldErrors || {}).forEach(([field, raw]) => {
    const label = labelMap[String(field)] || String(field);
    const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);
    errors[String(field)] = msg;
    messages.push(`${label}: ${msg}`);
  });

  return { errors, messages };
}

export function formatValidationToastMessage(messages: string[], maxItems = 3): string {
  if (!Array.isArray(messages) || messages.length === 0) return 'Errores de validacion. Revisa los campos.';
  const preview = messages.slice(0, maxItems).join(' | ');
  const suffix = messages.length > maxItems ? ` y ${messages.length - maxItems} mas` : '';
  return `Faltan datos o hay errores. Corrija: ${preview}${suffix}`;
}

export function formatRequiredHint(field: CRUDFormField<any>): string {
  if (!field.required) return '';
  if (field.type === 'select' || field.type === 'searchable-select') {
    return `Debe seleccionar ${String(field.label || field.name).toLowerCase()}.`;
  }
  return 'Este campo es obligatorio.';
}

export function buildConflictMessage(
  details: any,
  sections: CRUDFormSection<any>[]
): { message: string; field?: string } {
  const labelMap = buildFieldLabelMap(sections);
  const valErrors =
    details?.validation_errors ||
    details?.errors ||
    undefined;
  if (valErrors && typeof valErrors === 'object') {
    const entries = Object.entries(valErrors);
    if (entries.length > 0) {
      const [firstField, raw] = entries[0];
      const label = labelMap[String(firstField)] || String(firstField);
      const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);
      const message = `${label}: ${msg}. Cambie el valor o seleccione otro.`;
      return { message, field: String(firstField) };
    }
  }
  const errStr: string | undefined =
    typeof details?.error === 'string' ? details.error :
    typeof details === 'string' ? details :
    undefined;
  if (errStr) {
    const m = /Duplicate entry '([^']+)' for key '([^']+)'/i.exec(errStr);
    if (m) {
      const value = m[1];
      const key = m[2];
      const field = key.includes('.') ? key.split('.').pop() : key;
      const label = labelMap[String(field || '')] || String(field || 'campo');
      const message = `El ${label} "${value}" ya existe. Cambie el valor o seleccione otro.`;
      return { message, field: field ? String(field) : undefined };
    }
  }
  const fallback = typeof details?.error === 'string' ? details.error : '';
  const message = fallback && fallback.trim().length
    ? `${fallback}. Cambie el valor o seleccione otro.`
    : 'Violación de unicidad. Cambie el valor o seleccione otro.';
  return { message };
}
