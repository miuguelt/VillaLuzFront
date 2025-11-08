import React, { useState, useEffect } from 'react';
import { Eye, ExternalLink } from 'lucide-react';
import { GenericModal } from './GenericModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface ForeignKeyLinkHelpers {
  closeModal: () => void;
  reload: () => Promise<void>;
  setData: (data: any) => void;
}


interface ForeignKeyLinkProps {
  /**
   * ID de la entidad referenciada
   */
  id: number | string;

  /**
   * Etiqueta a mostrar (ej: "Animal 123", "Holstein", etc.)
   */
  label: string;

  /**
   * Servicio para obtener los detalles de la entidad
   */
  service: {
    getById: (id: number | string) => Promise<any>;
  };

  /**
   * Título del modal (ej: "Detalle del Animal")
   */
  modalTitle: string;

  /**
   * Función para renderizar el contenido del modal
   * Si no se proporciona, se usa un renderizado genérico
   */
  renderContent?: (data: any, helpers?: ForeignKeyLinkHelpers) => React.ReactNode;

  /**
   * Campos a mostrar en el renderizado genérico
   * Solo se usa si no se proporciona renderContent
   */
  fields?: Array<{
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
  }>;

  /**
   * Clase CSS adicional para el link
   */
  className?: string;

  /**
   * Si debe mostrar el icono de enlace externo
   */
  showIcon?: boolean;

  /**
   * Tamaño del modal
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

  /**
   * Habilitar botón de pantalla completa
   */
  enableFullScreenToggle?: boolean;
}

/**
 * Componente genérico para renderizar campos foráneos con un link clickeable
 * que abre un modal con los detalles de la entidad relacionada
 */
export const ForeignKeyLink: React.FC<ForeignKeyLinkProps> = ({
  id,
  label,
  service,
  modalTitle,
  renderContent,
  fields,
  className = '',
  showIcon = true,
  size = 'lg',
  enableFullScreenToggle = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await service.getById(id);
      setData(result);
    } catch (err: any) {
      console.error('Error loading entity details:', err);
      setError(err?.message || 'Error al cargar los detalles');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowModal(true);
    if (!data) {
      loadData();
    }
  };

  const defaultRenderContent = (item: any) => {
    if (!fields || fields.length === 0) {
      // Renderizado muy básico si no hay fields definidos
      return (
        <div className="space-y-2">
          {Object.entries(item).map(([key, value]) => (
            <div key={key} className="flex justify-between border-b pb-2">
              <span className="font-medium text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="text-foreground">{String(value)}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Información Detallada</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {fields.map((field) => {
              const value = item[field.key];
              const displayValue = field.render
                ? field.render(value, item)
                : value !== null && value !== undefined
                ? String(value)
                : '-';

              return (
                <div key={field.key}>
                  <dt className="text-muted-foreground">{field.label}</dt>
                  <dd className="font-medium">{displayValue}</dd>
                </div>
              );
            })}
          </dl>
        </CardContent>
      </Card>
    );
  };

  const renderModalContent = () => {
    const helpers: ForeignKeyLinkHelpers = {
      closeModal: () => setShowModal(false),
      reload: async () => { await loadData(); },
      setData: (value: any) => setData(value),
    };

    if (loading) {
      return (
        <div className="py-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando detalles...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-10 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadData} variant="outline" size="sm">
            Reintentar
          </Button>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">No se encontraron datos</p>
        </div>
      );
    }

    if (renderContent) {
      return renderContent(data, helpers);
    }

    return defaultRenderContent(data);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-0.5 text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer font-medium text-[9px] ${className}`}
        title={`Click para ver detalles de ${label}`}
      >
        <span className="truncate">{label}</span>
        {showIcon && <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />}
      </button>

      <GenericModal
        isOpen={showModal}
        onOpenChange={setShowModal}
        title={modalTitle}
        description={`Información detallada de ${label}`}
        size={size}
        enableBackdropBlur
        allowFullScreenToggle={enableFullScreenToggle}
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        {renderModalContent()}
      </GenericModal>
    </>
  );
};
