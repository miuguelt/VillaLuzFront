import React from 'react';
import { X, Syringe, MapPin, Pill, ClipboardList, TrendingUp, Edit, Activity, GitBranch, Calendar, Copy } from 'lucide-react';
import { TreatmentSuppliesPanel } from '@/widgets/dashboard/treatments/TreatmentSuppliesPanel';
import { cn } from '@/shared/ui/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';

interface ItemDetailModalProps {
    type: string;
    item: any;
    options: {
        diseases?: Record<number, string>;
        fields?: Record<number, string>;
        vaccines?: Record<number, string>;
        medications?: Record<number, string>;
        users?: Record<number, string>;
        routes?: Record<number, string>;
    };
    onClose: () => void;
    onEdit?: () => void;
    onReplicate?: () => void;
    zIndex?: number;
}

export function ItemDetailModal({
    type,
    item,
    options,
    onClose,
    onEdit,
    onReplicate,
    zIndex = 1000
}: ItemDetailModalProps) {
    // onOpenSupplies removed/unused
    if (!item) return null;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const safeOption = (map?: Record<number, string>, id?: number) => {
        if (!id || !map) return id || '-';
        return map[id] || `ID: ${id}`;
    };

    const getTitle = () => {
        const entityNames: Record<string, string> = {
            genetic_improvement: 'Mejora Genética',
            animal_disease: 'Enfermedad Diagnosticada',
            animal_field: 'Asignación de Campo',
            vaccination: 'Aplicación de Vacuna',
            treatment: 'Tratamiento Médico',
            control: 'Control de Crecimiento',
            vaccine: 'Ficha de Vacuna',
            medication: 'Ficha de Medicamento',
            disease: 'Ficha de Enfermedad'
        };
        return `${entityNames[type] || 'Detalle'} #${item.id}`;
    };

    return (
        <GenericModal
            isOpen={true}
            onOpenChange={(open) => !open && onClose()}
            title={getTitle()}
            description="Información detallada del registro"
            size="2xl"
            enableBackdropBlur
            className="bg-card/95 backdrop-blur-md text-card-foreground border-border/10"
            zIndex={zIndex}
        >
            <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Genetic Improvement */}
                    {type === 'genetic_improvement' && (
                        <>
                            <DetailSection
                                title="Información del Evento"
                                accent="indigo"
                                icon={<GitBranch className="w-4 h-4" />}
                            >
                                <InfoField label="Técnica" value={item.genetic_event_technique || item.genetic_event_techique || '-'} />
                                <InfoField label="Fecha" value={formatDate(item.date)} />
                                <InfoField label="Resultados" value={item.results || '-'} badge />
                            </DetailSection>
                            <DetailSection
                                title="Detalles Adicionales"
                                accent="slate"
                                fullWidth
                            >
                                <InfoField label="Observaciones" value={item.details || 'Sin detalles adicionales.'} fullWidth />
                            </DetailSection>
                        </>
                    )}

                    {/* Animal Disease */}
                    {type === 'animal_disease' && (
                        <>
                            <DetailSection
                                title="Diagnóstico"
                                accent="red"
                                icon={<Activity className="w-4 h-4" />}
                            >
                                <InfoField label="Enfermedad" value={safeOption(options.diseases, item.disease_id)} fullWidth />
                                <InfoField label="Fecha Diagnóstico" value={formatDate(item.diagnosis_date)} />
                                <InfoField label="Estado" value={item.status || 'Activo'} badge badgeVariant={item.status === 'Activo' ? 'destructive' : 'success'} />
                            </DetailSection>
                            <DetailSection
                                title="Responsable y Notas"
                                accent="slate"
                            >
                                <InfoField label="Instructor" value={safeOption(options.users, item.instructor_id)} />
                                <InfoField label="Notas" value={item.notes || 'Ninguna'} fullWidth />
                            </DetailSection>
                        </>
                    )}

                    {/* Animal Field */}
                    {type === 'animal_field' && (
                        <>
                            <DetailSection
                                title="Ubicación"
                                accent="emerald"
                                icon={<MapPin className="w-4 h-4" />}
                            >
                                <InfoField label="Potrero / Campo" value={safeOption(options.fields, item.field_id)} fullWidth />
                                <InfoField label="Fecha Asignación" value={formatDate(item.assignment_date)} />
                                <InfoField label="Estado" value={item.removal_date ? 'Histórico' : 'Activo'} badge badgeVariant={item.removal_date ? 'secondary' : 'success'} />
                            </DetailSection>
                            <DetailSection
                                title="Tiempos"
                                accent="slate"
                            >
                                <InfoField label="Fecha Retiro" value={item.removal_date ? formatDate(item.removal_date) : '-'} />
                                <InfoField label="Notas" value={item.notes || 'Ninguna'} fullWidth />
                            </DetailSection>
                        </>
                    )}

                    {/* Vaccination */}
                    {type === 'vaccination' && (
                        <>
                            <DetailSection
                                title="Detalle Aplicación"
                                accent="cyan"
                                icon={<Syringe className="w-4 h-4" />}
                            >
                                <InfoField label="Vacuna" value={safeOption(options.vaccines, item.vaccine_id)} fullWidth />
                                <InfoField label="Fecha Aplicación" value={formatDate(item.vaccination_date)} />
                                <InfoField label="Número de Lote" value={item.batch_number || '-'} />
                            </DetailSection>
                            <DetailSection
                                title="Personal Responsable"
                                accent="slate"
                            >
                                <InfoField label="Instructor" value={safeOption(options.users, item.instructor_id)} />
                                <InfoField label="Aprendiz" value={safeOption(options.users, item.apprentice_id)} />
                            </DetailSection>
                        </>
                    )}

                    {/* Treatment */}
                    {type === 'treatment' && (
                        <>
                            <DetailSection
                                title="Información del Tratamiento"
                                accent="purple"
                                icon={<ClipboardList className="w-4 h-4" />}
                                fullWidth
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                    <InfoField label="Diagnóstico" value={item.diagnosis || '-'} fullWidth />
                                    <InfoField label="Fecha Inicio" value={formatDate(item.treatment_date)} />
                                    <InfoField
                                        label="Estado"
                                        value={item.status || 'Iniciado'}
                                        badge
                                        badgeVariant={
                                            item.status === 'Completado' ? 'success' :
                                                item.status === 'Suspendido' ? 'destructive' :
                                                    item.status === 'En progreso' ? 'secondary' : 'default'
                                        }
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-2 border-t border-border/40">
                                    <InfoField label="Veterinario" value={item.veterinarian || '-'} />
                                    <InfoField label="Tipo" value={item.treatment_type || '-'} />
                                    <InfoField label="Costo" value={item.cost ? `$${Number(item.cost).toLocaleString()}` : '-'} />
                                </div>

                                {item.follow_up_date && (
                                    <div className="pt-2 border-t border-border/40">
                                        <InfoField label="Próxima Revisión" value={formatDate(item.follow_up_date)} />
                                    </div>
                                )}

                                {(item.symptoms) && (
                                    <div className="pt-2 border-t border-border/40">
                                        <InfoField label="Síntomas" value={item.symptoms} fullWidth />
                                    </div>
                                )}

                                {(item.treatment_plan || item.description) && (
                                    <div className="pt-2 border-t border-border/40">
                                        <InfoField label="Plan de Tratamiento" value={item.treatment_plan || item.description || '-'} fullWidth />
                                    </div>
                                )}

                                {(item.notes || item.observations) && (
                                    <div className="pt-2 border-t border-border/40">
                                        <InfoField label="Notas / Observaciones" value={item.notes || item.observations} fullWidth />
                                    </div>
                                )}
                            </DetailSection>

                            <div className="col-span-full pt-2 mt-2">
                                <TreatmentSuppliesPanel treatment={item} />
                            </div>
                        </>
                    )}

                    {/* Control */}
                    {type === 'control' && (
                        <>
                            <DetailSection
                                title="Métricas de Crecimiento"
                                accent="amber"
                                icon={<TrendingUp className="w-4 h-4" />}
                            >
                                <InfoField label="Fecha" value={formatDate(item.checkup_date)} />
                                <InfoField label="Peso" value={item.weight ? `${item.weight} kg` : '-'} />
                                <InfoField label="Altura" value={item.height ? `${item.height} m` : '-'} />
                            </DetailSection>
                            <DetailSection
                                title="Estado y Notas"
                                accent="slate"
                            >
                                <InfoField label="Estado de Salud" value={item.health_status || '-'} badge badgeVariant={item.health_status === 'Excelente' || item.health_status === 'Bueno' || item.health_status === 'Sano' ? 'success' : 'default'} />
                                <InfoField label="Descripción" value={item.description || 'Sin notas.'} fullWidth />
                            </DetailSection>
                        </>
                    )}

                    {/* Master Data: Vaccine / Medication */}
                    {(type === 'vaccine' || type === 'medication' || type === 'disease') && (
                        <>
                            <DetailSection
                                title="Información Básica"
                                accent="cyan"
                                icon={type === 'vaccine' ? <Syringe className="w-4 h-4" /> : type === 'medication' ? <Pill className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            >
                                <InfoField label="Nombre" value={item.name || item.disease || '-'} fullWidth />
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <InfoField label="ID" value={`#${item.id}`} />
                                    {type === 'vaccine' ? (
                                        <InfoField label="Tipo" value={item.type || '-'} badge />
                                    ) : type === 'medication' ? (
                                        <InfoField label="Disponibilidad" value={item.availability ? 'Disponible' : 'No disponible'} badge badgeVariant={item.availability ? 'success' : 'destructive'} />
                                    ) : (
                                        <InfoField label="Código" value={item.code || '-'} />
                                    )}
                                </div>
                            </DetailSection>

                            {type !== 'disease' && (
                                <DetailSection
                                    title={type === 'vaccine' ? 'Especificaciones' : 'Detalles de Uso'}
                                    accent="teal"
                                >
                                    <InfoField label="Dosis" value={item.dosis || item.dose || '-'} />
                                    <InfoField label="Vía de Administración" value={item.route_administration_name || item.administration_route_name || '-'} />
                                    {type === 'vaccine' ? (
                                        <InfoField label="Intervalo" value={item.dose_interval || item.vaccination_interval ? `${item.dose_interval || item.vaccination_interval} días` : '-'} />
                                    ) : (
                                        <InfoField label="Frecuencia" value={item.frequency || '-'} />
                                    )}
                                </DetailSection>
                            )}

                            <DetailSection
                                title="Descripción y Notas"
                                accent="slate"
                                fullWidth
                            >
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                    {item.description || item.indications || item.details || item.symptoms || 'Sin información adicional.'}
                                </p>
                                {(item.contraindications || item.precautions) && (
                                    <div className="mt-3 pt-3 border-t border-slate-200/40">
                                        <InfoField label="Contraindicaciones / Precauciones" value={item.contraindications || item.precautions} fullWidth />
                                    </div>
                                )}
                            </DetailSection>
                        </>
                    )}
                </div>

                {/* Auditoría del Sistema */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-3 border border-border/10">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                        <Calendar className="w-3 h-3" />
                        Registro del Sistema
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoField label="Creado" value={formatDateTime(item.created_at)} />
                        <InfoField label="Actualizado" value={item.updated_at ? formatDateTime(item.updated_at) : '-'} />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-border/40">
                <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
                    Cerrar
                </Button>
                {onReplicate && (
                    <Button
                        onClick={onReplicate}
                        variant="secondary"
                        className="rounded-xl px-6 bg-secondary/80 hover:bg-secondary text-secondary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Replicar
                    </Button>
                )}
                {onEdit && (
                    <Button
                        onClick={onEdit}
                        className="rounded-xl px-6 bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Registro
                    </Button>
                )}
            </div>
        </GenericModal>
    );
}

export function DetailSection({
    title,
    children,
    accent = 'blue',
    fullWidth = false,
    icon
}: {
    title: string;
    children: React.ReactNode;
    accent?: string;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}) {
    const accentClasses: Record<string, string> = {
        blue: "text-blue-700 dark:text-blue-300 before:bg-blue-500 shadow-blue-500/10",
        cyan: "text-cyan-700 dark:text-cyan-300 before:bg-cyan-500 shadow-cyan-500/10",
        teal: "text-teal-700 dark:text-teal-300 before:bg-teal-500 shadow-teal-500/10",
        emerald: "text-emerald-700 dark:text-emerald-300 before:bg-emerald-500 shadow-emerald-500/10",
        purple: "text-purple-700 dark:text-purple-300 before:bg-purple-500 shadow-purple-500/10",
        indigo: "text-indigo-700 dark:text-indigo-300 before:bg-indigo-500 shadow-indigo-500/10",
        red: "text-red-700 dark:text-red-300 before:bg-red-500 shadow-red-500/10",
        amber: "text-amber-700 dark:text-amber-300 before:bg-amber-500 shadow-amber-500/10",
        slate: "text-slate-700 dark:text-slate-300 before:bg-slate-500 shadow-slate-500/10",
    };

    const classes = accentClasses[accent] || accentClasses.slate;
    const [textClasses, barClasses] = [
        classes.split(' before:')[0],
        classes.split(' before:')[1]
    ];

    return (
        <div className={cn(
            "rounded-xl p-4 shadow-sm border transition-all hover:shadow-md h-full flex flex-col bg-card border-border/60",
            fullWidth && "col-span-full"
        )}>
            <h4 className={cn(
                "text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2",
                textClasses
            )}>
                {icon}
                <span className={cn("flex items-center gap-2 before:content-[''] before:w-1 before:h-3 before:rounded-full", barClasses)}>
                    {title}
                </span>
            </h4>
            <div className="space-y-3 flex-grow">
                {children}
            </div>
        </div>
    );
}

export function InfoField({
    label,
    value,
    fullWidth = false,
    badge = false,
    badgeVariant = 'default'
}: {
    label: string;
    value: any;
    fullWidth?: boolean;
    badge?: boolean;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
}) {
    const displayValue = value !== null && value !== undefined ? String(value) : '-';

    return (
        <div className={cn("space-y-1", fullWidth && "col-span-full")}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {label}
            </div>
            {badge ? (
                <Badge
                    variant={badgeVariant as any}
                    className={cn(
                        "text-[10px] px-2 py-0 h-5",
                        badgeVariant === 'success' && "bg-green-600 text-white"
                    )}
                >
                    {displayValue}
                </Badge>
            ) : (
                <div className={cn(
                    "text-xs sm:text-sm font-medium text-foreground/90",
                    fullWidth && "whitespace-pre-wrap leading-relaxed"
                )}>
                    {displayValue}
                </div>
            )}
        </div>
    );
}
