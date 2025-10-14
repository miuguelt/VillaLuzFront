import React, { useState, useEffect } from 'react';
import { MoreVertical, Dna, Activity, Syringe, Pill, MapPin, ClipboardList, Eye, Plus, History, GitBranch, Baby } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { GenericModal } from '@/components/common/GenericModal';
import { AnimalResponse } from '@/types/swaggerTypes';
import { getTodayColombia } from '@/utils/dateUtils';

// Importar servicios
import { geneticImprovementsService } from '@/services/geneticImprovementsService';
import { animalDiseasesService } from '@/services/animalDiseasesService';
import { animalFieldsService } from '@/services/animalFieldsService';
import { vaccinationsService } from '@/services/vaccinationsService';
import { treatmentsService } from '@/services/treatmentsService';
import { controlService } from '@/services/controlService';
import { diseaseService } from '@/services/diseaseService';
import { fieldService } from '@/services/fieldService';
import { vaccinesService } from '@/services/vaccinesService';
import { usersService } from '@/services/userService';

interface AnimalActionsMenuProps {
  animal: AnimalResponse;
  currentUserId?: number;
  onOpenHistory?: () => void;
  onOpenAncestorsTree?: () => void;
  onOpenDescendantsTree?: () => void;
}

type ModalType =
  | 'genetic_improvement'
  | 'animal_disease'
  | 'animal_field'
  | 'vaccination'
  | 'treatment'
  | 'control'
  | null;

type ModalMode = 'create' | 'list';

