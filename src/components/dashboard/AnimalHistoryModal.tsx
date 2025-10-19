import React from "react";
import { useState, useMemo, useEffect } from "react";
import { useAnimalDiseases } from "@/hooks/animalDiseases/useAnimalDiseases";
import { useAnimalFields } from "@/hooks/animalFields/useAnimalFields";
import { useTreatment } from "@/hooks/treatment/useTreatment";
import { useControls } from "@/hooks/control/useControl";
import { safeArray } from '@/utils/apiHelpers';
import { getAnimalLabel } from '@/utils/animalHelpers';
import { Clock, Activity, MapPin, Stethoscope, Syringe } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@/components/common/UnifiedModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { format, differenceInCalendarDays } from "date-fns";

// Interfaces for data types - removed unused interfaces

// Timeline event interface
interface TimelineEvent {
   id: string;
   date: string;
   type: 'disease' | 'treatment' | 'control' | 'movement';
   title: string;
   description: string;
   status?: string;
   icon: React.ReactNode;
   previewType?: 'treatment' | 'field' | 'disease' | 'control';
   previewData?: any;
  // Vencimientos (solo aplica a vacunación)
  isVaccination?: boolean;
  dueDate?: string;
  dueStatus?: 'due_soon' | 'overdue' | 'ok';
  dueInDays?: number;
  dueLabel?: string;
}

interface AnimalHistoryModalProps {
   animal: {
     idAnimal: number;
     record: string;
     name?: string;
     breed?: {
       name: string;
       species?: {
         name: string;
       };
     };
     birth_date?: string;
     sex?: string;
     status?: string;
   };
   onClose: () => void;
   refreshTrigger?: number;
 }

