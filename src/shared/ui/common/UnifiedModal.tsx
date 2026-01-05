/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { GenericModal, useUnifiedDisclosure, ModalSize } from './GenericModal';

// Contexto para pasar el título definido en <ModalHeader>
const ModalTitleContext = React.createContext<{
  title: React.ReactNode;
  setTitle: (t: React.ReactNode) => void;
}>({ title: '', setTitle: () => {} });

function normalizeSize(size?: ModalSize | string): ModalSize {
  if (!size) return '2xl';
  const allowed: ModalSize[] = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full'];
  if (allowed.includes(size as ModalSize)) return size as ModalSize;
  // Mapear tamaños no soportados de HeroUI a tamaños unificados
  if (String(size).toLowerCase() === '4xl') return '4xl';
  return '2xl';
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize | string;
  description?: string;
  disableAnimations?: boolean;
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'compact';
  fullScreen?: boolean;
  allowFullScreenToggle?: boolean;
  onFullScreenChange?: (next: boolean) => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  size,
  description,
  disableAnimations,
  className,
  children,
  variant = 'default',
  fullScreen = false,
  allowFullScreenToggle = false,
  onFullScreenChange,
}) => {
  const [title, setTitle] = React.useState<React.ReactNode>('');

  return (
    <ModalTitleContext.Provider value={{ title, setTitle }}>
      <GenericModal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={title}
        size={normalizeSize(size)}
        disableAnimations={!!disableAnimations}
        className={className}
        description={description}
        variant={variant}
        fullScreen={fullScreen}
        allowFullScreenToggle={allowFullScreenToggle}
        onFullScreenChange={onFullScreenChange}
      >
        {children}
      </GenericModal>
    </ModalTitleContext.Provider>
  );
};

export const ModalContent: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children }) => {
  // El contenido se renderiza directamente dentro del cuerpo del GenericModal
  return <>{children}</>;
};

export const ModalHeader: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children }) => {
  const { setTitle } = React.useContext(ModalTitleContext);
  React.useEffect(() => {
    setTitle(children);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);
  // GenericModal ya renderiza el header con el título; aquí no renderizamos nada extra
  return null;
};

export const ModalBody: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children }) => {
  return <>{children}</>;
};

// Reexportar un hook compatible con useDisclosure de HeroUI
export const useDisclosure = useUnifiedDisclosure;