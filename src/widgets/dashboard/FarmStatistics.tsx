import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import StatisticsCard from './StatisticsCard';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { useUsers } from '@/entities/user/model/useUser';
import { useFields } from '@/entities/field/model/useField';
import { useControls } from '@/entities/control/model/useControl';
import { useTreatment } from '@/entities/treatment/model/useTreatment';
import { useVaccinations } from '@/entities/vaccination/model/useVaccination';
import { 
  Users, 
  Heart, 
  MapPin, 
  Activity, 
  Syringe, 
  PillBottle,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnimalStats {
  total: number;
  alive: number;
  sold: number;
  dead: number;
  bySpecies: { [key: string]: number };
  byStatus: { name: string; value: number; color: string }[];
}

interface FieldStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  capacity: number;
}

interface HealthStats {
  totalControls: number;
  recentControls: number;
  treatments: number;
  vaccinations: number;
  healthDistribution: { name: string; value: number; color: string }[];
}

const FarmStatistics: React.FC = () => {
  const { animals, loading: animalsLoading } = useAnimals();
  const { data: users, loading: usersLoading } = useUsers();
  const { fields, loading: fieldsLoading } = useFields();
  const { controls, loading: controlsLoading } = useControls();
  const { treatments, loading: treatmentsLoading } = useTreatment();
  const { vaccinations, loading: vaccinationsLoading } = useVaccinations();

  const [animalStats, setAnimalStats] = useState<AnimalStats>({
    total: 0,
    alive: 0,
    sold: 0,
    dead: 0,
    bySpecies: {},
    byStatus: []
  });

  const [fieldStats, setFieldStats] = useState<FieldStats>({
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
    capacity: 0
  });

  const [healthStats, setHealthStats] = useState<HealthStats>({
    totalControls: 0,
    recentControls: 0,
    treatments: 0,
    vaccinations: 0,
    healthDistribution: []
  });

  // Calcular estadísticas de animales
  useEffect(() => {
    if (animals && animals.length > 0) {
      const alive = animals.filter(a => a.status === 'Sano' || a.status === 'Enfermo' || a.status === 'En tratamiento' || a.status === 'En observación' || a.status === 'Cuarentena').length;
      const sold = animals.filter(a => a.status === 'Vendido').length;
      const dead = animals.filter(a => a.status === 'Fallecido').length;

      const byStatus = [
        { name: 'Vivos', value: alive, color: '#22c55e' },
        { name: 'Vendidos', value: sold, color: '#3b82f6' },
        { name: 'Fallecidos', value: dead, color: '#ef4444' }
      ];

      setAnimalStats({
        total: animals.length,
        alive,
        sold,
        dead,
        bySpecies: {},
        byStatus
      });
    }
  }, [animals]);

  // Calcular estadísticas de Potreros
  useEffect(() => {
    if (fields && fields.length > 0) {
      const available = fields.filter(f => f.state === 'Disponible').length;
      const occupied = fields.filter(f => f.state === 'Ocupado').length;
      const maintenance = fields.filter(f => f.state === 'Mantenimiento').length;
      const totalCapacity = fields.reduce((sum, field) => {
        const capacity = parseInt(field.capacity.split(' ')[0]) || 0;
        return sum + capacity;
      }, 0);

      setFieldStats({
        total: fields.length,
        available,
        occupied,
        maintenance,
        capacity: totalCapacity
      });
    }
  }, [fields]);

  // Calcular estadísticas de salud
  useEffect(() => {
    if (controls && treatments && vaccinations) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentControls = controls.filter(c => {
  const controlDate = c.checkup_date ? new Date(c.checkup_date) : null;
  return controlDate ? (controlDate >= thirtyDaysAgo) : false;
      }).length;

      // Distribución de estados de salud
      const healthCounts = controls.reduce((acc, control) => {
        // Verificar que healt_status existe antes de usarlo como índice
        if (control.healt_status) {
          acc[control.healt_status] = (acc[control.healt_status] || 0) + 1;
        }
        return acc;
      }, {} as { [key: string]: number });

      const healthDistribution = Object.entries(healthCounts).map(([status, count]) => ({
        name: status,
        value: count,
        color: status === 'Excelente' ? '#22c55e' : 
               status === 'Bueno' ? '#3b82f6' :
               status === 'Regular' ? '#f59e0b' : '#ef4444'
      }));

      setHealthStats({
        totalControls: controls.length,
        recentControls,
        treatments: treatments.length,
        vaccinations: vaccinations.length,
        healthDistribution
      });
    }
  }, [controls, treatments, vaccinations]);

  const isLoading = animalsLoading || usersLoading || fieldsLoading || controlsLoading || treatmentsLoading || vaccinationsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatisticsCard
          title="Total Animales"
          value={animalStats.total}
          description="Animales registrados"
          icon={<Heart />}
          variant="default"
        />
        
        <StatisticsCard
          title="Animales Vivos"
          value={animalStats.alive}
          description={`${((animalStats.alive / animalStats.total) * 100).toFixed(1)}% del total`}
          icon={<CheckCircle />}
          variant="success"
        />
        
        <StatisticsCard
          title="Potreros Totales"
          value={fieldStats.total}
          description={`Capacidad: ${fieldStats.capacity} animales`}
          progress={{
            value: fieldStats.occupied,
            max: fieldStats.total,
            label: "Potreros ocupados"
          }}
          icon={<MapPin />}
        />
        
        <StatisticsCard
          title="Controles Recientes"
          value={healthStats.recentControls}
          description="Últimos 30 días"
          icon={<Activity />}
          variant={healthStats.recentControls > 0 ? 'success' : 'warning'}
        />
      </div>

      <Tabs defaultValue="animals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="animals">Animales</TabsTrigger>
          <TabsTrigger value="fields">Potreros</TabsTrigger>
          <TabsTrigger value="health">Salud</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="animals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={animalStats.byStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: import('@/shared/types/rechartsLabel.types').RechartsLabelProps) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {animalStats.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <StatisticsCard
                title="Animales Vendidos"
                value={animalStats.sold}
                description="Total de ventas"
                icon={<TrendingUp />}
                variant="default"
              />
              
              <StatisticsCard
                title="Mortalidad"
                value={animalStats.dead}
                description={`${((animalStats.dead / animalStats.total) * 100).toFixed(1)}% del total`}
                icon={<AlertTriangle />}
                variant={animalStats.dead > 0 ? 'destructive' : 'success'}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatisticsCard
              title="Potreros Disponibles"
              value={fieldStats.available}
              description="Listos para uso"
              icon={<CheckCircle />}
              variant="success"
            />
            
            <StatisticsCard
              title="Potreros Ocupados"
              value={fieldStats.occupied}
              description="En uso actualmente"
              icon={<Users />}
              variant="default"
            />
            
            <StatisticsCard
              title="En Mantenimiento"
              value={fieldStats.maintenance}
              description="Requieren atención"
              icon={<AlertTriangle />}
              variant="warning"
            />
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Salud General</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={healthStats.healthDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <StatisticsCard
                title="Tratamientos Activos"
                value={healthStats.treatments}
                description="En curso"
                icon={<PillBottle />}
                variant="default"
              />
              
              <StatisticsCard
                title="Vacunaciones"
                value={healthStats.vaccinations}
                description="Aplicadas"
                icon={<Syringe />}
                variant="success"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatisticsCard
              title="Total Usuarios"
              value={users?.length || 0}
              description="Registrados en el sistema"
              icon={<Users />}
              variant="default"
            />
            
            <StatisticsCard
              title="Usuarios Activos"
              value={users?.filter((u: any) => (typeof u.status === 'boolean' ? u.status === true : String(u.status) === '1' || String(u.status).toLowerCase() === 'true' || String(u.status).toLowerCase() === 'activo')).length || 0}
              description="Con acceso al sistema"
              icon={<CheckCircle />}
              variant="success"
            />
            
            <StatisticsCard
              title="Usuarios Inactivos"
              value={users?.filter((u: any) => (typeof u.status === 'boolean' ? u.status === false : String(u.status) === '0' || String(u.status).toLowerCase() === 'false' || String(u.status).toLowerCase() === 'inactivo')).length || 0}
              description="Sin acceso al sistema"
              icon={<AlertTriangle />}
              variant="warning"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FarmStatistics;
