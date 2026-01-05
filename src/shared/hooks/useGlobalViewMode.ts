import { useEffect, useState } from 'react';

export type ViewMode = 'table' | 'cards';

const STORAGE_KEY = 'adminGlobalViewMode';

/**
 * Hook para gestionar de forma global el modo de vista (tabla/tarjetas)
 * - Persiste en localStorage bajo una única clave
 * - Default: 'cards'
 * - Sincroniza cambios entre secciones mediante `storage` y un CustomEvent
 */
export function useGlobalViewMode(initial?: ViewMode): [ViewMode, (mode: ViewMode) => void] {
  const getInitial = (): ViewMode => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'table' || saved === 'cards') return saved;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useGlobalViewMode] No se pudo leer de localStorage', error);
      }
    }
    return initial ?? 'cards';
  };

  const [mode, setMode] = useState<ViewMode>(getInitial);

  // Persistir y notificar cambios
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useGlobalViewMode] No se pudo persistir el modo', error);
      }
    }
    try {
      window.dispatchEvent(new CustomEvent('admin:view-mode-changed', { detail: { mode } }));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useGlobalViewMode] No se pudo emitir evento de modo', error);
      }
    }
  }, [mode]);

  // Escuchar cambios externos (otras secciones o pestañas)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'table' || e.newValue === 'cards')) {
        setMode(e.newValue);
      }
    };
    const handleCustom = (e: Event) => {
      const m = (e as CustomEvent).detail?.mode;
      if (m === 'table' || m === 'cards') setMode(m);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('admin:view-mode-changed', handleCustom as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('admin:view-mode-changed', handleCustom as EventListener);
    };
  }, []);

  return [mode, setMode];
}
