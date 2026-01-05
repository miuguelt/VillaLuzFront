import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useAuth } from "@/features/auth/model/useAuth";
import { useState, useEffect, useRef } from "react";
import { loginUser, normalizeRole } from '@/features/auth/api/auth.service';
import { FaUser, FaLock, FaCheckCircle } from "react-icons/fa";
import { LogIn } from 'lucide-react';
import { Link, useLocation } from "react-router-dom";
import { ClimbingBoxLoader } from "react-spinners";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";

const LoginForm = () => {
  const [identification, setIdentification] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ identification?: string; password?: string; general?: string }>({});
  const { login } = useAuth();
  const location = useLocation();
  const successTimerRef = useRef<number | null>(null);

  // Helper: ensure any error value becomes a safe, readable string
  const toErrorText = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      const m = obj?.message ?? obj?.error ?? obj?.detail ?? obj?.details;
      if (typeof m === "string") return m;
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  // Check for success message in location state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message after 10 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Cleanup any pending success message timers on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, []);

  const validateForm = () => {
    const newErrors: { identification?: string; password?: string } = {};

    if (!identification.trim()) {
      newErrors.identification = 'El número de documento es obligatorio';
    } else if (!/^\d{4,15}$/.test(identification)) {
      newErrors.identification = 'El documento debe contener entre 4 y 15 dígitos numéricos';
    }

    if (!password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 4) {
      newErrors.password = 'La contraseña debe tener al menos 4 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const AUTH_REQUEST_TIMEOUT_MS = 20000;

  const backendUnavailableMessage = (serverMsg?: string) => {
    const suffix = 'Verifica que el backend esté activo y que el proxy del frontend apunte al servidor correcto.';
    if (serverMsg && serverMsg.trim()) return `Servidor no disponible (503). ${serverMsg}. ${suffix}`;
    return `Servidor no disponible (503). ${suffix}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      console.log('🔐 Starting login with credentials:', { identification, password: '***' });

      // Usar el servicio de autenticación estándar con timeout optimizado
      const loginData = {
        identification: identification, // enviar como cadena
        password: password
      };

      // Ejecutar login con timeout más corto para mejor UX
      const loginPromise = loginUser(loginData);
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Timeout de conexión')), AUTH_REQUEST_TIMEOUT_MS);
      });

      const response = await Promise.race([loginPromise, timeoutPromise]) as any;
      if (timeoutId) clearTimeout(timeoutId);

      console.log('✅ Login successful:', response);

      // Extraer datos del usuario y token de forma optimizada
      const _res: any = response;
      const userData = _res.user || _res.data?.user || _res.data?.data?.user;
      const token = _res.access_token || _res.data?.access_token || _res.data?.data?.access_token;
      let isCookieOnlySession = false;

      // Solo intentar validar vía cookie si no hay token y hay datos de usuario básicos
      if (!token && userData) {
        // Evitar spam de /auth/me: no llamar aquí, dejemos que el AuthProvider revalide en background
        isCookieOnlySession = true;
      }

      if (token || userData) {
        // Si el backend no devolvió el objeto user, no disparamos /auth/me de inmediato.
        // Autenticamos con los datos disponibles y dejamos la revalidación al AuthProvider.
        if (!userData) {
          // Mantener UX consistente: no bloquear por falta de perfil, AuthProvider lo actualizará.
        }

        if (userData) {
          // Crear objeto User completo con valores por defecto para Potreros faltantes
          const completeUserData = {
            ...userData,
            identification: typeof userData.identification === 'string' ? parseInt(userData.identification) : userData.identification,
            password: '', // No almacenar password en el frontend
            phone: (userData as any).phone || '',
            address: (userData as any).address || '',
            role: (userData as any).role as 'Administrador' | 'Instructor' | 'Aprendiz',
            status: userData.status ? 1 : 0 // Convertir boolean a number
          };

          // Normalize role if backend provides variants
          try {
            const canon = normalizeRole((completeUserData as any).role) || (completeUserData as any).role;
            (completeUserData as any).role = canon as any;
          } catch (e) {
            // ignore
          }

          // Determinar rol canónico antes de llamar a login() para evitar navegación intermedia
          const finalUserData = completeUserData as any;
          const canonBefore = normalizeRole((finalUserData as any).role);
          // No volver a llamar /auth/me aquí para normalizar rol, reducimos llamadas

          if (!canonBefore) {
            // No llamar a login si no tenemos un rol válido; mostrar mensaje y permanecer en login
            setErrors({ general: 'Tu cuenta no tiene un rol asignado o reconocido. Contacta al administrador.' });
            return;
          }

          login(finalUserData, token);
          const sessionVia = isCookieOnlySession || !token ? 'cookie-only' : 'token/cookie';
          console.log(`✅ Session established successfully (via ${sessionVia})`);
          setSuccessMessage(isCookieOnlySession || !token ? 'Inicio de sesión exitoso. Sesión validada mediante cookie segura.' : 'Inicio de sesión exitoso.');
          // Manage auto-clear timer safely
          if (successTimerRef.current) {
            clearTimeout(successTimerRef.current);
            successTimerRef.current = null;
          }
          successTimerRef.current = window.setTimeout(() => {
            setSuccessMessage(null);
          }, 10000);

          // Ya no re-invocamos /auth/me después; AuthProvider se encargará en background.
        } else {
          console.error('❌ Incomplete data in response (no user):', response);
          setErrors({ general: 'Error: No se pudo obtener el perfil del usuario después de iniciar sesión.' });
        }
      } else {
        console.error('❌ Token not returned in response and session could not be confirmed via /auth/me:', response);
        setErrors({ general: 'No se pudo establecer la sesión. El servidor no devolvió token y no se confirmó la cookie. Inténtalo nuevamente o contacta soporte.' });
      }

    } catch (error: any) {
      console.error('❌ Login error:', error);

      const extractServerMessage = (data: any): string | undefined => {
        if (!data) return undefined;
        if (typeof data === 'string') return data;
        if (Array.isArray(data?.errors)) {
          try {
            return data.errors.map((e: any) => (typeof e === 'string' ? e : (e?.message || JSON.stringify(e)))).join(', ');
          } catch {
            return undefined;
          }
        }
        return data?.message || data?.error || undefined;
      };

      // Soportar errores normalizados de authService (AuthError: { message, status, details })
      if (error && typeof error === 'object' && typeof error.status === 'number') {
        const status = error.status as number;
        const serverMsg = extractServerMessage(error.details) || error.message;

        if (status === 401) {
          setErrors({ general: serverMsg || 'Credenciales incorrectas. Verifique su documento y contraseña.' });
        } else if (status === 503) {
          setErrors({ general: backendUnavailableMessage(serverMsg) });
        } else if (status === 400 || status === 422) {
          setErrors({ general: serverMsg || 'Datos de inicio de sesión inválidos.' });
        } else if (status === 404) {
          setErrors({ general: serverMsg || 'Usuario no encontrado.' });
        } else if (status === 0) {
          setErrors({ general: 'Error de conexión. Verifique su conexión a Internet y que el servidor esté en ejecución.' });
        } else if (status >= 500) {
          setErrors({ general: serverMsg || 'Error del servidor. Por favor, inténtelo más tarde.' });
        } else {
          setErrors({ general: serverMsg || `Error (${status}).` });
        }
      } else if (error?.response) {
        // AxiosError con respuesta del servidor
        const status = error.response.status as number;
        const data = error.response.data;
        const serverMsg = extractServerMessage(data);

        if (status === 401) {
          setErrors({ general: serverMsg || 'Credenciales incorrectas. Verifique su documento y contraseña.' });
        } else if (status === 400 || status === 422) {
          setErrors({ general: serverMsg || 'Datos de inicio de sesión inválidos.' });
        } else if (status === 404) {
          setErrors({ general: serverMsg || 'Usuario no encontrado.' });
        } else if (status === 0) {
          setErrors({ general: 'Error de conexión. Verifique su conexión a Internet y que el servidor esté en ejecución.' });
        } else if (status >= 500) {
          setErrors({ general: serverMsg || 'Error del servidor. Por favor, inténtelo más tarde.' });
        } else {
          setErrors({ general: serverMsg || `Error del servidor (${status}): ${data?.message || 'Error desconocido'}` });
        }
      } else if (error?.request) {
        // Error de red / CORS / backend caído
        setErrors({ general: 'Error de conexión. Verifique su conexión a Internet y que el servidor esté en ejecución.' });
      } else {
        // Error de configuración u otro
        setErrors({ general: error?.message || 'Ocurrió un error inesperado.' });
      }
    } finally {
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  return (
    <div className="flex items-center justify-center h-[100dvh] overflow-y-auto bg-gradient-to-br from-green-50 to-green-100 p-4">
      {successMessage && (
        <div className="fixed top-4 right-4 max-w-md z-50 animate-fade-in">
          <Alert className="bg-green-50 border-green-200">
            <FaCheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800 font-medium">¡Éxito!</AlertTitle>
            <AlertDescription className="text-green-700">
              {successMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}
      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <ClimbingBoxLoader color="#10B981" loading={loading} size={15} />
        </div>
      ) : (
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl">
          <h2 className="text-3xl font-bold text-center text-green-700">
            Iniciar sesión
          </h2>

          {/* Estado del Backend removido - ya no es necesario */}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="documento" className="text-green-700">
                Número de identificación
              </Label>
              <div className="relative">
                <span className="absolute text-gray-600 inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser />
                </span>
                <Input
                  id="documento"
                  name="username"
                  autoComplete="username"
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="Ingresa tu número de identificación"
                  value={identification}
                  onChange={(e) => {
                    setIdentification(e.target.value);
                    setErrors((prev) => ({ ...prev, identification: undefined }));
                  }}
                  onKeyPress={(e) => {
                    if (!/\d/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className={`w-full px-10 py-2 border ${errors.identification ? 'border-red-400 focus:ring-red-400' : 'border-green-300 focus:ring-green-500'} rounded-md focus:outline-none focus:ring-1`}
                  aria-invalid={!!errors.identification}
                  aria-describedby={errors.identification ? 'documento-error' : undefined}
                />
              </div>
              {errors.identification && (
                <p id="documento-error" className="mt-1 text-sm text-red-600">
                  {errors.identification}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-green-700">
                Contraseña
              </Label>
              <div className="relative">
                <span className="absolute text-gray-600 inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock />
                </span>
                <Input
                  id="password"
                  name="current-password"
                  autoComplete="current-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`w-full px-10 py-2 border ${errors.password ? 'border-red-400 focus:ring-red-400' : 'border-green-300 focus:ring-green-500'} rounded-md focus:outline-none focus:ring-1`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600">
                  {errors.password}
                </p>
              )}
              <div className="flex justify-end pt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 focus:ring-green-500 focus:ring-offset-green-200 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={loading ? 'Iniciando sesión' : 'Iniciar sesión'}
            >
              {loading ? (
                <>
                  <LogIn className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </>
              )}
            </Button>
          </form>
          {errors.general && (
            <div className="p-3 mb-4 text-sm font-medium text-red-700 bg-red-100 rounded-md">
              {toErrorText(errors.general)}
            </div>
          )}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link to="/signUp" className="text-green-600 hover:text-green-700 font-medium">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
