import React, { useMemo } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import KPICard from '@/components/analytics/KPICard';
import AlertCard from '@/components/analytics/AlertCard';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { COLORS, getChartColors } from '@/utils/colors';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { KpiCardSummary } from '@/hooks/useCompleteDashboardStats';
import {
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Skull,
  ShoppingCart,
  Pill,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  ListChecks,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardExecutive: React.FC = () => {
  const {
    useDashboard,
    useAnimalStatistics,
    useHealthStatistics,
    useProductionStatistics,
    useAlerts,
  } = useAnalytics();

  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const {
    data: animalStats,
    isLoading: loadingAnimalStats,
  } = useAnimalStatistics();
  const {
    data: healthStats,
    isLoading: loadingHealthStats,
  } = useHealthStatistics();
  const {
    data: productionStats,
    isLoading: loadingProductionStats,
  } = useProductionStatistics();
  const { data: alerts, isLoading: loadingAlerts } = useAlerts({
    priority: 'critical',
    limit: 5,
  });

  const kpiResumen = dashboard?.kpi_resumen;
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

  const kpiIconMap = useMemo<Record<string, React.ReactNode>>(
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

  if (loadingDashboard) {
    return <LoadingDashboard />;
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  const totalesSexo = {
    machos: dashboard.distribucion_sexo?.machos || animalStats?.by_gender?.Macho || 0,
    hembras: dashboard.distribucion_sexo?.hembras || animalStats?.by_gender?.Hembra || 0,
  };

  const sexDistributionData = {
    labels: ['Machos', 'Hembras'],
    datasets: [
      {
        data: [totalesSexo.machos, totalesSexo.hembras],
        backgroundColor: [COLORS.animals.male, COLORS.animals.female],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const statusChartData =
    animalStats?.by_status && Object.keys(animalStats.by_status).length > 0
      ? {
          labels: Object.keys(animalStats.by_status),
          datasets: [
            {
              label: 'Animales',
              data: Object.values(animalStats.by_status),
              backgroundColor: getChartColors(Object.keys(animalStats.by_status).length),
              borderRadius: 6,
            },
          ],
        }
      : null;

  const ageDistributionData =
    animalStats?.age_distribution && animalStats.age_distribution.length > 0
      ? {
          labels: animalStats.age_distribution.map((item) => item.age_range),
          datasets: [
            {
              label: 'Cantidad',
              data: animalStats.age_distribution.map((item) => item.count),
              backgroundColor: COLORS.charts.secondary,
              borderRadius: 4,
            },
          ],
        }
      : null;

  const topBreeds =
    animalStats?.by_breed?.length
      ? animalStats.by_breed
      : dashboard.distribucion_razas_top5 || [];

  const enfermedadesComunes = healthStats?.common_diseases || [];
  const fechaActualizacion = dashboard.generated_at
    ? new Date(dashboard.generated_at)
    : undefined;

  // KPIs derivados del backend (no usan hooks adicionales para evitar violar reglas de hooks)
  const percentageKpis = kpiCards.filter((card) =>
    [
      'health_index',
      'vaccination_coverage',
      'control_compliance',
      'mortality_rate_30d',
      'sales_rate_30d',
      'alert_pressure',
      'task_load_index',
    ].includes(card.id)
  );

  const intensityKpis = kpiCards.filter((card) =>
    ['treatments_intensity', 'controls_frequency', 'herd_growth_rate'].includes(card.id)
  );

  const healthTimeSeries = (() => {
    const treatments = healthStats?.treatments_by_month || [];
    const vaccinations = healthStats?.vaccinations_by_month || [];
    if (!treatments.length && !vaccinations.length) return null;
    // Unificar etiquetas por periodo
    const labels = Array.from(
      new Set([
        ...treatments.map((i: any) => i.period),
        ...vaccinations.map((i: any) => i.period),
      ])
    ).sort();

    const mapSeries = (src: any[]) =>
      labels.map((p) => src.find((i) => i.period === p)?.count ?? 0);

    return {
      labels,
      datasets: [
        {
          label: 'Tratamientos',
          data: mapSeries(treatments),
          borderColor: COLORS.charts.primary,
          backgroundColor: COLORS.charts.primary,
          tension: 0.25,
          fill: false,
        },
        {
          label: 'Vacunaciones',
          data: mapSeries(vaccinations),
          borderColor: COLORS.charts.secondary,
          backgroundColor: COLORS.charts.secondary,
          tension: 0.25,
          fill: false,
        },
      ],
    };
  })();

  const weightTrendSeries = (() => {
    const trends = productionStats?.weight_trends || [];
    if (!trends.length) return null;
    const labels = trends.map(
      (t: any) => t.period ?? `${t.year}-${String(t.month).padStart(2, '0')}`
    );
    const data = trends.map((t: any) => t.avg_weight ?? 0);
    return {
      labels,
      datasets: [
        {
          label: 'Peso promedio (kg)',
          data,
          borderColor: COLORS.charts.primary,
          backgroundColor: COLORS.charts.primary,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  })();

  const formatNumber = (value?: number, options?: Intl.NumberFormatOptions) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '0';
    return Number(value).toLocaleString('es-CO', options);
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Panel integral de analítica</h1>
        <p className="text-muted-foreground mt-2">
          Monitorea inventario, salud, producción y alertas en tiempo real
        </p>
        {fechaActualizacion && (
          <p className="text-xs text-muted-foreground mt-1">
            Última actualización:{' '}
            {format(fechaActualizacion, "d 'de' MMMM, h:mm a", { locale: es })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.length > 0
          ? kpiCards.slice(0, 4).map((card) => {
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
                  loading={loadingDashboard}
                />
              );
            })
          : (
            <>
              <KPICard
                title="Animales registrados"
                value={dashboard.animales_registrados?.valor || 0}
                change={dashboard.animales_registrados?.cambio_porcentual}
                icon="🐄"
                loading={loadingDashboard}
              />
              <KPICard
                title="Animales vivos"
                value={dashboard.animales_activos?.valor || 0}
                change={dashboard.animales_activos?.cambio_porcentual}
                icon="💚"
                loading={loadingDashboard}
              />
              <KPICard
                title="Índice de salud"
                value={`${
                  (dashboard.distribucion_salud?.excelente || 0) +
                  (dashboard.distribucion_salud?.bueno || 0)
                }/${dashboard.animales_activos?.valor || 0}`}
                icon="🏥"
                loading={loadingDashboard}
                subtitle="Animales en condición óptima"
              />
              <KPICard
                title="Alertas activas"
                value={dashboard.alertas_sistema?.valor || 0}
                change={dashboard.alertas_sistema?.cambio_porcentual}
                icon="🔔"
                loading={loadingDashboard}
              />
            </>
          )}
      </div>

      {/* Visualización de KPIs como gauges (torta/oscilador) */}
      {percentageKpis.length > 0 && (
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Estado general del hato (KPIs porcentuales)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {percentageKpis.map((card) => {
              const unit = card.unidad || '%';
              const raw = typeof card.valor === 'number' ? card.valor : Number(card.valor) || 0;
              const clamped = Math.max(0, Math.min(raw, 100));
              const data = {
                labels: ['Valor', 'Resto'],
                datasets: [
                  {
                    data: [clamped, 100 - clamped],
                    backgroundColor: [COLORS.charts.primary, '#E5E7EB'],
                    borderWidth: 0,
                  },
                ],
              };
              const isBadWhenHigher =
                card.id === 'mortality_rate_30d' ||
                card.id === 'sales_rate_30d' ||
                card.id === 'alert_pressure' ||
                card.id === 'task_load_index';
              const goodWhenHigher = !isBadWhenHigher;
              const iconNode =
                kpiIconMap[card.id] ||
                (card.icono ? <span className="text-lg">{card.icono}</span> : null);

              return (
                <div key={card.id} className="flex flex-col items-center gap-2">
                  <div className="w-32 h-32">
                    <Doughnut
                      data={data}
                      options={{
                        cutout: '70%',
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.parsed}%`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="text-center space-y-1 text-card-foreground">
                    <div className="flex items-center justify-center gap-1 text-sm font-medium">
                      {iconNode}
                      <span>{card.titulo}</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {clamped.toFixed(1)}
                      {unit}
                    </div>
                    {typeof card.cambio === 'number' && (
                      <div className="text-xs">
                        <span
                          className={
                            (goodWhenHigher ? card.cambio >= 0 : card.cambio <= 0)
                              ? 'text-success-600'
                              : 'text-danger-600'
                          }
                        >
                          {card.cambio > 0 ? '+' : ''}
                          {card.cambio.toFixed(1)} pts
                        </span>{' '}
                        vs periodo anterior
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparación de intensidad/frecuencia/growth por periodo */}
      {intensityKpis.length > 0 && (
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Intensidad de manejo (aceleración de actividades)
          </h2>
          <div className="h-80">
            <Bar
              data={{
                labels: intensityKpis.map((c) => c.titulo),
                datasets: [
                  {
                    label: 'Periodo actual',
                    data: intensityKpis.map((c) => c.tendencia?.periodo_actual ?? c.valor ?? 0),
                    backgroundColor: COLORS.charts.primary,
                  },
                  {
                    label: 'Periodo anterior',
                    data: intensityKpis.map((c) => c.tendencia?.periodo_anterior ?? 0),
                    backgroundColor: COLORS.charts.secondary,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Distribución por sexo</h2>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={sexDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const total = totalesSexo.machos + totalesSexo.hembras;
                        const percentage =
                          total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Estado de los animales</h2>
          <div className="h-64">
            {loadingAnimalStats ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Cargando estadísticas...
              </div>
            ) : statusChartData ? (
              <Bar
                data={statusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No hay datos de distribución por estado.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Resumen de inventario</h2>
          <div className="space-y-5">
            <QuickStat
              label="Total de animales"
              value={formatNumber(animalStats?.total ?? dashboard.animales_activos?.valor)}
              icon="🐮"
            />
            <QuickStat
              label="Peso promedio"
              value={
                animalStats?.average_weight ? `${animalStats.average_weight.toFixed(1)} kg` : '—'
              }
              icon="⚖️"
            />
            <QuickStat
              label="Animales por especie"
              value={dashboard.catalogo_especies?.valor || 0}
              icon="🧬"
            />
            <QuickStat
              label="Campos monitoreados"
              value={dashboard.campos_registrados?.valor || productionStats?.total_fields || 0}
              icon="🌱"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pirámide de edades</h2>
          <div className="h-64">
            {loadingAnimalStats ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Cargando distribución de edades...
              </div>
            ) : ageDistributionData ? (
              <Bar
                data={ageDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No hay datos de edades.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Razas destacadas</h2>
          {topBreeds && topBreeds.length > 0 ? (
            <div className="space-y-4">
              {topBreeds.slice(0, 5).map((breed: any, index: number) => {
                const nombre = breed.breed_name || breed.raza || breed.name || `Raza ${index + 1}`;
                const cantidad = breed.count ?? breed.cantidad ?? 0;
                const totalAnimales = animalStats?.total || dashboard.animales_activos?.valor || 1;
                const porcentaje = ((cantidad / totalAnimales) * 100).toFixed(1);
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm font-medium text-card-foreground">
                      <span>{nombre}</span>
                      <span className="text-foreground">{cantidad}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${Math.min(Number(porcentaje), 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {porcentaje}% del inventario
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos de razas.</p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Salud y bienestar</h2>
            <p className="text-sm text-muted-foreground">
              Seguimiento de tratamientos, vacunas y enfermedades recurrentes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Tratamientos registrados"
            value={healthStats?.total_treatments ?? dashboard.tratamientos_totales?.valor ?? 0}
            icon="💊"
            loading={loadingHealthStats}
          />
          <KPICard
            title="Tratamientos activos"
            value={healthStats?.active_treatments ?? dashboard.tratamientos_activos?.valor ?? 0}
            icon="🩺"
            loading={loadingHealthStats}
          />
          <KPICard
            title="Vacunas aplicadas"
            value={healthStats?.total_vaccinations ?? dashboard.vacunas_aplicadas?.valor ?? 0}
            icon="💉"
            loading={loadingHealthStats}
          />
          <KPICard
            title="Vacunas pendientes"
            value={healthStats?.pending_vaccinations ?? 0}
            icon="📅"
            loading={loadingHealthStats}
          />
        </div>

        {/* Evolución de tratamientos y vacunaciones */}
        {healthTimeSeries && (
          <div className="h-72 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Evolución de tratamientos y vacunaciones
            </h3>
            <Line
              data={healthTimeSeries}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ProgressMetric
              label="Índice de éxito en tratamientos"
              value={healthStats?.treatment_success_rate ?? 0}
              suffix="%"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Porcentaje de tratamientos concluidos satisfactoriamente.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Enfermedades frecuentes
            </h3>
            {enfermedadesComunes.length > 0 ? (
              <ul className="space-y-2">
                {enfermedadesComunes.slice(0, 5).map((disease, index) => (
                  <li
                    key={`${disease.disease_name}-${index}`}
                    className="flex items-center justify-between text-sm text-card-foreground border-b border-gray-100 pb-2"
                  >
                    <span>{disease.disease_name}</span>
                    <span className="font-semibold text-foreground">{disease.count} casos</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin registros recientes.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Producción y rendimiento</h2>
            <p className="text-sm text-muted-foreground">
              Utilización de potreros y eficiencia general
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Campos registrados"
            value={productionStats?.total_fields ?? dashboard.campos_registrados?.valor ?? 0}
            icon="🏞️"
            loading={loadingProductionStats}
          />
          <KPICard
            title="Animales por campo"
            value={productionStats?.animals_per_field ?? 0}
            icon="🐄"
            loading={loadingProductionStats}
            subtitle="Promedio actual"
          />
          <KPICard
            title="Consumo de alimento"
            value={
              productionStats?.feed_consumption
                ? `${productionStats.feed_consumption} kg`
                : '—'
            }
            icon="🌾"
            loading={loadingProductionStats}
            subtitle="Último período reportado"
          />
          <KPICard
            title="Costos mensuales"
            value={`$ ${formatNumber(productionStats?.monthly_costs)}`}
            icon="💰"
            loading={loadingProductionStats}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ProgressMetric
              label="Utilización de potreros"
              value={productionStats?.field_utilization ?? 0}
              suffix="%"
            />
          </div>
          <div>
            <ProgressMetric
              label="Índice de productividad"
              value={productionStats?.productivity_index ?? 0}
              suffix="%"
            />
          </div>
        </div>

        {/* Curva de peso promedio: aceleración del crecimiento */}
        {weightTrendSeries && (
          <div className="h-72 mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Tendencia de peso promedio (aceleración del crecimiento)
            </h3>
            <Line
              data={weightTrendSeries}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
                scales: {
                  y: { beginAtZero: false },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg shadow p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Alertas críticas</h2>
          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
            {alerts?.alerts?.length || 0} activas
          </span>
        </div>

        {loadingAlerts ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : alerts?.alerts && alerts.alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.alerts.map((alert: any, index: number) => (
              <AlertCard
                key={alert.id || index}
                alert={alert}
                onAction={(alert) => console.log('Action:', alert)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-4xl mb-2">✅</p>
            <p>No hay alertas críticas en este momento</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingDashboard: React.FC = () => (
  <div className="min-h-screen bg-background p-6">
    <div className="mb-8 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
      <div className="h-4 bg-muted rounded w-1/3"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
      ))}
    </div>
  </div>
);

const ProgressMetric: React.FC<{ label: string; value?: number; suffix?: string }> = ({
  label,
  value,
  suffix = '%',
}) => {
  const normalized = value ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="text-foreground">
          {value !== undefined && value !== null ? `${normalized.toFixed(1)}${suffix}` : '—'}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
          style={{ width: `${Math.min(Math.max(normalized, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};

const QuickStat: React.FC<{ label: string; value: string | number; icon?: string }> = ({
  label,
  value,
  icon,
}) => (
  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
    {icon && <span className="text-2xl">{icon}</span>}
  </div>
);

export default DashboardExecutive;
