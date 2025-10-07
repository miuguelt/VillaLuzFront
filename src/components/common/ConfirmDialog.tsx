import React from "react";
import { GenericModal } from "@/components/common/GenericModal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/components/ui/cn.ts";

/**
 * ConfirmDialog: diálogo de confirmación accesible basado en GenericModal.
 *
 * Provee estructura estándar para confirmar acciones destructivas o relevantes.
 *
 * @example
 * ```tsx
 * import { ConfirmDialog } from "@/components/common/ConfirmDialog";
 *
 * function Example() {
 *   const [open, setOpen] = React.useState(false);
 *   return (
 *     <>
 *       <button onClick={() => setOpen(true)}>Eliminar</button>
 *       <ConfirmDialog
 *         open={open}
 *         onOpenChange={setOpen}
 *         title="¿Estás seguro?"
 *         description="Esta acción no se puede deshacer."
 *         confirmLabel="Confirmar"
 *         cancelLabel="Cancelar"
 *         onConfirm={() => { console.log("confirmado"); }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  cancelVariant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof GenericModal>["size"];
  className?: string;
  draggable?: boolean;
  disabled?: boolean; // Deshabilitar botón de confirmación
  // Nuevas props para advertencias detalladas
  detailedMessage?: string; // Mensaje largo con formato markdown/líneas
  showWarningIcon?: boolean; // Mostrar ícono de advertencia
  dependencies?: Array<{
    entity: string;
    count: number;
    samples?: string[];
  }>; // Lista estructurada de dependencias
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  confirmVariant = "destructive",
  cancelVariant = "outline",
  size = "sm",
  className,
  draggable = true,
  disabled = false,
  detailedMessage,
  showWarningIcon = false,
  dependencies,
}: ConfirmDialogProps) {
  // Si hay mensaje detallado o dependencias, usar tamaño más grande
  const effectiveSize = detailedMessage || dependencies ? "md" : size;
  const isDestructive = confirmVariant === "destructive";
  const modalClassName = cn(
    className,
    isDestructive ? "" : ""
  );

  return (
    <GenericModal
      isOpen={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={effectiveSize}
      className={modalClassName}
      draggable={draggable}
    >
      {/* Contenido adicional con advertencias detalladas */}
      {(showWarningIcon || detailedMessage || dependencies) && (
        <div className="mb-4 space-y-3">
          {/* Ícono de advertencia */}
          {showWarningIcon && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="font-semibold text-sm">Advertencia de Integridad Referencial</span>
            </div>
          )}

          {/* Mensaje detallado con formato preservado */}
          {detailedMessage && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 max-h-[400px] overflow-y-auto">
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                {detailedMessage.split('\n').map((line, idx) => {
                  // Detectar si es título (empieza con ** o contiene **)
                  const isBold = line.includes('**');
                  if (isBold) {
                    const parts = line.split('**');
                    return (
                      <div key={idx} className="my-1">
                        {parts.map((part, i) =>
                          i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900 dark:text-gray-100">{part}</strong> : part
                        )}
                      </div>
                    );
                  }
                  // Líneas vacías
                  if (!line.trim()) return <div key={idx} className="h-2" />;
                  // Líneas normales
                  return <div key={idx}>{line}</div>;
                })}
              </div>
            </div>
          )}

          {/* Lista estructurada de dependencias */}
          {dependencies && dependencies.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Registros Relacionados ({dependencies.reduce((sum, d) => sum + d.count, 0)} total)
              </h4>
              <ul className="space-y-2 text-sm">
                {dependencies.map((dep, idx) => (
                  <li key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        {dep.entity}: {dep.count}
                      </span>
                    </div>
                    {dep.samples && dep.samples.length > 0 && (
                      <ul className="ml-6 text-gray-600 dark:text-gray-400 text-xs space-y-0.5">
                        {dep.samples.map((sample, sIdx) => (
                          <li key={sIdx}>• {sample}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant={cancelVariant}
          onClick={() => onOpenChange(false)}
          aria-label={cancelLabel}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={() => {
            onConfirm?.();
            onOpenChange(false);
          }}
          aria-label={confirmLabel}
          disabled={disabled}
          className={cn("transition-colors duration-300", isDestructive ? "focus-visible:ring-red-500" : "")}
        >
          {isDestructive && <AlertTriangle className="mr-1.5 h-4 w-4" aria-hidden />}
          {confirmLabel}
        </Button>
      </div>
    </GenericModal>
  );
}

export default ConfirmDialog;