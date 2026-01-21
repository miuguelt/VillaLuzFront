/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/shared/ui/cn.ts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

// Mapeo de tamaños a clases Tailwind
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
 */
export const GenericModal: React.FC<GenericModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  children,
  className,
  size = 'full',
  description,
  disableAnimations = false,
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
  const overlayClasses = cn(
    'fixed inset-0 flex items-start justify-center px-4 py-6',
    'sm:px-6 sm:pt-8 lg:px-8',
    'bg-black/70 dark:bg-black/80',
    'backdrop-blur-[18px] motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none'
  );

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
      // Solo manejar si el foco está dentro del modal o no hay input activo
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) return;

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

  const [fsInternal, setFsInternal] = React.useState<boolean>(fullScreen);
  React.useEffect(() => {
    setFsInternal(fullScreen);
  }, [fullScreen]);

  const computedFullScreen = allowFullScreenToggle ? fsInternal : fullScreen;

  const modalClasses = cn(
    'w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw]',
    'max-w-[500px] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] xl:max-w-[1200px]',
    'h-auto',
    'max-h-[90vh] sm:max-h-[92vh]',
    'min-h-[200px]',
    '!flex !flex-col',
    'bg-white dark:bg-slate-900',
    'sm:bg-white/98 sm:dark:bg-slate-900/98',
    'shadow-2xl shadow-black/20 dark:shadow-black/40',
    'rounded-xl sm:rounded-2xl',
    'border border-border/50 dark:border-white/10',
    'backdrop-blur-sm',
    computedFullScreen && '!w-screen !max-w-none !h-dvh !max-h-none !min-h-0 !rounded-none !border-0',
    'vl-modal-surface text-foreground',
    '!p-0 !gap-0',
    !computedFullScreen && size !== 'full' && sizeClasses[size],
    !disableAnimations && 'transition-all duration-300 ease-out',
    variant === 'compact' && 'max-[360px]:text-xs',
    className
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        className={cn(modalClasses)}
        overlayClassName={overlayClasses}
        style={{
          cursor: isDragging ? 'grabbing' : 'default',
          ...(draggable && { transform: `translate(${position.x}px, ${position.y}px)` }),
        }}
      >
        <DialogHeader
          className={cn(
            "relative bg-surface-secondary/70 backdrop-blur-lg border-b border-white/40 dark:border-white/10 shadow-sm",
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
                  "text-sm sm:text-base font-semibold leading-none text-left text-foreground flex items-center gap-2 flex-1 min-w-0"
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

            <div className="flex-shrink-0 flex items-center gap-1.5">
              {allowFullScreenToggle && (
                <button
                  type="button"
                  aria-label={computedFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-surface-tertiary text-text-secondary hover:text-primary hover:bg-state-hover shadow-sm motion-safe:transition-all duration-200 hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !fsInternal;
                    setFsInternal(next);
                    onFullScreenChange?.(next);
                  }}
                >
                  {computedFullScreen ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M21 16v3a2 2 0 0 1-2 2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z" /><path d="M14 3h7v7h-7z" /><path d="M3 14h7v7H3z" /><path d="M14 14h7v7h-7z" /></svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {description ? (
            <DialogDescription
              id={descriptionId}
              className={cn("text-[11px] sm:text-xs text-muted-foreground/90 leading-snug mt-1 ml-8 sm:ml-9")}
            >
              {description}
            </DialogDescription>
          ) : (
            <VisuallyHidden>
              <DialogDescription id={descriptionId}>Dialog content</DialogDescription>
            </VisuallyHidden>
          )}
        </DialogHeader>

        <div
          tabIndex={0}
          className={cn(
            "overflow-x-hidden overflow-y-auto overscroll-contain focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 flex-1 min-h-0",
            variant === 'compact' ? "px-3 sm:px-4 py-2" : "px-4 sm:px-5 py-3",
            variant === 'compact' && 'max-[360px]:text-xs'
          )}>
          {children}
        </div>

        {footer && (
          <div className="flex-shrink-0">
            {footer}
          </div>
        )}

        {enableNavigation && (
          <>
            {hasPrevious && onNavigatePrevious && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigatePrevious();
                }}
                aria-label="Anterior"
                className={cn(
                  "absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full bg-background/[0.03] backdrop-blur-sm border border-primary/[0.05] text-foreground/10 hover:bg-background/80 hover:backdrop-blur-md hover:border-primary/30 hover:text-foreground hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out focus:outline-none focus:bg-background/80 focus:text-foreground focus:border-primary/30 z-10"
                )}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}

            {hasNext && onNavigateNext && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateNext();
                }}
                aria-label="Siguiente"
                className={cn(
                  "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full bg-background/[0.03] backdrop-blur-sm border border-primary/[0.05] text-foreground/10 hover:bg-background/80 hover:backdrop-blur-md hover:border-primary/30 hover:text-foreground hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out focus:outline-none focus:bg-background/80 focus:text-foreground focus:border-primary/30 z-10"
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

export const useUnifiedDisclosure = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: (open: boolean) => setIsOpen(open),
  } as const;
};
