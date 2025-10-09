import React, { useState } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { usersService } from '@/services/userService';
import type { UserResponse } from '@/types/swaggerTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, History, User as UserIcon, Grid, Table, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Defino un input de formulario flexible para evitar forzar password en edición
type UserFormInput = {
  identification: number | string;
  fullname: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'Administrador' | 'Instructor' | 'Aprendiz';
  password?: string;
  status?: boolean;
  is_active?: boolean;
};

// Columnas completas aprovechando todo el ancho de pantalla
const columns: CRUDColumn<UserResponse & { [k: string]: any }>[] = [
  { key: 'id', label: 'ID', width: 16 },
  { key: 'identification', label: 'Identificación', width: 28 },
  { key: 'fullname', label: 'Nombre Completo' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono', render: (v) => v || '-', width: 28 },
  { key: 'address', label: 'Dirección', render: (v) => v || '-' },
  { key: 'role', label: 'Rol', width: 28 },
  { key: 'status', label: 'Estado', width: 24, render: (v) => (typeof v === 'boolean' ? (v ? 'Activo' : 'Inactivo') : (v === 1 ? 'Activo' : 'Inactivo')) },
  { key: 'created_at', label: 'Creado', width: 28, render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  { key: 'updated_at', label: 'Actualizado', width: 28, render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Secciones del formulario
const formSections: CRUDFormSection<UserFormInput>[] = [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'identification', label: 'Identificación', type: 'text', required: true, placeholder: 'Ej: 123456789' },
      { name: 'fullname', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej: Juan Pérez' },
      { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'usuario@dominio.com' },
      { name: 'role', label: 'Rol', type: 'select', required: true, options: [
        { value: 'Administrador', label: 'Administrador' },
        { value: 'Instructor', label: 'Instructor' },
        { value: 'Aprendiz', label: 'Aprendiz' },
      ] },
      { name: 'password', label: 'Contraseña', type: 'text', placeholder: 'Requerida al crear' },
      { name: 'status', label: 'Activo', type: 'checkbox' },
    ],
  },
  {
    title: 'Información de Contacto',
    gridCols: 2,
    fields: [
      { name: 'phone', label: 'Teléfono', type: 'text', required: true, placeholder: 'Ej: +57 300...' },
      { name: 'address', label: 'Dirección', type: 'text', placeholder: 'Dirección del usuario' },
    ],
  },
];

// Configuración CRUD
const crudConfig: CRUDConfig<UserResponse & { [k: string]: any }, UserFormInput> = {
  title: 'Usuarios',
  entityName: 'Usuario',
  columns,
  formSections,
  searchPlaceholder: 'Buscar usuarios...',
  emptyStateMessage: 'No hay usuarios',
  emptyStateDescription: 'Crea el primero para comenzar',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
};

// Mapear respuesta a formulario
const mapResponseToForm = (item: UserResponse & { [k: string]: any }): UserFormInput => ({
  identification: item.identification,
  fullname: item.fullname || '',
  first_name: item.first_name || '',
  last_name: item.last_name || '',
  email: item.email || '',
  phone: item.phone || '',
  address: item.address || '',
  role: item.role,
  status: typeof item.status === 'boolean' ? item.status : item.is_active,
  is_active: item.is_active,
});

// Validación mejorada con advertencias y recomendaciones
const validateForm = (formData: UserFormInput): string | null => {
  // Validar identificación
  if (!String(formData.identification || '').trim()) {
    return '⚠️ La identificación es obligatoria. Ejemplo: 123456789';
  }

  const idStr = String(formData.identification).trim();
  if (!/^\d{4,15}$/.test(idStr)) {
    return '⚠️ La identificación debe contener entre 4 y 15 dígitos numéricos.';
  }

  // Validar nombre completo
  if (!formData.fullname || !formData.fullname.trim()) {
    return '⚠️ El nombre completo es obligatorio.';
  }

  if (formData.fullname.trim().length < 3) {
    return '⚠️ El nombre completo debe tener al menos 3 caracteres.';
  }

  // Validar email
  if (!formData.email || !formData.email.trim()) {
    return '⚠️ El email es obligatorio para notificaciones del sistema.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    return '⚠️ Ingrese un email válido. Ejemplo: usuario@dominio.com';
  }

  // Validar rol
  if (!formData.role) {
    return '⚠️ Debe seleccionar un rol:\n• Administrador: acceso total\n• Instructor: gestión de registros\n• Aprendiz: solo consulta';
  }

  // Validar contraseña (solo para creación)
  // Nota: En edición, el campo password puede estar vacío
  if (formData.password !== undefined && formData.password !== '') {
    if (formData.password.length < 4) {
      return '⚠️ La contraseña debe tener al menos 4 caracteres por seguridad.';
    }

    if (formData.password.length > 100) {
      return '⚠️ La contraseña es demasiado larga (máximo 100 caracteres).';
    }

    // Recomendación de seguridad
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    const strengthCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;

    if (strengthCount < 2) {
      return '💡 Recomendación: Use una contraseña más segura que incluya mayúsculas, minúsculas, números y símbolos.';
    }
  }

  // Validar teléfono (OBLIGATORIO)
  if (!formData.phone || !formData.phone.trim()) {
    return '⚠️ El teléfono es obligatorio para contactar al usuario.';
  }

  const phoneClean = formData.phone.replace(/[\s\-\(\)]/g, '');
  if (phoneClean.length < 7) {
    return '⚠️ El número de teléfono parece incompleto. Debe tener al menos 7 dígitos.';
  }

  return null;
};

// Datos iniciales
const initialFormData: UserFormInput = {
  identification: '',
  fullname: '',
  email: '',
  role: 'Aprendiz',
  password: '',
  status: true,
  phone: '',
  address: '',
};

// Componente de tarjeta para usuario
const UserCard = ({ user }: { user: UserResponse & { [k: string]: any } }) => {
  const navigate = useNavigate();
  
  const handleViewHistory = () => {
    navigate(`/dashboard/admin/user-history/${user.identification}`);
  };
  
  const handleViewInfo = () => {
    navigate(`/dashboard/admin/user-detail/${user.id}`);
  };

  const isActive = typeof user.status === 'boolean' ? user.status : user.status === '1';
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between min-w-0 gap-2">
          <CardTitle className="text-lg font-semibold truncate">{user.fullname}</CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground min-w-0">
          <UserIcon className="w-4 h-4" />
          <span className="whitespace-nowrap">ID: {user.identification}</span>
          <span className="hidden sm:inline">•</span>
          <span className="break-words">{user.role}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 min-w-0">
        <div className="space-y-2 text-sm min-w-0">
          <div>
            <span className="font-medium">Email:</span>
            <p className="text-muted-foreground truncate">{user.email}</p>
          </div>
          {user.phone && (
            <div>
              <span className="font-medium">Teléfono:</span>
              <p className="text-muted-foreground truncate">{user.phone}</p>
            </div>
          )}
          {user.address && (
            <div>
              <span className="font-medium">Dirección:</span>
              <p className="text-muted-foreground truncate">{user.address}</p>
            </div>
          )}
          <div className="flex flex-wrap justify-between gap-x-2 text-xs text-muted-foreground pt-2 border-t">
            <span>Creado: {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '-'}</span>
            <span>Actualizado: {user.updated_at ? new Date(user.updated_at).toLocaleDateString('es-ES') : '-'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewHistory}
            className="flex-1"
          >
            <History className="w-4 h-4 mr-1" />
            Historial
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewInfo}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            Info
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Página principal con estado para toggle de vista
const AdminUsersPageWrapper = () => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const navigate = useNavigate();

  // Acciones personalizadas para la tabla usando menú desplegable
  const customActions = (item: UserResponse & { [k: string]: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/dashboard/admin/user-detail/${item.id}`);
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          Ver información
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/dashboard/admin/user-history/${item.identification}`);
          }}
        >
          <History className="w-4 h-4 mr-2" />
          Ver historial
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Toolbar personalizado con toggle de vista
  const customToolbar = (
    <div className="flex items-center gap-2">
      <Button
        variant={viewMode === 'table' ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setViewMode('table')}
      >
        <Table className="w-4 h-4 mr-1" />
        Tabla
      </Button>
      <Button
        variant={viewMode === 'cards' ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setViewMode('cards')}
      >
        <Grid className="w-4 h-4 mr-1" />
        Tarjetas
      </Button>
    </div>
  );

  return (
    <AdminCRUDPage
      config={{
        ...crudConfig,
        customActions,
        customToolbar,
        viewMode,
        renderCard: (item) => <UserCard user={item} />,
      }}
      service={usersService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      realtime={true}
      pollIntervalMs={8000}
      refetchOnFocus={true}
      refetchOnReconnect={true}
      enhancedHover={true}
    />
  );
};

// Página principal exportada
const AdminUsersPage = () => <AdminUsersPageWrapper />;

export default AdminUsersPage;