export const AnimalHistoryModal = ({ animal, onClose, refreshTrigger }: AnimalHistoryModalProps) => {
    console.log('AnimalHistoryModal rendered with animal:', animal);
    const { data: animalDiseases, refetch: refetchDiseases } = useAnimalDiseases();
    const { data: animalFields, refetch: refetchFields } = useAnimalFields();
    const { data: treatments, refetch: refetchTreatments } = useTreatment();
    const { data: controls, refetch: refetchControls } = useControls();
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [remoteHistory, setRemoteHistory] = useState<any | null>(null);

    // Refrescar todos los datos al montar el componente (cuando se abre el historial)
    useEffect(() => {
      const refreshAllData = async () => {
        try {
          await Promise.all([
            refetchDiseases?.(),
            refetchFields?.(),
            refetchTreatments?.(),
            refetchControls?.()
          ]);
        } catch (e) {
          console.error('Error refreshing history data:', e);
        }
      };
      refreshAllData();
    }, []); // Solo al montar

    // Estado para vista previa
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewType, setPreviewType] = useState<'treatment' | 'field' | 'disease' | 'control' | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);

   // Cargar historial médico consolidado desde analytics si está disponible
   useEffect(() => {
     let active = true;
     const load = async () => {
       setHistoryLoading(true);
       setHistoryError(null);
       try {
         const { analyticsService } = await import('@/services/analyticsService');
         const data = await analyticsService.getAnimalMedicalHistory(animal.idAnimal).catch(() => null);
         if (active) setRemoteHistory(data);
       } catch (e: any) {
         if (active) setHistoryError(e?.message || 'Could not load remote history');
       } finally {
         if (active) setHistoryLoading(false);
       }
     };
     load();
     return () => {
       active = false;
     };
   }, [animal.idAnimal, refreshTrigger]);

   // Refrescar datos cuando cambia refreshTrigger
   useEffect(() => {
     if (refreshTrigger !== undefined && refreshTrigger > 0) {
       refetchDiseases?.();
       refetchFields?.();
       refetchTreatments?.();
       refetchControls?.();
     }
   }, [refreshTrigger, refetchDiseases, refetchFields, refetchTreatments, refetchControls]);

   // Filter and search states - removed unused filter states
   // const [searchTerm, setSearchTerm] = useState('');
   // const [selectedEventType, setSelectedEventType] = useState<string>("all");
   // const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
   // const [activeTab, setActiveTab] = useState("timeline");

   // Filter data for the selected animal
   const safeAnimalDiseases = safeArray(animalDiseases);
   const safeAnimalFields = safeArray(animalFields);
   const safeTreatments = safeArray(treatments);
   const safeControls = safeArray(controls);

   // Helper to determine if a record belongs to the current animal, supporting multiple possible shapes
   const belongsToAnimal = (item: any) => {
     const ids = [
       item?.animal_id,
       item?.animals?.id,
       item?.animal?.id,
       item?.animal?.idAnimal,
       item?.animals?.idAnimal,
     ].filter((v) => v !== undefined && v !== null);
     return ids.some((id) => Number(id) === Number(animal.idAnimal));
   };

   const animalDiseasesData = safeAnimalDiseases.filter((disease: any) => belongsToAnimal(disease));
   const animalFieldsData = safeAnimalFields.filter((field: any) => belongsToAnimal(field));
   const animalTreatmentsData = safeTreatments.filter((treatment: any) => belongsToAnimal(treatment));
   const animalControlsData = safeControls.filter((control: any) => belongsToAnimal(control));

   // Create timeline events from all data sources
   const timelineEvents = useMemo(() => {
     const events: TimelineEvent[] = [];

     // Add disease events
     animalDiseasesData.forEach((disease: any) => {
       events.push({
         id: `disease-${disease.id}`,
         date: disease.treatment_date,
         type: 'disease',
         title: `Enfermedad: ${disease.disease?.name}`,
         description: `Tratamiento: ${disease.treatment || 'No especificado'}`,
         status: disease.status,
         icon: <Stethoscope className="w-4 h-4" />,
         previewType: 'disease',
         previewData: {
           disease: disease.disease?.name || 'Enfermedad',
           start: disease.treatment_date,
           treatment: disease.treatment || '',
           status: disease.status || '',
           severity: disease.severity || '',
           notes: disease.notes || ''
         }
       });
     });

     // Add treatment events
     animalTreatmentsData.forEach((treatment: any) => {
       events.push({
         id: `treatment-${treatment.id}`,
         date: treatment.treatment_date,
         type: 'treatment',
         title: `Tratamiento: ${treatment.description}`,
         description: `Dosis: ${treatment.dosis} - Frecuencia: ${treatment.frequency}`,
         status: 'active',
         icon: <Syringe className="w-4 h-4" />,
         previewType: 'treatment',
         previewData: {
           date: treatment.treatment_date,
           type: 'Tratamiento',
           description: treatment.description || 'Tratamiento',
           dose: treatment.dosis || (treatment as any).dose || '',
           frequency: treatment.frequency || '',
           status: treatment.status || '',
           veterinarian: treatment.veterinarian || '',
           cost: treatment.cost ?? '',
           notes: treatment.notes || '',
           plan: treatment.treatment_plan || '',
           follow_up_date: treatment.follow_up_date,
           treatment_type: treatment.treatment_type || ''
         }
       });
     });

     // Add control events
     animalControlsData.forEach((control: any) => {
       const healthStatus = control.health_status || control.healt_status || '';
       events.push({
         id: `control-${control.id}`,
         date: control.checkup_date,
         type: 'control',
         title: 'Control de Salud',
         description: `Estado: ${healthStatus} - ${control.description}`,
         status: healthStatus,
         icon: <Activity className="w-4 h-4" />,
         previewType: 'control',
         previewData: {
           date: control.checkup_date,
           status: healthStatus,
           weight: control.weight ?? '',
           temperature: control.temperature ?? '',
           heart_rate: control.heart_rate ?? '',
           respiratory_rate: control.respiratory_rate ?? '',
           height: control.height ?? '',
           body_condition: control.body_condition ?? '',
           veterinarian: control.veterinarian || '',
           next_control_date: control.next_control_date || '',
           notes: control.description || control.observations || ''
         }
       });
     });

     // Add movement events
     animalFieldsData.forEach(field => {
       events.push({
         id: `movement-${field.id}`,
         date: field.assignment_date,
         type: 'movement',
         title: `Asignación a ${field.field?.name}`,
         description: `Motivo: ${field.reason || field.notes || 'No especificado'}`,
         status: field.removal_date ? 'completed' : 'active',
         icon: <MapPin className="w-4 h-4" />,
         previewType: 'field',
         previewData: (() => {
           const assignment = field.assignment_date;
           const removal = field.removal_date;
           const endRef = removal ? new Date(removal) : new Date();
           const startRef = assignment ? new Date(assignment) : null;
           const duration_days = startRef ? Math.max(0, Math.ceil((endRef.getTime() - startRef.getTime()) / (1000 * 60 * 60 * 24))) : '';
           return {
             field: field.field?.name || 'Campo',
             assignment,
             removal,
             notes: field.reason || field.notes || '—',
             is_active: !!field.is_active && !removal,
             status: removal ? 'Retirado' : 'Asignado',
             duration_days
           };
         })()
       });
     });

     // Merge remote history if structure provides arrays (heurística flexible)
     if (remoteHistory) {
       // Treatments
       const rhTreatments = (remoteHistory.treatments || remoteHistory.medical_treatments || []);
       rhTreatments.forEach((t: any) => {
         if (!t?.id || !t?.treatment_date) return;
         events.push({
           id: `rh-treatment-${t.id}`,
           date: t.treatment_date,
           type: 'treatment',
           title: `Tratamiento: ${t.diagnosis || t.description || 'Sin descripción'}`,
           description: t.notes || t.treatment_plan || '—',
           status: t.status,
           icon: <Syringe className="w-4 h-4" />,
           previewType: 'treatment',
           previewData: {
             date: t.treatment_date,
             type: 'Tratamiento',
             description: t.diagnosis || t.description || 'Tratamiento',
             dose: t.dose || t.dosage || '',
             frequency: t.frequency || t.interval || '',
             status: t.status || '',
             veterinarian: t.veterinarian || '',
             cost: t.cost ?? '',
             notes: t.notes || '',
             plan: t.treatment_plan || '',
             follow_up_date: t.follow_up_date,
             treatment_type: t.treatment_type || ''
           }
         });
       });
       // Vaccinations
       const rhVaccinations = (remoteHistory.vaccinations || []);
       rhVaccinations.forEach((v: any) => {
         if (!v?.id || !v?.vaccination_date) return;
         const dueRaw = v.next_due_date || v.next_vaccination_date || v.expiry_date || null;
         const dueInfo = getDueInfo(dueRaw);
         events.push({
           id: `rh-vaccination-${v.id}`,
           date: v.vaccination_date,
           type: 'treatment',
           title: `Vacunación: ${v.vaccine?.name || v.vaccine_name || 'Vacuna'}`,
           description: `Dosis: ${v.dose || v.dosage || '-'}${v.status ? ' - ' + v.status : ''}`,
           status: v.status,
           icon: <Syringe className="w-4 h-4" />,
           isVaccination: true,
           dueDate: dueRaw || undefined,
           dueStatus: dueInfo?.status,
           dueInDays: dueInfo?.days,
           dueLabel: dueInfo && (dueInfo.status === 'due_soon' || dueInfo.status === 'overdue') ? dueInfo.label : undefined,
           previewType: 'treatment',
           previewData: {
             date: v.vaccination_date,
             type: 'Vacunación',
             description: v.vaccine?.name || v.vaccine_name || 'Vacunación',
             dose: v.dose || v.dosage || '',
             frequency: v.frequency || '',
             status: v.status || '',
             veterinarian: v.veterinarian || '',
             cost: '',
             notes: v.notes || '',
             plan: '',
             follow_up_date: v.next_vaccination_date || v.next_due_date,
             vaccine_name: v.vaccine?.name || v.vaccine_name,
             batch_number: v.batch_number || '',
             expiry_date: v.expiry_date || '',
             administration_route: v.administration_route || '',
             adverse_reactions: v.adverse_reactions || '',
             next_vaccination_date: v.next_vaccination_date || '',
             next_due_date: v.next_due_date || '',
             dose_volume: v.dose_volume || '',
             administered_by: v.administered_by || ''
           }
         });
       });
       // Controls
       const rhControls = (remoteHistory.controls || remoteHistory.health_checks || []);
       rhControls.forEach((c: any) => {
         if (!c?.id || !c?.control_date) return;
         events.push({
           id: `rh-control-${c.id}`,
           date: c.control_date,
           type: 'control',
           title: 'Health Check',
           description: `Weight: ${c.weight ?? '-'} Temp: ${c.temperature ?? '-'}`,
           status: c.health_status || c.status,
           icon: <Activity className="w-4 h-4" />,
           previewType: 'control',
           previewData: {
             date: c.control_date,
             status: c.health_status || c.status || '',
             weight: c.weight ?? '',
             temperature: c.temperature ?? '',
             heart_rate: c.heart_rate ?? '',
             respiratory_rate: c.respiratory_rate ?? '',
             height: c.height ?? '',
             body_condition: c.body_condition ?? '',
             veterinarian: c.veterinarian || '',
             next_control_date: c.next_control_date || '',
             notes: c.notes || c.description || ''
           }
         });
       });
       // Diseases / Diagnoses
       const rhDiseases = (remoteHistory.diseases || remoteHistory.diagnoses || []);
       rhDiseases.forEach((d: any) => {
         const date = d.diagnosis_date || d.treatment_date;
         if (!d?.id || !date) return;
         events.push({
           id: `rh-disease-${d.id}`,
           date,
           type: 'disease',
           title: `Disease: ${d.disease?.name || d.disease_name || d.name || 'Pathology'}`,
           description: d.notes || d.symptoms || '—',
           status: d.status,
           icon: <Stethoscope className="w-4 h-4" />,
           previewType: 'disease',
           previewData: {
             disease: d.disease?.name || d.disease_name || d.name || 'Enfermedad',
             start: d.diagnosis_date || d.treatment_date,
             treatment: d.treatment || d.treatment_plan || '',
             status: d.status || '',
             severity: d.severity || '',
             notes: d.notes || d.symptoms || ''
           }
         });
       });
     }

     // Sort events by date (most recent first)
     return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   }, [animalDiseasesData, animalTreatmentsData, animalControlsData, animalFieldsData, remoteHistory]);

   const formatDate = (dateString: string) => {
     try {
       return format(new Date(dateString), "PPP");
     } catch (error) {
       return dateString;
     }
   };

   // --- Badges y estilos helpers ---
   const TypeBadge = ({ type }: { type: string }) => {
     const isVac = (type || '').toLowerCase().includes('vacun');
     const classes = isVac
       ? 'bg-blue-100 text-blue-700'
       : 'bg-emerald-100 text-emerald-700';
     const Icon = isVac ? Syringe : Stethoscope;
     const label = type || (isVac ? 'Vacunación' : 'Tratamiento');
     return (
       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
         <Icon className="w-3.5 h-3.5" />
         {label}
       </span>
     );
   };

   const getEventTypeClasses = (type: 'disease' | 'treatment' | 'control' | 'movement') => {
     switch (type) {
       case 'disease':
         return 'bg-rose-100 text-rose-700';
       case 'control':
         return 'bg-emerald-100 text-emerald-700';
       case 'movement':
         return 'bg-amber-100 text-amber-700';
       case 'treatment':
       default:
         return 'bg-blue-100 text-blue-700';
     }
   };

   const getStatusBadgeClasses = (status?: string) => {
     if (!status) return 'bg-gray-100 text-gray-700';
     const s = String(status).toLowerCase();
     if (['activo', 'active', 'pendiente', 'in-progress'].some(k => s.includes(k))) {
       return 'bg-amber-100 text-amber-700';
     }
     if (['complet', 'resuelto', 'recovered', 'ok', 'normal'].some(k => s.includes(k))) {
       return 'bg-emerald-100 text-emerald-700';
     }
     if (['grave', 'crit', 'bad', 'malo'].some(k => s.includes(k))) {
       return 'bg-rose-100 text-rose-700';
     }
     return 'bg-gray-100 text-gray-700';
   };

  // Helpers para vencimientos de vacunación
  const getDueInfo = (dueRaw?: string | null) => {
    if (!dueRaw) return null;
    try {
      const today = new Date();
      const d = new Date(dueRaw);
      const days = differenceInCalendarDays(d, today);
      if (Number.isNaN(days)) return null;
      if (days < 0) return { status: 'overdue' as const, days: Math.abs(days), label: `Vencido hace ${Math.abs(days)} días` };
      if (days === 0) return { status: 'due_soon' as const, days, label: 'Vence hoy' };
      if (days <= 14) return { status: 'due_soon' as const, days, label: `Vence en ${days} días` };
      return { status: 'ok' as const, days, label: `Vence en ${days} días` };
    } catch {
      return null;
    }
  };

  const getDueBadgeClasses = (dueStatus: 'due_soon' | 'overdue') => {
    return dueStatus === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
  };

  const getDueRingClasses = (dueStatus?: 'due_soon' | 'overdue' | 'ok') => {
    if (dueStatus === 'overdue') return 'ring-2 ring-rose-400';
    if (dueStatus === 'due_soon') return 'ring-2 ring-amber-400';
    return '';
  };

   // Filas para tablas: combinamos datos locales y, si existen, del historial remoto
   const treatmentRows = useMemo(() => {
     const local = animalTreatmentsData.map((t: any) => ({
       date: t.treatment_date,
       type: 'Tratamiento',
       description: t.description || 'Tratamiento',
       dose: t.dosis || t.dose || '',
       frequency: t.frequency || '',
       status: t.status || '',
       veterinarian: t.veterinarian || '',
       cost: t.cost ?? '',
       notes: t.notes || '',
       plan: t.treatment_plan || '',
       follow_up_date: t.follow_up_date,
       treatment_type: t.treatment_type || ''
     }));
     const rhT = (remoteHistory?.treatments || remoteHistory?.medical_treatments || []).map((t: any) => ({
       date: t.treatment_date,
       type: 'Tratamiento',
       description: t.diagnosis || t.description || 'Tratamiento',
       dose: t.dose || t.dosage || '',
       frequency: t.frequency || t.interval || '',
       status: t.status || '',
       veterinarian: t.veterinarian || '',
       cost: t.cost ?? '',
       notes: t.notes || '',
       plan: t.treatment_plan || '',
       follow_up_date: t.follow_up_date,
       treatment_type: t.treatment_type || ''
     }));
     const rhV = (remoteHistory?.vaccinations || []).map((v: any) => ({
       date: v.vaccination_date,
       type: 'Vacunación',
       description: v.vaccine?.name || v.vaccine_name || 'Vacunación',
       dose: v.dose || v.dosage || '',
       frequency: v.frequency || '',
       status: v.status || '',
       veterinarian: v.veterinarian || '',
       cost: '',
       notes: v.notes || '',
       plan: '',
       follow_up_date: v.next_vaccination_date || v.next_due_date,
       vaccine_name: v.vaccine?.name || v.vaccine_name,
       batch_number: v.batch_number || '',
       expiry_date: v.expiry_date || '',
       administration_route: v.administration_route || '',
       adverse_reactions: v.adverse_reactions || '',
       next_vaccination_date: v.next_vaccination_date || '',
       next_due_date: v.next_due_date || '',
       dose_volume: v.dose_volume || '',
       administered_by: v.administered_by || ''
     }));
     const rows = [...local, ...rhT, ...rhV].filter(r => r.date);
     rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
     return rows;
   }, [animalTreatmentsData, remoteHistory]);

   const fieldRows = useMemo(() => {
     const rows = animalFieldsData.map((f: any) => {
       const assignment = f.assignment_date;
       const removal = f.removal_date;
       const endRef = removal ? new Date(removal) : new Date();
       const startRef = assignment ? new Date(assignment) : null;
       const duration_days = startRef ? Math.max(0, Math.ceil((endRef.getTime() - startRef.getTime()) / (1000 * 60 * 60 * 24))) : '';
       return ({
         field: f.field?.name || 'Campo',
         assignment,
         removal,
         notes: f.reason || f.notes || '—',
         is_active: !!f.is_active && !removal,
         status: removal ? 'Retirado' : 'Asignado',
         duration_days
       });
     });
     rows.sort((a, b) => new Date((b.assignment || b.removal || 0) as any).getTime() - new Date((a.assignment || a.removal || 0) as any).getTime());
     return rows;
   }, [animalFieldsData]);

   const diseaseRows = useMemo(() => {
     const local = animalDiseasesData.map((d: any) => ({
       disease: d.disease?.name || 'Enfermedad',
       start: d.treatment_date,
       treatment: d.treatment || '',
       status: d.status || '',
       severity: d.severity || '',
       notes: d.notes || ''
     }));
     const remote = [
       ...(remoteHistory?.diseases || []),
       ...(remoteHistory?.diagnoses || [])
     ].map((d: any) => ({
       disease: d.disease?.name || d.disease_name || d.name || 'Enfermedad',
       start: d.diagnosis_date || d.treatment_date,
       treatment: d.treatment || d.treatment_plan || '',
       status: d.status || '',
       severity: d.severity || '',
       notes: d.notes || d.symptoms || ''
     }));
     const rows = [...local, ...remote].filter(r => r.start || r.disease);
     rows.sort((a, b) => new Date(b.start || 0).getTime() - new Date(a.start || 0).getTime());
     return rows;
   }, [animalDiseasesData, remoteHistory]);

   const controlRows = useMemo(() => {
     const local = animalControlsData.map((c: any) => ({
       date: c.checkup_date,
       status: c.healt_status || c.health_status || '',
       weight: c.weight ?? '',
       temperature: c.temperature ?? '',
       heart_rate: c.heart_rate ?? '',
       respiratory_rate: c.respiratory_rate ?? '',
       height: c.height ?? '',
       body_condition: c.body_condition ?? '',
       veterinarian: c.veterinarian || '',
       next_control_date: c.next_control_date || '',
       notes: c.description || c.observations || ''
     }));
     const remote = (remoteHistory?.controls || remoteHistory?.health_checks || []).map((c: any) => ({
       date: c.control_date,
       status: c.health_status || c.status || '',
       weight: c.weight ?? '',
       temperature: c.temperature ?? '',
       heart_rate: c.heart_rate ?? '',
       respiratory_rate: c.respiratory_rate ?? '',
       height: c.height ?? '',
       body_condition: c.body_condition ?? '',
       veterinarian: c.veterinarian || '',
       next_control_date: c.next_control_date || '',
       notes: c.notes || c.description || ''
     }));
     const rows = [...local, ...remote].filter(r => r.date);
     rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
     return rows;
   }, [animalControlsData, remoteHistory]);

   // --- Vista previa ---
   const openPreview = (type: 'treatment' | 'field' | 'disease' | 'control', data: any) => {
     setPreviewType(type);
     setPreviewData(data);
     setPreviewOpen(true);
   };

   const closePreview = () => {
     setPreviewOpen(false);
     setPreviewData(null);
     setPreviewType(null);
   };

   const PreviewContent = () => {
     if (!previewType || !previewData) return null;
     const row = previewData as any;
     // Removed unused label mapping to satisfy no-unused-vars
     // const label = {
     //   treatment: 'Tratamiento',
     //   field: 'Movimiento de Campo',
     //   disease: 'Enfermedad',
     //   control: 'Control de Salud'
     // }[previewType];
     
     return (
       <div className="space-y-3">
         <div className="text-sm text-muted-foreground">{getAnimalLabel(animal)}</div>
         <div className="rounded-md border overflow-hidden">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Campo</TableHead>
                 <TableHead>Valor</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {previewType === 'treatment' && (
                 <>
                   <TableRow><TableCell className="font-medium">Fecha</TableCell><TableCell>{row.date ? formatDate(row.date) : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Tipo</TableCell><TableCell>{row.type || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Estado</TableCell><TableCell>{row.status || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Veterinario</TableCell><TableCell>{row.veterinarian || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Descripción</TableCell><TableCell>{row.description || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Dosis</TableCell><TableCell>{row.dose || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Frecuencia</TableCell><TableCell>{row.frequency || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Plan de tratamiento</TableCell><TableCell>{row.plan || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Próximo seguimiento</TableCell><TableCell>{row.follow_up_date ? formatDate(row.follow_up_date) : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Tipo de tratamiento</TableCell><TableCell>{row.treatment_type || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Costo</TableCell><TableCell>{row.cost !== '' ? row.cost : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Notas</TableCell><TableCell>{row.notes || '—'}</TableCell></TableRow>
                   {row.type === 'Vacunación' && (
                     <>
                       <TableRow><TableCell className="font-medium">Vacuna</TableCell><TableCell>{row.vaccine_name || '—'}</TableCell></TableRow>
                       <TableRow><TableCell className="font-medium">Lote</TableCell><TableCell>{row.batch_number || '—'}</TableCell></TableRow>
                       <TableRow><TableCell className="font-medium">Vence</TableCell><TableCell>{row.expiry_date ? formatDate(row.expiry_date) : '—'}</TableCell></TableRow>
                       <TableRow><TableCell className="font-medium">Vía administración</TableCell><TableCell>{row.administration_route || '—'}</TableCell></TableRow>
                       <TableRow><TableCell className="font-medium">Reacciones adversas</TableCell><TableCell>{row.adverse_reactions || '—'}</TableCell></TableRow>
                       <TableRow><TableCell className="font-medium">Siguiente vacunación</TableCell><TableCell>{row.next_vaccination_date ? formatDate(row.next_vaccination_date) : '—'}</TableCell></TableRow>
                       <TableRow><TableCell className="font-medium">Próximo vencimiento</TableCell><TableCell>{row.next_due_date ? formatDate(row.next_due_date) : '—'}</TableCell></TableRow>
                       <TableRow><TableCell className="font-medium">Volumen dosis</TableCell><TableCell>{row.dose_volume !== '' ? row.dose_volume : '—'}</TableCell></TableRow>
                       <TableRow><TableCell className="font-medium">Aplicado por</TableCell><TableCell>{row.administered_by || '—'}</TableCell></TableRow>
                     </>
                   )}
                 </>
               )}
               {previewType === 'field' && (
                 <>
                   <TableRow><TableCell className="font-medium">Campo</TableCell><TableCell>{row.field || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Asignación</TableCell><TableCell>{row.assignment ? formatDate(row.assignment) : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Retiro</TableCell><TableCell>{row.removal ? formatDate(row.removal) : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Estado</TableCell><TableCell>{row.status || (row.removal ? 'Retirado' : 'Asignado')}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Duración (días)</TableCell><TableCell>{row.duration_days !== '' ? row.duration_days : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Notas</TableCell><TableCell>{row.notes || '—'}</TableCell></TableRow>
                 </>
               )}
               {previewType === 'disease' && (
                 <>
                   <TableRow><TableCell className="font-medium">Enfermedad</TableCell><TableCell>{row.disease || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Inicio</TableCell><TableCell>{row.start ? formatDate(row.start) : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Tratamiento</TableCell><TableCell>{row.treatment || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Estado</TableCell><TableCell>{row.status || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Severidad</TableCell><TableCell>{row.severity || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Notas</TableCell><TableCell>{row.notes || '—'}</TableCell></TableRow>
                 </>
               )}
               {previewType === 'control' && (
                 <>
                   <TableRow><TableCell className="font-medium">Fecha</TableCell><TableCell>{row.date ? formatDate(row.date) : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Estado</TableCell><TableCell>{row.status || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Peso (kg)</TableCell><TableCell>{row.weight !== '' ? row.weight : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Temperatura (°C)</TableCell><TableCell>{row.temperature !== '' ? row.temperature : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Frecuencia cardiaca</TableCell><TableCell>{row.heart_rate !== '' ? row.heart_rate : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Frecuencia respiratoria</TableCell><TableCell>{row.respiratory_rate !== '' ? row.respiratory_rate : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Altura</TableCell><TableCell>{row.height !== '' ? row.height : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Condición corporal</TableCell><TableCell>{row.body_condition !== '' ? row.body_condition : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Veterinario</TableCell><TableCell>{row.veterinarian || '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Próximo control</TableCell><TableCell>{row.next_control_date ? formatDate(row.next_control_date) : '—'}</TableCell></TableRow>
                   <TableRow><TableCell className="font-medium">Notas</TableCell><TableCell>{row.notes || '—'}</TableCell></TableRow>
                 </>
               )}
             </TableBody>
           </Table>
         </div>
       </div>
     );
   };

     return (
       <>
         <Modal
           isOpen={true}
           onClose={onClose}
           size="6xl"
           description={`${getAnimalLabel(animal) || 'Sin registro'}`}
           allowFullScreenToggle={true}
         >
           <ModalHeader>
             <span className="flex items-center gap-2">
               <Clock className="w-5 h-5" />
               Historial - {getAnimalLabel(animal) || 'Sin registro'}
             </span>
           </ModalHeader>
           <ModalContent>
             <ModalBody>
               <div className="flex flex-col h-full -m-4 -mb-4">
                 {/* Manejo de loading y error */}
                 {historyLoading ? (
                   <div className="flex justify-center items-center py-8">
                     <div className="text-gray-500">Cargando historial...</div>
                   </div>
                 ) : historyError ? (
                   <div className="flex justify-center items-center py-8 text-red-500">
                     Error: {historyError}
                   </div>
                 ) : (
                   // --- Tabs solicitadas: Tratamientos, Potreros y Enfermedades ---
                   <div className="flex flex-col h-full">
                     <Tabs defaultValue="treatments" className="flex flex-col h-full">
                       <TabsList className="grid w-full grid-cols-5">
                         <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
                         <TabsTrigger value="treatments">Tratamientos</TabsTrigger>
                         <TabsTrigger value="fields">Potreros</TabsTrigger>
                         <TabsTrigger value="diseases">Enfermedades</TabsTrigger>
                         <TabsTrigger value="controls">Controles</TabsTrigger>
                       </TabsList>
                       <TabsContent value="timeline" className="mt-3 flex-1 overflow-y-auto">
                         {timelineEvents.length === 0 ? (
                           <div className="text-center py-6 text-muted-foreground">
                             Sin eventos en la línea de tiempo para este animal.
                           </div>
                         ) : (
                           <div className="space-y-3">
                             <ul className="space-y-3">
                               {timelineEvents.map((ev) => (
                               <li
                                 key={ev.id}
                                 className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                                 onClick={() => ev.previewType && ev.previewData && openPreview(ev.previewType, ev.previewData)}
                                >
                                 <span className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getEventTypeClasses(ev.type)} ${ev.isVaccination ? getDueRingClasses(ev.dueStatus) : ''}`}>
                                   {ev.icon}
                                 </span>
                                 <div className="flex-1 rounded-md border p-3">
                                   <div className="flex items-center justify-between gap-3">
                                     <div className="font-medium leading-tight">{ev.title}</div>
                                     <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(ev.date)}</div>
                                   </div>
                                   {ev.description && (
                                     <div className="text-sm text-muted-foreground mt-1">{ev.description}</div>
                                   )}
                                   {ev.status && (
                                     <div className="mt-2">
                                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(ev.status)}`}>{ev.status}</span>
                                     </div>
                                   )}
                                   {ev.isVaccination && (ev.dueStatus === 'due_soon' || ev.dueStatus === 'overdue') && (
                                     <div className="mt-2">
                                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDueBadgeClasses(ev.dueStatus)}`}>
                                         {ev.dueLabel || 'Próximo vencimiento'}
                                       </span>
                                     </div>
                                   )}
                                 </div>
                               </li>
                               ))}
                             </ul>
                           </div>
                         )}
                       </TabsContent>

                       <TabsContent value="treatments" className="mt-3 flex-1 overflow-y-auto">
                         {treatmentRows.length === 0 ? (
                           <div className="text-center py-6 text-muted-foreground">
                             Sin tratamientos para este animal.
                           </div>
                         ) : (
                           <div className="w-full overflow-x-auto">
                             <Table aria-label="Tabla de tratamientos">
                               <TableCaption>Tratamientos y vacunaciones</TableCaption>
                               <TableHeader>
                                 <TableRow>
                                   <TableHead>Fecha</TableHead>
                                   <TableHead>Tipo</TableHead>
                                   <TableHead>Descripción</TableHead>
                                   <TableHead>Dosis</TableHead>
                                   <TableHead>Frecuencia</TableHead>
                                   <TableHead>Estado</TableHead>
                                   <TableHead>Veterinario</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {treatmentRows.map((r, idx) => (
                                   <TableRow key={`tr-${idx}`} className="hover:bg-muted/50 cursor-pointer" onClick={() => openPreview('treatment', r)}>
                                     <TableCell>{formatDate(r.date)}</TableCell>
                                     <TableCell><TypeBadge type={r.type} /></TableCell>
                                     <TableCell>{r.description}</TableCell>
                                     <TableCell>{r.dose || '—'}</TableCell>
                                     <TableCell>{r.frequency || '—'}</TableCell>
                                     <TableCell>{r.status || '—'}</TableCell>
                                     <TableCell>{r.veterinarian || '—'}</TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </div>
                         )}
                       </TabsContent>

                       <TabsContent value="fields" className="mt-3 flex-1 overflow-y-auto">
                         {fieldRows.length === 0 ? (
                           <div className="text-center py-6 text-muted-foreground">
                             Sin movimientos de campo para este animal.
                           </div>
                         ) : (
                           <div className="w-full overflow-x-auto">
                             <Table aria-label="Tabla de movimientos de campo">
                               <TableHeader>
                                 <TableRow>
                                   <TableHead>Campo</TableHead>
                                   <TableHead>Asignación</TableHead>
                                   <TableHead>Retiro</TableHead>
                                   <TableHead>Estado</TableHead>
                                   <TableHead>Duración (días)</TableHead>
                                   <TableHead>Motivo/Notas</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {fieldRows.map((r, idx) => (
                                   <TableRow key={`fi-${idx}`} className="hover:bg-muted/50 cursor-pointer" onClick={() => openPreview('field', r)}>
                                     <TableCell>{r.field}</TableCell>
                                     <TableCell>{r.assignment ? formatDate(r.assignment) : '—'}</TableCell>
                                     <TableCell>{r.removal ? formatDate(r.removal) : '—'}</TableCell>
                                     <TableCell>{r.status || (r.removal ? 'Retirado' : 'Asignado')}</TableCell>
                                     <TableCell>{r.duration_days !== '' ? r.duration_days : '—'}</TableCell>
                                     <TableCell>{r.notes || '—'}</TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </div>
                         )}
                       </TabsContent>

                       <TabsContent value="diseases" className="mt-3 flex-1 overflow-y-auto">
                         {diseaseRows.length === 0 ? (
                           <div className="text-center py-6 text-muted-foreground">
                             Sin enfermedades registradas para este animal.
                           </div>
                         ) : (
                           <div className="w-full overflow-x-auto">
                             <Table aria-label="Tabla de enfermedades">
                               <TableHeader>
                                 <TableRow>
                                   <TableHead>Enfermedad</TableHead>
                                   <TableHead>Inicio</TableHead>
                                   <TableHead>Tratamiento</TableHead>
                                   <TableHead>Estado</TableHead>
                                   <TableHead>Severidad</TableHead>
                                   <TableHead>Notas</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {diseaseRows.map((r, idx) => (
                                   <TableRow key={`di-${idx}`} className="hover:bg-muted/50 cursor-pointer" onClick={() => openPreview('disease', r)}>
                                     <TableCell>{r.disease}</TableCell>
                                     <TableCell>{r.start ? formatDate(r.start) : '—'}</TableCell>
                                     <TableCell>{r.treatment || '—'}</TableCell>
                                     <TableCell>{r.status || '—'}</TableCell>
                                     <TableCell>{r.severity || '—'}</TableCell>
                                     <TableCell>{r.notes || '—'}</TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </div>
                         )}
                       </TabsContent>

                       <TabsContent value="controls" className="mt-3 flex-1 overflow-y-auto">
                         {controlRows.length === 0 ? (
                           <div className="text-center py-6 text-muted-foreground">
                             Sin controles de salud para este animal.
                           </div>
                         ) : (
                           <div className="w-full overflow-x-auto">
                             <Table aria-label="Tabla de controles de salud">
                               <TableHeader>
                                 <TableRow>
                                   <TableHead>Fecha</TableHead>
                                   <TableHead>Estado</TableHead>
                                   <TableHead>Peso (kg)</TableHead>
                                   <TableHead>Temperatura (°C)</TableHead>
                                   <TableHead>Veterinario</TableHead>
                                   <TableHead>Próximo control</TableHead>
                                   <TableHead>Notas</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {controlRows.map((r, idx) => (
                                   <TableRow key={`co-${idx}`} className="hover:bg-muted/50 cursor-pointer" onClick={() => openPreview('control', r)}>
                                     <TableCell>{formatDate(r.date)}</TableCell>
                                     <TableCell>{r.status || '—'}</TableCell>
                                     <TableCell>{r.weight !== '' ? r.weight : '—'}</TableCell>
                                     <TableCell>{r.temperature !== '' ? r.temperature : '—'}</TableCell>
                                     <TableCell>{r.veterinarian || '—'}</TableCell>
                                     <TableCell>{r.next_control_date ? formatDate(r.next_control_date) : '—'}</TableCell>
                                     <TableCell>{r.notes || '—'}</TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </div>
                         )}
                       </TabsContent>
                     </Tabs>
                   </div>
                 )}
               </div>


         </ModalBody>
       </ModalContent>
     </Modal>
     {previewOpen && (
       <Modal
         isOpen={previewOpen}
         onClose={closePreview}
         size="5xl"
         description={`Vista previa • ${getAnimalLabel(animal)}`}
       >
         <ModalHeader>
           Vista previa{previewType && (
             <>
               {" – "}
               {previewType === 'treatment'
                 ? 'Tratamiento'
                 : previewType === 'field'
                 ? 'Movimiento de Campo'
                 : previewType === 'disease'
                 ? 'Enfermedad'
                 : 'Control de Salud'}
             </>
           )}
         </ModalHeader>
         <ModalContent>
           <ModalBody>
             <PreviewContent />
           </ModalBody>
         </ModalContent>
       </Modal>
     )}
     </>
   );
};