# Finca Villa Luz Frontend

> Política de despliegue PRIORITARIA: Este proyecto debe ejecutarse SIEMPRE bajo HTTPS (desarrollo y producción). No cambiar a HTTP ni solicitar confirmación para ello. El servidor de desarrollo forzará HTTPS automáticamente y el proxy de API redirigirá cualquier URL de backend a HTTPS.

Frontend de la aplicación de gestión de finca desarrollado con React, TypeScript y Vite.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd fincaFront-main

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.development
# Editar .env.development con tus configuraciones

# Iniciar servidor de desarrollo
npm run dev
```

## ⚙️ Variables de Entorno

### Variables Principales

```bash
# Backend
VITE_API_BASE_URL=https://finca.isladigital.xyz/api/v1
VITE_BACKEND_DOCS_URL=https://finca.isladigital.xyz/api/v1/docs/

# Frontend
VITE_FRONTEND_URL=https://localhost:5175
VITE_DEV_HOST=localhost
VITE_DEV_PORT=5180

# Autenticación
VITE_AUTH_COOKIE_NAME=access_token_cookie
VITE_AUTH_STORAGE_KEY=finca_dev_access_token
VITE_SESSION_TIMEOUT=30

# Desarrollo
VITE_DEBUG_MODE=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_API_TIMEOUT=15000
```

### Variables de Seguridad

```bash
VITE_FORCE_HTTPS=false
VITE_CSP_ENABLED=false
VITE_ENABLE_ERROR_REPORTING=false
```

## 📜 Scripts Disponibles

```bash
# Desarrollo
npm run dev            # Servidor de desarrollo
npm run build          # Build de producción
npm run preview        # Preview del build

# Calidad de código
npm run lint           # Linter
npm run lint:fix       # Fix automático
npm run type-check     # Verificación de tipos

# Utilidades
npm run env:info       # Información del entorno
npm run check:env      # Verificar variables de entorno
npm run test:endpoints # Probar endpoints del backend
npm run verify:optional # Verificar endpoints opcionales (search/stats/bulk)
npm run clean          # Limpiar archivos temporales
```

### Verificación de Endpoints Opcionales (search / stats / bulk)

Se añadió el script `scripts/verify_optional_endpoints.mjs` para detectar qué endpoints opcionales realmente existen en el backend.

Uso:

```bash
# Base URL explícita (si difiere de VITE_API_BASE_URL)
BASE_URL="https://localhost:8081/api/v1" TOKEN="JWT_TOKEN" npm run verify:optional
```

Salida esperada (ejemplo):

```text
Resource                search      stats       bulk       
------------------------------------------------------------
users                   OK          MISSING     MISSING    
species                 OK          OK          OK         
...                     ...         ...         ...        
```

Leyenda:

- OK: Endpoint disponible (2xx)
- MISSING: 404 (no implementado en backend)
- UNAUTHORIZED: Requiere credenciales válidas
- ERROR: Otro estado (500, 422, etc.)

Recursos verificados: users, animals, species, breeds, medications, vaccines, treatments, vaccinations, animal-diseases, animal-fields, treatment-medications, treatment-vaccines, route-administrations, controls, fields, diseases, genetic-improvements, food-types.

Esto permite al frontend conservar funciones placeholder sin fallar si el backend aún no expone la ruta. Antes de usar masivamente un endpoint opcional en UI, confirma su disponibilidad con este script.

## 🧩 Patrón de Servicios Unificado

`BaseService` ahora expone métodos estándar para todos los recursos:

- CRUD: `getAll`, `getPaginated`, `getById`, `create`, `update`, `patch`, `delete`
- Búsqueda: `search(q, filters)` → GET `/<resource>/search`
- Estadísticas opcionales: `getStats()` → GET `/<resource>/stats` (devuelve `{}` si 404)
- Creación masiva opcional: `bulkCreate(items[])` → POST `/<resource>/bulk`
- Custom: `customRequest(subpath, method, data)` para casos especiales

 Ventajas:

- Manejo homogéneo de retries, cache y normalización.
- Tolerancia a endpoints opcionales ausentes sin romper la UI.
- Facilita agregar nuevos recursos con una sola línea: `const myService = new BaseService('mi-endpoint', { enableCache: true });`

### Cómo extender un recurso existente

```ts
import { BaseService } from '@/services/baseService';

class VaccinesService extends BaseService<any> {
  constructor() { super('vaccines', { enableCache: true }); }
  getActive = () => this.search('', { status: 'active' });
}

export const vaccinesService = new VaccinesService();
```

### Uso en un hook

```ts
import { useEffect, useState } from 'react';
import { vaccinesService } from '@/services/vaccinesService';

