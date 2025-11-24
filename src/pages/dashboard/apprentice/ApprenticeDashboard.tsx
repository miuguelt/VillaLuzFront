import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStatsCard, DashboardStatsGrid } from '@/components/dashboard/DashboardStatsCard';
import { useCompleteDashboardStats, getStatValue, KpiCardSummary } from '@/hooks/useCompleteDashboardStats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
  Users,
  Heart,
  Activity,
  Syringe,
  Calendar,
  AlertTriangle,
  FileCheck,
  Map,
  Leaf,
  TrendingUp,
  TestTube,
  Pill,
  RefreshCw,
} from 'lucide-react';
import KPICard from '@/components/analytics/KPICard';

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

const ApprenticeDashboard: React.FC = () => {
  const { stats, loading, error, refetch, lastUpdated } = useCompleteDashboardStats();
  const navigate = useNavigate();
  const kpiResumen = stats?.kpi_resumen;
  const rawKpiCards: KpiCardSummary[] = useMemo(
    () => kpiResumen?.cards ?? [],
    [kpiResumen]
  );
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
  const kpiIconMap = useMemo<Record<string, React.ReactNode>>(
    () => ({
      health_index: <Heart className="w-5 h-5 text-red-500" />,
      vaccination_coverage: <Syringe className="w-5 h-5 text-emerald-600" />,
      control_compliance: <FileCheck className="w-5 h-5 text-sky-600" />,
      mortality_rate_30d: <AlertTriangle className="w-5 h-5 text-zinc-600" />,
      sales_rate_30d: <TrendingUp className="w-5 h-5 text-amber-600" />,
      treatments_intensity: <Pill className="w-5 h-5 text-indigo-600" />,
      controls_frequency: <Calendar className="w-5 h-5 text-blue-600" />,
      herd_growth_rate: <TrendingUp className="w-5 h-5 text-emerald-700" />,
      alert_pressure: <AlertTriangle className="w-5 h-5 text-red-500" />,
      task_load_index: <FileCheck className="w-5 h-5 text-orange-600" />,
    }),
    []
  );

  if (error) {
    return (
      <div className="bg-background px-4 pt-4 pb-6 sm:pb-8">
        <div className="w-full max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error cargando estadísticas: {error.message}
              <Button variant="link" onClick={() => refetch()} className="ml-2">
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background px-4 pt-0 pb-6 sm:pb-8">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Panel de Aprendiz
            </h1>
            <p className="text-sm text-muted-foreground">
              Resumen de actividades y estadísticas
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Última actualización: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* KPIs clave para el aprendiz (lectura general del hato) */}
        {!loading && kpiCards.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">KPIs del hato (últimos 30 días)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
              {kpiCards.map((card) => {
                const isBadWhenHigher =
                  card.id === 'mortality_rate_30d' ||
                  card.id === 'sales_rate_30d' ||
                  card.id === 'alert_pressure' ||
                  card.id === 'task_load_index';
                const unit = card.unidad || undefined;
                const value =
                  typeof card.valor === 'number' && unit === '%'
                    ? card.valor.toFixed(1)
                    : card.valor;
                const iconNode =
                  kpiIconMap[card.id] ||
                  (card.icono ? <span className="text-lg">{card.icono}</span> : null);

                return (
                  <KPICard
                    key={card.id}
                    title={card.titulo}
                    value={value}
                    unit={unit}
                    change={card.cambio}
                    icon={iconNode}
                    subtitle={card.descripcion}
                    goodWhenHigher={!isBadWhenHigher}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Estadísticas Principales */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Resumen General</h2>
          {loading ? (
            <DashboardStatsGrid>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </DashboardStatsGrid>
          ) : (
            <DashboardStatsGrid>
              <DashboardStatsCard
                title="Animales Registrados"
                icon={Heart}
                stat={stats?.animales_registrados}
                description="Total de animales en el sistema"
                onClick={() => navigate('/apprentice/animals')}
              />
              <DashboardStatsCard
                title="Animales Activos"
                icon={Heart}
                stat={stats?.animales_activos}
                description="Animales en seguimiento"
              />
              <DashboardStatsCard
                title="Tratamientos Activos"
                icon={Activity}
                stat={stats?.tratamientos_activos}
                description="En proceso actualmente"
                onClick={() => navigate('/apprentice/treatments')}
              />
              <DashboardStatsCard
                title="Vacunas Aplicadas"
                icon={Syringe}
                stat={stats?.vacunas_aplicadas}
                description="Total histórico"
                onClick={() => navigate('/apprentice/vaccinations')}
              />
              <DashboardStatsCard
                title="Controles Realizados"
                icon={FileCheck}
                stat={stats?.controles_realizados}
                description="Controles sanitarios"
                onClick={() => navigate('/apprentice/controls')}
              />
              <DashboardStatsCard
                title="Tareas Pendientes"
                icon={AlertTriangle}
                stat={stats?.tareas_pendientes}
                description="Requieren atención"
              />
              <DashboardStatsCard
                title="Potreros"
                icon={Map}
                stat={stats?.campos_registrados}
                description="Terrenos disponibles"
                onClick={() => navigate('/apprentice/fields')}
              />
              <DashboardStatsCard
                title="Mejoras Genéticas"
                icon={TrendingUp}
                stat={stats?.mejoras_geneticas}
                description="Programas activos"
                onClick={() => navigate('/apprentice/genetic-improvements')}
              />
            </DashboardStatsGrid>
          )}
        </div>

        {/* Sección de Sanidad */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Sanidad Animal</h2>
          {loading ? (
            <DashboardStatsGrid columns={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </DashboardStatsGrid>
          ) : (
            <DashboardStatsGrid columns={3}>
              <DashboardStatsCard
                title="Animales Enfermos"
                icon={HeartPulse}
                stat={stats?.animales_por_enfermedad}
                description="Requieren tratamiento"
                onClick={() => navigate('/apprentice/disease-animals')}
              />
              <DashboardStatsCard
                title="Catálogo Enfermedades"
                icon={AlertTriangle}
                stat={stats?.catalogo_enfermedades}
                description="Enfermedades registradas"
                onClick={() => navigate('/apprentice/diseases')}
              />
              <DashboardStatsCard
                title="Catálogo Medicamentos"
                icon={Pill}
                stat={stats?.catalogo_medicamentos}
                description="Medicamentos disponibles"
                onClick={() => navigate('/apprentice/medications')}
              />
              <DashboardStatsCard
                title="Catálogo Vacunas"
                icon={Syringe}
                stat={stats?.catalogo_vacunas}
                description="Vacunas registradas"
                onClick={() => navigate('/apprentice/vaccines')}
              />
              <DashboardStatsCard
                title="Tratamientos Totales"
                icon={Activity}
                stat={stats?.tratamientos_totales}
                description="Histórico completo"
              />
              <DashboardStatsCard
                title="Tratamientos con Medicamentos"
                icon={Pill}
                stat={stats?.tratamientos_medicamentos}
                description="Medicamentos aplicados"
              />
              <DashboardStatsCard
                title="Tratamientos con Vacunas"
                icon={Syringe}
                stat={stats?.tratamientos_vacunas}
                description="Vacunas aplicadas"
              />
            </DashboardStatsGrid>
          )}
        </div>

        {/* Sección de Gestión */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Gestión y Recursos</h2>
          {loading ? (
            <DashboardStatsGrid columns={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </DashboardStatsGrid>
          ) : (
            <DashboardStatsGrid columns={3}>
              <DashboardStatsCard
                title="Especies"
                icon={TestTube}
                stat={stats?.catalogo_especies}
                description="Especies registradas"
                onClick={() => navigate('/apprentice/species-breeds')}
              />
              <DashboardStatsCard
                title="Razas"
                icon={TrendingUp}
                stat={stats?.catalogo_razas}
                description="Razas disponibles"
                onClick={() => navigate('/apprentice/species-breeds')}
              />
              <DashboardStatsCard
                title="Tipos de Alimento"
                icon={Leaf}
                stat={stats?.catalogo_tipos_alimento}
                description="Alimentos disponibles"
                onClick={() => navigate('/apprentice/food-types')}
              />
              <DashboardStatsCard
                title="Ubicación Animales"
                icon={Map}
                stat={stats?.animales_por_campo}
                description="Distribución en potreros"
                onClick={() => navigate('/apprentice/fields')}
              />
              <DashboardStatsCard
                title="Usuarios Activos"
                icon={Users}
                stat={stats?.usuarios_activos}
                description="Personal activo"
              />
              <DashboardStatsCard
                title="Alertas del Sistema"
                icon={AlertTriangle}
                stat={stats?.alertas_sistema}
                description="Notificaciones pendientes"
              />
            </DashboardStatsGrid>
          )}
        </div>

        {/* Card de Información */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
            <CardDescription>
              Las estadísticas se actualizan automáticamente cada 2 minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Sistema Activo
              </Badge>
              <Badge variant="outline">
                Optimizado con caché de 2 minutos
              </Badge>
              <Badge variant="outline">
                {getStatValue(stats?.animales_registrados)} animales monitoreados
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const HeartPulse = ({ className }: { className?: string }) => (
  <Heart className={className} />
);

export default ApprenticeDashboard;
