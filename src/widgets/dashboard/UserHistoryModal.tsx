import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useAnimals } from "@/entities/animal/model/useAnimals";
import { useAnimalDiseases } from "@/entities/animal-disease/model/useAnimalDiseases";
import { useAnimalFields } from "@/entities/animal-field/model/useAnimalFields";
import { useTreatment } from "@/entities/treatment/model/useTreatment";
import { useControls } from "@/entities/control/model/useControl";
import { useGeneticImprovements } from "@/entities/genetic-improvement/model/useGeneticImprovement";
import { safeArray } from '@/shared/utils/apiHelpers';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Filter, Search, Activity, MapPin, Stethoscope, Syringe, Users, User, IdCard, Mail } from "lucide-react";
import { getAnimalLabel } from '@/entities/animal/lib/animalHelpers';
import { Modal, ModalContent, ModalHeader, ModalBody } from "@/shared/ui/common/UnifiedModal";

// Interfaces for data types

interface UserActivity {
  id: string;
  date: string;
  type: 'animal_created' | 'disease_treated' | 'control_performed' | 'treatment_applied' | 'genetic_improvement' | 'field_management';
  title: string;
  description: string;
  animalRecord?: string;
  status?: string;
  icon: React.ReactNode;
}

interface UserHistoryModalProps {
  user: {
    id?: number;
    identification: string | number;
    fullname: string;
    email: string;
    phone?: string;
    address?: string;
    role: string;
    status: boolean | string | number;
  };
  onClose: () => void;
}

