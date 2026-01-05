import React from "react";
import { useNavigate } from "react-router-dom";
import StatisticsCard from "@/widgets/dashboard/Cards";
import { useAuth } from "@/features/auth/model/useAuth";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartBarIcon } from '@heroicons/react/24/outline';

const ApprenticeHome = () => {
  const { name } = useAuth();
  const navigate = useNavigate();
  const COLORS = ["#0088FE", "#FF8042", "#00C49F"];

  return (
    <div className="bg-background px-4 pt-0 pb-6 sm:pb-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Bienvenido(a), {name}</h1>
            <p className="text-sm text-muted-foreground">Inicio de Aprendiz</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => navigate('/dashboard/apprentice/analytics')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <ChartBarIcon className="w-5 h-5" />
              Ver analíticas
            </button>
            <div className="overflow-x-auto">
              <Tabs defaultValue="todos" className="w-full">
                <TabsList className="whitespace-nowrap">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
                  <TabsTrigger value="animales">Animales</TabsTrigger>
                  <TabsTrigger value="sanidad">Sanidad</TabsTrigger>
                  <TabsTrigger value="terrenos">Potreros</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div>
            <StatisticsCard
              title="Animales enfermos"
              description="Animales que requieren atención"
              value={6}
            />
          </div>

          <div className="w-full">
            <Card className="text-sm font-semibold w-full">
              <CardHeader>
                <CardTitle className="text-center">
                  Estado de los animales
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Array.from({ length: 3 }).map((_, i) => ({ name: `Estado ${i + 1}`, value: i + 1 }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: any) =>
                        `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                    >
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ApprenticeHome;
