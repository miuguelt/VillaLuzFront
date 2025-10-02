import React, { useEffect, useState } from 'react';
import StatisticsCard from '@/components/dashboard/StatisticsCard';
import { vaccinationsService, controlService } from '@/services';
import { CalendarClock, Syringe, Activity, ListChecks } from 'lucide-react';
import useModelStats from '@/hooks/useModelStats';

const ApprenticeDashboard = () => {
  const [error, setError] = useState<string | null>(null);
  const [todayVaccinations, setTodayVaccinations] = useState<number>(0);
  const [pendingVaccinations, setPendingVaccinations] = useState<number>(0);
  const [recentControls, setRecentControls] = useState<number>(0);

  const vaccinationStats = useModelStats<any>('vaccinations');

  useEffect(() => {
    let active = true;
    (async () => {
      setError(null);
      try {
        const [vaccinations, controls] = await Promise.all([
          vaccinationsService.getAll().catch(() => []),
          controlService.getAll().catch(() => []),
        ]);
        if (!active) return;
        const today = new Date().toISOString().slice(0, 10);
        setTodayVaccinations(vaccinations.filter((v: any) => (v.vaccination_date || '').startsWith(today)).length);
        setPendingVaccinations(vaccinations.filter((v: any) => ['Programada', 'Pendiente', 'pending'].includes(v.status)).length);
        const seven = Date.now() - (7 * 24 * 60 * 60 * 1000);
        setRecentControls(controls.filter((c: any) => {
          const d = new Date(c.control_date || c.checkup_date || '').getTime();
          return !isNaN(d) && d >= seven;
        }).length);
      } catch (e: any) { if (active) setError(e?.message || 'Error cargando datos'); }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="bg-background px-4 pt-0 pb-6 sm:pb-8">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Syringe className="h-6 w-6" /> Apprentice Panel
            </h1>
            <p className="text-sm text-muted-foreground">Summary of tasks and health activities</p>
          </div>
        </div>

        {error && <div className="p-3 text-sm border border-red-300 bg-red-50 text-red-700 rounded">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatisticsCard
            title="Vaccines Today"
            value={todayVaccinations}
            description="Applied / planned"
            icon={<CalendarClock className="h-4 w-4" />}
            variant="success"
          />
          <StatisticsCard
            title="Pending"
            value={pendingVaccinations}
            description="Scheduled"
            icon={<Syringe className="h-4 w-4" />}
            variant="warning"
          />
          <StatisticsCard
            title="7d Controls"
            value={recentControls}
            description="Last 7 days"
            icon={<Activity className="h-4 w-4" />}
          />
          <StatisticsCard
            title="Total Vaccines"
            value={vaccinationStats.data?.total || vaccinationStats.data?.count || '-'}
            description="Historic"
            icon={<ListChecks className="h-4 w-4" />}
          />
        </div>

        <div className="p-4 border rounded bg-card text-xs text-muted-foreground">
          <strong>Insights Vacunaciones:</strong><br />
          {vaccinationStats.loading ? 'Cargando...' : JSON.stringify(vaccinationStats.data || {}, null, 2)}
        </div>
      </div>
    </div>
  );
};

export default ApprenticeDashboard;
