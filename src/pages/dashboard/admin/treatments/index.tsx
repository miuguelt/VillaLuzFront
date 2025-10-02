import React, { useEffect, useState, useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { treatmentsService } from '@/services/treatmentsService';
import { animalsService } from '@/services/animalService';
import { Button } from '@/components/ui/button';
import { GenericModal } from '@/components/common/GenericModal';
import { treatmentVaccinesService } from '@/services/treatmentVaccinesService';
import { treatmentMedicationService } from '@/services/treatmentMedicationService';
import { vaccinesService } from '@/services/vaccinesService';
import { medicationsService } from '@/services/medicationsService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { TreatmentResponse, TreatmentInput, TreatmentVaccineResponse, TreatmentMedicationResponse, VaccineResponse, MedicationResponse } from '@/types/swaggerTypes';

// MOVIDO: columnas se declaran dentro del componente para poder usar openAssociations
const AdminTreatmentsPage: React.FC = () => {
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para modal de insumos (vacunas/medicamentos)
  const [assocOpen, setAssocOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentResponse | null>(null);
  const [vaccines, setVaccines] = useState<TreatmentVaccineResponse[]>([]);
  const [medications, setMedications] = useState<TreatmentMedicationResponse[]>([]);
  const [loadingAssoc, setLoadingAssoc] = useState(false);
  const [assocError, setAssocError] = useState<string | null>(null);

  // Estados para añadir vacuna/medicamento
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [vaccineOptions, setVaccineOptions] = useState<{ value: number; label: string }[]>([]);
  const [medicationOptions, setMedicationOptions] = useState<{ value: number; label: string }[]>([]);
  const [newVaccine, setNewVaccine] = useState<{ vaccine_id: number | '' }>({ vaccine_id: '' });
  const [newMedication, setNewMedication] = useState<{ medication_id: number | '' }>({ medication_id: '' });
  const [savingVaccine, setSavingVaccine] = useState(false);
  const [savingMedication, setSavingMedication] = useState(false);
  const [newVaccineError, setNewVaccineError] = useState<string | null>(null);
  const [newMedicationError, setNewMedicationError] = useState<string | null>(null);

  // Estados para tarjeta de detalle de selección
  const [selectedVaccineInfo, setSelectedVaccineInfo] = useState<VaccineResponse | null>(null);
  const [selectedMedicationInfo, setSelectedMedicationInfo] = useState<MedicationResponse | null>(null);
  const [loadingVaccineInfo, setLoadingVaccineInfo] = useState(false);
  const [loadingMedicationInfo, setLoadingMedicationInfo] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await animalsService.getAnimals?.();
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        const options = (items || []).map((a: any) => ({ value: a.id, label: a.record || a.tag || `ID ${a.id}` }));
        setAnimalOptions(options);
      } catch (e) {
        // noop
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Crear mapa de búsqueda optimizado
  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const refreshAssociations = async (treatmentId: number) => {
    setLoadingAssoc(true);
    setAssocError(null);
    try {
      const [vaccRes, medRes] = await Promise.all([
        (treatmentVaccinesService as any).getAll?.({ treatment_id: treatmentId, limit: 100 }).catch(() => []),
        (treatmentMedicationService as any).getAll?.({ treatment_id: treatmentId, limit: 100 }).catch(() => []),
      ]);
      setVaccines(Array.isArray(vaccRes) ? vaccRes : (vaccRes as any)?.data || []);
      setMedications(Array.isArray(medRes) ? medRes : (medRes as any)?.data || []);
    } catch (err) {
      setAssocError('No se pudieron cargar los insumos del tratamiento.');
    } finally {
      setLoadingAssoc(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [vaccList, medList] = await Promise.all([
        (vaccinesService as any).getAll?.({ limit: 200 }).catch(async () => (vaccinesService as any).getVaccines?.({ limit: 200 })),
        (medicationsService as any).getAll?.({ limit: 200 }).catch(async () => (medicationsService as any).getMedications?.({ limit: 200 })),
      ]);
      const vaccData = Array.isArray(vaccList) ? vaccList : (vaccList as any)?.data || [];
      const medData = Array.isArray(medList) ? medList : (medList as any)?.data || [];
      setVaccineOptions((vaccData || []).map((v: any) => ({ value: v.id, label: v.name || `Vacuna ${v.id}` })));
      setMedicationOptions((medData || []).map((m: any) => ({ value: m.id, label: m.name || `Medicamento ${m.id}` })));
    } catch (e) {
      // noop
    }
  };

  const openAssociations = async (item: TreatmentResponse) => {
    setSelectedTreatment(item);
    setAssocError(null);
    setVaccines([]);
    setMedications([]);
    setAssocOpen(true);
    setLoadingAssoc(true);
    try {
      await Promise.all([refreshAssociations(item.id), loadOptions()]);
    } finally {
      // refreshAssociations maneja loading
    }
  };

  const closeAssociations = () => {
    setAssocOpen(false);
    setSelectedTreatment(null);
    setVaccines([]);
    setMedications([]);
    setAssocError(null);
    setShowAddVaccine(false);
    setShowAddMedication(false);
    setNewVaccine({ vaccine_id: '' });
    setNewMedication({ medication_id: '' });
    setNewVaccineError(null);
    setNewMedicationError(null);
    setSelectedVaccineInfo(null);
    setSelectedMedicationInfo(null);
  };

  const handleCreateVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatment) return;
    setNewVaccineError(null);
    const vaccine_id_num = typeof newVaccine.vaccine_id === 'string' ? parseInt(newVaccine.vaccine_id, 10) : newVaccine.vaccine_id;
    if (!vaccine_id_num) {
      setNewVaccineError('Selecciona una vacuna.');
      return;
    }
    // Evitar duplicados: si ya existe la misma vacuna asociada al tratamiento
    const alreadyExists = Array.isArray(vaccines) && vaccines.some((v: any) => v?.vaccine_id === vaccine_id_num);
    if (alreadyExists) {
      setNewVaccineError('Esta vacuna ya está asociada al tratamiento.');
      return;
    }
    setSavingVaccine(true);
    try {
      await treatmentVaccinesService.createTreatmentVaccine({
        treatment_id: selectedTreatment.id,
        vaccine_id: vaccine_id_num,
      } as any);
      await refreshAssociations(selectedTreatment.id);
      setShowAddVaccine(false);
      setNewVaccine({ vaccine_id: '' });
    } catch (err: any) {
      console.error('Error al crear tratamiento-vacuna:', err);
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      setNewVaccineError(apiMsg ? `No se pudo añadir la vacuna: ${typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg)}` : 'No se pudo añadir la vacuna al tratamiento.');
    } finally {
      setSavingVaccine(false);
    }
  };

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatment) return;
    setNewMedicationError(null);
    const medication_id_num = typeof newMedication.medication_id === 'string' ? parseInt(newMedication.medication_id, 10) : newMedication.medication_id;
    if (!medication_id_num) {
      setNewMedicationError('Selecciona un medicamento.');
      return;
    }
    setSavingMedication(true);
    try {
      await treatmentMedicationService.createTreatmentMedication({
        treatment_id: selectedTreatment.id,
        medication_id: medication_id_num,
      } as any);
      await refreshAssociations(selectedTreatment.id);
      setShowAddMedication(false);
      setNewMedication({ medication_id: '' });
    } catch (err: any) {
      setNewMedicationError('No se pudo añadir el medicamento al tratamiento.');
    } finally {
      setSavingMedication(false);
    }
  };

  const columns: CRUDColumn<TreatmentResponse & { [k: string]: any }>[] = useMemo(() => [
    {
      key: 'action' as any,
      label: '',
      sortable: false,
      render: (_v, item) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 ring-1 ring-white/20 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 hover:shadow-md hover:bg-white/10 active:scale-[0.98] cursor-pointer"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openAssociations(item); }}
          title="ver tratamiento"
          aria-label="ver tratamiento"
        >
          ver tratamiento
        </Button>
      ),
    },
    { key: 'animal_id' as any, label: 'Animal', render: (value: any) => animalMap.get(Number(value)) || `Animal ${value}` || '-' },
    { key: 'treatment_date' as any, label: 'Fecha de tratamiento', render: (v) => (v ? new Date(String(v)).toLocaleDateString('es-ES') : '-') },
    { key: 'description' as any, label: 'Descripción', render: (v) => v ?? '-' },
    { key: 'dosis' as any, label: 'Dosis', render: (v) => v ?? '-' },
    { key: 'frequency' as any, label: 'Frecuencia', render: (v) => v ?? '-' },
    { key: 'observations' as any, label: 'Observaciones', render: (v) => v ?? '-' },
    { key: 'created_at' as any, label: 'Creado', render: (v) => (v ? new Date(String(v)).toLocaleString('es-ES') : '-') },
  ], [animalMap]);

  const formSectionsLocal: CRUDFormSection<TreatmentInput & { [k: string]: any }>[] = [
    {
      title: 'Información básica',
      gridCols: 2,
      fields: [
        { name: 'animal_id' as any, label: 'Animal', type: 'select', required: true, options: animalOptions, placeholder: 'Seleccionar animal' },
        { name: 'treatment_date' as any, label: 'Fecha de tratamiento', type: 'date', required: true },
        { name: 'diagnosis' as any, label: 'Diagnóstico', type: 'text', required: true, placeholder: 'Ej: Fiebre, infección...' },
        { name: 'description' as any, label: 'Descripción', type: 'textarea', placeholder: 'Descripción del tratamiento', colSpan: 2 },
       
        { name: 'frequency' as any, label: 'Frecuencia', type: 'text', placeholder: 'Ej: Una vez' },
        { name: 'observations' as any, label: 'Observaciones', type: 'textarea', placeholder: 'Observaciones', colSpan: 2 },
      ],
    },
  ];

  const crudConfigLocal: CRUDConfig<TreatmentResponse & { [k: string]: any }, TreatmentInput & { [k: string]: any }> = {
    title: 'Tratamientos',
    entityName: 'Tratamiento',
    columns,
    formSections: formSectionsLocal,
    searchPlaceholder: 'Buscar tratamientos...',
    emptyStateMessage: 'No hay tratamientos registrados.',
    emptyStateDescription: 'Crea el primer registro para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    // Evitamos timestamps automáticos del detalle/edición porque ya mostramos created_at como columna
    showDetailTimestamps: false,
    showEditTimestamps: false,
    // Ocultar id en el título del detalle
    showIdInDetailTitle: false,
  };

  // No renderizar hasta que las opciones estén cargadas para evitar mostrar IDs
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tratamientos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminCRUDPage
        config={crudConfigLocal}
        service={treatmentsService}
        initialFormData={initialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
      />

      {/* Modal de Insumos (Vacunas y Medicamentos) */}
      <GenericModal
        isOpen={assocOpen}
        onOpenChange={(open) => (open ? setAssocOpen(true) : closeAssociations())}
        title={
          selectedTreatment
            ? `Insumos del tratamiento ${selectedTreatment.id ?? ''}`
            : 'Insumos del tratamiento'
        }
        size="2xl"
        enableBackdropBlur
        description="Vacunas y medicamentos asociados al tratamiento seleccionado"
        className="bg-card/60 backdrop-blur-md text-card-foreground border border-border/40 shadow-xl"
      >
        <div className="space-y-4">
          {/* Acciones para añadir */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {selectedTreatment ? (
                <span>
                  Tratamiento seleccionado: <span className="font-medium">#{selectedTreatment.id}</span>{' '}
                  {selectedTreatment.diagnosis ? `· ${selectedTreatment.diagnosis}` : ''}
                </span>
              ) : (
                <span>Selecciona un tratamiento.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="h-8 px-3 ring-1 ring-white/20 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 hover:shadow-md active:scale-[0.98]"
                onClick={(e) => { e.stopPropagation(); setShowAddVaccine((s) => !s); setShowAddMedication(false); }}
                disabled={!selectedTreatment}
              >
                Añadir vacuna
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="h-8 px-3 ring-1 ring-white/20 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 hover:shadow-md active:scale-[0.98]"
                onClick={(e) => { e.stopPropagation(); setShowAddMedication((s) => !s); setShowAddVaccine(false); }}
                disabled={!selectedTreatment}
              >
                Añadir medicamento
              </Button>
            </div>
          </div>

          {/* Formulario añadir vacuna */}
          {showAddVaccine && selectedTreatment && (
            <form onSubmit={handleCreateVaccine} className="rounded-lg border bg-background/80 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vacuna</label>
                  <select
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    value={newVaccine.vaccine_id as any}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setNewVaccine((s) => ({ ...s, vaccine_id: val }));
                      setNewVaccineError(null);
                      if (!val) {
                        setSelectedVaccineInfo(null);
                        return;
                      }
                      const idNum = typeof val === 'string' ? parseInt(val, 10) : val;
                      if (!idNum) {
                        setSelectedVaccineInfo(null);
                        return;
                      }
                      setLoadingVaccineInfo(true);
                      (async () => {
                        try {
                          const info = await vaccinesService.getVaccineById(String(idNum));
                          setSelectedVaccineInfo(info as any);
                        } catch (_) {
                          setSelectedVaccineInfo(null);
                        } finally {
                          setLoadingVaccineInfo(false);
                        }
                      })();
                    }}
                    required
                  >
                    <option value="">Seleccionar vacuna…</option>
                    {vaccineOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm" className="h-9" disabled={savingVaccine}>
                    {savingVaccine ? 'Guardando…' : 'Guardar vacuna'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => { setShowAddVaccine(false); setNewVaccine({ vaccine_id: '' }); setNewVaccineError(null); setSelectedVaccineInfo(null); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
              {loadingVaccineInfo && (
                <div className="text-xs text-muted-foreground">Cargando información de la vacuna…</div>
              )}
              {selectedVaccineInfo && !loadingVaccineInfo && (
                <Card className="bg-card text-card-foreground border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{selectedVaccineInfo.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedVaccineInfo.type && <p><span className="font-medium">Tipo:</span> {selectedVaccineInfo.type}</p>}
                      {selectedVaccineInfo.dosis && <p><span className="font-medium">Dosis:</span> {selectedVaccineInfo.dosis}</p>}
                      {selectedVaccineInfo.route_administration_name && <p><span className="font-medium">Ruta Admin.:</span> {selectedVaccineInfo.route_administration_name}</p>}
                      {typeof selectedVaccineInfo.vaccination_interval !== 'undefined' && <p><span className="font-medium">Intervalo (días):</span> {String(selectedVaccineInfo.vaccination_interval)}</p>}
                      {selectedVaccineInfo.target_disease_name && <p><span className="font-medium">Enfermedad objetivo:</span> {selectedVaccineInfo.target_disease_name}</p>}
                      {typeof selectedVaccineInfo.national_plan !== 'undefined' && <p><span className="font-medium">Plan Nacional:</span> {selectedVaccineInfo.national_plan ? 'Sí' : 'No'}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
              {newVaccineError && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">{newVaccineError}</div>
              )}
            </form>
          )}

          {/* Formulario añadir medicamento */}
          {showAddMedication && selectedTreatment && (
            <form onSubmit={handleCreateMedication} className="rounded-lg border bg-background/80 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Medicamento</label>
                  <select
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    value={newMedication.medication_id as any}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setNewMedication((s) => ({ ...s, medication_id: val }));
                      setNewMedicationError(null);
                      if (!val) {
                        setSelectedMedicationInfo(null);
                        return;
                      }
                      const idNum = typeof val === 'string' ? parseInt(val, 10) : val;
                      if (!idNum) {
                        setSelectedMedicationInfo(null);
                        return;
                      }
                      setLoadingMedicationInfo(true);
                      (async () => {
                        try {
                          const info = await medicationsService.getMedicationById(String(idNum));
                          setSelectedMedicationInfo(info as any);
                        } catch (_) {
                          setSelectedMedicationInfo(null);
                        } finally {
                          setLoadingMedicationInfo(false);
                        }
                      })();
                    }}
                    required
                  >
                    <option value="">Seleccionar medicamento…</option>
                    {medicationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm" className="h-9" disabled={savingMedication}>
                    {savingMedication ? 'Guardando…' : 'Guardar medicamento'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => { setShowAddMedication(false); setNewMedication({ medication_id: '' }); setNewMedicationError(null); setSelectedMedicationInfo(null); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
              {loadingMedicationInfo && (
                <div className="text-xs text-muted-foreground">Cargando información del medicamento…</div>
              )}
              {selectedMedicationInfo && !loadingMedicationInfo && (
                <Card className="bg-card text-card-foreground border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{selectedMedicationInfo.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedMedicationInfo.description && <p><span className="font-medium">Descripción:</span> {selectedMedicationInfo.description}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedMedicationInfo.dosage_form && <p><span className="font-medium">Forma farmacéutica:</span> {selectedMedicationInfo.dosage_form}</p>}
                      {selectedMedicationInfo.concentration && <p><span className="font-medium">Concentración:</span> {selectedMedicationInfo.concentration}</p>}
                      {selectedMedicationInfo.manufacturer && <p><span className="font-medium">Fabricante:</span> {selectedMedicationInfo.manufacturer}</p>}
                      {typeof selectedMedicationInfo.withdrawal_period_days !== 'undefined' && <p><span className="font-medium">Periodo de retiro (días):</span> {String(selectedMedicationInfo.withdrawal_period_days)}</p>}
                      {selectedMedicationInfo.storage_conditions && <p><span className="font-medium">Almacenamiento:</span> {selectedMedicationInfo.storage_conditions}</p>}
                    </div>
                    {selectedMedicationInfo.contraindications && <p><span className="font-medium">Contraindicaciones:</span> {selectedMedicationInfo.contraindications}</p>}
                  </CardContent>
                </Card>
              )}
              {newMedicationError && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">{newMedicationError}</div>
              )}
            </form>
          )}

          {assocError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
              {assocError}
            </div>
          )}

          {loadingAssoc ? (
            <div className="py-10 text-center text-muted-foreground">Cargando insumos…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-background p-4">
                <h3 className="font-semibold mb-2">Vacunas</h3>
                {vaccines && vaccines.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {vaccines.map((v: any) => (
                      <li key={v.id ?? `${v.vaccine_id}-${v.treatment_id}-${Math.random()}`} className="flex items-start justify-between rounded-md border p-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">Vacuna #{v.vaccine_id ?? v.id}</div>
                          {v.dose && (
                            <div className="text-muted-foreground">Dosis: {String(v.dose)}</div>
                          )}
                        </div>
                        {v.created_at && (
                          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                            {new Date(String(v.created_at)).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">No hay vacunas asociadas.</div>
                )}
              </div>

              <div className="rounded-lg border bg-background p-4">
                <h3 className="font-semibold mb-2">Medicamentos</h3>
                {medications && medications.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {medications.map((m: any) => (
                      <li key={m.id ?? `${m.medication_id}-${m.treatment_id}-${Math.random()}`} className="flex items-start justify-between rounded-md border p-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">Medicamento #{m.medication_id ?? m.id}</div>
                          <div className="text-muted-foreground">
                            {m.dosage ?? m.dose ? `Dosis: ${String(m.dosage ?? m.dose)}` : null}
                            {m.frequency ? ` · Frecuencia: ${String(m.frequency)}` : null}
                            {m.duration_days ? ` · Días: ${String(m.duration_days)}` : null}
                            {m.administration_route ? ` · Vía: ${String(m.administration_route)}` : null}
                          </div>
                        </div>
                        {m.created_at && (
                          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                            {new Date(String(m.created_at)).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">No hay medicamentos asociados.</div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={closeAssociations}>
              Cerrar
            </Button>
          </div>
        </div>
      </GenericModal>
    </>
  );
};

// Página principal reemplazada por versión con selects dinámicos arriba

export default AdminTreatmentsPage;

// Mapeo respuesta -> formulario (solo Potreros requeridos)
const mapResponseToForm = (item: TreatmentResponse & { [k: string]: any }): TreatmentInput & { [k: string]: any } => ({
  animal_id: item.animal_id,
  treatment_date: (item as any).treatment_date || (item as any).treatment_date || '',
  diagnosis: (item as any).diagnosis ?? '',
  description: (item as any).description ?? '',
  dosis: (item as any).dosis ?? '',
  frequency: (item as any).frequency ?? '',
  observations: (item as any).observations ?? '',
});

// Validación mínima
const validateForm = (formData: TreatmentInput & { [k: string]: any }): string | null => {
  if (!formData.animal_id) return 'El animal es obligatorio.';
  if (!formData.treatment_date || !String(formData.treatment_date).trim()) return 'La fecha de tratamiento es obligatoria.';
  if (!formData.diagnosis || !String(formData.diagnosis).trim()) return 'El diagnóstico es obligatorio.';
  return null;
};

// Datos iniciales (solo Potreros requeridos)
const initialFormData: TreatmentInput & { [k: string]: any } = {
  animal_id: 0,
  treatment_date: new Date().toISOString().split('T')[0],
  diagnosis: '',
  description: '',
  dosis: '',
  frequency: '',
  observations: '',
};

