/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/components/ui/cn.ts';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  email?: boolean;
  phone?: boolean;
  numeric?: boolean;
  min?: number;
  max?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

export interface FormValidationProps {
  errors: ValidationError[];
  className?: string;
  showSummary?: boolean;
}

// Utilidades de validación
export class FormValidator {
  static validateField(value: any, rules: ValidationRule, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validación requerido
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push({
        field: fieldName,
        message: `${fieldName} es requerido`,
        type: 'error'
      });
      return errors; // Si es requerido y está vacío, no validar otras reglas
    }
    
    // Si el valor está vacío y no es requerido, no validar otras reglas
    if (!value || value.toString().trim() === '') {
      return errors;
    }
    
    const stringValue = value.toString();
    
    // Validación de longitud mínima
    if (rules.minLength && stringValue.length < rules.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} debe tener al menos ${rules.minLength} caracteres`,
        type: 'error'
      });
    }
    
    // Validación de longitud máxima
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} no puede tener más de ${rules.maxLength} caracteres`,
        type: 'error'
      });
    }
    
    // Validación de email
    if (rules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} debe ser un email válido`,
          type: 'error'
        });
      }
    }
    
    // Validación de teléfono
    if (rules.phone) {
      const phoneRegex = /^[+]?[0-9\s\-(]{7,15}$/;
      if (!phoneRegex.test(stringValue)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} debe ser un número de teléfono válido`,
          type: 'error'
        });
      }
    }
    
    // Validación numérica
    if (rules.numeric) {
      const numericValue = parseFloat(stringValue);
      if (isNaN(numericValue)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} debe ser un número válido`,
          type: 'error'
        });
      } else {
        // Validación de valor mínimo
        if (rules.min !== undefined && numericValue < rules.min) {
          errors.push({
            field: fieldName,
            message: `${fieldName} debe ser mayor o igual a ${rules.min}`,
            type: 'error'
          });
        }
        
        // Validación de valor máximo
        if (rules.max !== undefined && numericValue > rules.max) {
          errors.push({
            field: fieldName,
            message: `${fieldName} debe ser menor o igual a ${rules.max}`,
            type: 'error'
          });
        }
      }
    }
    
    // Validación con patrón personalizado
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} no tiene el formato correcto`,
        type: 'error'
      });
    }
    
    // Validación personalizada
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        errors.push({
          field: fieldName,
          message: customError,
          type: 'error'
        });
      }
    }
    
    return errors;
  }
  
  static validateForm(data: { [key: string]: any }, rules: { [key: string]: ValidationRule }): ValidationError[] {
    const allErrors: ValidationError[] = [];
    
    Object.entries(rules).forEach(([fieldName, fieldRules]) => {
      const fieldValue = data[fieldName];
      const fieldErrors = this.validateField(fieldValue, fieldRules, fieldName);
      allErrors.push(...fieldErrors);
    });
    
    return allErrors;
  }
  
  static hasErrors(errors: ValidationError[]): boolean {
    return errors.some(error => error.type === 'error');
  }
  
  static getFieldErrors(errors: ValidationError[], fieldName: string): ValidationError[] {
    return errors.filter(error => error.field === fieldName);
  }
  
  static getErrorsByType(errors: ValidationError[], type: 'error' | 'warning' | 'info'): ValidationError[] {
    return errors.filter(error => error.type === type);
  }
}

// Componente para mostrar errores de validación
const FormValidation: React.FC<FormValidationProps> = ({ 
  errors, 
  className = "", 
  showSummary = true 
}) => {
  const errorsByType = {
    error: FormValidator.getErrorsByType(errors, 'error'),
    warning: FormValidator.getErrorsByType(errors, 'warning'),
    info: FormValidator.getErrorsByType(errors, 'info')
  };
  
  const getIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <Info className="h-4 w-4" />;
      case 'info':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };
  
  const getVariant = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'destructive';
    }
  };
  
  if (errors.length === 0) {
    return null;
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      {showSummary && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Errores de validación:
          </span>
          {errorsByType.error.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorsByType.error.length} errores
            </Badge>
          )}
          {errorsByType.warning.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {errorsByType.warning.length} advertencias
            </Badge>
          )}
        </div>
      )}
      
      {Object.entries(errorsByType).map(([type, typeErrors]) => 
        typeErrors.map((error, index) => (
          <Alert key={`${type}-${index}`} variant={getVariant(error.type as any)}>
            {getIcon(error.type)}
            <AlertDescription className="ml-2">
              <span className="font-medium">{error.field}:</span> {error.message}
            </AlertDescription>
          </Alert>
        ))
      )}
    </div>
  );
};

