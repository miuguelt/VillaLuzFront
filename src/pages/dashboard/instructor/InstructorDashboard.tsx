import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


const InstructorDashboard: React.FC = () => {
  return (
    <div className="bg-background px-4 pt-0 pb-6 sm:pb-8">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Instructor Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview</p>
          </div>
          <div className="overflow-x-auto">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="whitespace-nowrap overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="classes">Classes</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Card 1</CardTitle>
            </CardHeader>
            <CardContent>
              Content
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Card 2</CardTitle>
            </CardHeader>
            <CardContent>
              Content
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Card 3</CardTitle>
            </CardHeader>
            <CardContent>
              Content
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Card 4</CardTitle>
            </CardHeader>
            <CardContent>
              Content
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Section A</CardTitle>
            </CardHeader>
            <CardContent>
              Details
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Section B</CardTitle>
            </CardHeader>
            <CardContent>
              Details
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default InstructorDashboard;
