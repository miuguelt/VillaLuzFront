import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { HelpTooltip } from '@/shared/ui/common/HelpTooltip';
import { ClimbingBoxLoader } from 'react-spinners';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { useGeneticImprovements as useGenetics } from '@/entities/genetic-improvement/model/useGeneticImprovement';
import { useAnimalFields } from '@/entities/animal-field/model/useAnimalFields';
import { useAnimalDiseases } from '@/entities/animal-disease/model/useAnimalDiseases';
import { useTreatment } from '@/entities/treatment/model/useTreatment';
import { useVaccinations } from '@/entities/vaccination/model/useVaccination';
import { useControls } from '@/entities/control/model/useControl';
import HistoryTable from '@/widgets/dashboard/admin/HistoryTable';
import { getAnimalLabel } from '@/entities/animal/lib/animalHelpers';
import { usersService } from '@/entities/user/api/user.service';
import { changePassword } from '@/features/auth/api/auth.service';
import { User, Mail, Phone, MapPin, UserCircle, Activity, Shield, Lock, Save, CheckCircle2, Info, AlertTriangle, ClipboardList, CalendarClock, ExternalLink } from 'lucide-react';
import { useActivityFeed } from '@/features/activity/model/useActivityFeed';
import { fetchMyActivity } from '@/features/activity/api/activity.service';
import type { ActivityItem, ActivityEntity as ApiActivityEntity, ActivitySeverity as ApiActivitySeverity, ActivityAction as ApiActivityAction } from '@/features/activity/api/activity.service';
import { useMyActivitySummary } from '@/features/activity/model/useMyActivitySummary';

const profileSchema = z.object({
    fullname: z.string().min(3, 'Ingresa al menos 3 caracteres').max(120, 'Nombre demasiado largo'),
    email: z.string().email('Correo electr¢nico inv lido'),
    phone: z.string().optional().refine((value) => !value || /^[0-9+()\\-\\s]{7,20}$/.test(value), 'Tel‚fono inv lido'),
    address: z.string().max(160, 'Direcci¢n demasiado larga').optional(),
});

const passwordSchema = z
    .object({
        currentPassword: z.string().min(4, 'Ingresa tu contrasena actual'),
        newPassword: z
            .string()
            .min(8, 'La contrasena debe tener al menos 8 caracteres')
            .superRefine((value, ctx) => {
                const hasUppercase = /[A-Z]/.test(value);
                const hasLowercase = /[a-z]/.test(value);

                if (!hasUppercase || !hasLowercase) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Debe incluir al menos 1 mayuscula y 1 minuscula.',
                    });
                }
            }),
        confirmPassword: z.string(),
    })
    .superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Las contrasenas no coinciden',
                path: ['confirmPassword'],
            });
        }
    });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

type BubbleVariant = 'success' | 'error' | 'info' | 'warning';

const PASSWORD_POLICY_HELP = 'La nueva contrasena debe tener minimo 8 caracteres e incluir al menos 1 mayuscula y 1 minuscula. Ejemplo: Abcdefgh';

const BubbleMessage = ({ message, variant = 'error' }: { message: string; variant?: BubbleVariant }) => {
    const variants: Record<BubbleVariant, { wrapper: string; arrow: string }> = {
        success: { wrapper: 'border-green-200 bg-green-50 text-green-800', arrow: 'border-green-200 bg-green-50' },
        error: { wrapper: 'border-red-200 bg-red-50 text-red-700', arrow: 'border-red-200 bg-red-50' },
        info: { wrapper: 'border-blue-200 bg-blue-50 text-blue-800', arrow: 'border-blue-200 bg-blue-50' },
        warning: { wrapper: 'border-yellow-200 bg-yellow-50 text-yellow-800', arrow: 'border-yellow-200 bg-yellow-50' },
    };
    const styles = variants[variant];
    return (
        <div role="alert" className={`relative mt-2 rounded-lg border px-3 py-2 text-sm shadow-sm ${styles.wrapper}`}>
            <span aria-hidden="true" className={`absolute -top-2 left-4 h-3 w-3 rotate-45 border-l border-t ${styles.arrow}`} />
            {message}
        </div>
    );
};

type PasswordStatus = {
    type: BubbleVariant;
    title: string;
    message: string;
};

type ActivityEntityFilter = ApiActivityEntity | 'all';
type ActivityActionFilter = ApiActivityAction | 'all';
type ActivitySeverityFilter = ApiActivitySeverity | 'all';

