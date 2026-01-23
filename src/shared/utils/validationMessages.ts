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
  fieldErrors: Record<string, any> | any[],
  sections: CRUDFormSection<any>[]
): { errors: FieldErrors; messages: string[] } {
  const labelMap = buildFieldLabelMap(sections);
  const errors: FieldErrors = {};
  const messages: string[] = [];

  // Convert empty/null to empty object
  const rawErrors = fieldErrors || {};

  // Case 1: Array of errors (e.g., duplicated unique constraint)
  if (Array.isArray(rawErrors)) {
    rawErrors.forEach((errorObj, index) => {
      // If it's a string, try to map it by content
      if (typeof errorObj === 'string') {
        const mapped = attemptToMapMessageToField(errorObj, labelMap);
        if (mapped.field) {
          errors[mapped.field] = errorObj;
          messages.push(mapped.label ? `${mapped.label}: ${errorObj}` : errorObj);
        } else {
          messages.push(errorObj);
        }
      }
      // If it's an object, check for field/msg pattern
      else if (typeof errorObj === 'object' && errorObj !== null) {
        const field = errorObj.field || errorObj.attr || errorObj.name || String(index);
        const msg = errorObj.message || errorObj.msg || JSON.stringify(errorObj);
        const label = labelMap[String(field)] || String(field);

        errors[String(field)] = msg;
        messages.push(`${label}: ${msg}`);
      }
    });
  }
  // Case 2: Object with field keys
  else {
    Object.entries(rawErrors).forEach(([field, raw]) => {
      const label = labelMap[String(field)] || String(field);
      const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);

      // Special check: If field is numeric string (like "0"), it usually means an array index was wrongly mapped
      // Attempt to map by message content in this case
      if (/^\d+$/.test(field)) {
        const mapped = attemptToMapMessageToField(msg, labelMap);
        if (mapped.field) {
          errors[mapped.field] = msg;
          messages.push(`${mapped.label}: ${msg}`);
          return;
        }
      }

      errors[String(field)] = msg;
      messages.push(`${label}: ${msg}`);
    });
  }

  return { errors, messages };
}

/**
 * Helper to attempt mapping an error message to a field by looking for field names in quotes
 * e.g., "El valor 'Bovino' ya existe para el campo 'name'" -> maps to field 'name'
 */
function attemptToMapMessageToField(
  message: string,
  labelMap: Record<string, string>
): { field?: string; label?: string } {
  // Pattern to look for 'field' or 'campo' followed by the name in quotes or backticks
  // Also looks for just the name in quotes/backticks
  const fieldNames = Object.keys(labelMap);

  for (const name of fieldNames) {
    // Exact match in quotes/backticks
    const regex = new RegExp(`['"\`]${name}['"\`]`, 'i');
    if (regex.test(message)) {
      return { field: name, label: labelMap[name] };
    }

    // Try mapping by label too
    const label = labelMap[name];
    if (label && label.length > 2) {
      const labelRegex = new RegExp(`['"\`]${label}['"\`]`, 'i');
      if (labelRegex.test(message)) {
        return { field: name, label };
      }
    }
  }

  return {};
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
