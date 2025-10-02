import { useParams } from 'react-router-dom';
import { useUsers } from '@/hooks/user/useUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClimbingBoxLoader } from 'react-spinners';
import { useAnimals } from '@/hooks/animal/useAnimals';
import { useGeneticImprovements as useGenetics } from '@/hooks/geneticImprovement/useGeneticImprovement';
import { useAnimalFields } from '@/hooks/animalFields/useAnimalFields';
import HistoryTable from '@/components/dashboard/admin/HistoryTable';
import { User } from '@/types/userTypes';
import { getAnimalLabel } from '@/utils/animalHelpers';

const UserHistory = () => {
  const { userId } = useParams<{ userId: string }>();
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const { animals, loading: animalsLoading, error: animalsError } = useAnimals();
  const { geneticImprovements: genetics, loading: geneticsLoading, error: geneticsError } = useGenetics();
  const { animalFields, loading: animalFieldsLoading, error: animalFieldsError } = useAnimalFields();

  if (usersLoading || animalsLoading || geneticsLoading || animalFieldsLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <ClimbingBoxLoader color="#2563EB" size={30} />
      </div>
    );
  }

  if (usersError) return <p>{usersError}</p>;
  if (animalsError) return <p>{animalsError}</p>;
  if (geneticsError) return <p>{geneticsError}</p>;
  if (animalFieldsError) return <p>{animalFieldsError}</p>;

  const user = users.find((u: User) => u.identification === Number(userId));

  const userAnimals = animals
    .filter((animal: any) => animal.user?.identification === userId)
    .map((animal: any) => ({
      animal: getAnimalLabel(animal) || 'Sin registro',
      code: animal.code || '-',
      specie: animal.specie?.name || '-',
      breed: animal.breed?.name || '-',
      status: animal.status || '-',
    }));

  const userGenetics = genetics.filter((g: any) => g.user.identification === userId).map((g: any) => ({
    animalCode: g.animal.code,
    type: g.type,
    date: new Date(g.date).toLocaleDateString(),
    description: g.description,
  }));

  const userAnimalFields = animalFields.filter((af: any) => af.animal.user?.identification === userId).map((af: any) => ({
    animalCode: af.animal.code,
    field: af.field.name,
    entryDate: new Date(af.entry_date).toLocaleDateString(),
    exitDate: new Date(af.exit_date).toLocaleDateString(),
  }));

  if (!user) {
    return <p>Usuario no encontrado.</p>;
  }

  return (
    <div className="px-4 md:px-6 lg:px-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{user.fullname}</span>
            <Badge variant="secondary">{user.role}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Teléfono:</strong> {user.phone}</p>
          <p><strong>Identificación:</strong> {user.identification}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="animals">
        <TabsList>
          <TabsTrigger value="animals">Animales a Cargo</TabsTrigger>
          <TabsTrigger value="genetics">Mejoras Genéticas</TabsTrigger>
          <TabsTrigger value="fields">Lotes Asignados</TabsTrigger>
        </TabsList>
        <TabsContent value="animals">
          <HistoryTable 
            columns={["Animal", "Código", "Especie", "Raza", "Estado"]}
            data={userAnimals}
          />
        </TabsContent>
        <TabsContent value="genetics">
          <HistoryTable 
            columns={["Animal", "Tipo", "Fecha", "Descripción"]}
            data={userGenetics}
          />
        </TabsContent>
        <TabsContent value="fields">
          <HistoryTable 
            columns={["Animal", "Lote", "Fecha de Entrada", "Fecha de Salida"]}
            data={userAnimalFields}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserHistory;