// Hook personalizado para validación de formularios
export const useFormValidation = (initialData: any, rules: { [key: string]: ValidationRule }) => {
  const [data, setData] = React.useState(initialData);
  const [errors, setErrors] = React.useState<ValidationError[]>([]);
  const [touched, setTouched] = React.useState<{ [key: string]: boolean }>({});
  
  const validateField = React.useCallback((fieldName: string, value: any) => {
    const fieldRules = rules[fieldName];
    if (!fieldRules) return [];
    
    return FormValidator.validateField(value, fieldRules, fieldName);
  }, [rules]);
  
  const validateForm = React.useCallback(() => {
    const allErrors = FormValidator.validateForm(data, rules);
    setErrors(allErrors);
    return allErrors;
  }, [data, rules]);
  
  const updateField = React.useCallback((fieldName: string, value: any) => {
    setData((prev: any) => ({ ...prev, [fieldName]: value }));
    
    // Validar el campo si ya ha sido tocado
    if (touched[fieldName]) {
      const fieldErrors = validateField(fieldName, value);
      setErrors(prev => [
        ...prev.filter(error => error.field !== fieldName),
        ...fieldErrors
      ]);
    }
  }, [touched, validateField]);
  
  const touchField = React.useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Validar el campo cuando se toca
    const fieldErrors = validateField(fieldName, data[fieldName]);
    setErrors(prev => [
      ...prev.filter(error => error.field !== fieldName),
      ...fieldErrors
    ]);
  }, [data, validateField]);
  
  const getFieldErrors = React.useCallback((fieldName: string) => {
    return FormValidator.getFieldErrors(errors, fieldName);
  }, [errors]);
  
  const hasFieldErrors = React.useCallback((fieldName: string) => {
    return getFieldErrors(fieldName).some(error => error.type === 'error');
  }, [getFieldErrors]);
  
  const isValid = React.useMemo(() => {
    return !FormValidator.hasErrors(errors);
  }, [errors]);
  
  const reset = React.useCallback(() => {
    setData(initialData);
    setErrors([]);
    setTouched({});
  }, [initialData]);
  
  return {
    data,
    errors,
    touched,
    isValid,
    updateField,
    touchField,
    validateForm,
    getFieldErrors,
    hasFieldErrors,
    reset
  };
};

export default FormValidation;

// Componente para mostrar errores de campo específico
export const FieldError: React.FC<{ 
  errors: ValidationError[]; 
  fieldName: string; 
  className?: string; 
}> = ({ errors, fieldName, className = "" }) => {
  const fieldErrors = FormValidator.getFieldErrors(errors, fieldName);
  
  if (fieldErrors.length === 0) {
    return null;
  }
  
  return (
    <div className={cn("mt-1 space-y-1", className)}>
      {fieldErrors.map((error, index) => (
        <p 
          key={index} 
          className={cn(
            "text-xs",
            error.type === 'error' ? 'text-destructive' : 
            error.type === 'warning' ? 'text-yellow-600' : 
            'text-blue-600'
          )}
        >
          {error.message}
        </p>
      ))}
    </div>
  );
};

// Reglas de validación predefinidas
export const ValidationRules = {
  required: { required: true },
  email: { required: true, email: true },
  phone: { required: true, phone: true },
  password: { required: true, minLength: 8 },
  identification: { required: true, numeric: true, minLength: 6 },
  name: { required: true, minLength: 2, maxLength: 100 },
  address: { required: true, minLength: 5, maxLength: 200 },
  weight: { required: true, numeric: true, min: 0 },
  capacity: { required: true, numeric: true, min: 1 },
  area: { required: true, numeric: true, min: 0.1 }
};