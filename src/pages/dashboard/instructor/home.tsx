import React from "react";
import StatisticsCard from "@/components/dashboard/Cards";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnimalDiseases } from "@/hooks/animalDiseases/useAnimalDiseases";
import { useAnimals } from "@/hooks/animal/useAnimals";
import { safeArray } from '@/utils/apiHelpers';

const InstructorHome = () => {
  const { name } = useAuth();
  const { animalStatusData } = useAnimals();
  const { data: animalDiseases } = useAnimalDiseases();
  const safeAnimalDiseases = safeArray(animalDiseases);
  const totalAnimals = safeAnimalDiseases.length;

  const COLORS = ["#0088FE", "#FF8042", "#00C49F"];
  return (
    <div className="bg-background px-4 pt-0 pb-6 sm:pb-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Welcome, {name}</h1>
            <p className="text-sm text-muted-foreground">Instructor Home</p>
          </div>
          <div className="overflow-x-auto">
            <Tabs defaultValue="todos" className="w-full">
              <TabsList className="whitespace-nowrap">
                <TabsTrigger value="todos">All</TabsTrigger>
                <TabsTrigger value="usuarios">Users</TabsTrigger>
                <TabsTrigger value="animales">Animals</TabsTrigger>
                <TabsTrigger value="sanidad">Health</TabsTrigger>
                <TabsTrigger value="terrenos">Fields</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div>
            <StatisticsCard
              title={"Total Sick Animals"}
              description={"Animals that are sick"}
              value={totalAnimals}
            />
          </div>

          <div className="w-full">
            <Card className="text-sm font-semibold w-full">
              <CardHeader>
                <CardTitle className="text-center">
                  Animal Status
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Array.isArray(animalStatusData) ? animalStatusData : []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                      label={({ name, percent }: import('../../../types/rechartsLabel').RechartsLabelProps) =>
                        `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                    >
                      {(Array.isArray(animalStatusData) ? animalStatusData : []).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>{" "}
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

export default InstructorHome;
