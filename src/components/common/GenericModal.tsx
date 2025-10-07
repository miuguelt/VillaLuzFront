/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/components/ui/cn.ts';

// Interfaces y tipos
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

interface GenericModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: ModalSize;
  enableBackdropBlur?: boolean;
  description?: string;
  disableAnimations?: boolean;
  draggable?: boolean;
}

// Mapeo de tamaños a clases Tailwind (aplica principalmente en ≥sm)
const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-3xl',
  '3xl': 'sm:max-w-4xl',
  '4xl': 'sm:max-w-5xl',
  '5xl': 'sm:max-w-6xl',
  '6xl': 'sm:max-w-7xl',
  '7xl': 'sm:max-w-[90vw]',
  full: 'sm:max-w-[95vw]',
};

/**
 * Componente GenericModal optimizado para rendimiento y accesibilidad.
 * 
 * Este componente proporciona una interfaz modal reutilizable con las siguientes optimizaciones:
 * - **Rendimiento**: Animaciones condicionales y desenfoque de fondo opcional
 * - **Accesibilidad**: Soporte para descripciones ARIA y navegación por teclado
 * - **Responsividad**: Tamaños adaptativos para diferentes dispositivos
 * - **Mantenibilidad**: Sistema de clases centralizado y props bien tipadas
 * 
 * @example
 * ```tsx
 * <GenericModal
 *   isOpen={isModalOpen}
 *   onOpenChange={setIsModalOpen}
 *   title="Crear Usuario"
 *   size="lg"
 *   enableBackdropBlur={true}
 *   description="Formulario para crear un nuevo usuario en el sistema"
 * >
 *   <UserForm />
 * </GenericModal>
 * ```
 * 
 * @param props - Las propiedades del componente
 * @returns El componente modal renderizado
 */
export const GenericModal: React.FC<GenericModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  children,
  className,
  size = 'lg',
  description,
  disableAnimations = false,
  enableBackdropBlur = true,
  draggable = false,
}) => {
  const overlayClasses = enableBackdropBlur
    ? '!bg-black/80 backdrop-blur-md sm:backdrop-blur-lg transition-all duration-300'
    : '!bg-black/75 transition-all duration-300';

  // IDs estables para accesibilidad
  const titleId = React.useId();
  const descriptionId = React.useId();

  // Estados para drag & drop
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Reset position when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggable || !dialogRef.current) return;

    const rect = dialogRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - position.x,
      y: e.clientY - rect.top - position.y,
    });
    setIsDragging(true);
  };

  React.useEffect(() => {
    if (!isDragging || !draggable) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dialogRef.current) return;

      const rect = dialogRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, draggable]);

  // Clases base responsive con diseño futurista optimizado
  const modalClasses = cn(
    // Mobile-first: pantalla completa con diseño optimizado
    'w-full h-dvh max-h-dvh rounded-none p-3 overflow-hidden',
    // ≥sm: modal flotante con diseño futurista
    'sm:w-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:p-6 md:p-8',
    // Diseño futurista con glassmorphism y sombras profundas
    'bg-gradient-to-br from-background/98 via-card/96 to-muted/90',
    'backdrop-blur-xl backdrop-saturate-150',
    'border border-border/50 shadow-2xl',
    // Sombra múltiple para efecto de elevación
    'shadow-[0_8px_32px_rgba(0,0,0,0.12),0_24px_48px_rgba(0,0,0,0.18),0_0_1px_rgba(255,255,255,0.1)_inset]',
    // Ring con gradiente para borde luminoso
    'ring-1 ring-primary/20',
    'dark:ring-primary/30 dark:shadow-[0_8px_32px_rgba(0,0,0,0.32),0_24px_64px_rgba(0,0,0,0.48)]',
    // Ancho máximo en ≥sm según size
    sizeClasses[size],
    // Transiciones suaves
    !disableAnimations && 'transition-all duration-300 ease-out',
    // Evitar overflow horizontal
    'overflow-x-hidden',
    // Texto optimizado
    'text-card-foreground',
    className
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        className={cn(modalClasses)}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        overlayClassName={overlayClasses}
        style={draggable ? {
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
        } : undefined}
      >
        <DialogHeader
          className={cn(
            "relative -mx-6 sm:-mx-8 px-4 sm:px-6 py-2 sm:py-2.5 bg-muted/30 border-b border-border/40",
            draggable && "cursor-grab active:cursor-grabbing select-none"
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Decoración superior futurista */}
          <div className="absolute -top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <DialogTitle id={titleId} className={cn(
            "text-base sm:text-lg md:text-xl font-semibold leading-tight text-left",
            "text-foreground/90",
            "pb-0",
            !title && "sr-only"
          )}>
            {title || "Modal"}
          </DialogTitle>

          {description && (
            <DialogDescription id={descriptionId} className={cn(
              "text-xs sm:text-sm text-muted-foreground/90 leading-relaxed mt-0.5",
              {"sr-only": !description}
            )}>
              {description || "Modal Description"}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Contenedor interno con scroll optimizado */}
        <div className={cn(
          "min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain",
          "max-h-[calc(100dvh-140px)] sm:max-h-[calc(92vh-140px)]",
          "px-1 pb-2 sm:pb-2 mt-2 sm:mt-3",
          // Scrollbar personalizado
          "scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
          "hover:scrollbar-thumb-primary/30"
        )}>
          {/* Panel de contenido con glassmorphism */}
          <div className={cn(
            "relative rounded-2xl",
            "border border-border/40",
            "bg-gradient-to-br from-card/50 via-card/30 to-muted/40",
            "backdrop-blur-sm",
            // Sombras internas para profundidad
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_20px_50px_-20px_rgba(0,0,0,0.3)]",
            // Ring sutil
            "ring-1 ring-white/5",
            // Transición suave
            "transition-all duration-300"
          )}>
            {/* Brillo sutil en la parte superior */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-t-2xl" />

            <div className="p-3 sm:p-4 md:p-6">
              {children}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook para controlar el estado de apertura y cierre del modal de manera integrada.
 * 
 * @returns Objeto con isOpen, onOpen, onClose y onOpenChange
 */
export const useUnifiedDisclosure = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: (open: boolean) => setIsOpen(open),
  } as const;
};
