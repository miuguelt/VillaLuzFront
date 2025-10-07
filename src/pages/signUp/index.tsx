import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, User, Mail, Lock, UserPlus, Phone } from 'lucide-react';
import { usersService } from '@/services/userService';

interface SignUpFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  identification_number: string;
  role: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  identification_number?: string;
  general?: string;
}

const SignUpForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignUpFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    identification_number: '',
    role: 'Aprendiz' // default role
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Ingrese un correo electrónico válido';
    }

    // Validate phone
    const phoneVal = formData.phone.trim();
    const phoneRegex = /^[+]?[0-9\s-]{7,15}$/;
    if (!phoneVal) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!phoneRegex.test(phoneVal)) {
      newErrors.phone = 'Ingrese un teléfono válido (7-15 dígitos)';
    }

    // Validate identification number
    if (!formData.identification_number.trim()) {
      newErrors.identification_number = 'El número de identificación es obligatorio';
    } else if (formData.identification_number.trim().length < 5) {
      newErrors.identification_number = 'El número de identificación debe tener al menos 5 caracteres';
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 4) {
      newErrors.password = 'La contraseña debe tener al menos 4 caracteres';
    }

    // Validate password confirmation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'La confirmación de contraseña es obligatoria';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Prepare data for backend
      const userData = {
        fullname: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        identification: formData.identification_number.trim(),
        role: formData.role as "Administrador" | "Instructor" | "Aprendiz",
        status: true,
      };

      // Create user using service
      await usersService.createPublicUser(userData);
      
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Cuenta creada exitosamente. Por favor inicia sesión.',
            email: formData.email 
          } 
        });
      }, 2000);
      
    } catch (error: any) {
      console.error('Error registering user:', error);
      
      // Handle specific backend errors
      if (error.response?.status === 403) {
        setErrors({ 
          general: 'El registro público no está disponible: ya existen usuarios. Intenta nuevamente o contacta al administrador.' 
        });
      } else if (error.response?.status === 401) {
        setErrors({ 
          general: 'Se requiere autenticación de administrador para crear usuarios. Contacta al administrador.' 
        });
      } else if (error.response?.status === 409) {
        setErrors({ 
          general: 'A user with this email or identification number already exists' 
        });
      } else {
        // Extraer mensaje detallado del backend si está disponible
        const data = error?.response?.data;
        let detailed: any = data?.message || data?.detail || data?.error || data?.title;

        // 422: Normalizar estructura de validación si viene en data.details o data.errors
        const fieldErrors = data?.errors || data?.error_details || data?.validation_errors || data?.details;
        const newFieldErrors: FormErrors = {};
        if (fieldErrors) {
          try {
            if (typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
              const map: Record<string, keyof FormErrors> = {
                fullname: 'name',
                name: 'name',
                email: 'email',
                phone: 'phone',
                identification: 'identification_number',
                identification_number: 'identification_number',
                password: 'password',
                confirmPassword: 'confirmPassword',
              };
              Object.entries(fieldErrors as Record<string, any>).forEach(([key, val]) => {
                const uiKey = map[key] || undefined;
                const messages = Array.isArray(val) ? val : [val];
                const msg = messages
                  .map((e: any) => (typeof e === 'string' ? e : e?.message || e?.detail || e))
                  .filter(Boolean)
                  .join(' • ');
                if (uiKey && msg) {
                  newFieldErrors[uiKey] = msg;
                }
              });
              // Construir mensaje general si quedaron errores no mapeados
              const unknowns = Object.entries(fieldErrors as Record<string, any>)
                .filter(([k]) => !map[k])
                .map(([, v]) => (Array.isArray(v) ? v : [v]))
                .flat()
                .map((e: any) => (typeof e === 'string' ? e : e?.message || e?.detail || e))
                .filter(Boolean)
                .join(' • ');
              if (!detailed && unknowns) detailed = unknowns;
            } else if (Array.isArray(fieldErrors)) {
              detailed = fieldErrors
                .map((e: any) => (typeof e === 'string' ? e : e?.message || e?.detail || e))
                .filter(Boolean)
                .join(' • ');
            }
          } catch {}
        }

        // Asegurar que el mensaje sea un string renderizable
        if (!detailed && error?.message) detailed = error.message;
        if (detailed && typeof detailed !== 'string') {
          try {
            const candidates = [detailed.message, detailed.detail, detailed.error, detailed.title].filter(
              (v) => typeof v === 'string' && v.trim()
            );
            detailed = candidates[0] || JSON.stringify(detailed);
          } catch {
            detailed = 'Se produjo un error al procesar la respuesta del servidor.';
          }
        }

        setErrors({
          ...newFieldErrors,
          general: detailed || 'Error al crear la cuenta. Por favor, inténtalo de nuevo.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="h-[100dvh] overflow-y-auto flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Cuenta creada!
              </h2>
              <p className="text-gray-600 mb-4">
                Tu cuenta ha sido creada exitosamente. Serás redirigido al inicio de sesión en unos momentos.
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-y-auto flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
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
                  className={`pl-10 ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

          {/* Email */}
          <div className="space-y-2">
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
                className={`pl-10 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
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
                className={`pl-10 ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
                autoComplete="tel"
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

            {/* Número de Identificación */}
            <div className="space-y-2">
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
                  className={`pl-10 ${errors.identification_number ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              {errors.identification_number && (
                <p className="text-sm text-red-600">{errors.identification_number}</p>
              )}
            </div>

            {/* Rol */}
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={loading}
              >
                <option value="Aprendiz">Aprendiz</option>
                <option value="Instructor">Instructor</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
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
                  className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
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
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-2">
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
                  className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
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
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
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
              disabled={loading}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 focus:ring-green-500 focus:ring-offset-green-200 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={loading ? 'Creando cuenta de usuario' : 'Crear cuenta de usuario'}
            >
              {loading ? (
                <>
                  <UserPlus className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crear cuenta
                </>
              )}
            </Button>
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
