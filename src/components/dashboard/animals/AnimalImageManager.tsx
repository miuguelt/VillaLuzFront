import React, { useState } from 'react';
import { Image as ImageIcon, Upload as UploadIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimalImageUpload } from './AnimalImageUpload';
import { AnimalImageGallery } from './AnimalImageGallery';

interface AnimalImageManagerProps {
  animalId: number;
  /** Título del componente */
  title?: string;
  /** Mostrar controles de edición */
  showControls?: boolean;
  /** Comprimir imágenes al subir */
  compress?: boolean;
  /** Calidad de compresión (0-1) */
  quality?: number;
  /** Máximo de archivos permitidos */
  maxFiles?: number;
  /** Callback cuando las imágenes se actualizan (para refrescar otros componentes) */
  onImagesUpdate?: () => void;
}

/**
 * Componente completo para gestionar imágenes de animales
 * Combina subida de imágenes y galería en una interfaz de pestañas
 */
export function AnimalImageManager({
  animalId,
  title = 'Imágenes del Animal',
  showControls = true,
  compress = true,
  quality = 0.8,
  maxFiles = 20,
  onImagesUpdate,
}: AnimalImageManagerProps) {
  const [activeTab, setActiveTab] = useState<string>('gallery');
  const [galleryRefreshTrigger, setGalleryRefreshTrigger] = useState(0);

  // Manejar éxito de subida
  const handleUploadSuccess = () => {
    // Cambiar a la pestaña de galería
    setActiveTab('gallery');
    // Disparar refresh de la galería
    setGalleryRefreshTrigger((prev) => prev + 1);
    // Notificar a componentes externos (como el banner)
    if (onImagesUpdate) {
      onImagesUpdate();
    }
  };

  return (
    <div className="space-y-4">
      {/* Título */}
      {title && (
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gallery" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Galería
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <UploadIcon className="w-4 h-4" />
            Subir Imágenes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-4">
          <AnimalImageGallery
            animalId={animalId}
            showControls={showControls}
            refreshTrigger={galleryRefreshTrigger}
            onGalleryUpdate={() => {
              setGalleryRefreshTrigger((prev) => prev + 1);
              // Notificar también a componentes externos
              if (onImagesUpdate) {
                onImagesUpdate();
              }
            }}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <AnimalImageUpload
            animalId={animalId}
            onUploadSuccess={handleUploadSuccess}
            maxFiles={maxFiles}
            compress={compress}
            quality={quality}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
