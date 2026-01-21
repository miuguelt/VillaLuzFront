import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Eye, EyeOff, User, Mail, Lock, UserPlus, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import { usersService } from '@/entities/user/api/user.service';
import { getUserProfile } from '@/features/auth/api/auth.service';
import { useToast } from '@/app/providers/ToastContext';

interface SignUpFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  identification_number: string;
  role: string;
  address?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  identification_number?: string;
  address?: string;
  general?: string;
}

const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (value: string) => value.length >= 8 },
  { id: 'uppercase', label: 'Al menos una mayúscula', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'number', label: 'Al menos un número', test: (value: string) => /\d/.test(value) },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[0-9\s-]{7,15}$/;

const SignUpForm: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<SignUpFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    identification_number: '',
    role: 'Aprendiz', // default role
    address: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpFormData, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const setFieldError = (fieldName: keyof FormErrors, message?: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: message }));
  };

  const mapBackendFieldToUI = (field: string): keyof FormErrors | undefined => {
    const m: Record<string, keyof FormErrors> = {
      fullname: 'name',
      name: 'name',
      email: 'email',
      phone: 'phone',
      identification: 'identification_number',
      identification_number: 'identification_number',
      address: 'address',
      password: 'password',
      confirm_password: 'confirmPassword',
      confirmPassword: 'confirmPassword',
      role: undefined as any,
    };
    return m[field];
  };

  const labelForField = (field: string): string => {
    const map: Record<string, string> = {
      email: 'correo',
      fullname: 'nombre',
      name: 'nombre',
      phone: 'teléfono',
      identification: 'número de identificación',
      identification_number: 'número de identificación',
      address: 'dirección',
    };
    return map[field] || field;
  };

  const mapBackendValidationErrors = (details: any) => {
    if (!details || typeof details !== 'object') return;
    const validation = (details as any).validation_errors || (details as any).errors || details;
    if (!validation || typeof validation !== 'object') return;

    const map: Record<string, keyof FormErrors> = {
      fullname: 'name',
      name: 'name',
      email: 'email',
      phone: 'phone',
      identification: 'identification_number',
      identification_number: 'identification_number',
      password: 'password',
      confirmPassword: 'confirmPassword',
      address: 'address',
    };

    const newFieldErrors: FormErrors = {};
    Object.entries(validation).forEach(([key, val]) => {
      const uiKey = map[key];
      if (!uiKey) return;
      const messages = Array.isArray(val) ? val : [val];
      const msg = messages
        .map((e: any) => (typeof e === 'string' ? e : e?.message || e?.detail || e))
        .filter(Boolean)
        .join(' • ');
      if (msg) newFieldErrors[uiKey] = msg;
    });

    if (Object.keys(newFieldErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newFieldErrors }));
    }
  };

  const buildValidationErrors = (data: SignUpFormData): FormErrors => {
    const newErrors: FormErrors = {};

    if (!data.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (data.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    const emailVal = data.email.trim();
    if (!emailVal) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!EMAIL_REGEX.test(emailVal)) {
      newErrors.email = 'Ingrese un correo electrónico válido';
    }

    const phoneVal = data.phone.trim();
    if (!phoneVal) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!PHONE_REGEX.test(phoneVal)) {
      newErrors.phone = 'Ingrese un teléfono válido (7-15 dígitos)';
    }

    const idValue = data.identification_number.trim();
    if (!idValue) {
      newErrors.identification_number = 'El número de identificación es obligatorio';
    } else if (!/^\d+$/.test(idValue)) {
      newErrors.identification_number = 'El número de identificación debe contener solo dígitos';
    } else if (idValue.length < 5) {
      newErrors.identification_number = 'El número de identificación debe tener al menos 5 dígitos';
    } else if (parseInt(idValue, 10) <= 0) {
      newErrors.identification_number = 'El número de identificación debe ser un número positivo';
    }

    const unmetPasswordRules = PASSWORD_RULES.filter((rule) => !rule.test(data.password));
    if (!data.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (unmetPasswordRules.length) {
      newErrors.password = `La contraseña debe cumplir: ${unmetPasswordRules.map((rule) => rule.label.toLowerCase()).join(', ')}`;
    }

    if (!data.confirmPassword) {
      newErrors.confirmPassword = 'La confirmación de contraseña es obligatoria';
    } else if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return newErrors;
  };

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, valid: rule.test(formData.password) })),
    [formData.password]
  );
  const validationSnapshot = useMemo(() => buildValidationErrors(formData), [formData]);
  const isFormValid = Object.keys(validationSnapshot).length === 0;
  const hasInteracted = submitAttempted || Object.keys(touched).length > 0;

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = e.target.name as keyof SignUpFormData;
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const getFieldError = (field: keyof FormErrors) => {
    const existing = errors[field];
    if (existing) return existing;
    if (!hasInteracted) return undefined;
    if (!submitAttempted && !touched[field as keyof SignUpFormData]) return undefined;
    return validationSnapshot[field];
  };

  const blockingReasons = useMemo(() => {
    if (isFormValid) return [];

    const FIELD_LABELS: Partial<Record<keyof FormErrors, string>> = {
      name: 'Nombre completo',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      identification_number: 'Número de identificación',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
    };

    return (Object.entries(validationSnapshot) as Array<[keyof FormErrors, string | undefined]>)
      .filter(([, message]) => Boolean(message))
      .map(([field, message]) => {
        const label = FIELD_LABELS[field] || String(field);
        return `${label}: ${message}`;
      })
      .slice(0, 4);
  }, [isFormValid, validationSnapshot]);

  const validateForm = (): boolean => {
    const newErrors = buildValidationErrors(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setTouched((prev) =>
      prev[name as keyof SignUpFormData] ? prev : { ...prev, [name]: true }
    );

    // Clear specific error when user starts typing
    if (errors[name as keyof FormErrors] || errors.general) {
      setErrors(prev => {
        const next = { ...prev, [name]: undefined } as FormErrors;
        if (prev.general) next.general = undefined;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setSuccessMessage('');
    setSubmitAttempted(true);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    let userData: any = null;

    try {
      // Prepare data for backend
      const cleanedPhone = formData.phone.replace(/[\s-]+/g, '').trim();
      userData = {
        fullname: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: cleanedPhone,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        identification: parseInt(formData.identification_number.trim(), 10), // Convert to number
        role: formData.role as "Administrador" | "Instructor" | "Aprendiz",
        address: formData.address?.trim() || undefined,
      };

      // Debug logging in development
      if (import.meta.env.DEV) {
        console.log('[SignUp] Sending user data:', {
          ...userData,
          password: '***',
          password_confirmation: '***'
        });
      }

      // Crear usuario usando el servicio
      const created = (await usersService.createPublicUser(userData)) as any;
      const message = created?.message || created?.detail || 'Cuenta creada exitosamente. Por favor inicia sesión.';

      setSuccessMessage(message);
      setSuccess(true);

      // Redirigir a login después de 1.8 segundos
      setTimeout(() => {
        navigate('/login', {
          state: {
            message,
            email: formData.email
          }
        });
      }, 1800);

    } catch (error: any) {
      console.error('Error registering user:', error);

      const attemptAuthenticatedCreate = async () => {
        try {
          const profile = await getUserProfile();
          if (!profile?.user) return { ok: false as const };
        } catch {
          return { ok: false as const };
        }

        try {
          const created = (await usersService.createUser(userData as any)) as any;
          return { ok: true as const, created };
        } catch (authError: any) {
          return { ok: false as const, error: authError };
        }
      };

      const initialStatus = error?.response?.status ?? error?.status;
      let effectiveError: any = error;

      if (initialStatus === 401 || initialStatus === 403) {
        const fallback = await attemptAuthenticatedCreate();
        if (fallback.ok) {
          const message = fallback.created?.message || fallback.created?.detail || 'Cuenta creada exitosamente. Por favor inicia sesi¢n.';
          setSuccessMessage(message);
          setSuccess(true);
          setTimeout(() => {
            navigate('/login', {
              state: {
                message,
                email: formData.email
              }
            });
          }, 1800);
          return;
        }
        if (fallback.error) {
          effectiveError = fallback.error;
        }
      }

      const data = (effectiveError as any)?.original?.response?.data || effectiveError?.response?.data || effectiveError?.data;
      const status = (effectiveError as any)?.status ?? effectiveError?.response?.status ?? effectiveError?.status;
      const backendMessage = effectiveError?.message || data?.message || data?.detail || data?.error;
      const detailedReason =
        backendMessage ||
        data?.details?.message ||
        (typeof data === 'string' ? data : undefined);

      const details =
        (effectiveError as any)?.details ||
        data?.error?.details ||
        data?.details ||
        undefined;
      const traceId =
        data?.error?.trace_id ||
        data?.error?.traceId ||
        data?.trace_id ||
        data?.traceId ||
        undefined;
      const conflict = details?.conflict;
      const validationErrors =
        (effectiveError as any)?.validationErrors ||
        details?.validation_errors ||
        details?.errors ||
        data?.details?.validation_errors ||
        data?.validation_errors ||
        data?.errors;

      // 403: registro público no disponible
      if (status === 403) {
        setErrors({
          general:
            backendMessage ||
            'El registro público no está disponible: ya existen usuarios. Intenta nuevamente o contacta al administrador.',
        });
      }
      // 401: requiere autenticación admin
      else if (status === 401) {
        setErrors({
          general:
            backendMessage ||
            'Se requiere autenticación de administrador para crear usuarios. Contacta al administrador.',
        });
      }
      // 409: conflicto de unicidad
      else if (status === 409) {
        let msg = detailedReason || 'Conflicto de datos';
        if (conflict && typeof conflict === 'object') {
          if (conflict.field && typeof conflict.field === 'string') {
            const label = labelForField(conflict.field);
            msg = `Ya existe un usuario con ese ${label}. Cambia el ${label}.`;
            const uiField = mapBackendFieldToUI(conflict.field);
            if (uiField) setFieldError(uiField, msg);
          } else if (Array.isArray(conflict.fields) && conflict.fields.length > 0) {
            msg = 'Ya existe un usuario con esa combinación de datos. Modifica uno de esos campos.';
            conflict.fields.forEach((f: string) => {
              const uiField = mapBackendFieldToUI(f);
              if (uiField) setFieldError(uiField, msg);
            });
          }
        }
        if (traceId) {
          try { console.error('[SignUp][409] Trace ID:', traceId); } catch { void 0; }
        }
        showToast(`${msg}${traceId ? ` (Trace ID: ${traceId})` : ''}`, 'error');
        setErrors((prev) => ({ ...prev, general: msg }));
      }
      // 422: validaciones
      else if (status === 422 || validationErrors) {
        mapBackendValidationErrors(validationErrors || details || data);
        setErrors((prev) => ({
          ...prev,
          general: data?.message || detailedReason || 'Errores de validación. Revisa los campos.',
        }));
      }
      // 400: errores específicos de backend
      else if (status === 400) {
        const fieldErrors = data?.errors || data?.error_details || data?.validation_errors || data?.details;
        if (fieldErrors && typeof fieldErrors === 'object') {
          mapBackendValidationErrors(fieldErrors);
        }
        setErrors((prev) => ({
          ...prev,
          general: detailedReason || backendMessage || 'Solicitud inválida. Revisa los datos proporcionados.',
        }));
      }
      // 429: límite de solicitudes
      else if (status === 429) {
        const retryAfter = error?.response?.headers?.['retry-after'] || error?.response?.headers?.['Retry-After'];
        const retryText = retryAfter ? ` Inténtalo nuevamente en ${retryAfter} segundos.` : '';
        setErrors({
          general: `Demasiadas solicitudes. Has alcanzado el límite temporal.${retryText}`,
        });
      }
      // 400 u otros: intentar mapear, luego fallback
      else {
        const fieldErrors = data?.errors || data?.error_details || data?.validation_errors || data?.details;
        if (fieldErrors && typeof fieldErrors === 'object') {
          mapBackendValidationErrors(fieldErrors);
        }
        setErrors((prev) => ({
          ...prev,
          general: detailedReason || 'Ocurrió un error. Intenta de nuevo.',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen overflow-y-auto flex justify-center bg-gradient-to-br from-green-50 to-green-100 px-4 py-8">
        <Card className="w-full max-w-md h-fit my-auto">
          <CardContent className="pt-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Cuenta creada!
              </h2>
              <p className="text-gray-600 mb-4">
                {successMessage || 'Tu cuenta ha sido creada exitosamente. Serás redirigido al inicio de sesión en unos momentos.'}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                Redirigiendo a inicio de sesión...
              </div>
              <div className="mt-4">
                <Link to="/login" className="text-sm text-green-600 hover:text-green-700 font-medium">
                  Ir al inicio de sesión ahora
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto flex justify-center bg-gradient-to-br from-green-50 to-green-100 px-4 py-8">
      <Card className="w-full max-w-md h-fit my-auto">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-center mb-2">
            <div className="bg-green-600 p-2 rounded-full">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Crear cuenta
          </CardTitle>
          <p className="text-center text-gray-600">
            Ingresa tus datos para crear una nueva cuenta
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Tu nombre completo"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 ${getFieldError('name') ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
              {getFieldError('name') && (
                <p className="text-sm text-red-600">{getFieldError('name')}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 ${getFieldError('email') ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              {getFieldError('email') && (
                <p className="text-sm text-red-600">{getFieldError('email')}</p>
              )}
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Tu número de teléfono"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 ${getFieldError('phone') ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoComplete="tel"
                />
              </div>
              {getFieldError('phone') && (
                <p className="text-sm text-red-600">{getFieldError('phone')}</p>
              )}
            </div>

            {/* Dirección (opcional) */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección (opcional)</Label>
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="Calle, ciudad, referencia"
                value={formData.address}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="street-address"
              />
              {getFieldError('address') && (
                <p className="text-sm text-red-600">{getFieldError('address')}</p>
              )}
            </div>

            {/* Número de Identificación */}
            <div className="space-y-1.5">
              <Label htmlFor="identification_number">Número de identificación</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="identification_number"
                  name="identification_number"
                  type="text"
                  placeholder="Tu número de identificación"
                  value={formData.identification_number}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 ${getFieldError('identification_number') ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              {getFieldError('identification_number') && (
                <p className="text-sm text-red-600">{getFieldError('identification_number')}</p>
              )}
            </div>

            {/* Rol */}
            <div className="space-y-1.5">
              <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={loading}
                >
                <option value="Aprendiz">Aprendiz</option>
                <option value="Instructor">Instructor</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 pr-10 ${getFieldError('password') ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {getFieldError('password') && (
                <p className="text-sm text-red-600">{getFieldError('password')}</p>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`pl-10 pr-10 ${getFieldError('confirmPassword') ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {getFieldError('confirmPassword') && (
                <p className="text-sm text-red-600">{getFieldError('confirmPassword')}</p>
              )}
            </div>

            {/* Requisitos de contraseña */}
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-gray-700 mb-2">Requisitos de contraseña</p>
              <ul className="space-y-1.5">
                {passwordChecks.map((rule) => (
                  <li key={rule.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2
                      className={`h-4 w-4 ${rule.valid ? 'text-green-600' : 'text-gray-300'}`}
                      aria-hidden
                    />
                    <span className={rule.valid ? 'text-green-700' : 'text-gray-600'}>
                      {rule.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Error general */}
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Botón de registro */}
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 focus:ring-green-500 focus:ring-offset-green-200 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed gap-2"
              aria-label={loading ? 'Creando cuenta de usuario' : 'Crear cuenta de usuario'}
              title={
                !loading && !isFormValid && hasInteracted && blockingReasons.length
                  ? blockingReasons.join(' | ')
                  : undefined
              }
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crear cuenta
                </>
              )}
            </Button>

            {!loading && !isFormValid && hasInteracted && blockingReasons.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-semibold">Para habilitar "Crear cuenta", revisa:</p>
                <ul className="mt-1 list-disc pl-5 space-y-0.5">
                  {blockingReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpForm;
