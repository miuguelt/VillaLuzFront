/*
 * CRUDForm
 * 
 * Componente optimizado para formularios de creación/edición.
 * Implementa validación eficiente y mejor experiencia de usuario.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Combobox } from '@/shared/ui/combobox';
import { cn } from '@/shared/ui/cn.ts';
import { Loader2 } from 'lucide-react';
import { useT } from '@/shared/i18n';
import { getTodayColombia } from '@/shared/utils/dateUtils';

// Interfaces
import { CRUDFormField, CRUDFormSection } from '../AdminCRUDPage';

interface CRUDFormProps<T extends { id?: number }> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  formSections: CRUDFormSection<any>[];
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  editingItem?: T | null;
  showEditTimestamps?: boolean;
}

// Componente memoizado para cada campo del formulario
const FormField = memo<{
  field: CRUDFormField<any>;
  value: any;
  onChange: (value: any) => void;
  saving: boolean;
  editingItem?: any;
}>(({ field, value, onChange, saving, editingItem }) => {
  const t = useT();

  // Variables derivadas frecuentes usadas en diferentes ramas
  const isBirthDateField = String(field.name) === 'birth_date';
  const today = getTodayColombia();

  // Determinar si el campo es obligatorio y está vacío
  const isRequired = field.required === true;
  const isEmpty = value == null || value === '';
  const showWarning = isRequired && isEmpty;

  // Manejar cambio de valor
  const handleChange = useCallback((newValue: any) => {
    onChange(newValue);
  }, [onChange]);

  // Renderizar campo según tipo
  const renderField = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={String(field.name)}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            disabled={saving}
            aria-invalid={showWarning}
            aria-required={isRequired}
            className={cn(
              "w-full min-h-[80px] resize-none text-sm",
              showWarning
                ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500"
                : "border-border/50 focus:border-primary/50",
              isRequired && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40",
              "bg-background/50 focus:bg-background/80",
              "transition-all duration-300",
              "backdrop-blur-sm"
            )}
          />
        );

      case 'select':
        if (!field.options || field.options.length === 0) {
          return (
            <div className="text-sm text-muted-foreground">
              No hay opciones disponibles
            </div>
          );
        }

        {
          const opts = field.options || [];
          const isNumeric = opts.length > 0 && opts.every((o: any) => typeof o.value === 'number');

          return (
            <select
              id={String(field.name)}
              value={String(value ?? '')}
              onChange={(e) => {
                const val = e.target.value;
                handleChange(
                  isNumeric ? (val === '' ? undefined : Number(val)) : val
                );
              }}
              disabled={saving}
              aria-required={isRequired}
              className={cn(
                "w-full px-3 py-2.5 border rounded-lg min-h-[44px] text-sm",
                "bg-background/50 focus:bg-background/80",
                "transition-all duration-200",
                "backdrop-blur-sm",
                "cursor-pointer",
                showWarning
                  ? "border-amber-400/70 focus:border-amber-500 hover:border-amber-500/50 text-amber-900 dark:text-amber-200"
                  : "border-border/50 focus:border-primary/50 text-foreground hover:border-primary/30",
                isRequired && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40"
              )}
            >
              <option value="" className="text-muted-foreground">
                {field.placeholder || 'Seleccionar...'}
              </option>
              {opts.map((option: any) => (
                <option key={String(option.value)} value={String(option.value)} className="text-foreground">
                  {option.label}
                </option>
              ))}
            </select>
          );
        }

      case 'searchable-select':
        if (!field.options || field.options.length === 0) {
          return (
            <div className="text-sm text-muted-foreground">
              No hay opciones disponibles
            </div>
          );
        }

        {
          let opts = field.options || [];
          const isNumeric = opts.length > 0 && opts.every((o: any) => typeof o.value === 'number');

          // Excluir el propio registro si se solicita
          if (field.excludeSelf && editingItem?.id != null) {
            opts = opts.filter((o: any) => o.value !== editingItem.id);
          }

          return (
            <div className={cn(
              isRequired && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40 rounded-l-sm"
            )}>
              <Combobox
                options={opts.map((o) => ({ value: String(o.value), label: o.label }))}
                value={value == null ? '' : String(value)}
                onValueChange={(val) =>
                  handleChange(
                    isNumeric ? (val === '' ? undefined : Number(val)) : val
                  )
                }
                placeholder={field.placeholder || t('common.search', 'Buscar...')}
                searchPlaceholder={t('common.search', 'Buscar...')}
                emptyMessage={field.emptyMessage || t('state.empty.title', 'Sin resultados')}
                disabled={saving}
                loading={field.loading}
                searchDebounceMs={field.searchDebounceMs || 300}
                onSearchChange={field.onSearchChange}
                className={cn(
                  "transition-all duration-200",
                  field.loading && "opacity-80",
                  !opts.length && !field.loading && "opacity-60"
                )}
              />
            </div>
          );
        }

      case 'checkbox':
        return (
          <div className="flex items-start space-x-2 mt-1">
            <input
              id={String(field.name)}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleChange(e.target.checked)}
              disabled={saving}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5 flex-shrink-0"
            />
            <label htmlFor={String(field.name)} className="text-sm font-medium text-foreground leading-relaxed">
              {field.label}
            </label>
          </div>
        );

      case 'number':
        return (
          <Input
            id={String(field.name)}
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            disabled={saving}
            aria-invalid={showWarning}
            aria-required={isRequired}
            className={cn(
              "w-full min-h-[44px] text-sm",
              showWarning
                ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500"
                : "border-border/50 focus:border-primary/50",
              isRequired && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40",
              "bg-background/50 focus:bg-background/80",
              "transition-all duration-300 backdrop-blur-sm"
            )}
          />
        );

      case 'date':
        {
          const maxDate = isBirthDateField ? today : undefined;

          return (
            <Input
              id={String(field.name)}
              type="date"
              max={maxDate}
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              disabled={saving}
              aria-invalid={showWarning}
              aria-required={isRequired}
              className={cn(
                "w-full min-h-[44px] text-sm",
                showWarning
                  ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500"
                  : "border-border/50 focus:border-primary/50",
                isRequired && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40",
                "bg-background/50 focus:bg-background/80",
                "transition-all duration-300 backdrop-blur-sm"
              )}
            />
          );
        }

      case 'text':
      case 'multiselect':
      default:
        return (
          <Input
            id={String(field.name)}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={saving}
            aria-invalid={showWarning}
            aria-required={isRequired}
            className={cn(
              "w-full min-h-[44px] text-sm",
              showWarning
                ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500"
                : "border-border/50 focus:border-primary/50",
              isRequired && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40",
              "bg-background/50 focus:bg-background/80",
              "transition-all duration-300 backdrop-blur-sm"
            )}
          />
        );
    }
  };

  return (
    <div className={cn('w-full space-y-2 group', field.colSpan && field.colSpan > 1 && 'sm:col-span-2')}>
      <label htmlFor={String(field.name)} className={cn(
        "block text-xs sm:text-sm font-medium",
        "text-foreground/90 group-hover:text-foreground",
        "transition-colors duration-200",
        "flex items-center gap-1.5"
      )}>
        <span>{field.label}</span>
        {isRequired && (
          <span className="text-red-600 dark:text-red-400 font-extrabold text-base" title="Campo obligatorio">*</span>
        )}
      </label>

      {isRequired && (
        <p className="text-[10px] sm:text-xs text-muted-foreground/70 -mt-1 mb-1 flex items-center gap-1">
          <span className="text-red-500 dark:text-red-400">●</span>
          <span>Campo obligatorio</span>
        </p>
      )}

      <div className="space-y-1">
        {renderField()}

        {showWarning && field.type !== 'checkbox' && (
          <p className="text-xs text-[#f59e0b]">Este campo es obligatorio.</p>
        )}

        {field.type === 'date' && isBirthDateField && value && value > today && (
          <p className="text-xs text-red-500">La fecha de nacimiento no puede ser futura.</p>
        )}

        {/* Helper text - Renderizado después de los inputs y antes del mensaje de error amarillo */}
        {field.helperText && (
          <p className="text-[11px] text-muted-foreground/80 italic mt-0.5">{field.helperText}</p>
        )}
      </div>
    </div>
  );
});

