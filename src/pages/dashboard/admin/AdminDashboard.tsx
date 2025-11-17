import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import { useModelStats } from '../../../hooks/useModelStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import {
  Loader2,
  Users,
  Building2,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Skull,
  ShoppingCart,
  Pill,
  ClipboardCheck,
  TrendingUp,
  ListChecks,
} from 'lucide-react';
// OPTIMIZACIÓN: Lazy loading de componentes pesados
import { usePermissions } from '@/hooks/useJWT';
import api, { unwrapApi } from '@/services/api';
import { useT } from '@/i18n';
import axios from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton';
// OPTIMIZACIÓN: Hooks PWA optimizados para backend
import { useOptimizedList } from '@/hooks/useOptimizedData';
import { DataSyncIndicator } from '@/components/common/DataSyncIndicator';
import { DashboardStatsCard, DashboardStatsGrid } from '@/components/dashboard/DashboardStatsCard';
import { useCompleteDashboardStats, KpiCardSummary } from '@/hooks/useCompleteDashboardStats';
import KPICard from '@/components/analytics/KPICard';

// Lazy load de componentes pesados para mejorar tiempo de carga inicial
const StatisticsCard = lazy(() => import('../../../components/dashboard/StatisticsCard'));

// OPTIMIZACIÓN: Componente de alerta memoizado para evitar re-renders innecesarios
const AlertItem = memo(({ alert, onMarkRead, onNavigate, colorToClasses, renderIcon }: {
  alert: SystemAlert;
  onMarkRead: (id: string) => void;
  onNavigate: (path: string) => void;
  colorToClasses: (color?: string) => string;
  renderIcon: (alert: SystemAlert) => React.ReactNode;
}) => (
  <Alert
    className={`${colorToClasses(alert.color)} ${alert.isRead ? 'opacity-60' : ''}`}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3">
        {renderIcon(alert)}
        <div>
          <h4 className="font-medium">{alert.title}</h4>
          <AlertDescription className="mt-1">
            {alert.message}
          </AlertDescription>
          {alert.action_required && (
            <div className="mt-1 text-xs">
              Acción requerida: {alert.action_required}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {alert.priority && (
              <Badge variant="outline">Prioridad: {alert.priority}</Badge>
            )}
            {alert.type && (
              <Badge variant="secondary">Tipo: {alert.type}</Badge>
            )}
            {alert.animal_record && (
              <Badge variant="outline">Animal: {alert.animal_record}</Badge>
            )}
            <span>{new Date(alert.created_at).toLocaleString()}</span>
            {(alert.animal_record || alert.animal_id) && (
              <Button
                variant="link"
                size="sm"
                onClick={() => onNavigate(`/admin/animals?q=${encodeURIComponent(alert.animal_record || String(alert.animal_id))}`)}
              >
                Ver animal  
              </Button>
            )}
          </div>
        </div>
      </div>
      {!alert.isRead && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMarkRead(alert.id)}
          className="h-8 w-8 p-0"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  </Alert>
));
AlertItem.displayName = 'AlertItem';

// Definición de tipos
interface User {
  id: number;
  username: string;
  role: string;
  email?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalAnimals: number;
  activeTreatments: number;
  pendingTasks: number;
  systemAlerts: number;
}

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  value: number | string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  href?: string;
  action?: React.ReactNode;
}

interface SystemAlert {
  id: string;
  type: 'health' | 'vaccination' | 'growth' | 'productivity' | 'system' | 'info' | 'warning' | 'error' | 'success' | string;
  title: string;
  message: string;
  created_at: string;
  color?: 'red' | 'yellow' | 'green' | 'blue' | string;
  icon?: string; // emoji o nombre de icono
  priority?: 'low' | 'medium' | 'high' | 'critical';
  animal_id?: number;
  animal_record?: string;
  action_required?: string;
  isRead?: boolean;
}

const AdminDashboard: React.FC = () => {
  const t = useT();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Estado local - declarar PRIMERO antes de usar
  const [users, setUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalAnimals: 0,
    activeTreatments: 0,
    pendingTasks: 0,
    systemAlerts: 0,
  });
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Guardas para evitar llamadas duplicadas/in-flight y doble invocación en StrictMode
  const initialFetchDoneRef = useRef(false)
  const isFetchingUsersRef = useRef(false)
  const isFetchingAlertsRef = useRef(false)
  // Control de reintento único para /users
  const hasRetriedUsersRef = useRef(false)
  const usersRetryTimeoutRef = useRef<number | null>(null)

  // ===== Permisos evaluados como booleanos para estabilizar dependencias =====
  const canReadDashboard = hasPermission('dashboard:read')
  const canReadUsers = hasPermission('user:read')
  const canReadSystem = hasPermission('system:read')

  // OPTIMIZACIÓN: Usar SOLO useCompleteDashboardStats que trae TODAS las métricas en una sola llamada
  // Esto elimina 3 llamadas HTTP redundantes (dashboard, health, production)
  const { stats: completeStats, loading: completeLoading, error: completeError, refetch: refetchComplete, lastUpdated } = useCompleteDashboardStats(true);
  const kpiResumen = completeStats?.kpi_resumen;
  const rawKpiCards: KpiCardSummary[] = kpiResumen?.cards ?? [];
  const KPI_ORDER = [
    'health_index',
    'vaccination_coverage',
    'control_compliance',
    'mortality_rate_30d',
    'sales_rate_30d',
    'treatments_intensity',
    'controls_frequency',
    'herd_growth_rate',
    'alert_pressure',
    'task_load_index',
  ];
  const kpiCards = useMemo<KpiCardSummary[]>(() => {
    if (!rawKpiCards.length) return [];
    const indexOfId = (id: string) => KPI_ORDER.indexOf(id);
    return [...rawKpiCards].sort((a, b) => {
      const ai = indexOfId(a.id);
      const bi = indexOfId(b.id);
      if (ai === -1 && bi === -1) return a.id.localeCompare(b.id);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [rawKpiCards]);

  // Helper: mapear color devuelto por backend a clases Tailwind
  const colorToClasses = (color?: string) => {
    switch (color) {
      case 'red':
        return 'border-red-200 bg-red-50';
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50';
      case 'green':
        return 'border-green-200 bg-green-50';
      case 'blue':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  // Helper: icono según backend o fallback por tipo
  const renderAlertIcon = (alert: SystemAlert) => {
    if (alert.icon) {
      return <span className="text-xl mt-0.5">{alert.icon}</span>;
    }
    if (alert.type === 'vaccination') return <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />;
    if (alert.type === 'health') return <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />;
    if (alert.type === 'growth' || alert.type === 'productivity') return <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />;
    return <div className="h-5 w-5 rounded-full bg-blue-500 mt-0.5" />;
  };
  // Obtener usuarios del sistema
  const fetchUsers = useCallback(async () => {
    if (!canReadUsers) return
    if (isFetchingUsersRef.current) return
    isFetchingUsersRef.current = true
    setLoading(true)
    try {
      // Optimización: traer solo usuarios recientes y datos mínimos para el panel
      const res = await api.get('/users', {
        params: {
          limit: 20,
          sort: 'createdAt',
          dir: 'desc',
        }
      })
      const data: User[] = unwrapApi<User[]>(res)
      setUsers(data)
      // Nota: los conteos globales de usuarios provienen de useDashboardCounts.
      // Aquí solo mantenemos la lista reciente para la sección "Usuarios recientes".
    } catch (error) {
      console.error('Error fetching users:', error)
      showToast(t('dashboard.errors.fetchUsers'), 'error')
      // Reintento único con backoff si el backend responde 429 (rate limit)
      if (axios.isAxiosError(error) && error.response?.status === 429 && !hasRetriedUsersRef.current) {
        const headers = error.response?.headers ?? {}
        const retryAfterHeader = (headers['retry-after'] as string | undefined) ?? (headers['Retry-After'] as string | undefined)
        const rateLimitReset = (headers['ratelimit-reset'] as string | undefined) ?? (headers['RateLimit-Reset'] as string | undefined)
        let delayMs = 30000 // fallback 30s
        const parseNum = (val?: string) => {
          if (!val) return undefined
          const n = parseInt(Array.isArray(val) ? (val as any)[0] : (val as any), 10)
          return Number.isNaN(n) ? undefined : n
        }
        const retryAfterSec = parseNum(retryAfterHeader)
        if (retryAfterSec !== undefined) {
          delayMs = Math.max(retryAfterSec * 1000, 5000)
        } else {
          const resetSec = parseNum(rateLimitReset)
          if (resetSec !== undefined) {
            const nowSec = Math.floor(Date.now() / 1000)
            delayMs = Math.max((resetSec - nowSec) * 1000, 5000)
          }
        }
        hasRetriedUsersRef.current = true
        showToast(`Límite alcanzado (429). Reintentando en ${Math.round(delayMs/1000)}s…`, 'warning')
        usersRetryTimeoutRef.current = window.setTimeout(() => {
          fetchUsers()
        }, delayMs)
      }
    } finally {
      setLoading(false)
      isFetchingUsersRef.current = false
    }
  }, [canReadUsers, t, showToast])

  // Obtener alertas del sistema
  const fetchAlerts = useCallback(async () => {
    if (!canReadSystem) return
    if (isFetchingAlertsRef.current) return
    isFetchingAlertsRef.current = true
    try {
      // OPTIMIZACIÓN: Timeout extendido solo para este endpoint (puede ser lento)
      const res = await api.get('/analytics/alerts', {
        params: { limit: 50 },
        timeout: 30000 // 30 segundos (vs 10s default)
      })
      const payload = unwrapApi<any>(res)
      const rawAlerts: any[] = Array.isArray(payload) ? payload : (payload?.alerts ?? [])
      const normalized: SystemAlert[] = rawAlerts.map((a: any) => ({
        id: String(a.id),
        type: a.type ?? 'info',
        title: a.title ?? 'Alerta',
        message: a.message ?? '',
        created_at: a.created_at ?? new Date().toISOString(),
        color: a.color,
        icon: a.icon,
        priority: a.priority,
        animal_id: a.animal_id,
        animal_record: a.animal_record,
        action_required: a.action_required,
        isRead: false,
      }))
      setAlerts(normalized)
      setSystemStats(prev => ({
        ...prev,
        systemAlerts: normalized.length,
      }))
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn('Analytics alerts endpoint not found (404). Tratando como sin alertas.')
        setAlerts([])
        setSystemStats(prev => ({ ...prev, systemAlerts: 0 }))
        return
      }
      console.error('Error fetching alerts:', error)
      showToast(t('dashboard.errors.fetchAlerts'), 'error')
    } finally {
      isFetchingAlertsRef.current = false
    }
  }, [canReadSystem, t, showToast])

  // Cargar datos iniciales de forma paralela (optimizado para velocidad)
  useEffect(() => {
    if (user && canReadDashboard && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true
      // Resetear estado de reintento único por sesión
      hasRetriedUsersRef.current = false
      if (usersRetryTimeoutRef.current) {
        clearTimeout(usersRetryTimeoutRef.current)
        usersRetryTimeoutRef.current = null
      }

      // OPTIMIZACIÓN: iniciar carga de usuarios inmediata y diferir alertas para no bloquear primer render
      fetchUsers().finally(() => {
        // Desbloquear render inicial en cuanto tengamos algo de contenido
        setIsInitialLoad(false)
      })
      // Cargar alertas con un ligero defer para reducir competencia de red
      setTimeout(() => {
        fetchAlerts().catch((error) => {
          console.error('[Dashboard] Error cargando alertas (deferred):', error)
        })
      }, 300)
    }
  }, [user, canReadDashboard, fetchUsers, fetchAlerts])

  // OPTIMIZACIÓN: si completeStats ya están listos, no mantener el skeleton por alertas
  useEffect(() => {
    if (!completeLoading) {
      setIsInitialLoad(false)
    }
  }, [completeLoading])

  // Cleanup de timeouts programados
  useEffect(() => {
    return () => {
      if (usersRetryTimeoutRef.current) {
        clearTimeout(usersRetryTimeoutRef.current)
        usersRetryTimeoutRef.current = null
      }
    }
  }, [])

  // ELIMINADO: Ya no necesitamos actualizar systemStats desde stats (usamos completeStats directamente)

  // Marcar alerta como leída
  const markAlertAsRead = async (alertId: string) => {
    try {
      // Marcado local (el backend de /analytics/alerts no expuso endpoint de lectura)
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, isRead: true } : alert
        )
      )
      showToast(t('dashboard.alerts.markedAsRead'), 'success')
    } catch (error) {
      console.error('Error marking alert as read:', error)
      showToast(t('dashboard.errors.markAlertRead'), 'error')
    }
  }

  // Marcar todas las alertas como leídas
  const markAllAlertsAsRead = async () => {
    try {
      // Marcado local para todas las alertas
      setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })))
      showToast(t('dashboard.alerts.allMarkedAsRead'), 'success')
    } catch (error) {
      console.error('Error marking all alerts as read:', error)
      showToast(t('dashboard.errors.markAllAlertsRead'), 'error')
    }
  }

  const uniqueTypes = useMemo(() => Array.from(new Set(alerts.map(a => a.type).filter(Boolean))), [alerts])
  const uniquePriorities = useMemo(() => Array.from(new Set(alerts.map(a => a.priority).filter(Boolean))), [alerts])
  const filteredAlerts = useMemo(
    () => alerts.filter(a => (filterType === 'all' || a.type === filterType) && (filterPriority === 'all' || a.priority === filterPriority)),
    [alerts, filterType, filterPriority]
  )

  const kpiIconMap: Record<string, React.ReactNode> = useMemo(
    () => ({
      health_index: <HeartPulse className="w-5 h-5 text-red-500" />,
      vaccination_coverage: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      control_compliance: <Stethoscope className="w-5 h-5 text-sky-600" />,
      mortality_rate_30d: <Skull className="w-5 h-5 text-zinc-600" />,
      sales_rate_30d: <ShoppingCart className="w-5 h-5 text-amber-600" />,
      treatments_intensity: <Pill className="w-5 h-5 text-indigo-600" />,
      controls_frequency: <ClipboardCheck className="w-5 h-5 text-blue-600" />,
      herd_growth_rate: <TrendingUp className="w-5 h-5 text-emerald-700" />,
      alert_pressure: <AlertTriangle className="w-5 h-5 text-red-500" />,
      task_load_index: <ListChecks className="w-5 h-5 text-orange-600" />,
    }),
    []
  );

  // Generación de tarjetas del dashboard usando estadísticas completas del backend
  const renderCompleteStatsCards = () => (
    <div className="space-y-6">
      {kpiCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                KPIs de salud y operación
              </CardTitle>
              {kpiResumen?.ventana_dias && (
                <CardDescription className="text-xs">
                  Ventana móvil de {kpiResumen.ventana_dias} días
                </CardDescription>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {kpiCards.map((card) => {
              const isBadWhenHigher =
                card.id === 'mortality_rate_30d' ||
                card.id === 'sales_rate_30d' ||
                card.id === 'alert_pressure' ||
                card.id === 'task_load_index';
              const goodWhenHigher = !isBadWhenHigher;
              const iconNode =
                kpiIconMap[card.id] ?? (card.icono ? <span>{card.icono}</span> : null);
              const unit = card.unidad || undefined;
              const value =
                typeof card.valor === 'number' && unit === '%'
                  ? card.valor.toFixed(1)
                  : card.valor;

              return (
                <KPICard
                  key={card.id}
                  title={card.titulo}
                  value={value}
                  unit={unit}
                  change={card.cambio}
                  icon={iconNode}
                  subtitle={card.descripcion}
                  goodWhenHigher={goodWhenHigher}
                />
              );
            })}
          </div>
        </div>
      )}
      {/* Errores del endpoint completo */}
      {completeError && (
        <Alert>
          <AlertDescription>
            Error cargando estadísticas: {completeError.message}
            <Button variant="link" onClick={() => refetchComplete()} className="ml-2">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Resumen General */}
      <DashboardStatsGrid>
        <DashboardStatsCard title="Usuarios Registrados" icon={Users} stat={completeStats?.usuarios_registrados} description="Total de usuarios" onClick={() => navigate('/admin/users')} />
        <DashboardStatsCard title="Usuarios Activos" icon={Users} stat={completeStats?.usuarios_activos} description="Actividad reciente (30 días)" onClick={() => navigate('/admin/users?filter=active')} />
        <DashboardStatsCard title="Animales Registrados" icon={Building2} stat={completeStats?.animales_registrados} description="Total de animales" onClick={() => navigate('/admin/animals')} />
        <DashboardStatsCard title="Animales Activos" icon={Building2} stat={completeStats?.animales_activos} description="En seguimiento" onClick={() => navigate('/admin/animals')} />
        <DashboardStatsCard title="Tratamientos Activos" icon={ClipboardList} stat={completeStats?.tratamientos_activos} description="En proceso" onClick={() => navigate('/admin/treatments')} />
        <DashboardStatsCard title="Tratamientos Totales" icon={ClipboardList} stat={completeStats?.tratamientos_totales} description="Histórico" onClick={() => navigate('/admin/treatments')} />
        <DashboardStatsCard title="Vacunas Aplicadas" icon={ClipboardList} stat={completeStats?.vacunas_aplicadas} description="Total histórico" onClick={() => navigate('/admin/vaccinations')} />
        <DashboardStatsCard title="Controles Realizados" icon={ClipboardList} stat={completeStats?.controles_realizados} description="Sanidad" onClick={() => navigate('/admin/control')} />
      </DashboardStatsGrid>

      {/* Operación */}
      <DashboardStatsGrid>
        <DashboardStatsCard title="Potreros" icon={Building2} stat={completeStats?.campos_registrados} description="Campos registrados" onClick={() => navigate('/admin/fields')} />
        <DashboardStatsCard title="Tareas Pendientes" icon={AlertTriangle} stat={completeStats?.tareas_pendientes} description="Requieren atención" />
        <DashboardStatsCard title="Alertas del Sistema" icon={AlertTriangle} stat={completeStats?.alertas_sistema} description="Notificaciones" />
        <DashboardStatsCard title="Mejoras Genéticas" icon={ClipboardList} stat={completeStats?.mejoras_geneticas} description="Programas activos" onClick={() => navigate('/admin/genetic_improvements')} />
      </DashboardStatsGrid>

      {/* Catálogos */}
      <DashboardStatsGrid columns={3}>
        <DashboardStatsCard title="Vacunas" icon={ClipboardList} stat={completeStats?.catalogo_vacunas} description="Catálogo" onClick={() => navigate('/admin/vaccines')} />
        <DashboardStatsCard title="Medicamentos" icon={ClipboardList} stat={completeStats?.catalogo_medicamentos} description="Catálogo" onClick={() => navigate('/admin/medications')} />
        <DashboardStatsCard title="Enfermedades" icon={ClipboardList} stat={completeStats?.catalogo_enfermedades} description="Catálogo" onClick={() => navigate('/admin/diseases')} />
        <DashboardStatsCard title="Especies" icon={ClipboardList} stat={completeStats?.catalogo_especies} description="Catálogo" onClick={() => navigate('/admin/species')} />
        <DashboardStatsCard title="Razas" icon={ClipboardList} stat={completeStats?.catalogo_razas} description="Catálogo" onClick={() => navigate('/admin/breeds')} />
        <DashboardStatsCard title="Tipos de Alimento" icon={ClipboardList} stat={completeStats?.catalogo_tipos_alimento} description="Catálogo" onClick={() => navigate('/admin/food-types')} />
      </DashboardStatsGrid>

      {/* Relaciones y Tratamientos */}
      <DashboardStatsGrid columns={3}>
        <DashboardStatsCard title="Animales por Campo" icon={ClipboardList} stat={completeStats?.animales_por_campo} description="Distribución" onClick={() => navigate('/admin/animal-fields')} />
        <DashboardStatsCard title="Animales por Enfermedad" icon={ClipboardList} stat={completeStats?.animales_por_enfermedad} description="Sanidad" onClick={() => navigate('/admin/disease-animals')} />
        <DashboardStatsCard title="Tratamientos con Medicamentos" icon={ClipboardList} stat={completeStats?.tratamientos_medicamentos} description="Aplicados" onClick={() => navigate('/admin/treatment_medications')} />
        <DashboardStatsCard title="Tratamientos con Vacunas" icon={ClipboardList} stat={completeStats?.tratamientos_vacunas} description="Aplicados" onClick={() => navigate('/admin/treatment_vaccines')} />
      </DashboardStatsGrid>
    </div>
  );

  // Renderizar contenido de la pestaña de resumen
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas con skeleton screen mejorado */}
      {(completeLoading || isInitialLoad) ? (
        <DashboardStatsGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </DashboardStatsGrid>
      ) : (
        <Suspense fallback={Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}>
          {renderCompleteStatsCards()}
        </Suspense>
      )}

      {/* Alertas del sistema */}
      {hasPermission('system:read') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.alerts.title')}</CardTitle>
              <CardDescription>{t('dashboard.alerts.description')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  {uniquePriorities.map((p) => (
                    <SelectItem key={p!} value={p!}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterType('all')
                  setFilterPriority('all')
                }}
              >
                Limpiar filtros
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={markAllAlertsAsRead}
                disabled={alerts.filter(a => !a.isRead).length === 0}
              >
                {t('dashboard.actions.markAllRead')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('dashboard.alerts.noAlerts')}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onMarkRead={markAlertAsRead}
                    onNavigate={navigate}
                    colorToClasses={colorToClasses}
                    renderIcon={renderAlertIcon}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usuarios recientes */}
      {hasPermission('user:read') && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentUsers.title')}</CardTitle>
            <CardDescription>{t('dashboard.recentUsers.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonTable rows={5} />
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('dashboard.recentUsers.noUsers')}
              </div>
            ) : (
              <div className="space-y-3">
                {users.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {user.username?.charAt?.(0)?.toUpperCase?.() ?? '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                      {user.lastLogin && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/users')}
                >
                  {t('dashboard.recentUsers.viewAll')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  // Renderizar contenido de la pestaña de sistema
  const renderSystemTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.system.title')}</CardTitle>
          <CardDescription>{t('dashboard.system.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('dashboard.system.version')}</span>
                <Badge variant="outline">1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('dashboard.system.environment')}</span>
                <Badge variant={import.meta.env.MODE === 'development' ? 'default' : 'secondary'}>
                  {import.meta.env.MODE}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('dashboard.system.lastUpdate')}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('dashboard.system.database')}</span>
                <Badge variant="outline">PostgreSQL</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('dashboard.system.storage')}</span>
                <Badge variant="outline">75% used</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('dashboard.system.apiStatus')}</span>
                <Badge variant="default" className="bg-green-500">
                  {t('common.online')}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.system.performance.title')}</CardTitle>
          <CardDescription>{t('dashboard.system.performance.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{t('dashboard.system.performance.cpu')}</span>
                <span className="text-sm text-muted-foreground">45%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{t('dashboard.system.performance.memory')}</span>
                <span className="text-sm text-muted-foreground">62%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '62%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{t('dashboard.system.performance.disk')}</span>
                <span className="text-sm text-muted-foreground">75%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Renderizar contenido de la pestaña de configuración
  const renderSettingsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.settings.title')}</CardTitle>
          <CardDescription>{t('dashboard.settings.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('dashboard.settings.notifications')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('dashboard.settings.notificationsDesc')}
                </div>
              </div>
              <Button variant="outline" size="sm">
                {t('common.configure')}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('dashboard.settings.security')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('dashboard.settings.securityDesc')}
                </div>
              </div>
              <Button variant="outline" size="sm">
                {t('common.configure')}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('dashboard.settings.appearance')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('dashboard.settings.appearanceDesc')}
                </div>
              </div>
              <Button variant="outline" size="sm">
                {t('common.configure')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.activity.title')}</CardTitle>
          <CardDescription>{t('dashboard.activity.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{t('dashboard.activity.itemTitle', 'Actualización del sistema')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('dashboard.activity.itemDesc', 'Se aplicaron mejoras de rendimiento y correcciones de errores')}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="overflow-x-auto flex-wrap sm:flex-nowrap max-w-full">
          <TabsTrigger value="overview">{t('dashboard.tabs.overview', 'Resumen')}</TabsTrigger>
          <TabsTrigger value="system">{t('dashboard.tabs.system', 'Sistema')}</TabsTrigger>
          <TabsTrigger value="settings">{t('dashboard.tabs.settings', 'Ajustes')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>
        <TabsContent value="system">
          {renderSystemTab()}
        </TabsContent>
        <TabsContent value="settings">
          {renderSettingsTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
