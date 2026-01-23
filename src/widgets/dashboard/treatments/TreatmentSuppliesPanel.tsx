import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { cn } from '@/shared/ui/cn';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { TreatmentResponse, VaccineResponse, MedicationResponse, TreatmentVaccineResponse, TreatmentMedicationResponse } from '@/shared/api/generated/swaggerTypes';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { TreatmentSuppliesCards } from './TreatmentSuppliesCards';
import { useToast } from '@/app/providers/ToastContext';
import { ItemDetailModal } from '../animals/ItemDetailModal';

interface TreatmentSuppliesPanelProps {
    treatment: TreatmentResponse | null;
    className?: string;
}

export const TreatmentSuppliesPanel: React.FC<TreatmentSuppliesPanelProps> = ({
    treatment,
    className
}) => {
    const { showToast } = useToast();

    // Data State
    const [vaccines, setVaccines] = useState<TreatmentVaccineResponse[]>([]);
    const [medications, setMedications] = useState<TreatmentMedicationResponse[]>([]);
    const [loadingAssoc, setLoadingAssoc] = useState(false);
    const [assocError, setAssocError] = useState<string | null>(null);

    // Options State
    const [vaccineOptions, setVaccineOptions] = useState<{ value: number; label: string }[]>([]);
    const [medicationOptions, setMedicationOptions] = useState<{ value: number; label: string }[]>([]);
    const [vaccineDoseMap, setVaccineDoseMap] = useState<Record<number, string>>({});

    const [vaccineRouteMap, setVaccineRouteMap] = useState<Record<number, string>>({});
    const [vaccineFullMap, setVaccineFullMap] = useState<Record<number, any>>({});
    const [medicationFullMap, setMedicationFullMap] = useState<Record<number, any>>({});

    // View Detail State
    const [viewDetailItem, setViewDetailItem] = useState<any>(null);
    const [viewDetailType, setViewDetailType] = useState<'vaccine' | 'medication' | null>(null);

    // Create State
    const [showAddVaccine, setShowAddVaccine] = useState(false);
    const [showAddMedication, setShowAddMedication] = useState(false);
    const [vaccineSearch, setVaccineSearch] = useState('');
    const [medicationSearch, setMedicationSearch] = useState('');
    const [newVaccines, setNewVaccines] = useState<number[]>([]);
    const [newMedications, setNewMedications] = useState<number[]>([]);
    const [savingVaccine, setSavingVaccine] = useState(false);
    const [savingMedication, setSavingMedication] = useState(false);
    const [newVaccineError, setNewVaccineError] = useState<string | null>(null);
    const [newMedicationError, setNewMedicationError] = useState<string | null>(null);

    // Filter State (Simplified for panel)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
    const [deleteLoadingId, setDeleteLoadingId] = useState<{ type: 'vaccine' | 'medication'; id: number } | null>(null);

    // Refs
    const associationsLoadingRef = useRef<Promise<void> | null>(null);
    const associationsIdRef = useRef<number | null>(null);
    const optionsLoadedRef = useRef(false);
    const optionsLoadingRef = useRef<Promise<void> | null>(null);

    // Maps
    const vaccineLabelById = useMemo(() => {
        const map = new Map<number, string>();
        (vaccineOptions || []).forEach((o) => map.set(Number(o.value), o.label));
        return map;
    }, [vaccineOptions]);

    const medicationLabelById = useMemo(() => {
        const map = new Map<number, string>();
        (medicationOptions || []).forEach((o) => map.set(Number(o.value), o.label));
        return map;
    }, [medicationOptions]);

    // Load Options
    const loadOptions = useCallback(async () => {
        if (optionsLoadedRef.current) return;
        if (optionsLoadingRef.current) return optionsLoadingRef.current;

        const req = (async () => {
            try {
                const [vaccList, medList] = await Promise.all([
                    (vaccinesService as any).getAll?.({ limit: 200 }).catch(async () => (vaccinesService as any).getVaccines?.({ limit: 200 })),
                    (medicationsService as any).getAll?.({ limit: 200 }).catch(async () => (medicationsService as any).getMedications?.({ limit: 200 })),
                ]);

                const vaccData = Array.isArray(vaccList) ? vaccList : (vaccList as any)?.data || [];
                const medData = Array.isArray(medList) ? medList : (medList as any)?.data || [];

                setVaccineOptions((vaccData || []).map((v: any) => ({ value: v.id, label: v.name || `Vacuna ${v.id}` })));
                setMedicationOptions((medData || []).map((m: any) => ({ value: m.id, label: m.name || `Medicamento ${m.id}` })));

                const doseEntries: [number, string][] = (vaccData || []).map((v: any) => {
                    const dose = (v as any).dosis ?? (v as any).dose ?? '';
                    return [Number(v.id), typeof dose === 'string' && dose.trim() ? String(dose) : '1 dosis'];
                }).filter(([id]: [number, string]) => !!id);
                const doseMap: Record<number, string> = {};
                doseEntries.forEach(([id, dose]: [number, string]) => { doseMap[id] = dose; });
                setVaccineDoseMap(doseMap);

                const routeEntries: [number, string][] = (vaccData || []).map((v: any) => [Number(v.id), (v as any).route_administration_name || '']).filter(([id, name]: [number, string]) => !!id && !!String(name).trim());
                const routeMap: Record<number, string> = {};
                routeEntries.forEach(([id, name]: [number, string]) => { routeMap[id] = String(name); });
                setVaccineRouteMap(routeMap);

                const vaccMap: Record<number, any> = {};
                (vaccData || []).forEach((v: any) => { vaccMap[v.id] = v; });
                setVaccineFullMap(vaccMap);

                const medMap: Record<number, any> = {};
                (medData || []).forEach((m: any) => { medMap[m.id] = m; });
                setMedicationFullMap(medMap);

                optionsLoadedRef.current = true;
            } catch (e) {
                console.error('Failed to load options', e);
            }
        })();

        optionsLoadingRef.current = req;
        try {
            await req;
        } finally {
            if (optionsLoadingRef.current === req) {
                optionsLoadingRef.current = null;
            }
        }
    }, []);

    // Fetch Associations
    const refreshAssociations = useCallback(async (treatmentId: number, bypassCache: boolean = false) => {
        if (!treatmentId) return;
        if (!bypassCache && associationsLoadingRef.current && associationsIdRef.current === treatmentId) {
            return associationsLoadingRef.current;
        }

        setLoadingAssoc(true);
        setAssocError(null);
        associationsIdRef.current = treatmentId;

        const req = (async () => {
            try {
                // Helper recursivo para garantizar la carga completa de datos
                const fetchAllItems = async (service: any, method: string, queryParams: any) => {
                    let allData: any[] = [];
                    let page = 1;
                    const ITEMS_PER_PAGE = 50;

                    while (page <= 10) { // Límite de seguridad
                        const p = { ...queryParams, page, limit: ITEMS_PER_PAGE };
                        try {
                            const res = await service[method](p);
                            const list = res.data || (Array.isArray(res) ? res : []);

                            if (!list || list.length === 0) break;

                            const newItems = list.filter((item: any) => !allData.some((existing) => existing.id === item.id));
                            if (newItems.length === 0) break;

                            allData = [...allData, ...newItems];
                            page++;
                        } catch (e) {
                            console.error(`Error fetching page ${page}`, e);
                            break;
                        }
                    }
                    return allData;
                };

                const params: any = {
                    treatment_id: treatmentId,
                    treatmentId: treatmentId,
                    sort_by: 'id',
                    sort_order: 'desc',
                    _t: Date.now()
                };

                if (bypassCache) {
                    params.cache_bust = Date.now();
                }

                const [vData, mData] = await Promise.all([
                    fetchAllItems(treatmentVaccinesService, 'getTreatmentVaccines', params),
                    fetchAllItems(treatmentMedicationService, 'getTreatmentMedications', params),
                ]);

                // FILTRADO ROBUSTO y FILTRADO DE SOFT DELETES
                const tIdStr = String(treatmentId);
                const isNotDeleted = (item: any) => !item.deleted_at && !item.deletedAt;

                const filteredVaccines = vData.filter((v: any) => {
                    const vTId = v.treatment_id ?? v.treatmentId;
                    return String(vTId) === tIdStr && isNotDeleted(v);
                });
                const filteredMedications = mData.filter((m: any) => {
                    const mTId = m.treatment_id ?? m.treatmentId;
                    return String(mTId) === tIdStr && isNotDeleted(m);
                });

                setVaccines(filteredVaccines);
                setMedications(filteredMedications);
            } catch (err) {
                console.error('[TreatmentSuppliesPanel] Error refreshing associations:', err);
                setAssocError('No se pudieron cargar los insumos del tratamiento.');
            } finally {
                setLoadingAssoc(false);
            }
        })();

        associationsLoadingRef.current = req;
        try {
            await req;
        } finally {
            if (associationsLoadingRef.current === req) {
                associationsLoadingRef.current = null;
                associationsIdRef.current = null;
            }
        }
    }, []);

    // Initial Load
    useEffect(() => {
        if (treatment?.id) {
            loadOptions();
            refreshAssociations(treatment.id, true);
        }
    }, [treatment, loadOptions, refreshAssociations]);

    // Handlers
    const handleCreateVaccine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!treatment) return;
        setNewVaccineError(null);
        if (!Array.isArray(newVaccines) || newVaccines.length === 0) {
            setNewVaccineError('Selecciona una vacuna.');
            return;
        }

        const existingIds = (vaccines || []).map((v: any) => Number(v.vaccine_id)).filter(Boolean);
        const toCreateIds = newVaccines.filter((id) => !!id && !existingIds.includes(Number(id)));

        if (toCreateIds.length === 0) {
            setNewVaccineError('Todas las vacunas seleccionadas ya están asociadas.');
            return;
        }

        setSavingVaccine(true);
        try {
            const payload = toCreateIds.map((id) => ({
                treatment_id: treatment.id,
                treatmentId: treatment.id,
                vaccine_id: id,
                dose: vaccineDoseMap[id] ?? '1 dosis',
            }));
            if (payload.length === 1) {
                await treatmentVaccinesService.createTreatmentVaccine(payload[0] as any);
            } else {
                await (treatmentVaccinesService as any).createBulk(payload as any);
            }

            await Promise.all([
                treatmentVaccinesService.clearCache(),
                treatmentMedicationService.clearCache()
            ]);

            setTimeout(() => {
                refreshAssociations(treatment.id, true);
            }, 1200);

            setShowAddVaccine(false);
            setNewVaccines([]);
            const names = toCreateIds.map((id) => vaccineLabelById.get(Number(id)) || `#${id}`);
            showToast(`Vacuna(s) asociadas: ${names.join(', ')}`, 'success');
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
        if (!treatment) return;
        setNewMedicationError(null);
        if (!Array.isArray(newMedications) || newMedications.length === 0) {
            setNewMedicationError('Selecciona un medicamento.');
            return;
        }

        const existingIds = (medications || []).map((m: any) => Number(m.medication_id)).filter(Boolean);
        const toCreateIds = newMedications.filter((id) => !!id && !existingIds.includes(Number(id)));

        if (toCreateIds.length === 0) {
            setNewMedicationError('Todos los medicamentos seleccionados ya están asociados.');
            return;
        }

        setSavingMedication(true);
        try {
            const payload = toCreateIds.map((id) => ({
                treatment_id: treatment.id,
                treatmentId: treatment.id,
                medication_id: id,
            }));
            if (payload.length === 1) {
                await treatmentMedicationService.createTreatmentMedication(payload[0] as any);
            } else {
                await (treatmentMedicationService as any).createBulk(payload as any);
            }

            await Promise.all([
                treatmentVaccinesService.clearCache(),
                treatmentMedicationService.clearCache()
            ]);

            setTimeout(() => {
                refreshAssociations(treatment.id, true);
            }, 1200);

            setShowAddMedication(false);
            setNewMedications([]);
            const names = toCreateIds.map((id) => medicationLabelById.get(Number(id)) || `#${id}`);
            showToast(`Medicamento(s) asociados: ${names.join(', ')}`, 'success');
        } catch (err: any) {
            setNewMedicationError('No se pudo añadir el medicamento al tratamiento.');
        } finally {
            setSavingMedication(false);
        }
    };

    const openDeleteVaccine = async (v: any) => {
        const itemId = v.id;
        if (confirmingDeleteId === itemId) {
            setConfirmingDeleteId(null);
            await confirmDeleteVaccine(v);
        } else {
            setConfirmingDeleteId(itemId);
            showToast('Haz clic de nuevo para desvincular', 'warning');
            setTimeout(() => setConfirmingDeleteId(prev => prev === itemId ? null : prev), 3000);
        }
    };

    const confirmDeleteVaccine = async (v: any) => {
        if (!v || !treatment) return;
        const itemId = v.id;
        setDeleteLoadingId({ type: 'vaccine', id: itemId });
        setVaccines(prev => prev.filter(v => v.id !== itemId));

        try {
            await (treatmentVaccinesService as any).deleteTreatmentVaccine(String(itemId));
            await Promise.all([
                treatmentVaccinesService.clearCache(),
                treatmentMedicationService.clearCache()
            ]);
            await refreshAssociations(treatment.id, true);
            showToast('Vacuna desvinculada', 'success');
        } catch (e: any) {
            if (e?.response?.status === 404 || e?.status === 404) {
                await Promise.all([
                    treatmentVaccinesService.clearCache(),
                    treatmentMedicationService.clearCache()
                ]);
                await refreshAssociations(treatment.id, true);
            } else {
                await refreshAssociations(treatment.id, true);
                showToast('Error al desvincular vacuna', 'error');
            }
        } finally {
            setDeleteLoadingId(null);
        }
    };

    const openDeleteMedication = async (m: any) => {
        const itemId = m.id;
        if (confirmingDeleteId === itemId) {
            setConfirmingDeleteId(null);
            await confirmDeleteMedication(m);
        } else {
            setConfirmingDeleteId(itemId);
            showToast('Haz clic de nuevo para desvincular', 'warning');
            setTimeout(() => setConfirmingDeleteId(prev => prev === itemId ? null : prev), 3000);
        }
    };

    const confirmDeleteMedication = async (m: any) => {
        if (!m || !treatment) return;
        const itemId = m.id;
        setDeleteLoadingId({ type: 'medication', id: itemId });
        setMedications(prev => prev.filter(m => m.id !== itemId));

        try {
            await (treatmentMedicationService as any).deleteTreatmentMedication(String(itemId));
            await Promise.all([
                treatmentVaccinesService.clearCache(),
                treatmentMedicationService.clearCache()
            ]);
            await refreshAssociations(treatment.id, true);
            showToast('Medicamento desvinculado', 'success');
        } catch (e: any) {
            if (e?.response?.status === 404 || e?.status === 404) {
                await Promise.all([
                    treatmentVaccinesService.clearCache(),
                    treatmentMedicationService.clearCache()
                ]);
                await refreshAssociations(treatment.id, true);
            } else {
                await refreshAssociations(treatment.id, true);
                showToast('Error al desvincular medicamento', 'error');
            }
        } finally {
            setDeleteLoadingId(null);
        }
    };

    const handleViewItem = (type: 'vaccine' | 'medication', id: number) => {
        if (!id) return;
        let itemData: any = null;
        if (type === 'vaccine') {
            itemData = vaccineFullMap[id];
        } else {
            itemData = medicationFullMap[id];
        }

        if (itemData) {
            setViewDetailType(type);
            setViewDetailItem(itemData);
        } else {
            setViewDetailType(type);
            setViewDetailItem({
                id,
                name: type === 'vaccine' ? `Vacuna #${id}` : `Medicamento #${id}`,
                _notFound: true
            });
            showToast('Los datos completos no están disponibles. Mostrando información básica.', 'warning');
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Gestión de Insumos</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                        onClick={() => treatment?.id && refreshAssociations(treatment.id, true)}
                        title="Refrescar datos (bypass cache)"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", loadingAssoc && "animate-spin")} />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => { setShowAddVaccine((s) => !s); setShowAddMedication(false); }}
                        disabled={!treatment}
                        className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700"
                    >
                        + Vacuna
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => { setShowAddMedication((s) => !s); setShowAddVaccine(false); }}
                        disabled={!treatment}
                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700"
                    >
                        + Medicamento
                    </Button>
                </div>
            </div>

            {/* Forms */}
            {showAddVaccine && treatment && (
                <form onSubmit={handleCreateVaccine} className="rounded-lg border bg-background/80 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1">Vacuna</label>
                            <input
                                type="text"
                                className="mb-2 w-full h-8 rounded-md border bg-background px-2 text-sm"
                                placeholder="Buscar vacuna…"
                                value={vaccineSearch}
                                onChange={(e) => setVaccineSearch(e.target.value)}
                            />
                            <select
                                aria-label="Seleccionar vacunas"
                                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                multiple
                                value={newVaccines.map(String)}
                                onChange={(e) => setNewVaccines(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
                                required
                            >
                                {vaccineOptions
                                    .filter((opt) => opt.label.toLowerCase().includes(vaccineSearch.toLowerCase()))
                                    .map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button type="submit" size="sm" disabled={savingVaccine}>Guardar</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddVaccine(false)}>Cancelar</Button>
                        </div>
                    </div>
                    {newVaccineError && <div className="text-xs text-destructive">{newVaccineError}</div>}
                </form>
            )}

            {showAddMedication && treatment && (
                <form onSubmit={handleCreateMedication} className="rounded-lg border bg-background/80 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1">Medicamento</label>
                            <input
                                type="text"
                                className="mb-2 w-full h-8 rounded-md border bg-background px-2 text-sm"
                                placeholder="Buscar medicamento…"
                                value={medicationSearch}
                                onChange={(e) => setMedicationSearch(e.target.value)}
                            />
                            <select
                                aria-label="Seleccionar medicamentos"
                                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                multiple
                                value={newMedications.map(String)}
                                onChange={(e) => setNewMedications(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
                                required
                            >
                                {medicationOptions
                                    .filter((opt) => opt.label.toLowerCase().includes(medicationSearch.toLowerCase()))
                                    .map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button type="submit" size="sm" disabled={savingMedication}>Guardar</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddMedication(false)}>Cancelar</Button>
                        </div>
                    </div>
                    {newMedicationError && <div className="text-xs text-destructive">{newMedicationError}</div>}
                </form>
            )}

            {/* Cards */}
            <TreatmentSuppliesCards
                vaccines={vaccines as any}
                medications={medications as any}
                vaccineFullMap={vaccineFullMap}
                medicationFullMap={medicationFullMap}
                vaccineRouteMap={vaccineRouteMap}
                onViewVaccine={(id) => handleViewItem('vaccine', id)}
                onViewMedication={(id) => handleViewItem('medication', id)}
                onDeleteVaccine={openDeleteVaccine}
                onDeleteMedication={openDeleteMedication}
                confirmingDeleteId={confirmingDeleteId}
                deleteLoadingId={deleteLoadingId}
                loading={loadingAssoc}
            />

            {/* Nested Detail Modal for Vaccines/Meds */}
            {viewDetailItem && viewDetailType && (
                <ItemDetailModal
                    type={viewDetailType}
                    item={viewDetailItem}
                    options={{}}
                    onClose={() => {
                        setViewDetailItem(null);
                        setViewDetailType(null);
                    }}
                    onEdit={() => {
                        const itemId = viewDetailItem?.id;
                        if (!itemId) return;
                        const route = viewDetailType === 'vaccine'
                            ? `/admin/vaccines?edit=${itemId}`
                            : `/admin/medications?edit=${itemId}`;
                        setViewDetailItem(null);
                        setViewDetailType(null);
                        window.location.href = route;
                    }}
                    zIndex={2500}
                />
            )}
        </div>
    );
};