export function CRUDForm<T extends { id?: number }>({
  isOpen,
  onOpenChange,
  title,
  formData,
  setFormData,
  formSections,
  onSubmit,
  saving,
  editingItem,
  showEditTimestamps = true,
}: CRUDFormProps<T>) {
  const t = useT();

  // Manejar cambio de un campo específico
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  }, [setFormData]);

  // Renderizar secciones del formulario
  const renderFormSections = useMemo(() => {
    return formSections.map((section, sectionIndex) => {
      const gridCols = section.gridCols ?? 3;
      const gridClass = `grid grid-cols-1 ${gridCols >= 2 ? 'sm:grid-cols-2' : ''} ${gridCols >= 3 ? 'lg:grid-cols-3' : ''} gap-3 sm:gap-4 lg:gap-5`;

      return (
        <div key={section.title || sectionIndex} className={cn(
          "relative rounded-xl p-3 sm:p-4",
          "border border-border/40",
          "bg-gradient-to-br from-card/30 via-card/20 to-transparent",
          "shadow-sm backdrop-blur-sm",
          "transition-all duration-300"
        )}>
          {section.title && (
            <div className="mb-3 sm:mb-4 pb-2 border-b border-border/30">
              <h3 className={cn(
                "text-base sm:text-lg font-semibold",
                "bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent",
                "flex items-center gap-2"
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {section.title}
              </h3>
            </div>
          )}

          <div className={gridClass}>
            {section.fields.map((field) => (
              <FormField
                key={String(field.name)}
                field={field}
                value={formData[field.name as string]}
                onChange={(value) => handleFieldChange(String(field.name), value)}
                saving={saving}
                editingItem={editingItem}
              />
            ))}
          </div>
        </div>
      );
    });
  }, [formSections, formData, saving, editingItem, handleFieldChange]);

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      size="5xl"
      variant="compact"
      allowFullScreenToggle
      enableBackdropBlur
      className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out max-h-[90vh]"
    >
      <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4 h-full flex flex-col text-[13px] sm:text-sm">
        {renderFormSections}

        {editingItem && showEditTimestamps && (
          <div className={cn(
            "mt-2 p-3 sm:p-4 rounded-lg",
            "bg-muted/30 border border-border/40",
            "text-xs sm:text-sm text-muted-foreground",
            "backdrop-blur-sm"
          )}>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span><strong className="text-foreground/80">ID:</strong> {editingItem.id}</span>
              {(editingItem as any).created_at && (
                <span><strong className="text-foreground/80">Creado:</strong> {new Date((editingItem as any).created_at).toLocaleDateString('es-ES')}</span>
              )}
              {(editingItem as any).updated_at && (
                <span><strong className="text-foreground/80">Actualizado:</strong> {new Date((editingItem as any).updated_at).toLocaleDateString('es-ES')}</span>
              )}
            </div>
          </div>
        )}

        <div className={cn(
          "flex flex-col sm:flex-row gap-3 pt-4 mt-auto",
          "sticky bottom-0 -mx-4 -mb-4 p-4 sm:-mx-6 sm:-mb-6 sm:p-6",
          "bg-gradient-to-t from-card/95 to-card/50",
          "backdrop-blur-md border-t border-border/40"
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className={cn(
              "w-full sm:flex-1",
              "h-11 sm:h-12",
              "border-border/50 hover:border-border",
              "hover:bg-accent/50",
              "transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.02]",
              "active:scale-[0.98]"
            )}
          >
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className={cn(
              "w-full sm:flex-1",
              "h-11 sm:h-12",
              "bg-primary hover:bg-primary/90",
              "shadow-lg shadow-primary/20",
              "hover:shadow-xl hover:shadow-primary/30",
              "transition-all duration-200",
              "hover:scale-[1.02]",
              "active:scale-[0.98]",
              saving && "opacity-80 cursor-not-allowed"
            )}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.saving', 'Guardando...')}
              </span>
            ) : (
              editingItem ? t('common.update', 'Actualizar') : t('common.create', 'Crear')
            )}
          </Button>
        </div>
      </form>
    </GenericModal>
  );
}

export default CRUDForm;