import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { usersService } from '@/services/userService';
import type { UserResponse } from '@/types/swaggerTypes';

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

// Columnas (width numérico -> w-{n})
const columns: CRUDColumn<UserResponse & { [k: string]: any }>[] = [
  { key: 'id', label: 'ID', width: 12 },
  { key: 'fullname', label: 'Nombre' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Rol' },
  { key: 'status', label: 'Estado', render: (v) => (typeof v === 'boolean' ? (v ? 'Activo' : 'Inactivo') : (v || '-')) },
  { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Secciones del formulario
const formSections: CRUDFormSection<UserFormInput>[] = [
  {
    title: 'Información Básica',
    gridCols: 3,
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
    title: 'Contacto (opcional)',
    gridCols: 2,
    fields: [
      { name: 'phone', label: 'Teléfono', type: 'text', placeholder: 'Ej: +57 300...' },
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

  // Validar teléfono si existe
  if (formData.phone && formData.phone.trim()) {
    const phoneClean = formData.phone.replace(/[\s\-\(\)]/g, '');
    if (phoneClean.length < 7) {
      return '⚠️ El número de teléfono parece incompleto.';
    }
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

// Página principal
const AdminUsersPage = () => (
  <AdminCRUDPage
    config={crudConfig}
    service={usersService}
    initialFormData={initialFormData}
    mapResponseToForm={mapResponseToForm}
    validateForm={validateForm}
    enhancedHover={true}
  />
);

export default AdminUsersPage;