export const AnimalActionsMenu: React.FC<AnimalActionsMenuProps> = ({ animal, currentUserId, onOpenHistory, onOpenAncestorsTree, onOpenDescendantsTree }) => {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Opciones para los selects
  const [diseaseOptions, setDiseaseOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [fieldOptions, setFieldOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [vaccineOptions, setVaccineOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [userOptions, setUserOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Cargar opciones cuando se abre un modal de creación
  useEffect(() => {
    if (openModal && modalMode === 'create') {
      loadOptions();
    }
  }, [openModal, modalMode]);

  // Cargar lista cuando se abre un modal de lista
  useEffect(() => {
    if (openModal && modalMode === 'list') {
      loadListData();
    }
  }, [openModal, modalMode, animal.id]);

  const loadOptions = async () => {
    try {
      const [diseases, fields, vaccines, users] = await Promise.all([
        diseaseService.getDiseases({ page: 1, limit: 1000 }).catch(() => []),
        fieldService.getFields({ page: 1, limit: 1000 }).catch(() => []),
        vaccinesService.getVaccines?.({ page: 1, limit: 1000 }).catch(() => []),
        usersService.getUsers({ page: 1, limit: 1000 }).catch(() => []),
      ]);

      const diseasesData = (diseases as any)?.data || diseases || [];
      setDiseaseOptions(diseasesData.map((d: any) => ({
        value: d.id,
        label: d.disease || d.name || `Enfermedad ${d.id}`
      })));

      const fieldsData = (fields as any)?.data || fields || [];
      setFieldOptions(fieldsData.map((f: any) => ({
        value: f.id,
        label: f.name || `Campo ${f.id}`
      })));

      const vaccinesData = (vaccines as any)?.data || vaccines || [];
      setVaccineOptions(vaccinesData.map((v: any) => ({
        value: v.id,
        label: v.name || `Vacuna ${v.id}`
      })));

      const usersData = (users as any)?.data || users || [];
      setUserOptions(usersData.map((u: any) => ({
        value: u.id,
        label: u.fullname || u.name || `Usuario ${u.id}`
      })));
    } catch (err) {
      console.error('Error loading options:', err);
    }
  };

  const loadListData = async () => {
    setLoadingList(true);
    try {
      let data: any[] = [];

      switch (openModal) {
        case 'genetic_improvement':
          const giResult = await (geneticImprovementsService as any).getAll?.({
            animal_id: animal.id,
            limit: 100
          });
          data = Array.isArray(giResult) ? giResult : (giResult?.data || giResult?.items || []);
          data = data.filter((item: any) => item.animal_id === animal.id);
          break;

        case 'animal_disease':
          const adResult = await (animalDiseasesService as any).getAll?.({
            animal_id: animal.id,
            limit: 100
          });
          data = Array.isArray(adResult) ? adResult : (adResult?.data || adResult?.items || []);
          data = data.filter((item: any) => item.animal_id === animal.id);
          break;

        case 'animal_field':
          const afResult = await (animalFieldsService as any).getAll?.({
            animal_id: animal.id,
            limit: 100
          });
          data = Array.isArray(afResult) ? afResult : (afResult?.data || afResult?.items || []);
          data = data.filter((item: any) => item.animal_id === animal.id);
          break;

        case 'vaccination':
          const vResult = await (vaccinationsService as any).getAll?.({
            animal_id: animal.id,
            limit: 100
          });
          data = Array.isArray(vResult) ? vResult : (vResult?.data || vResult?.items || []);
          data = data.filter((item: any) => item.animal_id === animal.id);
          break;

        case 'treatment':
          const tResult = await (treatmentsService as any).getAll?.({
            animal_id: animal.id,
            limit: 100
          });
          data = Array.isArray(tResult) ? tResult : (tResult?.data || tResult?.items || []);
          data = data.filter((item: any) => item.animal_id === animal.id);
          break;

        case 'control':
          const cResult = await (controlService as any).getAll?.({
            animal_id: animal.id,
            limit: 100
          });
          data = Array.isArray(cResult) ? cResult : (cResult?.data || cResult?.items || []);
          data = data.filter((item: any) => item.animal_id === animal.id);
          break;
      }

      setListData(data);
    } catch (err: any) {
      console.error('Error loading list data:', err);
      setError('Error al cargar los registros');
    } finally {
      setLoadingList(false);
    }
  };

  const handleOpenModal = (type: ModalType, mode: ModalMode) => {
    setOpenModal(type);
    setModalMode(mode);
    setError(null);
    setListData([]);

    if (mode === 'create') {
      // Inicializar formulario según el tipo
      switch (type) {
        case 'genetic_improvement':
          setFormData({
            animal_id: animal.id,
            date: getTodayColombia(),
            genetic_event_technique: '',
            details: '',
            results: '',
          });
          break;
        case 'animal_disease':
          setFormData({
            animal_id: animal.id,
            disease_id: undefined,
            instructor_id: currentUserId,
            diagnosis_date: getTodayColombia(),
            status: 'Activo',
            notes: '',
          });
          break;
        case 'animal_field':
          setFormData({
            animal_id: animal.id,
            field_id: undefined,
            assignment_date: getTodayColombia(),
            removal_date: undefined,
            notes: '',
          });
          break;
        case 'vaccination':
          setFormData({
            animal_id: animal.id,
            vaccine_id: undefined,
            vaccination_date: getTodayColombia(),
            apprentice_id: currentUserId,
            instructor_id: currentUserId,
          });
          break;
        case 'treatment':
          setFormData({
            animal_id: animal.id,
            treatment_date: getTodayColombia(),
            diagnosis: '',
            description: '',
            frequency: '',
            observations: '',
          });
          break;
        case 'control':
          setFormData({
            animal_id: animal.id,
            checkup_date: getTodayColombia(),
            weight: undefined,
            height: undefined,
            health_status: 'Sano',
            description: '',
          });
          break;
      }
    }
  };

  const handleCloseModal = () => {
    setOpenModal(null);
    setFormData({});
    setError(null);
    setListData([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (openModal) {
        case 'genetic_improvement':
          if (!formData.genetic_event_technique?.trim()) {
            throw new Error('La técnica del evento genético es obligatoria');
          }
          await geneticImprovementsService.createGeneticImprovement(formData);
          break;
        case 'animal_disease':
          if (!formData.disease_id || !formData.instructor_id) {
            throw new Error('Enfermedad e instructor son obligatorios');
          }
          await animalDiseasesService.createAnimalDisease(formData);
          break;
        case 'animal_field':
          if (!formData.field_id) {
            throw new Error('El campo es obligatorio');
          }
          await animalFieldsService.createAnimalField(formData);
          break;
        case 'vaccination':
          if (!formData.vaccine_id) {
            throw new Error('La vacuna es obligatoria');
          }
          await vaccinationsService.createVaccination(formData);
          break;
        case 'treatment':
          if (!formData.diagnosis?.trim()) {
            throw new Error('El diagnóstico es obligatorio');
          }
          await treatmentsService.createTreatment(formData);
          break;
        case 'control':
          await (controlService as any).create(formData);
          break;
      }

      handleCloseModal();
      alert('Registro creado exitosamente');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const renderListContent = () => {
    if (loadingList) {
      return (
        <div className="py-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando registros...</p>
        </div>
      );
    }

    if (listData.length === 0) {
      return (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">No hay registros para este animal</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {listData.map((item, index) => (
          <div
            key={item.id || index}
            className="border border-border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            {renderListItem(item)}
          </div>
        ))}
      </div>
    );
  };

  const renderListItem = (item: any) => {
    switch (openModal) {
      case 'genetic_improvement':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Técnica:</span>
              <span className="text-muted-foreground">{item.genetic_event_technique || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Fecha:</span>
              <span className="text-muted-foreground">{item.date ? new Date(item.date).toLocaleDateString('es-ES') : '-'}</span>
            </div>
            {item.details && (
              <div>
                <span className="font-medium text-foreground">Detalles:</span>
                <p className="text-muted-foreground mt-1">{item.details}</p>
              </div>
            )}
            {item.results && (
              <div>
                <span className="font-medium text-foreground">Resultados:</span>
                <p className="text-muted-foreground mt-1">{item.results}</p>
              </div>
            )}
          </div>
        );

      case 'animal_disease':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Enfermedad ID:</span>
              <span className="text-muted-foreground">{item.disease_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Estado:</span>
              <span className={item.status === 'Activo' ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>{item.status || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Diagnóstico:</span>
              <span className="text-muted-foreground">{item.diagnosis_date ? new Date(item.diagnosis_date).toLocaleDateString('es-ES') : '-'}</span>
            </div>
            {item.notes && (
              <div>
                <span className="font-medium text-foreground">Notas:</span>
                <p className="text-muted-foreground mt-1">{item.notes}</p>
              </div>
            )}
          </div>
        );

      case 'animal_field':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Campo ID:</span>
              <span className="text-muted-foreground">{item.field_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Asignación:</span>
              <span className="text-muted-foreground">{item.assignment_date ? new Date(item.assignment_date).toLocaleDateString('es-ES') : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Retiro:</span>
              <span className="text-muted-foreground">{item.removal_date ? new Date(item.removal_date).toLocaleDateString('es-ES') : 'Actualmente asignado'}</span>
            </div>
            {item.notes && (
              <div>
                <span className="font-medium text-foreground">Notas:</span>
                <p className="text-muted-foreground mt-1">{item.notes}</p>
              </div>
            )}
          </div>
        );

      case 'vaccination':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Vacuna ID:</span>
              <span className="text-muted-foreground">{item.vaccine_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Fecha:</span>
              <span className="text-muted-foreground">{item.vaccination_date ? new Date(item.vaccination_date).toLocaleDateString('es-ES') : '-'}</span>
            </div>
          </div>
        );

      case 'treatment':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Diagnóstico:</span>
              <span className="text-muted-foreground">{item.diagnosis || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Fecha:</span>
              <span className="text-muted-foreground">{item.treatment_date ? new Date(item.treatment_date).toLocaleDateString('es-ES') : '-'}</span>
            </div>
            {item.description && (
              <div>
                <span className="font-medium text-foreground">Descripción:</span>
                <p className="text-muted-foreground mt-1">{item.description}</p>
              </div>
            )}
          </div>
        );

      case 'control':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Fecha:</span>
              <span className="text-muted-foreground">{item.checkup_date ? new Date(item.checkup_date).toLocaleDateString('es-ES') : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Peso:</span>
              <span className="text-muted-foreground">{item.weight ? `${item.weight} kg` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Altura:</span>
              <span className="text-muted-foreground">{item.height ? `${item.height} m` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Estado:</span>
              <span className="text-muted-foreground">{item.health_status || '-'}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderFormContent = () => {
    const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
    const labelClass = "block text-sm font-medium mb-1.5 text-foreground";
    const selectClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

    switch (openModal) {
      case 'genetic_improvement':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha *</label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Técnica del Evento Genético *</label>
              <input
                type="text"
                value={formData.genetic_event_technique || ''}
                onChange={(e) => setFormData({ ...formData, genetic_event_technique: e.target.value })}
                placeholder="Técnica utilizada"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Detalles</label>
              <textarea
                value={formData.details || ''}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="Detalles de la mejora genética"
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Resultados</label>
              <textarea
                value={formData.results || ''}
                onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                placeholder="Resultados obtenidos"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'animal_disease':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Enfermedad *</label>
              <select
                value={formData.disease_id || ''}
                onChange={(e) => setFormData({ ...formData, disease_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar enfermedad</option>
                {diseaseOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Instructor *</label>
              <select
                value={formData.instructor_id || ''}
                onChange={(e) => setFormData({ ...formData, instructor_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar instructor</option>
                {userOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha de Diagnóstico *</label>
              <input
                type="date"
                value={formData.diagnosis_date || ''}
                onChange={(e) => setFormData({ ...formData, diagnosis_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={formData.status || 'Activo'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={selectClass}
              >
                <option value="Activo">Activo</option>
                <option value="En tratamiento">En tratamiento</option>
                <option value="Curado">Curado</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Notas</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observaciones"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'animal_field':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Campo *</label>
              <select
                value={formData.field_id || ''}
                onChange={(e) => setFormData({ ...formData, field_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar campo</option>
                {fieldOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha de Asignación *</label>
              <input
                type="date"
                value={formData.assignment_date || ''}
                onChange={(e) => setFormData({ ...formData, assignment_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de Retiro</label>
              <input
                type="date"
                value={formData.removal_date || ''}
                onChange={(e) => setFormData({ ...formData, removal_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Notas</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observaciones adicionales"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'vaccination':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Vacuna *</label>
              <select
                value={formData.vaccine_id || ''}
                onChange={(e) => setFormData({ ...formData, vaccine_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar vacuna</option>
                {vaccineOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha de Vacunación *</label>
              <input
                type="date"
                value={formData.vaccination_date || ''}
                onChange={(e) => setFormData({ ...formData, vaccination_date: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'treatment':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de Tratamiento *</label>
              <input
                type="date"
                value={formData.treatment_date || ''}
                onChange={(e) => setFormData({ ...formData, treatment_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Diagnóstico *</label>
              <input
                type="text"
                value={formData.diagnosis || ''}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="Ej: Fiebre, infección..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del tratamiento"
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Frecuencia</label>
              <input
                type="text"
                value={formData.frequency || ''}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="Ej: Una vez al día"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Observaciones</label>
              <textarea
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Observaciones"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'control':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de Chequeo *</label>
              <input
                type="date"
                value={formData.checkup_date || ''}
                onChange={(e) => setFormData({ ...formData, checkup_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Peso (kg)</label>
                <input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  placeholder="Peso en kg"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Altura (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                  placeholder="Altura en metros"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Estado de Salud *</label>
              <select
                value={formData.health_status || 'Sano'}
                onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
                className={selectClass}
              >
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
                <option value="Sano">Sano</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del control"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (openModal) {
      case 'genetic_improvement':
        return modalMode === 'create' ? 'Nueva Mejora Genética' : 'Mejoras Genéticas';
      case 'animal_disease':
        return modalMode === 'create' ? 'Registrar Enfermedad' : 'Enfermedades';
      case 'animal_field':
        return modalMode === 'create' ? 'Asignar a Campo' : 'Asignaciones de Campo';
      case 'vaccination':
        return modalMode === 'create' ? 'Registrar Vacunación' : 'Vacunaciones';
      case 'treatment':
        return modalMode === 'create' ? 'Registrar Tratamiento' : 'Tratamientos';
      case 'control':
        return modalMode === 'create' ? 'Nuevo Control' : 'Controles';
      default:
        return '';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="icon-btn p-1.5 hover:bg-accent rounded-md transition-colors"
            onClick={(e) => e.stopPropagation()}
            title="Más acciones"
            aria-label="Más acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory?.();
            }}
            className="cursor-pointer"
          >
            <History className="mr-2 h-4 w-4" />
            Historial
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenAncestorsTree?.();
            }}
            className="cursor-pointer"
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Árbol de Antepasados
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenDescendantsTree?.();
            }}
            className="cursor-pointer"
          >
            <Baby className="mr-2 h-4 w-4" />
            Árbol de Descendientes
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Dna className="mr-2 h-4 w-4" />
              Mejora Genética
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('genetic_improvement', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('genetic_improvement', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Activity className="mr-2 h-4 w-4" />
              Enfermedad
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animal_disease', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animal_disease', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MapPin className="mr-2 h-4 w-4" />
              Asignar Campo
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animal_field', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animal_field', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Syringe className="mr-2 h-4 w-4" />
              Vacunación
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('vaccination', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('vaccination', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Pill className="mr-2 h-4 w-4" />
              Tratamiento
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('treatment', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('treatment', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ClipboardList className="mr-2 h-4 w-4" />
              Control
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('control', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('control', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <GenericModal
        isOpen={openModal !== null}
        onOpenChange={(open) => !open && handleCloseModal()}
        title={getModalTitle()}
        description={
          modalMode === 'list'
            ? `Registros del animal ${animal.record || animal.id}`
            : `Formulario para registrar información del animal ${animal.record || animal.id}`
        }
        size="2xl"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        <div className="space-y-4">
          {modalMode === 'list' ? (
            renderListContent()
          ) : (
            <>
              {renderFormContent()}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </>
          )}
        </div>
      </GenericModal>
    </>
  );
};