export const UserHistoryModal = ({ user, onClose }: UserHistoryModalProps) => {
  const { animals } = useAnimals();
  const { animalDiseases } = useAnimalDiseases();
  const { animalFields } = useAnimalFields();
  const { treatments } = useTreatment();
  const { controls } = useControls();
  const { geneticImprovements } = useGeneticImprovements();
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivityType, setSelectedActivityType] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("timeline");

  // Filter data for the selected user
  const safeAnimals = safeArray(animals);
  const safeAnimalDiseases = safeArray(animalDiseases);
  const safeAnimalFields = safeArray(animalFields);
  const safeTreatments = safeArray(treatments);
  const safeControls = safeArray(controls);
  const safeGeneticImprovements = safeArray(geneticImprovements);

  const userAnimals = safeAnimals.filter(
    (animal: any) => animal?.user?.identification === user.identification
  );

  const userDiseases = safeAnimalDiseases.filter(
    (disease: any) => disease?.instructor?.identification === user.identification
  );

  const userFields = safeAnimalFields.filter(
    (field: any) => field?.animal?.user?.identification === user.identification
  );

  const userTreatments = safeTreatments.filter(
    (treatment: any) => treatment?.animals?.user?.identification === user.identification
  );

  const userControls = safeControls.filter(
    (control: any) => control?.animals?.user?.identification === user.identification
  );

  const userGenetics = safeGeneticImprovements.filter(
    (genetic: any) => genetic?.user?.identification === user.identification
  );

  // Create timeline activities from all data sources
  const timelineActivities = useMemo(() => {
    const activities: UserActivity[] = [];

    // Add animal creation activities
    userAnimals.forEach(animal => {
      activities.push({
        id: `animal-${animal.idAnimal}`,
        date: animal.birth_date,
        type: 'animal_created',
        title: `Animal Registrado: ${getAnimalLabel(animal)}`,
        description: `${animal.breed?.name || 'Sin raza'} - ${animal.gender} - Estado: ${animal.status}`,
        animalRecord: getAnimalLabel(animal),
        status: animal.status,
        icon: <Users className="w-4 h-4" />
      });
    });

    // Add disease treatment activities
    userDiseases.forEach(disease => {
      activities.push({
        id: `disease-${disease.id}`,
        date: disease.diagnosis_date,
        type: 'disease_treated',
        title: `Diagnóstico de Enfermedad`,
        description: `${disease.disease?.name} en animal ${getAnimalLabel(disease.animal)}`,
        animalRecord: getAnimalLabel(disease.animal),
        status: disease.status ? 'Activo' : 'Inactivo',
        icon: <Stethoscope className="w-4 h-4" />
      });
    });

    // Add control activities
    userControls.forEach(control => {
      activities.push({
        id: `control-${control.id}`,
        date: control.checkup_date,
        type: 'control_performed',
        title: `Control de Salud Realizado`,
        description: `Estado: ${control.healt_status} - ${control.description}`,
        animalRecord: getAnimalLabel(control.animals),
        status: control.healt_status,
        icon: <Activity className="w-4 h-4" />
      });
    });

    // Add treatment activities
    userTreatments.forEach(treatment => {
      activities.push({
        id: `treatment-${treatment.id}`,
        date: treatment.treatment_date,
        type: 'treatment_applied',
        title: `Tratamiento Aplicado`,
        description: `${treatment.description} - Animal: ${getAnimalLabel(treatment.animals)}`,
        animalRecord: getAnimalLabel(treatment.animals),
        status: 'Aplicado',
        icon: <Syringe className="w-4 h-4" />
      });
    });

    // Add genetic improvement activities
    userGenetics.forEach(genetic => {
      activities.push({
        id: `genetic-${genetic.id}`,
        date: genetic.date,
        type: 'genetic_improvement',
        title: `Mejora Genética`,
        description: `${genetic.genetic_event_techique} - Animal: ${getAnimalLabel(genetic.animal)}`,
        animalRecord: getAnimalLabel(genetic.animal),
        status: 'Completado',
        icon: <Activity className="w-4 h-4" />
      });
    });

    // Add field management activities
    userFields.forEach(field => {
      activities.push({
        id: `field-${field.id}`,
        date: field.treatment_date,
        type: 'field_management',
        title: `Gestión de Campo`,
        description: `Animal ${getAnimalLabel(field.animal)} en ${field.field?.name}`,
        animalRecord: getAnimalLabel(field.animal),
        status: field.end_date ? 'Completado' : 'Activo',
        icon: <MapPin className="w-4 h-4" />
      });
    });

    // Sort activities by date (most recent first)
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [userAnimals, userDiseases, userControls, userTreatments, userGenetics, userFields]);

  // Filter timeline activities based on search and filters
  const filteredTimelineActivities = useMemo(() => {
    return timelineActivities.filter(activity => {
      const matchesSearch = searchTerm === "" || 
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.animalRecord && activity.animalRecord.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = selectedActivityType === "all" || activity.type === selectedActivityType;
      
      const matchesDateRange = selectedDateRange === "all" || (() => {
        const activityDate = new Date(activity.date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (selectedDateRange) {
          case "week": return daysDiff <= 7;
          case "month": return daysDiff <= 30;
          case "year": return daysDiff <= 365;
          default: return true;
        }
      })();
      
      return matchesSearch && matchesType && matchesDateRange;
    });
  }, [timelineActivities, searchTerm, selectedActivityType, selectedDateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      totalActivities: timelineActivities.length,
      animalsManaged: userAnimals.length,
      diseasesHandled: userDiseases.length,
      controlsPerformed: userControls.length,
      treatmentsApplied: userTreatments.length,
      geneticImprovements: userGenetics.length,
      recentActivities: timelineActivities.filter(activity => {
        const activityDate = new Date(activity.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return activityDate >= thirtyDaysAgo;
      }).length
    };
  }, [timelineActivities, userAnimals, userDiseases, userControls, userTreatments, userGenetics]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP", { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="2xl"
      description={`${user.fullname} • ${user.email}`}
      variant="compact"
      fullScreen
      allowFullScreenToggle
    >
      <ModalHeader>
        <span className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Historial - {user.fullname}
          <Badge variant="secondary">{user.role}</Badge>
        </span>
      </ModalHeader>
      <ModalContent>
        <ModalBody>
          {/* User Info and Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <IdCard className="w-4 h-4" />
                  Identificación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{user.identification}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm break-words">{user.email}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Actividades</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{stats.totalActivities}</p>
                <p className="text-xs text-gray-500">{stats.recentActivities} últimos 30 días</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Animales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{stats.animalsManaged}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Controles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">{stats.controlsPerformed}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Tratamientos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{stats.treatmentsApplied}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar actividades, animales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo de Actividad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las actividades</SelectItem>
                  <SelectItem value="animal_created">Animales registrados</SelectItem>
                  <SelectItem value="disease_treated">Enfermedades tratadas</SelectItem>
                  <SelectItem value="control_performed">Controles realizados</SelectItem>
                  <SelectItem value="treatment_applied">Tratamientos aplicados</SelectItem>
                  <SelectItem value="genetic_improvement">Mejoras genéticas</SelectItem>
                  <SelectItem value="field_management">Gestión de Potreros</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="year">Último año</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedActivityType("all");
                  setSelectedDateRange("all");
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>

          {/* Tabs for different sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
              <TabsTrigger value="animals">Animales a Cargo</TabsTrigger>
              <TabsTrigger value="activities">Actividades Médicas</TabsTrigger>
              <TabsTrigger value="management">Gestión de Potreros</TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Línea de Tiempo de Actividades
                    <Badge variant="secondary">{filteredTimelineActivities.length} actividades</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredTimelineActivities.length > 0 ? (
                    <div className="space-y-4">
                      {filteredTimelineActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0">
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              activity.type === 'disease_treated' ? 'bg-red-100 text-red-600' :
                              activity.type === 'treatment_applied' ? 'bg-green-100 text-green-600' :
                              activity.type === 'control_performed' ? 'bg-purple-100 text-purple-600' :
                              activity.type === 'animal_created' ? 'bg-blue-100 text-blue-600' :
                              activity.type === 'genetic_improvement' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {activity.icon}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 break-words">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                              <div className="flex items-center space-x-2">
                                {activity.animalRecord && (
                                  <Badge variant="outline" className="text-xs">
                                    {activity.animalRecord}
                                  </Badge>
                                )}
                                {activity.status && (
                                  <Badge 
                                    variant={activity.status === 'Activo' || activity.status === 'Aplicado' ? 'default' : 
                                            activity.status === 'Completado' ? 'secondary' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {activity.status}
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500">{formatDate(activity.date)}</span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No se encontraron actividades que coincidan con los filtros.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="animals" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Animales a Cargo
                    <Badge variant="secondary">{userAnimals.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userAnimals.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Registro</TableHead>
                            <TableHead>Raza</TableHead>
                            <TableHead>Especie</TableHead>
                            <TableHead>Sexo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha de Nacimiento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userAnimals.map((animal) => (
                            <TableRow key={animal.idAnimal}>
                              <TableCell className="font-medium">{animal.record}</TableCell>
                              <TableCell>{animal.breed?.name || 'No especificada'}</TableCell>
                              <TableCell>{animal.breed?.species?.name || 'No especificada'}</TableCell>
                              <TableCell>{animal.gender}</TableCell>
                              <TableCell>
                                <Badge variant={animal.status === 'Activo' ? 'default' : 
                                              animal.status === 'Vendido' ? 'secondary' : 'destructive'}>
                                  {animal.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(animal.birth_date)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay animales asignados a este usuario.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="activities" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5" />
                      Diagnósticos de Enfermedades
                      <Badge variant="secondary">{userDiseases.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDiseases.length > 0 ? (
                      <div className="space-y-3">
                        {userDiseases.slice(0, 5).map((disease: any) => (
                          <div key={disease.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{disease.disease?.name}</p>
                                <p className="text-sm text-gray-600">Animal: {disease.animal?.record}</p>
                                <p className="text-xs text-gray-500">{formatDate(disease.diagnosis_date)}</p>
                              </div>
                              <Badge variant={disease.status ? 'default' : 'secondary'}>
                                {disease.status ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {userDiseases.length > 5 && (
                          <p className="text-sm text-gray-500 text-center">Y {userDiseases.length - 5} más...</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No hay diagnósticos registrados.</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Controles de Salud
                      <Badge variant="secondary">{userControls.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userControls.length > 0 ? (
                      <div className="space-y-3">
                        {userControls.slice(0, 5).map((control: any) => (
                          <div key={control.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">Control de Salud</p>
                                <p className="text-sm text-gray-600">Animal: {control.animals?.record}</p>
                                <p className="text-xs text-gray-500">{formatDate(control.checkup_date)}</p>
                              </div>
                              <Badge variant={control.healt_status === 'Exelente' ? 'default' : 'secondary'}>
                                {control.healt_status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {userControls.length > 5 && (
                          <p className="text-sm text-gray-500 text-center">Y {userControls.length - 5} más...</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No hay controles registrados.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="management" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Gestión de Potreros y Pastoreo
                    <Badge variant="secondary">{userFields.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userFields.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Animal</TableHead>
                            <TableHead>Campo</TableHead>
                            <TableHead>Fecha de Inicio</TableHead>
                            <TableHead>Fecha de Fin</TableHead>
                            <TableHead>Duración</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userFields.map((field: any) => (
                            <TableRow key={field.id}>
                              <TableCell className="font-medium">{field.animal?.record}</TableCell>
                              <TableCell>{field.field?.name}</TableCell>
                              <TableCell>{formatDate(field.treatment_date)}</TableCell>
                              <TableCell>{field.end_date ? formatDate(field.end_date) : 'Actual'}</TableCell>
                              <TableCell>{field.duration || 'En curso'}</TableCell>
                              <TableCell>
                                <Badge variant={field.end_date ? 'secondary' : 'default'}>
                                  {field.end_date ? 'Completado' : 'Activo'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay registros de gestión de Potreros.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default UserHistoryModal;