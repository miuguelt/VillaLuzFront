import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import { useModelStats } from '../../../hooks/useModelStats';
import { useDashboardCounts } from '../../../hooks/useDashboardCounts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Loader2, Users, Building2, ClipboardList, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import StatisticsCard from '../../../components/dashboard/StatisticsCard';
// Correcting the import and usage of permissions
import { usePermissions } from '@/hooks/useJWT';
import api, { unwrapApi } from '@/services/api';
import { useT } from '@/i18n';
import axios from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton';

// Lazy load de componentes pesados para mejorar tiempo de carga inicial
const StatisticsCardLazy = lazy(() => import('../../../components/dashboard/StatisticsCard'));

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

  // Cargar estadísticas de forma escalonada para mejorar percepción de velocidad
  const { data: stats, loading: statsLoading, error: statsError, refresh: refetch } = useModelStats('dashboard');
  const { counts, loading: countsLoading, error: countsError } = useDashboardCounts();
  // Cargar estadísticas adicionales SOLO cuando el tab activo las requiera (lazy loading de datos)
  const shouldLoadDetailedStats = activeTab === 'overview';
  const { data: healthStats } = useModelStats<any>('health', { enabled: shouldLoadDetailedStats });
  const { data: productionStats } = useModelStats<any>('production', { enabled: shouldLoadDetailedStats });

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
      const res = await api.get('/users')
      const data: User[] = unwrapApi<User[]>(res)
      setUsers(data)
      setSystemStats(prev => ({
        ...prev,
        totalUsers: data.length,
        activeUsers: data.filter((u: User) => u.isActive).length,
      }))
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
      const res = await api.get('/analytics/alerts', { params: { limit: 50 } })
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

  // Cargar datos iniciales de forma escalonada (solo una vez por cambio de sesión/permisos relevantes)
  useEffect(() => {
    if (user && canReadDashboard && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true
      // Resetear estado de reintento único por sesión
      hasRetriedUsersRef.current = false
      if (usersRetryTimeoutRef.current) {
        clearTimeout(usersRetryTimeoutRef.current)
        usersRetryTimeoutRef.current = null
      }
      // Cargar datos críticos primero
      setTimeout(() => {
        fetchUsers()
      }, 0)
      // Cargar alertas después con delay para no bloquear el render inicial
      setTimeout(() => {
        fetchAlerts()
        setIsInitialLoad(false)
      }, 500)
    }
  }, [user, canReadDashboard, fetchUsers, fetchAlerts])

  // Cleanup de timeouts programados
  useEffect(() => {
    return () => {
      if (usersRetryTimeoutRef.current) {
        clearTimeout(usersRetryTimeoutRef.current)
        usersRetryTimeoutRef.current = null
      }
    }
  }, [])

  // Actualizar estadísticas cuando cambian los datos de la API (con guard para evitar loops)
  const statsUpdateRef = useRef(false);
  useEffect(() => {
    if (stats && Object.keys(stats).length > 0 && !statsUpdateRef.current) {
      statsUpdateRef.current = true;
      setSystemStats(prev => ({
        ...prev,
        totalAnimals: stats.total_animals || 0,
        activeTreatments: stats.summary?.active_treatments || 0,
        pendingTasks: stats.summary?.pending_vaccinations || 0,
      }));
    }
  }, [stats]);

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

  // Generar tarjetas del dashboard
  const generateDashboardCards = (): DashboardCard[] => {
    const baseCards: DashboardCard[] = [
      {
        id: 'total-users',
        title: t('dashboard.cards.totalUsers'),
        description: t('dashboard.cards.totalUsersDesc'),
        icon: <Users className="h-5 w-5" />,
        value: counts.usersRegistered ?? systemStats.totalUsers,
        trend: {
          value: 12,
          isPositive: true,
        },
        href: '/admin/users',
      },
      {
        id: 'active-users',
        title: t('dashboard.cards.activeUsers'),
        description: t('dashboard.cards.activeUsersDesc'),
        icon: <Users className="h-5 w-5" />,
        value: counts.usersActive ?? systemStats.activeUsers,
        trend: {
          value: 8,
          isPositive: true,
        },
        href: '/admin/users?filter=active',
      },
      {
        id: 'total-animals',
        title: t('dashboard.cards.totalAnimals'),
        description: t('dashboard.cards.totalAnimalsDesc'),
        icon: <Building2 className="h-5 w-5" />,
        value: counts.animalsRegistered ?? systemStats.totalAnimals,
        trend: {
          value: stats?.animalGrowthRate || 0,
          isPositive: true,
        },
        href: '/admin/animals',
      },
      {
        id: 'active-treatments',
        title: t('dashboard.cards.activeTreatments'),
        description: t('dashboard.cards.activeTreatmentsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.activeTreatments ?? systemStats.activeTreatments,
        trend: {
          value: stats?.treatmentChangeRate || 0,
          isPositive: false,
        },
        href: '/admin/treatments',
      },
    ];

    // Agregar tarjeta de tareas pendientes si hay permiso
    if (hasPermission('task:read')) {
      baseCards.push({
        id: 'pending-tasks',
        title: t('dashboard.cards.pendingTasks'),
        description: t('dashboard.cards.pendingTasksDesc'),
        icon: <AlertTriangle className="h-5 w-5" />,
        value: counts.pendingTasks ?? systemStats.pendingTasks,
        trend: {
          value: 5,
          isPositive: false,
        },
        // No hay ruta de tareas en AppRoutes; se deja sin navegación
        href: undefined,
      });
    }

    // Agregar tarjeta de alertas del sistema si hay permiso
    if (hasPermission('system:read')) {
      baseCards.push({
        id: 'system-alerts',
        title: t('dashboard.cards.systemAlerts'),
        description: t('dashboard.cards.systemAlertsDesc'),
        icon: <AlertTriangle className="h-5 w-5" />,
        value: (counts.systemAlerts || systemStats.systemAlerts || 0),
        trend: {
          value: 3,
          isPositive: false,
        },
        // No existe ruta dedicada; se deja sin navegación
        href: undefined,
      });
    }

    // Cards adicionales para visión general (salud y producción)
    baseCards.push(
      {
        id: 'total-treatments',
        title: t('dashboard.cards.totalTreatments'),
        description: t('dashboard.cards.totalTreatmentsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.treatmentsTotal ?? (healthStats?.summary?.total_treatments ?? 0),
        trend: {
          value: stats?.treatmentChangeRate || 0,
          isPositive: (stats?.treatmentChangeRate ?? 0) >= 0,
        },
        href: '/admin/treatments',
      },
      {
        id: 'total-vaccinations',
        title: t('dashboard.cards.totalVaccinations'),
        description: t('dashboard.cards.totalVaccinationsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.vaccinationsApplied ?? (healthStats?.summary?.total_vaccinations ?? 0),
        trend: {
          value: stats?.vaccinationChangeRate || 0,
          isPositive: (stats?.vaccinationChangeRate ?? 0) >= 0,
        },
        href: '/admin/vaccinations',
      },
      {
        id: 'total-controls',
        title: t('dashboard.cards.totalControls'),
        description: t('dashboard.cards.totalControlsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.controlsPerformed ?? (productionStats?.summary?.total_controls ?? 0),
        trend: {
          value: stats?.controlsChangeRate || 0,
          isPositive: (stats?.controlsChangeRate ?? 0) >= 0,
        },
        href: '/admin/control',
      },
      {
        id: 'total-fields',
        title: t('dashboard.cards.totalFields'),
        description: t('dashboard.cards.totalFieldsDesc'),
        icon: <Building2 className="h-5 w-5" />,
        value: counts.fieldsRegistered ?? (productionStats?.summary?.total_fields ?? 0),
        trend: {
          value: stats?.fieldsChangeRate || 0,
          isPositive: (stats?.fieldsChangeRate ?? 0) >= 0,
        },
        href: '/admin/fields',
      }
    );

    // Catálogos y relaciones (enlazan a listas de modelos)
    baseCards.push(
      {
        id: 'catalog-vaccines',
        title: t('dashboard.cards.vaccines'),
        description: t('dashboard.cards.vaccinesDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.vaccinesCount ?? 0,
        href: '/admin/vaccines',
      },
      {
        id: 'catalog-medications',
        title: t('dashboard.cards.medications'),
        description: t('dashboard.cards.medicationsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.medicationsCount ?? 0,
        href: '/admin/medications',
      },
      {
        id: 'catalog-diseases',
        title: t('dashboard.cards.diseases'),
        description: t('dashboard.cards.diseasesDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.diseasesCount ?? 0,
        href: '/admin/diseases',
      },
      {
        id: 'catalog-species',
        title: t('dashboard.cards.species'),
        description: t('dashboard.cards.speciesDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.speciesCount ?? 0,
        href: '/admin/species',
      },
      {
        id: 'catalog-breeds',
        title: t('dashboard.cards.breeds'),
        description: t('dashboard.cards.breedsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.breedsCount ?? 0,
        href: '/admin/breeds',
      },
      {
        id: 'relations-animal-fields',
        title: t('dashboard.cards.animalFields'),
        description: t('dashboard.cards.animalFieldsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.animalFieldsCount ?? 0,
        href: '/admin/animal-fields',
      },
      {
        id: 'relations-disease-animals',
        title: t('dashboard.cards.diseaseAnimals'),
        description: t('dashboard.cards.diseaseAnimalsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.animalDiseasesCount ?? 0,
        href: '/admin/disease-animals',
      },
      {
        id: 'genetic-improvements',
        title: t('dashboard.cards.geneticImprovements'),
        description: t('dashboard.cards.geneticImprovementsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.geneticImprovementsCount ?? 0,
        href: '/admin/genetic_improvements',
      },
      {
        id: 'treatment-medications',
        title: t('dashboard.cards.treatmentMedications'),
        description: t('dashboard.cards.treatmentMedicationsDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.treatmentMedicationsCount ?? 0,
        href: '/admin/treatment_medications',
      },
      {
        id: 'treatment-vaccines',
        title: t('dashboard.cards.treatmentVaccines'),
        description: t('dashboard.cards.treatmentVaccinesDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.treatmentVaccinesCount ?? 0,
        href: '/admin/treatment_vaccines',
      },
      {
        id: 'catalog-food-types',
        title: t('dashboard.cards.foodTypes'),
        description: t('dashboard.cards.foodTypesDesc'),
        icon: <ClipboardList className="h-5 w-5" />,
        value: counts.foodTypesCount ?? 0,
        href: '/admin/food-types',
      }
    );

    return baseCards;
  };

  // Renderizar contenido de la pestaña de resumen
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas con skeleton screen mejorado */}
      {countsError && (
        <Alert>
          <AlertDescription>
            {t('common.error')}: {String(countsError)}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(countsLoading || statsLoading || isInitialLoad) ? (
          // Skeleton screen para mejor UX durante carga
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <Suspense fallback={Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}>
            {generateDashboardCards().map((card) => (
              <StatisticsCard
                key={card.id}
                title={card.title}
                description={card.description}
                icon={card.icon}
                value={card.value}
                trend={card.trend}
                onClick={card.href ? () => navigate(card.href!) : undefined}
              />
            ))}
          </Suspense>
        )}
      </div>

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
                  <Alert
                    key={alert.id}
                    className={`${colorToClasses(alert.color)} ${alert.isRead ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {renderAlertIcon(alert)}
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
                                onClick={() => navigate(`/admin/animals?q=${encodeURIComponent(alert.animal_record || String(alert.animal_id))}`)}
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
                          onClick={() => markAlertAsRead(alert.id)}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Alert>
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
        <TabsList>
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
