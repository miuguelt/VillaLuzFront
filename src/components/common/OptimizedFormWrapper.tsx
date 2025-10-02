import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useFormDataEntities, useCacheDebug } from '@/hooks/useOptimizedFormData';
import { useAnimals } from '@/hooks/animal/useAnimals';
import { useUsers } from '@/hooks/user/useUser';
import { useDiseases } from '@/hooks/diseases/useDisease';
import { useSpecies } from '@/hooks/species/useSpecies';
import { useFields } from '@/hooks/field/useField';
import { useMedications } from '@/hooks/medication/useMedication';
import { useVaccines } from '@/hooks/vaccine/useVaccine';

interface OptimizedFormWrapperProps {
  children: React.ReactNode;
  requiredEntities: string[];
  onDataReady?: (data: Record<string, any[]>) => void;
  enableDebug?: boolean;
}

/**
 * Componente wrapper que optimiza la carga de datos para formularios
 * Evita peticiones redundantes al backend usando caché inteligente
 */
export const OptimizedFormWrapper: React.FC<OptimizedFormWrapperProps> = ({
  children,
  requiredEntities,
  onDataReady,
  enableDebug = false
}) => {
  const [isDataReady, setIsDataReady] = useState(false);
  const [loadedData, setLoadedData] = useState<Record<string, any[]>>({});
  
  const { checkSpecificEntities } = useFormDataEntities();
  const { logCacheStats } = useCacheDebug();
  
  // Hooks condicionales basados en entidades requeridas
  const animalsHook = useAnimals();
  const usersHook = useUsers();
  const diseasesHook = useDiseases();
  const speciesHook = useSpecies();
  const fieldsHook = useFields();
  const medicationsHook = useMedications();
  const vaccinesHook = useVaccines();
  
  // Mapeo de entidades a hooks - Memoizado para evitar re-renders
  const entityHookMap = useMemo(() => ({
    animals: animalsHook,
    users: usersHook,
    diseases: diseasesHook,
    species: speciesHook,
    fields: fieldsHook,
    medications: medicationsHook,
    vaccines: vaccinesHook
  }), [animalsHook, usersHook, diseasesHook, speciesHook, fieldsHook, medicationsHook, vaccinesHook]);
  
  // Función para verificar si todos los datos están listos
  const checkDataReadiness = useCallback(() => {
    const { allCached, cachedData, missingEntities } = checkSpecificEntities(requiredEntities);
    
    if (enableDebug) {
      console.group('🔍 OptimizedFormWrapper - Data Check');
      console.log('Required entities:', requiredEntities);
      console.log('All cached:', allCached);
      console.log('Missing entities:', missingEntities);
      logCacheStats(requiredEntities);
      console.groupEnd();
    }
    
    // Si todos los datos están en caché, usar esos datos
    if (allCached) {
      setLoadedData(cachedData);
      setIsDataReady(true);
      onDataReady?.(cachedData);
      return;
    }
    
    // Si faltan datos, verificar si los hooks han terminado de cargar
    const allHooksReady = requiredEntities.every(entity => {
      const hook = entityHookMap[entity as keyof typeof entityHookMap];
      return hook && !hook.loading;
    });
    
    if (allHooksReady) {
      // Recopilar datos de los hooks
      const hookData: Record<string, any[]> = {};
      requiredEntities.forEach(entity => {
        const hook = entityHookMap[entity as keyof typeof entityHookMap];
        if (hook) {
          switch (entity) {
            case 'animals':
              hookData[entity] = (hook as any).animals || [];
              break;
            case 'users':
              hookData[entity] = (hook as any).users || [];
              break;
            case 'diseases':
              hookData[entity] = (hook as any).diseases || [];
              break;
            case 'species':
              hookData[entity] = (hook as any).species || [];
              break;
            case 'fields':
              hookData[entity] = (hook as any).fields || [];
              break;
            case 'medications':
              hookData[entity] = (hook as any).medications || [];
              break;
            case 'vaccines':
              hookData[entity] = (hook as any).vaccines || [];
              break;
          }
        }
      });
      
      setLoadedData(hookData);
      setIsDataReady(true);
      onDataReady?.(hookData);
    }
  }, [requiredEntities, checkSpecificEntities, onDataReady, enableDebug, logCacheStats, entityHookMap]);
  
  // Efecto para verificar la disponibilidad de datos
  useEffect(() => {
    checkDataReadiness();
  }, [
    checkDataReadiness,
    animalsHook.loading,
    usersHook.loading,
    diseasesHook.loading,
    speciesHook.loading,
    fieldsHook.loading,
    medicationsHook.loading,
    vaccinesHook.loading
  ]);
  
  // Mostrar loading si los datos no están listos
  if (!isDataReady) {
    const loadingEntities = requiredEntities.filter(entity => {
      const hook = entityHookMap[entity as keyof typeof entityHookMap];
      return hook?.loading;
    });
    
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Cargando datos{loadingEntities.length > 0 && ` (${loadingEntities.join(', ')})`}...
          </p>
          {enableDebug && (
            <p className="text-xs text-muted-foreground mt-2">
              Entidades requeridas: {requiredEntities.join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // Clonar children y pasar los datos como props
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
        const childProps = {
          ...(child.props as any),
          optimizedData: loadedData,
          isOptimized: true
        };
        return React.cloneElement(child, childProps);
      }
    return child;
  });
  
  return (
    <>
      {enableDebug && (
        <div className="mb-4 p-2 bg-muted rounded text-xs">
          <strong>🚀 OptimizedFormWrapper Debug:</strong>
          <br />Entidades: {requiredEntities.join(', ')}
          <br />Datos listos: {isDataReady ? '✅' : '❌'}
          <br />Elementos cargados: {Object.keys(loadedData).map(key => `${key}(${loadedData[key]?.length || 0})`).join(', ')}
        </div>
      )}
      {childrenWithProps}
    </>
  );
};

export default OptimizedFormWrapper;