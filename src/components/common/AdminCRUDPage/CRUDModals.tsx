/*
 * CRUDModals
 * 
 * Componentes optimizados para los modales de CRUD.
 * Implementa modales de detalle y confirmación con mejor UX.
 */

import React, { memo, useCallback } from 'react';
import { GenericModal } from '@/components/common/GenericModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Edit, Eye } from 'lucide-react';
import { cn } from '@/components/ui/cn.ts';
import { useT } from '@/i18n';

// Interfaces
import { CRUDConfig } from '../AdminCRUDPage';

// Subcomponente para el modal de detalle
function DetailModalComponent<T extends { id: number }>({
  isOpen,
  onOpenChange,
  title,
  item,
  config,
  onEdit,
  customDetailContent,
  showDetailTimestamps = true,
  detailIndex,
  setDetailIndex,
  items,
  setDetailItem,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  item: T | null;
  config: CRUDConfig<T, any>;
  onEdit?: (item: T) => void;
  customDetailContent?: (item: T, navigateToItem?: (item: T) => void) => React.ReactNode;
  showDetailTimestamps?: boolean;
  showIdInDetailTitle?: boolean;
  detailIndex: number | null;
  setDetailIndex: (index: number | null) => void;
  items: T[];
  setDetailItem: (item: T | null) => void;
}) {
  const t = useT();
  
  // Manejar navegación entre elementos
  const handleNextDetail = useCallback(() => {
    if (!items?.length || detailIndex === null) return;
    const nextIndex = (detailIndex + 1) % items.length;
    setDetailIndex(nextIndex);
    setDetailItem(items[nextIndex]);
  }, [items, detailIndex, setDetailIndex, setDetailItem]);
  
  const handlePrevDetail = useCallback(() => {
    if (!items?.length || detailIndex === null) return;
    const prevIndex = (detailIndex - 1 + items.length) % items.length;
    setDetailIndex(prevIndex);
    setDetailItem(items[prevIndex]);
  }, [items, detailIndex, setDetailIndex, setDetailItem]);
  
  // Mapa de etiquetas para llaves foráneas
  const fkLabelMap = React.useMemo(() => {
    const map: Record<string, Map<string, string>> = {};
    try {
      (config.formSections || []).forEach((section) => {
        (section.fields || []).forEach((field) => {
          if ((field.type === 'select' || field.type === 'searchable-select') && field.options && field.options.length) {
            const m = new Map<string, string>();
            field.options.forEach((opt) => {
              m.set(String(opt.value), opt.label);
            });
            map[String(field.name)] = m;
          }
        });
      });
    } catch (e) {
      console.warn('[DetailModal] Error construyendo mapa de etiquetas', e);
    }
    return map;
  }, [config.formSections]);
  
  // Footer con navegación y acciones
  const footer = (
    <div className="relative border-t-2 border-primary/20 bg-gradient-to-br from-primary/10 via-muted/50 to-muted/40 shadow-[0_-2px_8px_rgba(0,0,0,0.1),0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md px-5 sm:px-6 py-2.5 sm:py-3">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex gap-2 sm:flex-1">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handlePrevDetail}
            disabled={!items || items.length <= 1}
            className="flex-1 sm:flex-initial transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 font-semibold border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            <ChevronLeft className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleNextDetail}
            disabled={!items || items.length <= 1}
            className="flex-1 sm:flex-initial transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 font-semibold border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4 sm:ml-1.5" />
          </Button>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => { onOpenChange(false); setDetailIndex(null); }}
            className="flex-1 sm:flex-initial transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 font-semibold border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            {t('modal.close', 'Cerrar')}
          </Button>
          {item && onEdit && (
            <Button
              size="sm"
              type="button"
              onClick={() => { onEdit(item); onOpenChange(false); setDetailIndex(null); }}
              className="flex-1 sm:flex-initial transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            >
              <Edit className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('common.edit', 'Editar')}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
  
  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      size="4xl"
      variant="compact"
      allowFullScreenToggle
      enableBackdropBlur
      className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out max-h-[90vh]"
      footer={footer}
    >
      {item && (
        customDetailContent ? (
          customDetailContent(item, (newItem) => {
            const idx = items.findIndex((i) => i.id === newItem.id);
            if (idx >= 0) {
              setDetailIndex(idx);
              setDetailItem(newItem);
            }
          })
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-border rounded-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Información general</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm min-w-0">
                    {config.columns.map((col, _colIndex) => (
                      <div key={String(col.key)} className="space-y-1 min-w-0">
                        <dt className="text-xs text-muted-foreground font-medium">{col.label}</dt>
                        <dd className="text-sm font-medium text-foreground break-words whitespace-normal leading-snug min-w-0">
                          {col.render
                            ? col.render((item as any)[col.key], item, 0)
                            : (() => {
                                const raw = (item as any)[col.key];
                                const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                                return mapped ?? String(raw ?? '-');
                              })()}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4 min-w-0">
              {showDetailTimestamps && ((item as any).created_at || (item as any).updated_at) && (
                <Card className="shadow-sm border border-border rounded-xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fecha y hora</CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0">
                    <dl className="grid grid-cols-1 gap-3 text-sm">
                      {(item as any).created_at && (
                        <div className="space-y-1 min-w-0">
                          <dt className="text-xs text-muted-foreground font-medium">Creado</dt>
                          <dd className="text-sm font-medium break-words whitespace-normal leading-snug">
                            {new Date((item as any).created_at).toLocaleString('es-ES')}
                          </dd>
                        </div>
                      )}
                      {(item as any).updated_at && (
                        <div className="space-y-1 min-w-0">
                          <dt className="text-xs text-muted-foreground font-medium">Actualizado</dt>
                          <dd className="text-sm font-medium break-words whitespace-normal leading-snug">
                            {new Date((item as any).updated_at).toLocaleString('es-ES')}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )
      )}
    </GenericModal>
  );
}

export const DetailModal = DetailModalComponent;

// Subcomponente para el diálogo de confirmación de eliminación
export const ConfirmDeleteDialog = memo<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel: string;
  entityName: string;
}>(({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel,
  cancelLabel,
  entityName,
}) => {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      confirmVariant="destructive"
      size="sm"
    />
  );
});

ConfirmDeleteDialog.displayName = 'ConfirmDeleteDialog';

// Objeto que exporta todos los modales
export const CRUDModals = {
  DetailModal,
  ConfirmDeleteDialog,
};

export default CRUDModals;