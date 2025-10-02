# GenericModal Component

## Descripción

El componente `GenericModal` es un modal reutilizable y optimizado para React, construido sobre el componente `Dialog` de Radix UI. Está diseñado para proporcionar una experiencia consistente y accesible en toda la aplicación, con énfasis en el rendimiento y la responsividad.

## Características Principales

- **Reutilizable**: Componente genérico que puede ser usado en cualquier parte de la aplicación
- **Optimizado para rendimiento**: Animaciones condicionales y efectos opcionales
- **Accesible**: Soporte completo para lectores de pantalla y navegación por teclado
- **Responsivo**: Tamaños adaptativos para diferentes dispositivos
- **Personalizable**: Props extensivas para personalización

## Props

| Prop | Tipo | Requerido | Default | Descripción |
|------|------|-----------|---------|-------------|
| `isOpen` | `boolean` | Sí | - | Controla la visibilidad del modal |
| `onOpenChange` | `(isOpen: boolean) => void` | Sí | - | Callback ejecutado cuando cambia el estado del modal |
| `title` | `string` | Sí | - | Título mostrado en el encabezado del modal |
| `children` | `React.ReactNode` | Sí | - | Contenido del modal |
| `className` | `string` | No | - | Clases CSS adicionales para personalización |
| `size` | `ModalSize` | No | `'lg'` | Tamaño predefinido del modal |
| `enableBackdropBlur` | `boolean` | No | `false` | Habilita efecto de desenfoque en el fondo |
| `description` | `string` | No | - | Descripción accesible para lectores de pantalla |
| `disableAnimations` | `boolean` | No | `false` | Deshabilita animaciones para mejor rendimiento |

### Tipos de Tamaño (`ModalSize`)

- `'sm'`: Pequeño (max-w-sm)
- `'md'`: Mediano (max-w-md)
- `'lg'`: Grande (max-w-lg) - **Predeterminado**
- `'xl'`: Extra grande (max-w-xl)
- `'2xl'`: Doble extra grande (max-w-2xl)
- `'full'`: Pantalla completa

## Optimizaciones Realizadas

### 1. Rendimiento
- **Animaciones condicionales**: Se pueden deshabilitar las animaciones con `disableAnimations` para mejorar el rendimiento en dispositivos lentos
- **Desenfoque de fondo opcional**: El efecto `backdrop-blur` solo se aplica cuando es necesario, reduciendo el uso de recursos
- **Scroll optimizado**: Contenedor con altura máxima y scroll interno para mejor manejo de contenido largo

### 2. Accesibilidad
- **Soporte ARIA**: Descripción opcional con `aria-describedby`
- **Navegación por teclado**: Compatible con navegación estándar de modales
- **Lectores de pantalla**: Etiquetas y descripciones apropiadas

### 3. Responsividad
- **Breakpoints adaptativos**: Tamaños que se ajustan automáticamente a diferentes pantallas
- **Espaciado inteligente**: Padding y márgenes que se adaptan al dispositivo
- **Altura dinámica**: Máxima altura que se ajusta según el viewport

## Ejemplos de Uso

### Ejemplo Básico

```tsx
import { GenericModal } from '@/components/common/GenericModal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Confirmar Acción"
    >
      <p>¿Estás seguro de que quieres continuar?</p>
      <div className="flex gap-2 mt-4">
        <Button onClick={() => setIsOpen(false)}>Cancelar</Button>
        <Button onClick={handleConfirm}>Confirmar</Button>
      </div>
    </GenericModal>
  );
}
```

### Ejemplo con Optimizaciones

```tsx
<GenericModal
  isOpen={isModalOpen}
  onOpenChange={setIsModalOpen}
  title="Crear Nuevo Usuario"
  size="xl"
  enableBackdropBlur={true}
  description="Formulario para crear un nuevo usuario en el sistema"
  disableAnimations={false}
>
  <UserForm />
</GenericModal>
```

### Ejemplo de Implementación Real (EnhancedUserManagement)

```tsx
<GenericModal
  isOpen={isCreateDialogOpen}
  onOpenChange={setIsCreateDialogOpen}
  title="Crear Nuevo Usuario"
  size="lg"
  enableBackdropBlur={true}
  description="Formulario para crear un nuevo usuario con roles y permisos"
>
  <UserCreateForm
    onSuccess={() => {
      setIsCreateDialogOpen(false);
      refetchUsers();
    }}
  />
</GenericModal>
```

## Implementaciones en el Proyecto

El componente `GenericModal` se utiliza extensivamente en las páginas de administración:

- **Usuarios**: Creación, edición y eliminación de usuarios
- **Animales**: Gestión de registros de animales
- **Enfermedades**: Formularios de enfermedades y tratamientos
- **Medicamentos**: Administración de medicamentos y tratamientos
- **Especies y Razas**: Gestión de especies y razas
- **Potreros**: Configuración de Potreros de animales
- **Tipos de Alimento**: Gestión de tipos de alimento
- **Vacunas**: Administración de vacunas y tratamientos
- **Controles**: Registros de control veterinario

## Mejores Prácticas

### 1. Gestión de Estado
```tsx
// ✅ Bueno: Usar estado local para controlar el modal
const [isOpen, setIsOpen] = useState(false);

// ❌ Evitar: No usar estado global innecesariamente
// const isOpen = useSelector(state => state.modal.isOpen);
```

### 2. Tamaños Adecuados
```tsx
// ✅ Elegir tamaño según el contenido
<GenericModal size="sm" ... /> // Para confirmaciones simples
<GenericModal size="xl" ... /> // Para formularios complejos
```

### 3. Optimizaciones de Rendimiento
```tsx
// ✅ Deshabilitar animaciones en listas largas
<GenericModal disableAnimations={items.length > 100} ... />

// ✅ Usar backdrop blur solo cuando mejore la UX
<GenericModal enableBackdropBlur={isPremiumFeature} ... />
```

### 4. Accesibilidad
```tsx
// ✅ Siempre incluir descripción cuando sea necesario
<GenericModal
  description="Formulario de registro de nuevo animal"
  ...
/>
```

## Consideraciones de Mantenimiento

- El componente utiliza clases Tailwind CSS centralizadas en `sizeClasses`
- Las optimizaciones están documentadas en los comentarios del código
- Compatible con futuras actualizaciones de Radix UI
- Soporte para temas oscuros/claros a través de Tailwind

## Historial de Cambios

- **v1.0**: Componente base con funcionalidades esenciales
- **v1.1**: Añadidas optimizaciones de rendimiento
- **v1.2**: Mejorada accesibilidad y responsividad
- **v1.3**: Sistema de tamaños predefinidos
- **v1.4**: Documentación JSDoc completa y README