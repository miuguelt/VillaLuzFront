import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useToast } from '@/app/providers/ToastContext';
import { controlService } from '@/entities/control/api/control.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { Control } from '@/entities/control/model/types';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { ImageManager } from '@/shared/ui/common/ImageManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { Loader2, Plus, Search, Filter, Calendar, Weight, Activity, Eye, Edit, Trash2 } from 'lucide-react';

interface ControlsPageProps {}

const ControlsPage: React.FC<ControlsPageProps> = () => {
  const { showToast } = useToast();
  
  // Estados principales
  const [controls, setControls] = useState<Control[]>([]);
  const [animals, setAnimals] = useState<AnimalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredControls, setFilteredControls] = useState<Control[]>([]);
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalResponse | null>(null);
  const [formData, setFormData] = useState<Partial<Control>>({});
  const [saving, setSaving] = useState(false);
  
  // Estados para filtros
  const [selectedAnimalFilter, setSelectedAnimalFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Cargar controles
  const fetchControls = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await controlService.getControls({ page: 1, limit: 100 });
      if (response && response.data) {
        setControls(response.data);
      }
    } catch (err: any) {
      console.error('Error al cargar controles:', err);
      setError('Error al cargar los controles');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Cargar animales
  const fetchAnimals = useCallback(async () => {
    try {
      const response = await animalsService.getAnimals({ page: 1, limit: 1000 });
      if (response && response.data) {
        setAnimals(response.data);
      }
    } catch (err: any) {
      console.error('Error al cargar animales:', err);
    }
  }, []);
  
  // Cargar datos al montar
  useEffect(() => {
    fetchControls();
    fetchAnimals();
  }, [fetchControls, fetchAnimals]);
  
  // Filtrar controles
  useEffect(() => {
    let filtered = controls;
    
    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter(control => 
        control.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        control.health_status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        control.checkup_date?.includes(searchQuery)
      );
    }
    
    // Filtrar por animal
    if (selectedAnimalFilter !== 'all') {
      filtered = filtered.filter(control => control.animal_id === parseInt(selectedAnimalFilter));
    }
    
    // Filtrar por estado
    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(control => control.health_status === selectedStatusFilter);
    }
    
    // Filtrar por fecha
    if (dateFilter) {
      filtered = filtered.filter(control => 
        control.checkup_date && control.checkup_date.startsWith(dateFilter)
      );
    }
    
    setFilteredControls(filtered);
  }, [controls, searchQuery, selectedAnimalFilter, selectedStatusFilter, dateFilter]);
  
  // Manejar creación de control
  const handleCreateControl = useCallback(async () => {
    if (!formData.animal_id || !formData.checkup_date || !formData.health_status) {
      showToast('Por favor complete los campos obligatorios', 'warning');
      return;
    }
    
    setSaving(true);
    
    try {
      await controlService.createControl(formData as Control);
      showToast('Control creado correctamente', 'success');
      setShowCreateModal(false);
      setFormData({});
      fetchControls();
    } catch (err: any) {
      console.error('Error al crear control:', err);
      showToast(err.response?.data?.message || err.message || 'Error al crear el control', 'error');
    } finally {
      setSaving(false);
    }
  }, [formData, fetchControls, showToast]);
  
  // Manejar edición de control
  const handleEditControl = useCallback(async () => {
    if (!selectedControl || !formData.animal_id || !formData.checkup_date || !formData.health_status) {
      showToast('Por favor complete los campos obligatorios', 'warning');
      return;
    }
    
    setSaving(true);
    
    try {
      await controlService.updateControl(selectedControl.id!, formData as Partial<Control>);
      showToast('Control actualizado correctamente', 'success');
      setShowEditModal(false);
      setSelectedControl(null);
      setFormData({});
      fetchControls();
    } catch (err: any) {
      console.error('Error al actualizar control:', err);
      showToast(err.response?.data?.message || err.message || 'Error al actualizar el control', 'error');
    } finally {
      setSaving(false);
    }
  }, [selectedControl, formData, fetchControls, showToast]);
  
  // Manejar eliminación de control
  const handleDeleteControl = useCallback(async (controlId: number) => {
    if (!confirm('¿Está seguro de eliminar este control?')) {
      return;
    }
    
    try {
      await controlService.deleteControl(controlId.toString());
      showToast('Control eliminado correctamente', 'success');
      fetchControls();
    } catch (err: any) {
      console.error('Error al eliminar control:', err);
      showToast(err.response?.data?.message || err.message || 'Error al eliminar el control', 'error');
    }
  }, [fetchControls, showToast]);
  
  // Abrir modal de creación
  const openCreateModal = useCallback(() => {
    setFormData({
      checkup_date: getTodayColombia(),
      health_status: 'Sano',
      description: '',
    });
    setShowCreateModal(true);
  }, []);
  
  // Abrir modal de edición
  const openEditModal = useCallback((control: Control) => {
    setSelectedControl(control);
    setFormData({
      animal_id: control.animal_id,
      checkup_date: control.checkup_date,
      health_status: control.health_status,
      weight: control.weight,
      height: control.height,
      description: control.description,
    });
    setShowEditModal(true);
  }, []);
  
  // Abrir modal de detalle
  const openDetailModal = useCallback((control: Control) => {
    setSelectedControl(control);
    const animal = animals.find(a => a.id === control.animal_id);
    setSelectedAnimal(animal || null);
    setShowDetailModal(true);
  }, [animals]);
  
  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData({});
    setSelectedControl(null);
    setSelectedAnimal(null);
  }, []);
  
  // Manejar cambios en el formulario
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);
  
  // Obtener nombre del animal
  const getAnimalName = useCallback((animalId: number) => {
    const animal = animals.find(a => a.id === animalId);
    return animal ? animal.record || `Animal #${animal.id}` : 'Desconocido';
  }, [animals]);
  
  // Obtener color para el estado de salud
  const getHealthStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Excelente':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
      case 'Bueno':
      case 'Sano':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'Regular':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
      case 'Malo':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300';
    }
  }, []);
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="w-12 h-12 border-b-2 border-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando controles...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Controles Sanitarios</h1>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Control
        </Button>
      </div>
      
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                <Input
                  placeholder="Buscar en descripción o estado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            
            {/* Filtro por animal */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Animal</label>
              <Select value={selectedAnimalFilter} onValueChange={setSelectedAnimalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los animales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los animales</SelectItem>
                  {animals.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id.toString()}>
                      {animal.record || `Animal #${animal.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtro por estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado de Salud</label>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Excelente">Excelente</SelectItem>
                  <SelectItem value="Bueno">Bueno</SelectItem>
                  <SelectItem value="Sano">Sano</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Malo">Malo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtro por fecha */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="month"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Filtrar por mes y año"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de controles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredControls.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay controles registrados</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || selectedAnimalFilter !== 'all' || selectedStatusFilter !== 'all' || dateFilter
                    ? 'No hay controles que coincidan con los filtros aplicados'
                    : 'Comienza registrando el primer control sanitario'}
                </p>
                <Button onClick={openCreateModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Control
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredControls.map((control) => (
            <Card key={control.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getHealthStatusColor(control.health_status || control.healt_status || 'Sano')}>
                      {control.health_status || control.healt_status || 'Sano'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(control.checkup_date).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetailModal(control)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(control)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteControl(control.id!)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Animal:</span>
                    <span className="text-sm">{getAnimalName(control.animal_id)}</span>
                  </div>
                  
                  {(control.weight || control.height) && (
                    <div className="flex items-center gap-4">
                      {control.weight && (
                        <div className="flex items-center gap-2">
                          <Weight className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{control.weight} kg</span>
                        </div>
                      )}
                      {control.height && (
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{control.height} m</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {control.description && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Descripción:</span>
                      <p className="text-sm text-muted-foreground line-clamp-2">{control.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Modal de creación */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Control</DialogTitle>
            <DialogDescription>
              Registra un nuevo control sanitario para un animal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Animal *</label>
              <Select value={formData.animal_id?.toString()} onValueChange={(value) => handleInputChange('animal_id', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un animal" />
                </SelectTrigger>
                <SelectContent>
                  {animals.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id.toString()}>
                      {animal.record || `Animal #${animal.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Control *</label>
              <Input
                type="date"
                value={formData.checkup_date || ''}
                onChange={(e) => handleInputChange('checkup_date', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Peso (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight || ''}
                  onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Altura (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.height || ''}
                  onChange={(e) => handleInputChange('height', parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado de Salud *</label>
              <Select value={formData.health_status} onValueChange={(value) => handleInputChange('health_status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excelente">Excelente</SelectItem>
                  <SelectItem value="Bueno">Bueno</SelectItem>
                  <SelectItem value="Sano">Sano</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Malo">Malo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Observaciones del control..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateControl} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Control
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de edición */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Control</DialogTitle>
            <DialogDescription>
              Modifica la información del control sanitario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Animal *</label>
              <Select value={formData.animal_id?.toString()} onValueChange={(value) => handleInputChange('animal_id', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un animal" />
                </SelectTrigger>
                <SelectContent>
                  {animals.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id.toString()}>
                      {animal.record || `Animal #${animal.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Control *</label>
              <Input
                type="date"
                value={formData.checkup_date || ''}
                onChange={(e) => handleInputChange('checkup_date', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Peso (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight || ''}
                  onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Altura (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.height || ''}
                  onChange={(e) => handleInputChange('height', parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado de Salud *</label>
              <Select value={formData.health_status} onValueChange={(value) => handleInputChange('health_status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excelente">Excelente</SelectItem>
                  <SelectItem value="Bueno">Bueno</SelectItem>
                  <SelectItem value="Sano">Sano</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Malo">Malo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Observaciones del control..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowEditModal(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleEditControl} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Actualizar Control
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de detalle */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalle del Control
              {selectedControl && (
                <Badge className={getHealthStatusColor(selectedControl.health_status || selectedControl.healt_status || 'Sano')}>
                  {selectedControl.health_status || selectedControl.healt_status || 'Sano'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Información completa del control sanitario
            </DialogDescription>
          </DialogHeader>
          
          {selectedControl && (
            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">ID del Control</label>
                  <p className="text-base">{selectedControl.id}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Animal</label>
                  <p className="text-base">{getAnimalName(selectedControl.animal_id)}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Fecha de Control</label>
                  <p className="text-base">{new Date(selectedControl.checkup_date).toLocaleDateString('es-ES')}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Estado de Salud</label>
                  <Badge className={getHealthStatusColor(selectedControl.health_status || selectedControl.healt_status || 'Sano')}>
                    {selectedControl.health_status || selectedControl.healt_status || 'Sano'}
                  </Badge>
                </div>
              </div>
              
              {/* Mediciones */}
              {(selectedControl.weight || selectedControl.height) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedControl.weight && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Peso</label>
                      <p className="text-base">{selectedControl.weight} kg</p>
                    </div>
                  )}
                  
                  {selectedControl.height && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Altura</label>
                      <p className="text-base">{selectedControl.height} m</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Descripción */}
              {selectedControl.description && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                  <p className="text-base bg-muted/50 p-3 rounded-lg">{selectedControl.description}</p>
                </div>
              )}
              
              {/* Galería de imágenes del animal */}
              {selectedAnimal && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Imágenes del Animal</h3>
                    <Badge variant="secondary" className="text-xs">
                      {selectedAnimal.record || `Animal #${selectedAnimal.id}`}
                    </Badge>
                  </div>
                  
                  <ImageManager
                    animalId={selectedAnimal.id}
                    title={`Imágenes de ${selectedAnimal.record || `Animal #${selectedAnimal.id}`}`}
                    compact={true}
                    showControls={true}
                  />
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => {
              setShowDetailModal(false);
              resetForm();
            }}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ControlsPage;