export function useVaccines() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    vaccinesService.getAll()
      .then(data => { if (mounted) setItems(data); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return { items, loading, reload: () => vaccinesService.clearCache() };
}
```

### Pruebas rápidas de endpoints con curl

Se añadió el script `scripts/curl_tests.sh` para validar los endpoints principales tras levantar el backend.

Uso (Git Bash / WSL / macOS):

```bash
export BASE_URL="http://localhost:8000/api/v1"
export TOKEN="JWT_TOKEN"
bash ./scripts/curl_tests.sh
```

En Windows PowerShell:

```powershell
$env:BASE_URL="http://localhost:8000/api/v1"
$env:TOKEN="JWT_TOKEN"
bash ./scripts/curl_tests.sh
```

El script reporta [OK] o [FAIL] por cada recurso clave (auth, users, animals, breeds, species, medications, vaccines, route-administrations, treatments, vaccinations, relaciones, analytics).

Para extenderlo, agrega nuevas llamadas usando la función `check` del script.

## 👤 Migración de `userService` al Patrón BaseService

El antiguo `userService` basado en funciones ad-hoc fue migrado a una clase `UsersService` que extiende `BaseService` para unificar el comportamiento con el resto de recursos.

Conservamos todas las funciones exportadas previamente para evitar refactors masivos en componentes existentes:

```ts
// Compatibilidad mantenida
getUsers(params?) -> { users, pagination, status, message }
getUser(id)
createUser(data)
updateUser(id, data)
deleteUser(id)
searchUsers(q, params?)
getUserStats()              // opcional
createUsersBulk(items[])    // opcional
getUserRoles(), getUserRolesWithRetry()
getUserStatus(), getUserStatusWithRetry()
```

Nuevos métodos internos adicionales disponibles vía la instancia:

```ts
import { usersService } from '@/services/userService';
await usersService.getRoles();
await usersService.getStatusList();
```

## 🧪 Pruebas de Endpoints Opcionales

Se añadieron pruebas unitarias para garantizar el comportamiento tolerante de los endpoints opcionales (`stats`, `bulk`, `search`). Archivo: `src/services/__tests__/baseServiceOptionalEndpoints.test.ts`.

Casos cubiertos:

- `getStats` devuelve `{}` ante 404 (endpoint ausente)
- `getStats` devuelve los datos cuando existen
- `bulkCreate` procesa respuesta exitosa e invalida caché
- `bulkCreate` re-lanza error 404 registrando un warning
- `search` retorna array normalizado

Ejecutar solo estas pruebas:

```bash
npm test -- baseServiceOptionalEndpoints.test.ts
```

Estas pruebas aseguran que la UI pueda invocar endpoints opcionales sin romperse cuando el backend aún no los implemente.

## 🔄 Hook Genérico `useResource`

Se añadió `useResource` (`src/hooks/useResource.ts`) para consumir cualquier instancia de `BaseService<T>` con una API mínima y consistente.

Ejemplo:

```ts
import { speciesService } from '@/services/speciesService';
import { useResource } from '@/hooks/useResource';

export function useSpecies() {
  return useResource<any>(speciesService, { autoFetch: true });
}
```

Retorna: `{ data, loading, error, refetch, createItem, updateItem, deleteItem, setData }`.

Ventajas:

- Sustituye hooks duplicados específicos.
- Soporta cancelación y transformación opcional (`map`).
- Facilita mantener UI sincronizada tras operaciones CRUD.

## ♻️ Matriz de Deprecación de Wrappers de Servicios

Se están eliminando gradualmente los wrappers de funciones sueltas (`getX`, `createX`, etc.) en favor de usar directamente las instancias de servicio (`xxxService`). Esto reduce superficie de mantenimiento y duplicación.

| Recurso | Instancia | Wrappers Marcados `@deprecated` | Reemplazo Directo |
|---------|----------|----------------------------------|-------------------|
| species | `speciesService` | getSpecies, createSpecies, updateSpecies, deleteSpecies, getSpeciesById, searchSpecies, getSpeciesStats, createSpeciesBulk | `speciesService.*` |
| breeds | `breedsService` | getBreeds, createBreed, updateBreed, deleteBreed, getBreedById, searchBreeds, getBreedStats, createBreedsBulk | `breedsService.*` |
| medications | `medicationsService` | getMedications,... | `medicationsService.*` |
| vaccines | `vaccinesService` | getVaccines,... | `vaccinesService.*` |
| treatments | `treatmentsService` | getTreatments,... | `treatmentsService.*` |
| vaccinations | `vaccinationsService` | getVaccinations,... | `vaccinationsService.*` |
| animal-diseases | `animalDiseasesService` | getAnimalDiseases,... | `animalDiseasesService.*` |
| animal-fields | `animalFieldsService` | getAnimalFields,... | `animalFieldsService.*` |
| treatment-medications | `treatmentMedicationsService` | getTreatmentMedications,... | `treatmentMedicationsService.*` |
| treatment-vaccines | `treatmentVaccinesService` | getTreatmentVaccines,... | `treatmentVaccinesService.*` |
| route-administrations | `routeAdministrationsService` | listRouteAdministrations,... | `routeAdministrationsService.*` |
| controls | `controlsService` | getControls,... | `controlsService.*` |
| fields | `fieldsService` | getFields,... | `fieldsService.*` |
| diseases | `diseasesService` | getDiseases,... | `diseasesService.*` |
| genetic-improvements | `geneticImprovementsService` | getGeneticImprovements,... | `geneticImprovementsService.*` |
| food-types | `foodTypesService` | getFoodTypes,... | `foodTypesService.*` |
| users | `usersService` | (Compat heredado aún sin marcar) | (Próxima fase) |

Leyenda `...` indica el resto del paquete CRUD + search/stats/bulk.

### Plan de Remoción

1. Fase Actual: Todos marcados con `@deprecated` (excepto userService por compatibilidad ampliada).
2. Próxima Release Minor: Actualizar imports en componentes para usar directamente la instancia.
3. Release Mayor: Eliminar los wrappers y actualizar documentación.

Si necesitas el wrapper y recibes advertencia de deprecación, migra cuanto antes a la forma `xxxService.metodo()`.



Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
