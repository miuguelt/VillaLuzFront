/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/components/ui/cn.ts';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  variant?: 'default' | 'compact';
  fullScreen?: boolean;
  allowFullScreenToggle?: boolean;
  onFullScreenChange?: (next: boolean) => void;
  footer?: React.ReactNode;
  // Navegación entre items
  enableNavigation?: boolean;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
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
  variant = 'default',
  fullScreen = false,
  allowFullScreenToggle = false,
  onFullScreenChange,
  footer,
  enableNavigation = false,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const overlayClasses = enableBackdropBlur
    ? '!bg-black/80 backdrop-blur-md sm:backdrop-blur-lg motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none'
    : '!bg-black/75 motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none';

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

  // Manejador de navegación por teclado
  React.useEffect(() => {
    if (!isOpen || !enableNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo manejar si el foco está dentro del modal
      if (!dialogRef.current?.contains(document.activeElement)) return;

      if (e.key === 'ArrowLeft' && hasPrevious && onNavigatePrevious) {
        e.preventDefault();
        onNavigatePrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enableNavigation, hasPrevious, hasNext, onNavigatePrevious, onNavigateNext]);

  // Clases base responsive con diseño futurista optimizado
  const [fsInternal, setFsInternal] = React.useState<boolean>(fullScreen);
  React.useEffect(() => {
    setFsInternal(fullScreen);
  }, [fullScreen]);

  const computedFullScreen = allowFullScreenToggle ? fsInternal : fullScreen;

  const modalClasses = cn(
    // Mobile-first: pantalla completa con diseño optimizado
    'w-full h-dvh max-h-dvh rounded-none overflow-hidden',
    // IMPORTANTE: Sobrescribir el padding por defecto del DialogContent
    '!p-0 !gap-0',
    // Safe areas para dispositivos con notch
    'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
    // ≥sm: modal flotante con altura automática que se ajusta al contenido
    'sm:w-full sm:h-auto',
    computedFullScreen ? 'sm:h-[98vh] sm:max-h-[98vh] sm:rounded-none sm:p-0' : 'sm:max-h-[95vh] sm:rounded-2xl sm:p-0',
    // Diseño futurista con glassmorphism y sombras profundas
    'bg-gradient-to-br from-background/98 via-card/96 to-muted/90',
    'backdrop-blur-xl backdrop-saturate-150',
    'border-2 border-border/60 shadow-2xl',
    // Sombra múltiple para efecto de elevación y profundidad
    'shadow-[0_10px_40px_rgba(0,0,0,0.15),0_30px_60px_rgba(0,0,0,0.25),0_0_2px_rgba(255,255,255,0.1)_inset]',
    // Ring con gradiente para borde luminoso más pronunciado
    'ring-2 ring-primary/30',
    'dark:ring-primary/40 dark:shadow-[0_10px_40px_rgba(0,0,0,0.4),0_30px_80px_rgba(0,0,0,0.6)]',
    // Ancho máximo en ≥sm según size
    sizeClasses[size],
    // Transiciones suaves
    !disableAnimations && 'motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none',
    // Evitar overflow horizontal y vertical (se maneja en el contenedor interno)
    'overflow-hidden flex flex-col',
    // Texto optimizado
    'text-card-foreground',
    variant === 'compact' && 'max-[360px]:text-xs',
    className
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        className={cn(modalClasses)}
        overlayClassName={overlayClasses}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={draggable ? {
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
        } : undefined}
      >
        <DialogHeader
          className={cn(
            "relative bg-gradient-to-br from-primary/10 via-muted/50 to-muted/40",
            "border-b border-primary/20",
            "shadow-sm",
            // Más espacio a la derecha cuando hay botón de pantalla completa
            variant === 'compact'
              ? allowFullScreenToggle ? "px-4 sm:px-5 py-1.5 pr-16 sm:pr-20" : "px-4 sm:px-5 py-1.5 pr-10 sm:pr-11"
              : allowFullScreenToggle ? "px-5 sm:px-6 py-2 pr-16 sm:pr-20" : "px-5 sm:px-6 py-2 pr-10 sm:pr-11",
            draggable && "cursor-grab active:cursor-grabbing select-none"
          )}
          onMouseDown={handleMouseDown}
        >

          <div className="flex items-center gap-2 min-w-0">
            {title ? (
              <DialogTitle
                id={titleId}
                className={cn(
                  "text-sm sm:text-base font-semibold leading-none text-left",
                  "text-foreground",
                  "flex items-center gap-2 flex-1 min-w-0"
                )}
              >
                <div className="flex-shrink-0 w-1 h-4 rounded-full bg-primary" />
                <span className="flex-1 min-w-0 truncate">{title}</span>
              </DialogTitle>
            ) : (
              <VisuallyHidden>
                <DialogTitle id={titleId}>Modal</DialogTitle>
              </VisuallyHidden>
            )}

            {/* Botones de acción del header alineados */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {allowFullScreenToggle && (
                <button
                  type="button"
                  aria-label={computedFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-foreground hover:text-primary shadow-sm motion-safe:transition-all duration-200 hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !fsInternal;
                    setFsInternal(next);
                    onFullScreenChange?.(next);
                  }}
                >
                  {computedFullScreen ? (
                    // Minimize icon
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  ) : (
                    // Maximize icon
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/><path d="M14 14h7v7h-7z"/></svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {description ? (
            <DialogDescription
              id={descriptionId}
              className={cn(
                "text-[11px] sm:text-xs text-muted-foreground/90 leading-snug mt-1 ml-8 sm:ml-9"
              )}
            >
              {description}
            </DialogDescription>
          ) : (
            <VisuallyHidden>
              <DialogDescription id={descriptionId}>Dialog content</DialogDescription>
            </VisuallyHidden>
          )}
        </DialogHeader>

        {/* Contenedor interno con scroll optimizado - única barra de desplazamiento vertical */}
        <div className={cn(
          "overflow-x-hidden overflow-y-auto overscroll-contain",
          // En escritorio: aprovechar al máximo la altura disponible
          "flex-1 min-h-0",
          // Altura máxima: restar el header (aprox 4rem) y dar margen para footer si existe
          computedFullScreen
            ? "sm:max-h-[calc(98vh-5rem)]"
            : footer
              ? "sm:max-h-[calc(95vh-8rem)]"
              : "sm:max-h-[calc(95vh-6rem)]",
          variant === 'compact' ? "px-3 sm:px-4 py-2" : "px-4 sm:px-5 py-3",
          // Scrollbar personalizado para mejor UX
          "scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-muted/20",
          "hover:scrollbar-thumb-primary/40",
          variant === 'compact' && 'max-[360px]:text-xs'
        )}>
          {children}
        </div>

        {/* Footer flotante siempre visible - fuera del área de scroll */}
        {footer && (
          <div className="flex-shrink-0">
            {footer}
          </div>
        )}

        {/* Botones de navegación flotantes */}
        {enableNavigation && (
          <>
            {/* Botón Anterior (Izquierda) */}
            {hasPrevious && onNavigatePrevious && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigatePrevious();
                }}
                aria-label="Animal anterior"
                className={cn(
                  "absolute left-2 sm:left-3 top-1/2 -translate-y-1/2",
                  "h-8 w-8 sm:h-9 sm:w-9",
                  "flex items-center justify-center",
                  "rounded-full",
                  // Estado normal: casi invisible (97% transparente = 3% opacidad)
                  "bg-background/[0.03] backdrop-blur-sm",
                  "border border-primary/[0.05]",
                  "text-foreground/10",
                  // Hover/Focus: visible
                  "hover:bg-background/80 hover:backdrop-blur-md",
                  "hover:border-primary/30",
                  "hover:text-foreground hover:shadow-lg",
                  "hover:scale-105",
                  // Active
                  "active:scale-95",
                  // Transiciones suaves
                  "transition-all duration-300 ease-in-out",
                  "focus:outline-none focus:bg-background/80 focus:text-foreground focus:border-primary/30",
                  "z-10"
                )}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}

            {/* Botón Siguiente (Derecha) */}
            {hasNext && onNavigateNext && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateNext();
                }}
                aria-label="Animal siguiente"
                className={cn(
                  "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2",
                  "h-8 w-8 sm:h-9 sm:w-9",
                  "flex items-center justify-center",
                  "rounded-full",
                  // Estado normal: casi invisible (97% transparente = 3% opacidad)
                  "bg-background/[0.03] backdrop-blur-sm",
                  "border border-primary/[0.05]",
                  "text-foreground/10",
                  // Hover/Focus: visible
                  "hover:bg-background/80 hover:backdrop-blur-md",
                  "hover:border-primary/30",
                  "hover:text-foreground hover:shadow-lg",
                  "hover:scale-105",
                  // Active
                  "active:scale-95",
                  // Transiciones suaves
                  "transition-all duration-300 ease-in-out",
                  "focus:outline-none focus:bg-background/80 focus:text-foreground focus:border-primary/30",
                  "z-10"
                )}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </>
        )}
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