const PasswordLiveRequirements = ({ newPassword, confirmPassword }: { newPassword: string; confirmPassword: string }) => {
    const lengthOk = newPassword.length >= 8;
    const uppercaseOk = /[A-Z]/.test(newPassword);
    const lowercaseOk = /[a-z]/.test(newPassword);
    const matchOk = !!newPassword && !!confirmPassword && newPassword === confirmPassword;

    const Item = ({ ok, text }: { ok: boolean; text: string }) => (
        <div className={`flex items-start gap-2 text-sm ${ok ? 'text-green-700' : 'text-muted-foreground'}`}>
            {ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" aria-hidden /> : <AlertTriangle className="h-4 w-4 mt-0.5" aria-hidden />}
            <span>{text}</span>
        </div>
    );

    return (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Item ok={lengthOk} text="Minimo 8 caracteres" />
            <Item ok={uppercaseOk} text="Incluye 1 mayuscula" />
            <Item ok={lowercaseOk} text="Incluye 1 minuscula" />
            <Item ok={matchOk} text="Confirmacion coincide" />
        </div>
    );
};

const UserProfile = () => {
    const { user, loading: authLoading, refreshUserData, logout } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { animals, loading: animalsLoading } = useAnimals();
    const { geneticImprovements: genetics, loading: geneticsLoading } = useGenetics();
    const { animalFields, loading: animalFieldsLoading } = useAnimalFields();
    const { animalDiseases, loading: animalDiseasesLoading } = useAnimalDiseases();
    const { treatments, loading: treatmentsLoading } = useTreatment();
    const { vaccinations, loading: vaccinationsLoading } = useVaccinations();
    const { controls, loading: controlsLoading } = useControls();
    const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [passwordStatus, setPasswordStatus] = useState<PasswordStatus | null>(null);
    const [logoutCountdown, setLogoutCountdown] = useState<number | null>(null);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullname: user?.fullname || '',
            email: user?.email || '',
            phone: user?.phone || '',
            address: user?.address || '',
        },
    });
    const { reset } = profileForm;

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const extractErrorMessage = (error: any): string => {
        const payload = error?.response?.data ?? error?.details ?? error?.data ?? error;
        const block = payload?.error ?? payload;
        const fromErrorsObject = (errors: any): string | undefined => {
            if (!errors) return undefined;
            if (Array.isArray(errors)) {
                const messages = errors.map((item) => (typeof item === 'string' ? item : item?.message || item?.detail || item)).filter(Boolean);
                return messages.length ? messages.join(' ') : undefined;
            }
            if (typeof errors === 'object') {
                const messages = Object.values(errors)
                    .flatMap((item) => (Array.isArray(item) ? item : [item]))
                    .map((item) => (typeof item === 'string' ? item : item?.message || item?.detail || item))
                    .filter(Boolean);
                return messages.length ? messages.join(' ') : undefined;
            }
            return undefined;
        };
        const errors =
            block?.errors ??
            block?.data?.errors ??
            block?.data?.data?.errors ??
            block?.details?.errors ??
            block?.details?.data?.errors ??
            block?.validation_errors ??
            block?.data?.validation_errors ??
            block?.data?.data?.validation_errors ??
            block?.details?.validation_errors ??
            block?.details?.data?.validation_errors ??
            payload?.errors ??
            payload?.details?.errors;
        return (
            fromErrorsObject(errors) ||
            block?.message ||
            block?.detail ||
            block?.error ||
            payload?.message ||
            payload?.detail ||
            error?.message ||
            'No se pudo actualizar la contrasena.'
        );
    };

    const currentPasswordValue = passwordForm.watch('currentPassword');
    const newPasswordValue = passwordForm.watch('newPassword');
    const confirmPasswordValue = passwordForm.watch('confirmPassword');

    useEffect(() => {
        if (logoutCountdown == null) return;
        if (logoutCountdown <= 0) {
            setLogoutCountdown(null);
            Promise.resolve(logout()).catch(() => {});
            return;
        }
        const t = setTimeout(() => setLogoutCountdown((prev) => (prev == null ? null : prev - 1)), 1000);
        return () => clearTimeout(t);
    }, [logoutCountdown, logout]);
    useEffect(() => {
        if (user) {
            reset({
                fullname: user.fullname || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
            });
        }
    }, [user, reset]);

    const handleProfileSubmit = async (values: ProfileFormValues) => {
        if (!user?.id) {
            setProfileStatus({ type: 'error', message: 'No se pudo identificar el usuario.' });
            return;
        }

        setUpdatingProfile(true);
        setProfileStatus(null);

        try {
            const normalized = {
                fullname: values.fullname.trim(),
                email: values.email.trim(),
                phone: values.phone?.trim() || '',
                address: values.address?.trim() || '',
            };
            const payload = {
                fullname: normalized.fullname,
                email: normalized.email,
                phone: normalized.phone || undefined,
                address: normalized.address || undefined,
            };

            const updated = await usersService.patchUser(user.id, payload);
            const queued = (updated as any)?.__offlineQueued;
            setProfileStatus({
                type: 'success',
                message: queued ? 'Actualizacion en cola (offline).' : 'Perfil actualizado correctamente.',
            });
            profileForm.reset(normalized);
            if (refreshUserData) {
                await refreshUserData().catch(() => {});
            }
        } catch (error: any) {
            const payload = error?.response?.data ?? error?.data ?? error?.details ?? error;
            const message = error?.message || payload?.message || payload?.detail || 'No se pudo actualizar el perfil.';
            setProfileStatus({ type: 'error', message });
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handlePasswordSubmit = async (values: PasswordFormValues) => {
        setUpdatingPassword(true);
        setPasswordStatus(null);
        setLogoutCountdown(null);
        passwordForm.clearErrors();

        try {
            const result = await changePassword(values.currentPassword, values.newPassword);
            const okMessage = result?.message || 'Contrasena actualizada correctamente.';

            if (result?.should_clear_auth) {
                const msg = result?.message || 'Contrasena actualizada. Por seguridad debes iniciar sesion nuevamente.';
                setPasswordStatus({
                    type: 'info',
                    title: 'Vuelve a iniciar sesion',
                    message: `${msg} Cerraremos tu sesion en unos segundos para proteger tu cuenta.`,
                });
                showToast(msg, 'info', 9000);
                passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setLogoutCountdown(3);
                return;
            }

            showToast(okMessage, 'success');
            setPasswordStatus({ type: 'success', title: 'Listo', message: okMessage });
            passwordForm.reset({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error: any) {
            const status = error?.response?.status ?? error?.status;
            const payload = error?.response?.data ?? error?.details ?? error?.data ?? error;
            const block = payload?.error ?? payload;
            const errors =
                block?.errors ??
                block?.data?.errors ??
                block?.data?.data?.errors ??
                block?.details?.errors ??
                block?.details?.data?.errors ??
                block?.validation_errors ??
                block?.data?.validation_errors ??
                block?.data?.data?.validation_errors ??
                block?.details?.validation_errors ??
                block?.details?.data?.validation_errors ??
                payload?.errors ??
                payload?.details?.errors;

            const fieldMap: Record<string, keyof PasswordFormValues> = {
                current_password: 'currentPassword',
                new_password: 'newPassword',
                confirm_password: 'confirmPassword',
                currentPassword: 'currentPassword',
                newPassword: 'newPassword',
                confirmPassword: 'confirmPassword',
            };

            if (errors && typeof errors === 'object') {
                Object.entries(errors).forEach(([field, value]) => {
                    const uiField = fieldMap[field];
                    if (!uiField) return;
                    const messages = Array.isArray(value) ? value : [value];
                    const message = messages
                        .map((item: any) => (typeof item === 'string' ? item : item?.message || item?.detail || item))
                        .filter(Boolean)
                        .join(' ');
                    if (message) passwordForm.setError(uiField, { message });
                });
            }

            const message = extractErrorMessage(error);
            const normalized = String(message || '').toLowerCase();
            const hasNewPasswordError = !!(errors && typeof errors === 'object' && ('new_password' in errors || 'newPassword' in errors));
            const hasCurrentPasswordError = !!(errors && typeof errors === 'object' && ('current_password' in errors || 'currentPassword' in errors));
            const isGenericValidation =
                normalized.includes('errores de validacion') ||
                normalized.includes('validation error') ||
                normalized.trim() === 'validation';

                if (status === 422) {
                    setPasswordStatus({
                        type: 'warning',
                        title: 'Revisa los campos',
                        message: message || 'Errores de validacion. Ajusta los campos segun los requisitos.',
                    });
                    showToast(message || 'Errores de validacion. Revisa los campos.', 'warning', 8000);
                    if (hasNewPasswordError || normalized.includes('contras') || normalized.includes('password') || normalized.includes('new_password')) {
                        if (!hasNewPasswordError && !isGenericValidation && message) {
                            passwordForm.setError('newPassword', { message });
                        }
                    } else if (!hasCurrentPasswordError && normalized.includes('actual') && !isGenericValidation && message) {
                    passwordForm.setError('currentPassword', { message });
                }
            } else if (status === 401) {
                const isCsrf = normalized.includes('csrf');
                setPasswordStatus({
                    type: 'error',
                    title: isCsrf ? 'Sesion expirada' : 'No autorizado',
                    message:
                        message ||
                        (isCsrf
                            ? 'Sesion expirada o CSRF invalido. Recarga la pagina e intenta nuevamente.'
                            : 'No autorizado. Verifica tu contrasena actual.'),
                });
                showToast(message || (isCsrf ? 'Sesion expirada o CSRF invalido. Recarga la pagina e intenta nuevamente.' : 'No autorizado. Verifica tu contrasena actual.'), 'error', 9000);
                if (!errors && normalized.includes('actual')) {
                    passwordForm.setError('currentPassword', { message: message || 'Contrasena actual incorrecta.' });
                }
            } else if (status === 403) {
                setPasswordStatus({
                    type: 'error',
                    title: 'Acceso denegado',
                    message: message || 'Usuario inactivo. Contacta al administrador.',
                });
                showToast(message || 'Usuario inactivo. Contacta al administrador.', 'error', 9000);
            } else if (status === 404) {
                setPasswordStatus({
                    type: 'error',
                    title: 'No encontrado',
                    message: message || 'Usuario no encontrado.',
                });
                showToast(message || 'Usuario no encontrado.', 'error', 9000);
            } else if (status === 429) {
                setPasswordStatus({
                    type: 'warning',
                    title: 'Demasiados intentos',
                    message: message || 'Demasiados intentos. Intenta nuevamente mas tarde.',
                });
                showToast(message || 'Demasiados intentos. Intenta nuevamente mas tarde.', 'warning', 9000);
            } else if (!status) {
                setPasswordStatus({
                    type: 'error',
                    title: 'Sin conexion',
                    message: message || 'No se pudo conectar con el servidor. Verifica tu conexion o el proxy.',
                });
                showToast(message || 'No se pudo conectar con el servidor. Verifica tu conexion o el proxy.', 'error', 9000);
            } else {
                setPasswordStatus({
                    type: 'error',
                    title: 'No se pudo actualizar',
                    message: message || 'No se pudo actualizar la contrasena.',
                });
                showToast(message || 'No se pudo actualizar la contrasena.', 'error', 9000);
            }
        } finally {
            setUpdatingPassword(false);
        }
    };

    const loading = authLoading || animalsLoading || geneticsLoading || animalFieldsLoading || animalDiseasesLoading || treatmentsLoading || vaccinationsLoading || controlsLoading;

    const userIdentity = String(user?.identification ?? user?.id ?? '');
    const userId = Number(user?.id ?? 0);
    const safeAnimals = Array.isArray(animals) ? animals : [];
    const safeGenetics = Array.isArray(genetics) ? genetics : [];
    const safeAnimalFields = Array.isArray(animalFields) ? animalFields : [];
    const safeAnimalDiseases = Array.isArray(animalDiseases) ? animalDiseases : [];
    const safeTreatments = Array.isArray(treatments) ? treatments : [];
    const safeVaccinations = Array.isArray(vaccinations) ? vaccinations : [];
    const safeControls = Array.isArray(controls) ? controls : [];

    const userAnimalRecords = safeAnimals
        .filter((animal: any) => {
            const nestedId = animal?.user?.id;
            const nestedIdentification = animal?.user?.identification;
            const directId = animal?.user_id ?? animal?.userId;
            if (nestedId != null && Number(nestedId) === userId) return true;
            if (directId != null && Number(directId) === userId) return true;
            return String(nestedIdentification ?? '') === userIdentity;
        });

    const userAnimalIds = new Set(
        userAnimalRecords
            .map((animal: any) => Number(animal?.id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
    );

    const animalLabelById = new Map(
        userAnimalRecords.map((animal: any) => [
            Number(animal?.id),
            getAnimalLabel(animal) || animal.code || animal.record || '-',
        ])
    );

    const getAnimalIdFromRecord = (record: any): number | null => {
        const candidates = [
            record?.animal_id,
            record?.animalId,
            record?.animals?.id,
            record?.animal?.id,
            record?.animals_id,
        ];
        const candidate = candidates.find((value) => value != null && value !== '');
        const num = Number(candidate);
        return Number.isFinite(num) ? num : null;
    };

    const isUserFkRecord = (record: any): boolean => {
        if (!record) return false;

        const animalId = getAnimalIdFromRecord(record);
        if (animalId != null && userAnimalIds.has(animalId)) {
            return true;
        }

        const directIdCandidates = [
            record?.user_id,
            record?.userId,
            record?.apprentice_id,
            record?.apprenticeId,
            record?.instructor_id,
            record?.instructorId,
            record?.owner_id,
            record?.ownerId,
        ];

        if (userId && directIdCandidates.some((value) => Number(value) === userId)) {
            return true;
        }

        const nestedUsers = [
            record?.user,
            record?.apprentice,
            record?.instructor,
            record?.owner,
        ].filter(Boolean);

        for (const nested of nestedUsers) {
            if (nested?.id != null && Number(nested.id) === userId) return true;
            if (nested?.identification != null && String(nested.identification) === userIdentity) return true;
        }

        return false;
    };

    const userAnimals = userAnimalRecords
        .map((animal: any) => ({
            id: animal.id,
            animal: getAnimalLabel(animal) || 'Sin registro',
            code: animal.code || animal.record || '-',
            specie: animal.specie?.name || animal.species?.name || '-',
            breed: animal.breed?.name || '-',
            status: animal.status || '-',
            ts: animal?.updated_at || animal?.created_at || null,
        }));

    const userGenetics = safeGenetics
        .filter((genetic: any) => isUserFkRecord(genetic))
        .map((genetic: any) => ({
            id: genetic?.id,
            animal: getAnimalLabel(genetic?.animal) || genetic?.animal?.code || genetic?.animal?.record || '-',
            type: genetic?.type || genetic?.genetic_event_technique || genetic?.genetic_event_techique || '-',
            date: genetic?.date ? new Date(genetic.date).toLocaleDateString() : '-',
            description: genetic?.description || genetic?.details || '-',
            animalId: getAnimalIdFromRecord(genetic),
            ts: genetic?.date || genetic?.updated_at || genetic?.created_at || null,
        }));

    const userAnimalFields = safeAnimalFields
        .filter((field: any) => isUserFkRecord(field))
        .map((field: any) => ({
            id: field?.id,
            animal: getAnimalLabel(field?.animal) || field?.animal?.code || field?.animal?.record || '-',
            field: field?.field?.name || '-',
            entryDate: field?.entry_date ? new Date(field.entry_date).toLocaleDateString() : '-',
            exitDate: field?.exit_date ? new Date(field.exit_date).toLocaleDateString() : '-',
            animalId: getAnimalIdFromRecord(field),
            ts: field?.exit_date || field?.entry_date || field?.updated_at || field?.created_at || null,
        }));

    const userAnimalDiseases = safeAnimalDiseases
        .filter((d: any) => isUserFkRecord(d))
        .map((d: any) => ({
            id: d?.id,
            animal: d?.animal_record || animalLabelById.get(getAnimalIdFromRecord(d) ?? -1) || '-',
            disease: d?.disease_name || d?.diseases?.name || d?.disease?.name || '-',
            status: d?.status || '-',
            date: d?.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString() : '-',
            animalId: getAnimalIdFromRecord(d),
            ts: d?.diagnosis_date || d?.updated_at || d?.created_at || null,
        }));

    const userTreatments = safeTreatments
        .filter((t: any) => isUserFkRecord(t))
        .map((t: any) => ({
            id: t?.id,
            animal: animalLabelById.get(getAnimalIdFromRecord(t) ?? -1) || t?.animals?.record || '-',
            date: t?.treatment_date ? new Date(t.treatment_date).toLocaleDateString() : '-',
            description: t?.description || t?.diagnosis || '-',
            frequency: t?.frequency || '-',
            animalId: getAnimalIdFromRecord(t),
            endDateRaw: t?.end_date || null,
            ts: t?.treatment_date || t?.updated_at || t?.created_at || null,
        }));

    const userVaccinations = safeVaccinations
        .filter((v: any) => isUserFkRecord(v))
        .map((v: any) => ({
            id: v?.id,
            animal: animalLabelById.get(getAnimalIdFromRecord(v) ?? -1) || v?.animals?.record || '-',
            vaccine: v?.vaccines?.name || v?.vaccine?.name || v?.vaccine_id || '-',
            date: v?.application_date ? new Date(v.application_date).toLocaleDateString() : '-',
            responsible: v?.instructor_id || v?.apprentice_id || '-',
            animalId: getAnimalIdFromRecord(v),
            nextDateRaw: v?.next_dose_date || v?.next_vaccination_date || v?.next_due_date || v?.expiry_date || null,
            ts: v?.application_date || v?.updated_at || v?.created_at || null,
        }));

    const userControls = safeControls
        .filter((c: any) => isUserFkRecord(c))
        .map((c: any) => ({
            id: c?.id,
            animal: animalLabelById.get(getAnimalIdFromRecord(c) ?? -1) || c?.animals?.record || '-',
            date: c?.checkup_date ? new Date(c.checkup_date).toLocaleDateString() : '-',
            status: c?.health_status || c?.healt_status || '-',
            animalId: getAnimalIdFromRecord(c),
            nextDateRaw: c?.next_control_date || c?.next_checkup_date || null,
            ts: c?.checkup_date || c?.updated_at || c?.created_at || null,
        }));

    const getRolePrefix = (roleValue: string | undefined): string => {
        switch (roleValue) {
            case 'Administrador':
                return '/admin';
            case 'Instructor':
                return '/instructor';
            case 'Aprendiz':
                return '/apprentice';
            default:
                return '/admin';
        }
    };

    const rolePrefix = getRolePrefix(user?.role);

    const openCrudDetail = (path: string, id: number | string) => {
        if (!id) return;
        navigate(`${rolePrefix}/${path}?detail=${id}`);
    };

    const openCrudList = (path: string, search: string = '') => {
        navigate(`${rolePrefix}/${path}${search}`);
    };

    const activitySections = ([
        {
            key: 'animals',
            title: 'Mis Animales',
            columns: [
                { key: 'animal', label: 'Animal' },
                { key: 'code', label: 'Codigo' },
                { key: 'specie', label: 'Especie' },
                { key: 'breed', label: 'Raza' },
                { key: 'status', label: 'Estado' },
            ],
            rows: userAnimals,
            crudPath: 'animals',
        },
        {
            key: 'genetics',
            title: 'Mejoras',
            columns: [
                { key: 'animal', label: 'Animal' },
                { key: 'type', label: 'Tipo' },
                { key: 'date', label: 'Fecha' },
                { key: 'description', label: 'Descripcion' },
            ],
            rows: userGenetics,
            crudPath: 'genetic-improvements',
        },
        {
            key: 'fields',
            title: 'Lotes',
            columns: [
                { key: 'animal', label: 'Animal' },
                { key: 'field', label: 'Lote' },
                { key: 'entryDate', label: 'Entrada' },
                { key: 'exitDate', label: 'Salida' },
            ],
            rows: userAnimalFields,
            crudPath: 'animal-fields',
        },
        {
            key: 'diseases',
            title: 'Enfermedades',
            columns: [
                { key: 'animal', label: 'Animal' },
                { key: 'disease', label: 'Enfermedad' },
                { key: 'status', label: 'Estado' },
                { key: 'date', label: 'Fecha' },
            ],
            rows: userAnimalDiseases,
            crudPath: 'disease-animals',
        },
        {
            key: 'treatments',
            title: 'Tratamientos',
            columns: [
                { key: 'animal', label: 'Animal' },
                { key: 'date', label: 'Fecha' },
                { key: 'description', label: 'Descripcion' },
                { key: 'frequency', label: 'Frecuencia' },
            ],
            rows: userTreatments,
            crudPath: 'treatments',
        },
        {
            key: 'vaccinations',
            title: 'Vacunaciones',
            columns: [
                { key: 'animal', label: 'Animal' },
                { key: 'vaccine', label: 'Vacuna' },
                { key: 'date', label: 'Fecha' },
                { key: 'responsible', label: 'Responsable' },
            ],
            rows: userVaccinations,
            crudPath: 'vaccinations',
        },
        {
            key: 'controls',
            title: 'Controles',
            columns: [
                { key: 'animal', label: 'Animal' },
                { key: 'date', label: 'Fecha' },
                { key: 'status', label: 'Estado' },
            ],
            rows: userControls,
            crudPath: 'controls',
        },
    ]);

    const toEpochMs = (value: any): number | null => {
        if (!value) return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        if (value instanceof Date) {
            const t = value.getTime();
            return Number.isFinite(t) ? t : null;
        }
        const parsed = new Date(String(value)).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    };

    /*
    const activityEvents: ActivityEvent[] = useMemo(() => {
        const now = Date.now();
        const events: ActivityEvent[] = [];

        const pushEvent = (event: Omit<ActivityEvent, 'id'>) => {
            const id = `${event.entity}:${String(event.entityId)}:${event.action}:${event.ts}`;
            events.push({ ...event, id });
        };

        userAnimals.forEach((row: any) => {
            const ts = toEpochMs(row.ts) ?? 0;
            pushEvent({
                action: 'create',
                entity: 'animal',
                entityId: row.id,
                ts,
                title: `Animal: ${row.animal}`,
                summary: `${row.code} · ${row.specie} · ${row.breed}`,
                severity: 'low',
                crudPath: 'animals',
                animalId: Number(row.id),
                animalLabel: row.animal,
            });
        });

        userGenetics.forEach((row: any) => {
            const ts = toEpochMs(row.ts) ?? 0;
            pushEvent({
                action: 'create',
                entity: 'improvement',
                entityId: row.id,
                ts,
                title: `Mejora genetica: ${row.type}`,
                summary: row.description ? `${row.animal} · ${row.description}` : `${row.animal}`,
                severity: 'low',
                crudPath: 'genetic-improvements',
                animalId: row.animalId ?? undefined,
                animalLabel: row.animal,
            });
        });

        userAnimalFields.forEach((row: any) => {
            const ts = toEpochMs(row.ts) ?? 0;
            pushEvent({
                action: 'create',
                entity: 'field',
                entityId: row.id,
                ts,
                title: `Lote asignado: ${row.field}`,
                summary: `${row.animal} · Entrada: ${row.entryDate}`,
                severity: 'low',
                crudPath: 'animal-fields',
                animalId: row.animalId ?? undefined,
                animalLabel: row.animal,
            });
        });

        userAnimalDiseases.forEach((row: any) => {
            const ts = toEpochMs(row.ts) ?? 0;
            pushEvent({
                action: 'create',
                entity: 'disease',
                entityId: row.id,
                ts,
                title: `Enfermedad: ${row.disease}`,
                summary: `${row.animal} · Estado: ${row.status}`,
                severity: 'medium',
                crudPath: 'disease-animals',
                animalId: row.animalId ?? undefined,
                animalLabel: row.animal,
            });
        });

        userTreatments.forEach((row: any) => {
            const ts = toEpochMs(row.ts) ?? 0;
            const endTs = toEpochMs(row.endDateRaw);
            const isOverdue = endTs != null && endTs > 0 && endTs < now;
            pushEvent({
                action: isOverdue ? 'alert' : 'create',
                entity: 'treatment',
                entityId: row.id,
                ts: isOverdue ? endTs ?? ts : ts,
                title: isOverdue ? 'Tratamiento vencido' : 'Tratamiento registrado',
                summary: `${row.animal} · ${row.description}`,
                severity: isOverdue ? 'high' : 'low',
                crudPath: 'treatments',
                animalId: row.animalId ?? undefined,
                animalLabel: row.animal,
            });
        });

        userVaccinations.forEach((row: any) => {
            const ts = toEpochMs(row.ts) ?? 0;
            const nextTs = toEpochMs(row.nextDateRaw);
            const isOverdue = nextTs != null && nextTs > 0 && nextTs < now;
            const isUpcoming = nextTs != null && nextTs > 0 && nextTs >= now && nextTs <= now + 7 * 24 * 60 * 60 * 1000;

            pushEvent({
                action: 'create',
                entity: 'vaccination',
                entityId: row.id,
                ts,
                title: 'Vacunacion aplicada',
                summary: `${row.animal} · ${row.vaccine} · ${row.date}`,
                severity: 'low',
                crudPath: 'vaccinations',
                animalId: row.animalId ?? undefined,
                animalLabel: row.animal,
            });

            if (isOverdue || isUpcoming) {
                pushEvent({
                    action: 'alert',
                    entity: 'vaccination',
                    entityId: row.id,
                    ts: nextTs ?? ts,
                    title: isOverdue ? 'Vacuna vencida' : 'Vacuna proxima',
                    summary: `${row.animal} · ${row.vaccine}`,
                    severity: isOverdue ? 'high' : 'medium',
                    crudPath: 'vaccinations',
                    animalId: row.animalId ?? undefined,
                    animalLabel: row.animal,
                });
            }
        });

        userControls.forEach((row: any) => {
            const ts = toEpochMs(row.ts) ?? 0;
            const nextTs = toEpochMs(row.nextDateRaw);
            const isOverdue = nextTs != null && nextTs > 0 && nextTs < now;
            const isUpcoming = nextTs != null && nextTs > 0 && nextTs >= now && nextTs <= now + 7 * 24 * 60 * 60 * 1000;

            pushEvent({
                action: 'create',
                entity: 'control',
                entityId: row.id,
                ts,
                title: 'Control registrado',
                summary: `${row.animal} · Estado: ${row.status}`,
                severity: 'low',
                crudPath: 'controls',
                animalId: row.animalId ?? undefined,
                animalLabel: row.animal,
            });

            if (isOverdue || isUpcoming) {
                pushEvent({
                    action: 'alert',
                    entity: 'control',
                    entityId: row.id,
                    ts: nextTs ?? ts,
                    title: isOverdue ? 'Control atrasado' : 'Control proximo',
                    summary: `${row.animal}`,
                    severity: isOverdue ? 'high' : 'medium',
                    crudPath: 'controls',
                    animalId: row.animalId ?? undefined,
                    animalLabel: row.animal,
                });
            }
        });

        return events
            .filter((e) => Number.isFinite(e.ts) && e.ts > 0)
            .sort((a, b) => b.ts - a.ts);
    }, [userAnimals, userGenetics, userAnimalFields, userAnimalDiseases, userTreatments, userVaccinations, userControls]);

    const [activityRange, setActivityRange] = useState<'7d' | '30d' | 'all'>('7d');
    const [activityEntity, setActivityEntity] = useState<ActivityEntity | 'all'>('all');
    const [activityAction, setActivityAction] = useState<ActivityAction | 'all'>('all');
    const [showAllTimeline, setShowAllTimeline] = useState(false);

    const filteredTimeline = useMemo(() => {
        const now = Date.now();
        const minTs =
            activityRange === '7d'
                ? now - 7 * 24 * 60 * 60 * 1000
                : activityRange === '30d'
                  ? now - 30 * 24 * 60 * 60 * 1000
                  : 0;

        const filtered = activityEvents.filter((e) => {
            if (minTs && e.ts < minTs) return false;
            if (activityEntity !== 'all' && e.entity !== activityEntity) return false;
            if (activityAction !== 'all' && e.action !== activityAction) return false;
            return true;
        });

        return showAllTimeline ? filtered : filtered.slice(0, 15);
    }, [activityEvents, activityRange, activityEntity, activityAction, showAllTimeline]);

    const timelineGroups = useMemo(() => {
        const groups = new Map<string, ActivityEvent[]>();
        const formatDay = (ts: number) =>
            new Date(ts).toLocaleDateString('es-ES', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        filteredTimeline.forEach((event) => {
            const key = formatDay(event.ts);
            const current = groups.get(key) ?? [];
            current.push(event);
            groups.set(key, current);
        });
        return Array.from(groups.entries());
    }, [filteredTimeline]);

    const activityStats = useMemo(() => {
        const now = Date.now();
        const countSince = (days: number) => activityEvents.filter((e) => e.ts >= now - days * 24 * 60 * 60 * 1000).length;
        const activeTreatments = userTreatments.filter((t: any) => {
            const endTs = toEpochMs(t.endDateRaw);
            if (!endTs) return true;
            return endTs >= now;
        }).length;
        const pendingAlerts = activityEvents.filter((e) => e.action === 'alert' && e.severity === 'high').length;
        const upcoming = activityEvents.filter((e) => e.action === 'alert' && e.severity === 'medium').length;
        return {
            actions7: countSince(7),
            actions30: countSince(30),
            animals: userAnimals.length,
            activeTreatments,
            pendingAlerts,
            upcoming,
        };
    }, [activityEvents, userAnimals.length, userTreatments]);
    */

    const [activityPage, setActivityPage] = useState(1);
    const [activityLimit, setActivityLimit] = useState(20);
    const [activityEntity, setActivityEntity] = useState<ActivityEntityFilter>('all');
    const [activityAction, setActivityAction] = useState<ActivityActionFilter>('all');
    const [activitySeverity, setActivitySeverity] = useState<ActivitySeverityFilter>('all');
    const [activityFrom, setActivityFrom] = useState('');
    const [activityTo, setActivityTo] = useState('');
    const [activityAnimalId, setActivityAnimalId] = useState('');

    const activityQuery = useMemo(
        () => ({
            page: activityPage,
            limit: activityLimit,
            entity: activityEntity === 'all' ? undefined : activityEntity,
            action: activityAction === 'all' ? undefined : activityAction,
            severity: activitySeverity === 'all' ? undefined : activitySeverity,
            from: activityFrom || undefined,
            to: activityTo || undefined,
            animalId: activityAnimalId || undefined,
        }),
        [activityAction, activityAnimalId, activityEntity, activityFrom, activityLimit, activityPage, activitySeverity, activityTo]
    );

    const {
        items: activityItems,
        meta: activityMeta,
        loading: activityLoading,
        error: activityError,
        refetch: refetchActivity,
    } = useActivityFeed(activityQuery, { enableCache: true, enabled: !!user?.id, fetcher: fetchMyActivity });

    const { data: myActivitySummary, loading: summaryLoading } = useMyActivitySummary({ enabled: !!user?.id });
    const actions7 = myActivitySummary?.window_7d?.totals?.events ?? 0;
    const actions30 = myActivitySummary?.window_30d?.totals?.events ?? 0;
    const distinctAnimals30 = myActivitySummary?.window_30d?.totals?.distinct_animals ?? 0;
    const lastActivityAt = myActivitySummary?.last_activity_at ?? null;

    const activeTreatments = useMemo(() => {
        const now = Date.now();
        return userTreatments.filter((t: any) => {
            const endTs = toEpochMs(t.endDateRaw);
            if (!endTs) return true;
            return endTs >= now;
        }).length;
    }, [userTreatments]);

    const activityTimelineGroups = useMemo(() => {
        const groups: Array<[string, ActivityItem[]]> = [];
        let currentLabel: string | null = null;
        activityItems.forEach((item) => {
            const ts = new Date(item.timestamp).getTime();
            const label = Number.isFinite(ts)
                ? new Date(ts).toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                : 'Sin fecha';
            if (label !== currentLabel) {
                currentLabel = label;
                groups.push([label, [item]]);
                return;
            }
            groups[groups.length - 1]?.[1].push(item);
        });
        return groups;
    }, [activityItems]);

    const activityHasNext =
        activityMeta?.has_next ?? (typeof activityMeta?.total_pages === 'number' ? activityPage < activityMeta.total_pages : activityItems.length === activityLimit);

    const resolveNavLink = (raw: string): string => {
        if (!raw) return raw;
        if (raw.startsWith('/')) return raw;
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
        return `${rolePrefix}/${raw}`;
    };

    const entityCrudPath = (entityValue: string | undefined): string | null => {
        switch (entityValue) {
            case 'animal':
                return 'animals';
            case 'treatment':
                return 'treatments';
            case 'vaccination':
                return 'vaccinations';
            case 'control':
                return 'controls';
            case 'field':
                return 'animal-fields';
            case 'disease':
                return 'disease-animals';
            case 'improvement':
                return 'genetic-improvements';
            default:
                return null;
        }
    };

    const openActivityLink = (raw?: string) => {
        if (!raw) return;
        const resolved = resolveNavLink(raw);
        if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
            window.open(resolved, '_blank', 'noopener,noreferrer');
            return;
        }
        navigate(resolved);
    };

    const openActivityDetail = (item: ActivityItem) => {
        if (item.links?.detail) return openActivityLink(item.links.detail);
        const crud = entityCrudPath(item.entity);
        const id = item.entity_id ?? item.id;
        if (crud && id != null) return openCrudDetail(crud, id);
    };

    const openActivityCrud = (item: ActivityItem) => {
        if (item.links?.crud) return openActivityLink(item.links.crud);
        const crud = entityCrudPath(item.entity);
        if (!crud) return;
        const animalId = item.animal_id;
        openCrudList(crud, animalId ? `?animal_id=${animalId}` : '');
    };

    const openActivityAnimal = (item: ActivityItem) => {
        if (item.links?.animal) return openActivityLink(item.links.animal);
        const animalId = item.animal_id;
        if (animalId) openCrudDetail('animals', animalId);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <ClimbingBoxLoader color="#16a34a" size={30} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-4 md:p-8 max-w-3xl mx-auto">
                <p className="text-sm text-muted-foreground">No se pudo cargar el perfil.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                        <UserCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{user.fullname}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {user.role}
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="px-4 py-1 text-sm bg-green-50 text-green-700 border-green-200">
                    Perfil de Usuario
                </Badge>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 shadow-sm border-muted/50">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <User className="w-5 h-5 text-green-600" />
                            Información Personal
                        </CardTitle>
                        <CardDescription>Detalles de tu cuenta en el sistema</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Identificación</p>
                            <p className="font-medium">{user.identification}</p>
                        </div>
                        <div className="space-y-1 border-t pt-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email
                            </p>
                            <p className="font-medium truncate">{user.email}</p>
                        </div>
                        {user.phone && (
                            <div className="space-y-1 border-t pt-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Teléfono
                                </p>
                                <p className="font-medium">{user.phone}</p>
                            </div>
                        )}
                        {user.address && (
                            <div className="space-y-1 border-t pt-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Dirección
                                </p>
                                <p className="font-medium">{user.address}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-sm border-muted/50">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-600" />
                            Tu Actividad
                        </CardTitle>
                        <CardDescription>Resumen de tus acciones y asignaciones</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                <div className="rounded-lg border bg-white p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Acciones (7/30)</p>
                                        <Activity className="h-4 w-4 text-green-600" aria-hidden />
                                    </div>
                                    <p className="mt-1 text-lg font-semibold text-foreground">
                                        {summaryLoading ? '-' : actions7} <span className="text-muted-foreground">/</span> {summaryLoading ? '-' : actions30}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">Eventos recientes</p>
                                </div>
                                <div className="rounded-lg border bg-white p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Mis animales</p>
                                        <User className="h-4 w-4 text-green-600" aria-hidden />
                                    </div>
                                    <p className="mt-1 text-lg font-semibold text-foreground">{summaryLoading ? '-' : distinctAnimals30}</p>
                                    <p className="text-[11px] text-muted-foreground">Involucrados (30d)</p>
                                </div>
                                <div className="rounded-lg border bg-white p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Tratamientos activos</p>
                                        <ClipboardList className="h-4 w-4 text-green-600" aria-hidden />
                                    </div>
                                    <p className="mt-1 text-lg font-semibold text-foreground">{activeTreatments}</p>
                                    <p className="text-[11px] text-muted-foreground">En seguimiento</p>
                                </div>
                                <div className="rounded-lg border bg-white p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Ultima actividad</p>
                                        <CalendarClock className="h-4 w-4 text-blue-600" aria-hidden />
                                    </div>
                                    <p className="mt-1 text-lg font-semibold text-foreground">
                                        {summaryLoading ? '-' : lastActivityAt ? new Date(lastActivityAt).toLocaleDateString('es-ES') : '-'}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {summaryLoading ? '' : lastActivityAt ? new Date(lastActivityAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Sin eventos'}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-white p-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Timeline de actividad</p>
                                        <p className="text-xs text-muted-foreground">Usa paginado + filtros (sin reordenar la data) y navega con deep links.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 sm:items-center w-full md:w-auto">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor="activityFrom">
                                                Desde
                                            </Label>
                                            <Input
                                                id="activityFrom"
                                                type="date"
                                                value={activityFrom}
                                                onChange={(e) => {
                                                    setActivityFrom(e.target.value);
                                                    setActivityPage(1);
                                                }}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor="activityTo">
                                                Hasta
                                            </Label>
                                            <Input
                                                id="activityTo"
                                                type="date"
                                                value={activityTo}
                                                onChange={(e) => {
                                                    setActivityTo(e.target.value);
                                                    setActivityPage(1);
                                                }}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor="activityAnimalId">
                                                Animal ID
                                            </Label>
                                            <Input
                                                id="activityAnimalId"
                                                type="number"
                                                inputMode="numeric"
                                                value={activityAnimalId}
                                                onChange={(e) => {
                                                    setActivityAnimalId(e.target.value);
                                                    setActivityPage(1);
                                                }}
                                                className="h-9"
                                                placeholder="80"
                                            />
                                        </div>
                                        <Select
                                            value={activityEntity}
                                            onValueChange={(v) => {
                                                setActivityEntity(v as ActivityEntityFilter);
                                                setActivityPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-9 w-full lg:w-[170px]">
                                                <SelectValue placeholder="Entidad" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>
                                                <SelectItem value="animal">Animales</SelectItem>
                                                <SelectItem value="treatment">Tratamientos</SelectItem>
                                                <SelectItem value="vaccination">Vacunaciones</SelectItem>
                                                <SelectItem value="control">Controles</SelectItem>
                                                <SelectItem value="disease">Enfermedades</SelectItem>
                                                <SelectItem value="field">Lotes</SelectItem>
                                                <SelectItem value="improvement">Mejoras</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={activityAction}
                                            onValueChange={(v) => {
                                                setActivityAction(v as ActivityActionFilter);
                                                setActivityPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-9 w-full lg:w-[150px]">
                                                <SelectValue placeholder="Accion" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>
                                                <SelectItem value="create">Crear</SelectItem>
                                                <SelectItem value="update">Actualizar</SelectItem>
                                                <SelectItem value="delete">Eliminar</SelectItem>
                                                <SelectItem value="alert">Alertas</SelectItem>
                                                <SelectItem value="system">Sistema</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={activitySeverity}
                                            onValueChange={(v) => {
                                                setActivitySeverity(v as ActivitySeverityFilter);
                                                setActivityPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-9 w-full lg:w-[150px]">
                                                <SelectValue placeholder="Severidad" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>
                                                <SelectItem value="low">Baja</SelectItem>
                                                <SelectItem value="medium">Media</SelectItem>
                                                <SelectItem value="high">Alta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={String(activityLimit)}
                                                onValueChange={(v) => {
                                                    setActivityLimit(Number(v));
                                                    setActivityPage(1);
                                                }}
                                            >
                                                <SelectTrigger className="h-9 w-full lg:w-[120px]">
                                                    <SelectValue placeholder="Items" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="20">20</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button type="button" variant="outline" size="sm" onClick={refetchActivity} disabled={activityLoading}>
                                                Refrescar
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {activityError ? (
                                    <div className="mt-4">
                                        <Alert className="bg-red-50 border-red-200">
                                            <AlertTitle className="font-semibold">No se pudo cargar la actividad</AlertTitle>
                                            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <span className="text-sm">{activityError}</span>
                                                <Button type="button" variant="outline" size="sm" onClick={refetchActivity}>
                                                    Reintentar
                                                </Button>
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                ) : activityLoading ? (
                                    <div className="mt-4 flex justify-center py-6">
                                        <ClimbingBoxLoader color="#16a34a" size={10} />
                                    </div>
                                ) : activityItems.length === 0 ? (
                                    <div className="mt-4 rounded-lg border border-dashed p-4 text-center">
                                        <p className="text-sm font-medium text-foreground">Sin actividad con estos filtros.</p>
                                        <p className="text-xs text-muted-foreground mt-1">Ajusta fechas/entidad o registra una accion desde el CRUD.</p>
                                        <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-center">
                                            <Button type="button" variant="outline" size="sm" onClick={() => openCrudList('animals')}>
                                                Ir a Animales
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => navigate(`${rolePrefix}/analytics/executive`)}>
                                                Ver Analytics
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-4">
                                        {activityTimelineGroups.map(([dayLabel, items]) => (
                                            <div key={dayLabel}>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">{dayLabel}</p>
                                                <div className="mt-2 space-y-2">
                                                    {items.map((item) => {
                                                        const severity = String(item.severity ?? 'low');
                                                        const accent =
                                                            severity === 'high'
                                                                ? 'border-l-red-500'
                                                                : severity === 'medium'
                                                                  ? 'border-l-amber-500'
                                                                  : 'border-l-green-500';
                                                        const timestamp = new Date(item.timestamp);
                                                        const timeLabel = Number.isFinite(timestamp.getTime())
                                                            ? timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                                            : '';
                                                        const title = item.title || `${String(item.action)} · ${String(item.entity)}`;
                                                        const summary = item.summary || '';
                                                        const canOpenDetail = Boolean(item.links?.detail || entityCrudPath(item.entity));
                                                        const canOpenAnimal = Boolean(item.animal_id || item.links?.animal);
                                                        const canOpenCrud = Boolean(item.links?.crud || entityCrudPath(item.entity));
                                                        const key = `${String(item.id)}:${String(item.timestamp)}`;

                                                        return (
                                                            <div
                                                                key={key}
                                                                className={`flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-muted/60 bg-background/50 p-3 border-l-4 ${accent}`}
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openActivityDetail(item)}
                                                                            className="text-left text-sm font-semibold text-foreground truncate hover:underline"
                                                                        >
                                                                            {title}
                                                                        </button>
                                                                        {timeLabel && <span className="text-[11px] text-muted-foreground">{timeLabel}</span>}
                                                                        <Badge variant="outline" className="text-[10px]">
                                                                            {String(item.entity)}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-[10px]">
                                                                            {String(item.action)}
                                                                        </Badge>
                                                                    </div>
                                                                    {summary && <p className="text-xs text-muted-foreground mt-1 truncate">{summary}</p>}
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {canOpenDetail && (
                                                                        <Button type="button" variant="ghost" size="sm" onClick={() => openActivityDetail(item)}>
                                                                            Ver
                                                                        </Button>
                                                                    )}
                                                                    {canOpenAnimal && (
                                                                        <Button type="button" variant="ghost" size="sm" onClick={() => openActivityAnimal(item)}>
                                                                            Animal
                                                                        </Button>
                                                                    )}
                                                                    {canOpenCrud && (
                                                                        <Button type="button" variant="outline" size="sm" onClick={() => openActivityCrud(item)}>
                                                                            CRUD <ExternalLink className="h-3 w-3 ml-1" aria-hidden />
                                                                        </Button>
                                                                    )}
                                                                    {item.links?.analytics && (
                                                                        <Button type="button" variant="outline" size="sm" onClick={() => openActivityLink(item.links?.analytics)}>
                                                                            Analytics <ExternalLink className="h-3 w-3 ml-1" aria-hidden />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <p className="text-xs text-muted-foreground">
                                                Pagina {activityPage}
                                                {typeof activityMeta?.total_pages === 'number' ? ` de ${activityMeta.total_pages}` : ''}
                                                {typeof activityMeta?.total === 'number' ? ` · Total: ${activityMeta.total}` : ''}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                                                    disabled={activityPage <= 1 || activityLoading}
                                                >
                                                    Anterior
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActivityPage((p) => p + 1)}
                                                    disabled={!activityHasNext || activityLoading}
                                                >
                                                    Siguiente
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Tabs defaultValue={activitySections[0]?.key || 'animals'} className="w-full">
                                <TabsList className="flex flex-wrap gap-2 mb-6 bg-muted/50 p-1 rounded-lg">
                                    {activitySections.map((section) => (
                                        <TabsTrigger
                                            key={section.key}
                                            value={section.key}
                                            className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                        >
                                            {section.title} <span className="ml-1 text-xs text-muted-foreground">({section.rows.length})</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {activitySections.map((section) => {
                                    const rows = Array.isArray(section.rows) ? section.rows : [];
                                    const lastTs = rows
                                        .map((row: any) => toEpochMs(row.ts))
                                        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
                                        .reduce((max, v) => Math.max(max, v), 0);
                                    const lastLabel = lastTs ? new Date(lastTs).toLocaleString('es-ES') : 'Sin actividad';

                                    const emptyCopy: Record<string, { title: string; body: string; cta: string }> = {
                                        animals: { title: 'Aun no tienes animales asignados', body: 'Agrega o asigna animales para ver su trazabilidad aqui.', cta: 'Ir a Animales' },
                                        genetics: { title: 'Sin mejoras geneticas registradas', body: 'Registra una mejora para mantener el historial productivo al dia.', cta: 'Ir a Mejoras' },
                                        fields: { title: 'Sin lotes vinculados', body: 'Asigna un animal a un lote para mejorar el seguimiento de ubicacion.', cta: 'Ir a Lotes' },
                                        diseases: { title: 'Sin enfermedades registradas', body: 'Si aparece un caso, registralo para mantener el historial medico.', cta: 'Ir a Enfermedades' },
                                        treatments: { title: 'Aun no tienes tratamientos', body: 'Registra el primer tratamiento para uno de tus animales.', cta: 'Ir a Tratamientos' },
                                        vaccinations: { title: 'Aun no tienes vacunaciones', body: 'Registra una aplicacion para mantener los vencimientos controlados.', cta: 'Ir a Vacunaciones' },
                                        controls: { title: 'Aun no tienes controles', body: 'Registra un control para dar seguimiento al estado del animal.', cta: 'Ir a Controles' },
                                    };
                                    const empty = emptyCopy[section.key] ?? { title: 'Sin registros', body: 'Aun no hay actividad en esta seccion.', cta: 'Abrir CRUD' };

                                    return (
                                        <TabsContent
                                            key={section.key}
                                            value={section.key}
                                            className="min-h-[200px] animate-in slide-in-from-bottom-2 duration-300"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Ultima actividad: {lastLabel}</p>
                                                    <p className="text-xs text-muted-foreground">Deep links: ver detalle, ver animal, ver CRUD filtrado.</p>
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => openCrudList(section.crudPath)}>
                                                        Abrir CRUD completo
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => navigate(`${rolePrefix}/analytics/executive`)}>
                                                        Analytics
                                                    </Button>
                                                </div>
                                            </div>

                                            {rows.length === 0 ? (
                                                <div className="rounded-lg border border-dashed p-6 text-center bg-muted/10">
                                                    <p className="text-sm font-semibold text-foreground">{empty.title}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{empty.body}</p>
                                                    <div className="mt-4 flex justify-center">
                                                        <Button type="button" size="sm" onClick={() => openCrudList(section.crudPath)}>
                                                            {empty.cta}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-md border border-muted/60 bg-white">
                                                    <HistoryTable
                                                        columns={section.columns}
                                                        data={rows}
                                                        getRowId={(row) => row.id}
                                                        onRowClick={(row) => openCrudDetail(section.crudPath, row.id)}
                                                        renderRowActions={(row) => (
                                                            <div className="flex gap-2 justify-end">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        openCrudDetail(section.crudPath, row.id);
                                                                    }}
                                                                >
                                                                    Ver
                                                                </Button>
                                                                {row.animalId && section.crudPath !== 'animals' && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            openCrudDetail('animals', row.animalId);
                                                                        }}
                                                                    >
                                                                        Animal
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </TabsContent>
                                    );
                                })}
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="shadow-sm border-muted/50">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Save className="w-5 h-5 text-green-600" />
                            Actualiza tus datos
                        </CardTitle>
                        <CardDescription>El formulario usa cookies + header CSRF automático desde el cliente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {profileStatus && (
                            <Alert className={profileStatus.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
                                <AlertTitle className="font-semibold">{profileStatus.type === 'error' ? 'Error' : 'Datos guardados'}</AlertTitle>
                                <AlertDescription>{profileStatus.message}</AlertDescription>
                            </Alert>
                        )}
                        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullname">Nombre completo</Label>
                                <Input
                                    id="fullname"
                                    placeholder="Nombre y apellidos"
                                    {...profileForm.register('fullname')}
                                    className={profileForm.formState.errors.fullname ? 'border-red-400 focus:ring-red-400' : ''}
                                />
                                {profileForm.formState.errors.fullname && (
                                    <p className="text-sm text-red-600">{profileForm.formState.errors.fullname.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="correo@dominio.com"
                                    {...profileForm.register('email')}
                                    className={profileForm.formState.errors.email ? 'border-red-400 focus:ring-red-400' : ''}
                                />
                                {profileForm.formState.errors.email && (
                                    <p className="text-sm text-red-600">{profileForm.formState.errors.email.message}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        placeholder="Ej: +57 3001234567"
                                        {...profileForm.register('phone')}
                                        className={profileForm.formState.errors.phone ? 'border-red-400 focus:ring-red-400' : ''}
                                    />
                                    {profileForm.formState.errors.phone && (
                                        <p className="text-sm text-red-600">{profileForm.formState.errors.phone.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Dirección</Label>
                                    <Input
                                        id="address"
                                        placeholder="Barrio, ciudad"
                                        {...profileForm.register('address')}
                                        className={profileForm.formState.errors.address ? 'border-red-400 focus:ring-red-400' : ''}
                                    />
                                    {profileForm.formState.errors.address && (
                                        <p className="text-sm text-red-600">{profileForm.formState.errors.address.message}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                <p className="text-xs text-muted-foreground">Se envía usando axios con credenciales y encabezado CSRF desde las cookies.</p>
                                <Button type="submit" disabled={updatingProfile} className="min-w-[160px]">
                                    {updatingProfile ? 'Guardando...' : 'Guardar cambios'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-muted/50">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Lock className="w-5 h-5 text-green-600" />
                            Seguridad y contrasena
                        </CardTitle>
                        <CardDescription>Usa el endpoint /auth/change-password protegido con cookies + CSRF.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {passwordStatus && (
                            <Alert
                                className={
                                    passwordStatus.type === 'success'
                                        ? 'bg-green-50 border-green-200'
                                        : passwordStatus.type === 'warning'
                                          ? 'bg-yellow-50 border-yellow-200'
                                          : passwordStatus.type === 'info'
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'bg-red-50 border-red-200'
                                }
                            >
                                <AlertTitle className="font-semibold flex items-center gap-2">
                                    {passwordStatus.type === 'success' ? (
                                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                                    ) : passwordStatus.type === 'warning' ? (
                                        <AlertTriangle className="h-4 w-4" aria-hidden />
                                    ) : (
                                        <Info className="h-4 w-4" aria-hidden />
                                    )}
                                    {passwordStatus.title}
                                </AlertTitle>
                                <AlertDescription>
                                    <div className="space-y-2">
                                        <p>{passwordStatus.message}</p>
                                        {logoutCountdown != null && (
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                                                <p className="text-sm">
                                                    Cerrando sesion en <span className="font-semibold">{logoutCountdown}s</span>...
                                                </p>
                                                <Button type="button" variant="outline" size="sm" onClick={() => Promise.resolve(logout()).catch(() => {})}>
                                                    Cerrar sesion ahora
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                        <form
                            onSubmit={passwordForm.handleSubmit(handlePasswordSubmit, () =>
                                showToast('Revisa los campos antes de continuar.', 'warning', 6000)
                            )}
                            className="space-y-4"
                        >
                            <input
                                type="text"
                                name="username"
                                autoComplete="username"
                                value={user.email || user.identification || ''}
                                readOnly
                                tabIndex={-1}
                                aria-hidden="true"
                                className="hidden"
                            />

                                {(!!currentPasswordValue || !!newPasswordValue || !!confirmPasswordValue) && (
                                    <Alert className="bg-yellow-50 border-yellow-200">
                                        <AlertTitle className="font-semibold flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" aria-hidden />
                                            Requisitos de contrasena
                                        </AlertTitle>
                                        <AlertDescription className="text-sm">
                                            <p>Actual: 4+ caracteres. Nueva: minimo 8 caracteres e incluye al menos 1 mayuscula y 1 minuscula.</p>
                                            <PasswordLiveRequirements newPassword={newPasswordValue || ''} confirmPassword={confirmPasswordValue || ''} />
                                        </AlertDescription>
                                    </Alert>
                                )}
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Contrasena actual</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    {...passwordForm.register('currentPassword')}
                                    className={passwordForm.formState.errors.currentPassword ? 'border-red-400 focus:ring-red-400' : ''}
                                />
                                {passwordForm.formState.errors.currentPassword?.message && (
                                    <BubbleMessage message={passwordForm.formState.errors.currentPassword.message} variant="error" />
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword" className="flex items-center gap-2">
                                        Nueva contrasena
                                        <HelpTooltip content={PASSWORD_POLICY_HELP} side="right" />
                                    </Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        {...passwordForm.register('newPassword')}
                                        className={passwordForm.formState.errors.newPassword ? 'border-red-400 focus:ring-red-400' : ''}
                                    />
                                    {passwordForm.formState.errors.newPassword?.message && (
                                        <BubbleMessage message={passwordForm.formState.errors.newPassword.message} variant="error" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar nueva contrasena</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        {...passwordForm.register('confirmPassword')}
                                        className={passwordForm.formState.errors.confirmPassword ? 'border-red-400 focus:ring-red-400' : ''}
                                    />
                                    {passwordForm.formState.errors.confirmPassword?.message && (
                                        <BubbleMessage message={passwordForm.formState.errors.confirmPassword.message} variant="error" />
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                <p className="text-xs text-muted-foreground">Si el backend responde should_clear_auth, cerraremos la sesión de forma segura.</p>
                                <Button type="submit" disabled={updatingPassword} className="min-w-[180px]">
                                    {updatingPassword ? 'Actualizando...' : 'Actualizar contrasena'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default UserProfile;
