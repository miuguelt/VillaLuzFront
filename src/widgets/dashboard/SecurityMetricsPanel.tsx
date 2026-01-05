import { useEffect, useState } from 'react';
import { securityService } from '@/shared/api';
import { normalizeDisplayValue } from '@/shared/utils/normalization';
import StatisticsCard from './StatisticsCard';
import { Shield, ShieldAlert, ActivitySquare, RefreshCcw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';

interface SecurityMetrics {
  vulnerabilities_total?: number;
  vulnerabilities_open?: number;
  vulnerabilities_critical?: number;
  scans_executed?: number;
  last_scan?: string;
  avg_scan_time_ms?: number;
  pending_patches?: number;
  [key: string]: any;
}

interface SecurityAlert {
  id?: number | string;
  title: string;
  message?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  created_at?: string;
  resolved_at?: string;
}

const severityColor: Record<string, string> = {
  low: 'bg-accent text-accent-foreground',
  medium: 'bg-accent text-accent-foreground',
  high: 'bg-accent text-accent-foreground',
  critical: 'bg-destructive text-destructive-foreground'
};

export const SecurityMetricsPanel = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, a] = await Promise.all([
        securityService.getMetrics().catch(()=>({})),
        securityService.getAlerts().catch(()=>[]),
      ]);
      setMetrics(m);
      setAlerts(a);
    } catch (e:any) {
      setError(e?.message || 'Error cargando métricas de seguridad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const triggerScan = async () => {
    setScanning(true); setError(null);
    try {
      await securityService.performScan();
      await load();
    } catch(e:any){
      setError(e?.message || 'Error ejecutando escaneo');
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground">Cargando seguridad...</div>;
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Seguridad</CardTitle>
          <p className="text-[11px] text-muted-foreground">Estado resumido y alertas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading || scanning} className="h-7 px-2 text-[11px]"> <RefreshCcw className="h-3 w-3 mr-1" /> Refrescar</Button>
          <Button size="sm" onClick={triggerScan} disabled={scanning} className="h-7 px-2 text-[11px]">{scanning ? 'Escaneando...' : 'Scan'}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-xs bg-destructive text-destructive-foreground border border-destructive rounded p-2">{error}</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatisticsCard
            title="Vulnerabilidades"
            value={normalizeDisplayValue(metrics?.vulnerabilities_total)}
            description="Totales"
            icon={<ShieldAlert className="h-4 w-4" />}
          />
          <StatisticsCard
            title="Abiertas"
            value={normalizeDisplayValue(metrics?.vulnerabilities_open)}
            description="Sin resolver"
            variant="warning"
          />
          <StatisticsCard
            title="Críticas"
            value={normalizeDisplayValue(metrics?.vulnerabilities_critical)}
            description="Prioridad alta"
            variant="destructive"
          />
          <StatisticsCard
            title="Escaneos"
            value={normalizeDisplayValue(metrics?.scans_executed)}
            description="Ejecutados"
            variant="success"
          />
        </div>
        <Separator />
        <div>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1"><ActivitySquare className="h-3.5 w-3.5" /> Alertas recientes</h3>
          <ul className="space-y-2 max-h-56 overflow-auto pr-1">
            {alerts.length ? alerts.slice(0,8).map((al, index) => (
              <li key={al.id || `alert-${index}-${al.title}`} className="p-2 rounded border bg-muted text-[11px]">
                <div className="flex justify-between items-start">
                  <span className="font-medium line-clamp-1">{al.title}</span>
                  {al.severity && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${severityColor[al.severity] || 'bg-muted text-muted-foreground'}`}>{al.severity}</span>}
                </div>
                {al.message && <p className="text-muted-foreground line-clamp-2">{al.message}</p>}
                {al.created_at && <span className="text-[9px] text-muted-foreground mt-1 block">{normalizeDisplayValue(al.created_at)}</span>}
              </li>
            )) : <li key="no-alerts" className="text-[11px] text-muted-foreground">Sin alertas de seguridad</li>}
          </ul>
        </div>
        {metrics?.last_scan && (
          <p className="text-[10px] text-muted-foreground">Último scan: {normalizeDisplayValue(metrics.last_scan)} {metrics.avg_scan_time_ms && `(~${metrics.avg_scan_time_ms} ms)`}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityMetricsPanel;
