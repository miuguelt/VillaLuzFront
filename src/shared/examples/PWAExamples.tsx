/**
 * Ejemplos de uso de las optimizaciones PWA
 * Este archivo contiene ejemplos prácticos de implementación
 */

import React, { useEffect, useState } from 'react';
import { createPWAClient } from '@/shared/api/pwa-client';
import { usePWASync, useMultiResourceSync } from '@/shared/hooks/usePWASync';
import { useMetadata, useSmartSync, useMultiResourceMetadata } from '@/shared/hooks/useMetadata';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

// ============================================================
// Ejemplo 1: Sincronización Incremental Básica
// ============================================================

export function BasicSyncExample() {
  const {
    sync,
    isSyncing,
    lastSync,
    changesCount,
    error,
  } = usePWASync('users', {
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // Cada 5 minutos
    onSyncComplete: (count) => {
      console.log(`${count} usuarios sincronizados`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronización Incremental</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => sync()}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={isSyncing ? 'animate-spin' : ''} size={16} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </Button>

          {changesCount > 0 && (
            <Badge variant="secondary">{changesCount} cambios</Badge>
          )}
        </div>

        {lastSync && (
          <p className="text-sm text-muted-foreground">
            Última sincronización: {new Date(lastSync).toLocaleString()}
          </p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Ejemplo 2: Verificación de Metadata
// ============================================================

export function MetadataCheckExample() {
  const {
    check,
    hasChanges,
    metadata,
    isLoading,
    totalCount,
    lastModified,
  } = useMetadata('diseases', {
    autoCheck: true,
    checkInterval: 30000, // Cada 30 segundos
    onChangesDetected: (meta) => {
      console.log('Cambios detectados:', meta);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificación de Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={check} disabled={isLoading}>
          {isLoading ? 'Verificando...' : 'Verificar Cambios'}
        </Button>

        {hasChanges && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Hay cambios disponibles en el servidor
            </AlertDescription>
          </Alert>
        )}

        {metadata && (
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Total de registros:</strong> {totalCount}
            </p>
            <p className="text-sm">
              <strong>Última modificación:</strong>{' '}
              {lastModified ? new Date(lastModified).toLocaleString() : 'N/A'}
            </p>
            <p className="text-sm">
              <strong>ETag:</strong> {metadata.etag}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Ejemplo 3: Smart Sync (Metadata + Auto-sync)
// ============================================================

export function SmartSyncExample() {
  const {
    data,
    sync,
    hasChanges,
    isLoading,
    totalCount,
    lastModified,
  } = useSmartSync('breeds', {
    checkInterval: 30000,
    autoSyncOnChanges: true,
    onSyncComplete: (count) => {
      console.log(`${count} razas actualizadas`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Sync (Auto-sincronización)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="animate-spin" size={16} />
            Cargando...
          </div>
        )}

        {hasChanges && (
          <Badge variant="outline" className="bg-yellow-50">
            Sincronizando cambios...
          </Badge>
        )}

        <div className="space-y-2">
          <p className="text-sm">
            <strong>Total:</strong> {totalCount} razas
          </p>
          <p className="text-sm">
            <strong>En memoria:</strong> {data.length} registros
          </p>
          {lastModified && (
            <p className="text-sm">
              <strong>Última modificación:</strong>{' '}
              {new Date(lastModified).toLocaleString()}
            </p>
          )}
        </div>

        <Button onClick={sync} disabled={isLoading} size="sm">
          Sincronizar Manualmente
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Ejemplo 4: Sincronización de Múltiples Recursos
// ============================================================

export function MultiResourceSyncExample() {
  const { syncAll, isSyncing, results } = useMultiResourceSync([
    'users',
    'diseases',
    'breeds',
    'species',
  ]);

  const handleSyncAll = async () => {
    const syncResults = await syncAll();
    console.log('Resultados de sincronización:', syncResults);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronización Múltiple</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="w-full"
        >
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Todos los Recursos'}
        </Button>

        <div className="space-y-2">
          {Object.entries(results).map(([resource, result]) => (
            <div
              key={resource}
              className="flex items-center justify-between p-2 border rounded"
            >
              <span className="font-medium capitalize">{resource}</span>

              {result.success ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle size={12} />
                  {result.count} cambios
                </Badge>
              ) : (
                <Badge variant="destructive">Error</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Ejemplo 5: Verificación Múltiple de Metadata
// ============================================================

export function MultiResourceMetadataExample() {
  const {
    checkAll,
    isChecking,
    hasAnyChanges,
    changedResources,
    results,
  } = useMultiResourceMetadata([
    'users',
    'diseases',
    'breeds',
    'vaccinations',
  ]);

  useEffect(() => {
    // Verificar al montar
    checkAll();

    // Verificar cada minuto
    const interval = setInterval(checkAll, 60000);
    return () => clearInterval(interval);
  }, [checkAll]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificación Múltiple</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkAll} disabled={isChecking}>
          {isChecking ? 'Verificando...' : 'Verificar Todos'}
        </Button>

        {hasAnyChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cambios detectados en: {changedResources.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(results).map(([resource, result]) => (
            <div
              key={resource}
              className={`p-2 border rounded ${
                result.hasChanges ? 'bg-yellow-50 border-yellow-200' : ''
              }`}
            >
              <p className="font-medium text-sm capitalize">{resource}</p>
              <p className="text-xs text-muted-foreground">
                {result.hasChanges ? '✓ Hay cambios' : '○ Sin cambios'}
              </p>
              {result.metadata && (
                <p className="text-xs text-muted-foreground">
                  Total: {result.metadata.total_count}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Ejemplo 6: Uso Directo de PWA API Client
// ============================================================

export function DirectClientExample() {
  const [status, setStatus] = useState<string>('Listo');
  const [data, setData] = useState<any[]>([]);

  const client = createPWAClient('users');

  const testETagValidation = async () => {
    setStatus('Obteniendo datos con ETag...');
    try {
      const response = await client.getWithETag({ page: 1, limit: 10 });
      setData(response.data);
      setStatus(`✅ ${response.data.length} usuarios cargados`);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const testMetadata = async () => {
    setStatus('Obteniendo metadata...');
    try {
      const metadata = await client.getMetadata();
      if (metadata) {
        setStatus(`ℹ️ Total: ${metadata.total_count}, ETag: ${metadata.etag}`);
      } else {
        setStatus('⚠️ Metadata no disponible');
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const testIncremental = async () => {
    setStatus('Sincronización incremental...');
    try {
      const { data } = await client.syncSince();
      setStatus(`✅ ${data.length} cambios desde última sync`);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const testHasChanges = async () => {
    setStatus('Verificando cambios...');
    try {
      const hasChanges = await client.hasChanges();
      setStatus(
        hasChanges ? '⚠️ Hay cambios disponibles' : '✓ Sin cambios'
      );
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso Directo de PWA Client</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={testETagValidation} size="sm" variant="outline">
            ETag Validation
          </Button>
          <Button onClick={testMetadata} size="sm" variant="outline">
            Metadata
          </Button>
          <Button onClick={testIncremental} size="sm" variant="outline">
            Sync Incremental
          </Button>
          <Button onClick={testHasChanges} size="sm" variant="outline">
            Has Changes?
          </Button>
        </div>

        <Alert>
          <AlertDescription>{status}</AlertDescription>
        </Alert>

        {data.length > 0 && (
          <div className="text-xs">
            <p className="font-medium">Datos cargados:</p>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Componente Demo Completo
// ============================================================

export function PWAExamplesDemo() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">PWA Optimization Examples</h1>
        <p className="text-muted-foreground">
          Ejemplos prácticos de las optimizaciones PWA implementadas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BasicSyncExample />
        <MetadataCheckExample />
        <SmartSyncExample />
        <MultiResourceSyncExample />
        <MultiResourceMetadataExample />
        <DirectClientExample />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recursos Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'users',
              'diseases',
              'breeds',
              'species',
              'medications',
              'vaccines',
              'vaccinations',
              'treatments',
              'animals',
              'controls',
            ].map((resource) => (
              <Badge key={resource} variant="outline">
                {resource}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
