import type { CRUDFormField, CRUDFormSection } from '@/shared/ui/common/AdminCRUDPage';
import { getTodayColombia } from '@/shared/utils/dateUtils';

export type FieldErrors = Record<string, string>;

const isEmptyValue = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const getLength = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === 'string') return value.trim().length;
  if (Array.isArray(value)) return value.length;
  return 0;
};

export function validateField(
  field: CRUDFormField<any>,
  value: any,
  _formData: Record<string, any>
): string | null {
  const label = field.label || String(field.name);
  const isRequired = field.required === true;
  const hasValue = !isEmptyValue(value);

  if (field.type === 'checkbox') {
    if (isRequired && !value) {
      return `Debe activar ${label.toLowerCase()}.`;
    }
  } else if (isRequired && (!hasValue || (field.type === 'select' || field.type === 'searchable-select') && value === 0)) {
    if (field.type === 'select' || field.type === 'searchable-select') {
      return `Debe seleccionar ${label.toLowerCase()}.`;
    }
    return 'Este campo es obligatorio.';
  }

  if (!hasValue) return null;

  if (field.type === 'number') {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return 'Debe ingresar un valor numerico valido.';
    }
    if (field.validation?.min != null && numericValue < field.validation.min) {
      return `Debe ser mayor o igual a ${field.validation.min}.`;
    }
    if (field.validation?.max != null && numericValue > field.validation.max) {
      return `Debe ser menor o igual a ${field.validation.max}.`;
    }
  }

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'multiselect') {
    const length = getLength(value);
    if (field.validation?.min != null && length < field.validation.min) {
      return `Debe tener al menos ${field.validation.min} caracteres.`;
    }
    if (field.validation?.max != null && length > field.validation.max) {
      return `Debe tener maximo ${field.validation.max} caracteres.`;
    }
  }

  if (field.type === 'date' && String(field.name) === 'birth_date') {
    const today = getTodayColombia();
    if (typeof value === 'string' && value > today) {
      return 'La fecha de nacimiento no puede ser futura.';
    }
  }

  if (field.validation?.pattern && typeof value === 'string') {
    if (!field.validation.pattern.test(value)) {
      return field.helperText || 'Formato invalido.';
    }
  }

  if (field.validation?.custom) {
    const customResult = field.validation.custom(value);
    if (customResult) return customResult;
  }

  return null;
}

export function validateFormSections(
  sections: CRUDFormSection<any>[],
  formData: Record<string, any>
): { errors: FieldErrors; messages: string[] } {
  const errors: FieldErrors = {};
  const messages: string[] = [];

  sections.forEach((section) => {
    section.fields.forEach((field) => {
      const key = String(field.name);
      const error = validateField(field, formData[key], formData);
      if (error) {
        errors[key] = error;
        messages.push(`${field.label}: ${error}`);
      }
    });
  });

  return { errors, messages };
}
