import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStatsCard, DashboardStatsGrid } from '@/components/dashboard/DashboardStatsCard';
import { useCompleteDashboardStats, getStatValue } from '@/hooks/useCompleteDashboardStats';
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

const InstructorDashboard: React.FC = () => {
  const { stats, loading, error, refetch, lastUpdated } = useCompleteDashboardStats();
  const navigate = useNavigate();

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
              Panel de Instructor
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
                onClick={() => navigate('/instructor/animals')}
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
                onClick={() => navigate('/instructor/treatments')}
              />
              <DashboardStatsCard
                title="Vacunas Aplicadas"
                icon={Syringe}
                stat={stats?.vacunas_aplicadas}
                description="Total histórico"
                onClick={() => navigate('/instructor/vaccinations')}
              />
              <DashboardStatsCard
                title="Controles Realizados"
                icon={FileCheck}
                stat={stats?.controles_realizados}
                description="Controles sanitarios"
                onClick={() => navigate('/instructor/controls')}
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
                onClick={() => navigate('/instructor/fields')}
              />
              <DashboardStatsCard
                title="Mejoras Genéticas"
                icon={TrendingUp}
                stat={stats?.mejoras_geneticas}
                description="Programas activos"
                onClick={() => navigate('/instructor/genetic-improvements')}
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
                onClick={() => navigate('/instructor/disease-animals')}
              />
              <DashboardStatsCard
                title="Catálogo Enfermedades"
                icon={AlertTriangle}
                stat={stats?.catalogo_enfermedades}
                description="Enfermedades registradas"
                onClick={() => navigate('/instructor/diseases')}
              />
              <DashboardStatsCard
                title="Catálogo Medicamentos"
                icon={Pill}
                stat={stats?.catalogo_medicamentos}
                description="Medicamentos disponibles"
                onClick={() => navigate('/instructor/medications')}
              />
              <DashboardStatsCard
                title="Catálogo Vacunas"
                icon={Syringe}
                stat={stats?.catalogo_vacunas}
                description="Vacunas registradas"
                onClick={() => navigate('/instructor/vaccines')}
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
                onClick={() => navigate('/instructor/species-breeds')}
              />
              <DashboardStatsCard
                title="Razas"
                icon={TrendingUp}
                stat={stats?.catalogo_razas}
                description="Razas disponibles"
                onClick={() => navigate('/instructor/species-breeds')}
              />
              <DashboardStatsCard
                title="Tipos de Alimento"
                icon={Leaf}
                stat={stats?.catalogo_tipos_alimento}
                description="Alimentos disponibles"
                onClick={() => navigate('/instructor/food-types')}
              />
              <DashboardStatsCard
                title="Ubicación Animales"
                icon={Map}
                stat={stats?.animales_por_campo}
                description="Distribución en potreros"
                onClick={() => navigate('/instructor/animal-fields')}
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

export default InstructorDashboard;
