import React, { useState, useEffect } from 'react';
import { MoreVertical, Activity, Syringe, Eye, Plus } from 'lucide-react';
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
import { UserResponse } from '@/types/swaggerTypes';
import { getTodayColombia } from '@/utils/dateUtils';

// Importar servicios
import { animalDiseasesService } from '@/services/animalDiseasesService';
import { vaccinationsService } from '@/services/vaccinationsService';
import { diseaseService } from '@/services/diseaseService';
import { animalsService } from '@/services/animalService';
import { vaccinesService } from '@/services/vaccinesService';

interface UserActionsMenuProps {
  user: UserResponse;
}

type ModalType = 'animal_disease' | 'vaccination' | null;
type ModalMode = 'create' | 'list';

export const UserActionsMenu: React.FC<UserActionsMenuProps> = ({ user }) => {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Opciones para los selects
  const [animalOptions, setAnimalOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [vaccineOptions, setVaccineOptions] = useState<Array<{ value: number; label: string }>>([]);

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
  }, [openModal, modalMode, user.id]);

  const loadOptions = async () => {
    try {
      const [animals, diseases, vaccines] = await Promise.all([
        animalsService.getAnimals({ page: 1, limit: 1000 }).catch(() => []),
        diseaseService.getDiseases({ page: 1, limit: 1000 }).catch(() => []),
        vaccinesService.getVaccines?.({ page: 1, limit: 1000 }).catch(() => []),
      ]);

      const animalsData = animals || [];
      setAnimalOptions(animalsData.map((a: any) => ({
        value: a.id,
        label: a.record || `ID ${a.id}`
      })));

      const diseasesData = (diseases as any)?.data || diseases || [];
      setDiseaseOptions(diseasesData.map((d: any) => ({
        value: d.id,
        label: d.disease || d.name || `Enfermedad ${d.id}`
      })));

      const vaccinesData = (vaccines as any)?.data || vaccines || [];
      setVaccineOptions(vaccinesData.map((v: any) => ({
        value: v.id,
        label: v.name || `Vacuna ${v.id}`
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
        case 'animal_disease':
          {
            const adResult = await (animalDiseasesService as any).getAll?.({
              instructor_id: user.id,
              limit: 100
            });
            data = Array.isArray(adResult) ? adResult : (adResult?.data || adResult?.items || []);
            data = data.filter((item: any) => item.instructor_id === user.id);
            break;
          }

        case 'vaccination':
          {
            const vResult = await (vaccinationsService as any).getAll?.({
              limit: 100
            });
            const allVaccinations = Array.isArray(vResult) ? vResult : (vResult?.data || vResult?.items || []);
            // Filtrar por instructor_id o apprentice_id
            data = allVaccinations.filter((item: any) =>
              item.instructor_id === user.id || item.apprentice_id === user.id
            );
            break;
          }
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
        case 'animal_disease':
          setFormData({
            animal_id: undefined,
            disease_id: undefined,
            instructor_id: user.id,
            diagnosis_date: getTodayColombia(),
            status: 'Activo',
            notes: '',
          });
          break;
        case 'vaccination':
          setFormData({
            animal_id: undefined,
            vaccine_id: undefined,
            vaccination_date: getTodayColombia(),
            apprentice_id: user.role === 'Aprendiz' ? user.id : undefined,
            instructor_id: user.role === 'Instructor' ? user.id : undefined,
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
        case 'animal_disease':
          if (!formData.animal_id || !formData.disease_id || !formData.instructor_id) {
            throw new Error('Animal, enfermedad e instructor son obligatorios');
          }
          await animalDiseasesService.createAnimalDisease(formData);
          break;
        case 'vaccination':
          if (!formData.animal_id || !formData.vaccine_id) {
            throw new Error('Animal y vacuna son obligatorios');
          }
          await vaccinationsService.createVaccination(formData);
          break;
      }

      handleCloseModal();
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
          <p className="text-muted-foreground">No hay registros para este usuario</p>
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
    const getAnimalLabel = (animalId: number) => {
      const animal = animalOptions.find(a => a.value === animalId);
      return animal?.label || `Animal ${animalId}`;
    };

    switch (openModal) {
      case 'animal_disease':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Animal:</span>
              <span className="text-muted-foreground">{item.animal_id ? getAnimalLabel(item.animal_id) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Enfermedad ID:</span>
              <span className="text-muted-foreground">{item.disease_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Estado:</span>
              <span className={item.status === 'Activo' ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                {item.status || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Diagnóstico:</span>
              <span className="text-muted-foreground">
                {item.diagnosis_date ? new Date(item.diagnosis_date).toLocaleDateString('es-ES') : '-'}
              </span>
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
        {
          const roleLabel = item.instructor_id === user.id ? 'Instructor' : item.apprentice_id === user.id ? 'Aprendiz' : 'N/A';
          return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Animal:</span>
              <span className="text-muted-foreground">{item.animal_id ? getAnimalLabel(item.animal_id) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Vacuna ID:</span>
              <span className="text-muted-foreground">{item.vaccine_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Fecha:</span>
              <span className="text-muted-foreground">
                {item.vaccination_date ? new Date(item.vaccination_date).toLocaleDateString('es-ES') : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Rol:</span>
              <span className="text-muted-foreground">{roleLabel}</span>
            </div>
          </div>
          );
        }

      default:
        return null;
    }
  };

  const renderFormContent = () => {
    const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
    const labelClass = "block text-sm font-medium mb-1.5 text-foreground";
    const selectClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

    switch (openModal) {
      case 'animal_disease':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Instructor</label>
              <input
                type="text"
                value={user.fullname || `ID ${user.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Animal *</label>
              <select
                value={formData.animal_id || ''}
                onChange={(e) => setFormData({ ...formData, animal_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar animal</option>
                {animalOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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

      case 'vaccination':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Usuario</label>
              <input
                type="text"
                value={`${user.fullname} (${user.role})`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Animal *</label>
              <select
                value={formData.animal_id || ''}
                onChange={(e) => setFormData({ ...formData, animal_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar animal</option>
                {animalOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (openModal) {
      case 'animal_disease':
        return modalMode === 'create' ? 'Registrar Enfermedad' : 'Enfermedades Asignadas';
      case 'vaccination':
        return modalMode === 'create' ? 'Registrar Vacunación' : 'Vacunaciones Realizadas';
      default:
        return '';
    }
  };

  // Todos los usuarios pueden ver y registrar enfermedades y vacunaciones
  const showDiseaseOption = true;
  const showVaccinationOption = true;

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
          {showDiseaseOption && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Activity className="mr-2 h-4 w-4" />
                  Enfermedades
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
              {showVaccinationOption && <DropdownMenuSeparator />}
            </>
          )}

          {showVaccinationOption && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Syringe className="mr-2 h-4 w-4" />
                Vacunaciones
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
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <GenericModal
        isOpen={openModal !== null}
        onOpenChange={(open) => !open && handleCloseModal()}
        title={getModalTitle()}
        description={modalMode === 'list' ? `Registros del usuario ${user.fullname || user.id}` : undefined}
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
