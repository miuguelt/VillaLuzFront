import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
const AdminDiseasesPage = lazy(() => import('@/pages/dashboard/admin/diseases/index.tsx'));
const AdminMedicationsPage = lazy(() => import('@/pages/dashboard/admin/medications/index.tsx'));

const AdminGeneticImprovementsPage = lazy(() => import('@/pages/dashboard/admin/genetic_improvements/index.tsx'));
const AdminRouteAdministrationPage = lazy(() => import('@/pages/dashboard/admin/route_administration/index.tsx'));
const AdminUserPage = lazy(() => import('@/pages/dashboard/admin/user/index.tsx'));
const AdminVaccinationsPage = lazy(() => import('@/pages/dashboard/admin/vaccinations/index.tsx'));
const AdminVaccinesPage = lazy(() => import('@/pages/dashboard/admin/vaccines/index.tsx'));

// Import pages using lazy loading for better performance
const LandingPage = lazy(() => import('@/pages/landing/index'));
const LoginPage = lazy(() => import('@/pages/login/index.tsx'));
const SignUpPage = lazy(() => import('@/pages/signUp/index.tsx'));
const DashboardLayout = lazy(() => import('@/components/dashboard/layout/DashboardLayout.tsx'));
const AdminFoodTypesPage = lazy(() => import('@/pages/dashboard/admin/food_types/index.tsx'));
const FoodTypesCreatePage = lazy(() => import('@/pages/food-types/create.tsx'));
const FoodTypesEditPage = lazy(() => import('@/pages/food-types/edit.tsx'));
const AdminDashboard = lazy(() => import('@/pages/dashboard/admin/AdminDashboard.tsx'));
const AdminUsersPage = lazy(() => import('@/pages/dashboard/admin/users/index.tsx'));
const UnauthorizedPage = lazy(() => import('@/pages/unauthorized/index.tsx'));
const ApprenticeDashboard = lazy(() => import('@/pages/dashboard/apprentice/ApprenticeDashboard.tsx'));
const InstructorDashboard = lazy(() => import('@/pages/dashboard/instructor/InstructorDashboard.tsx'));
const NotFoundPage = lazy(() => import('@/pages/notFound/index.tsx'));
const RoleDashboardRedirect = lazy(() => import('@/pages/dashboard/RoleDashboardRedirect'));

const AdminFieldsPage = lazy(() => import('@/pages/dashboard/admin/fields/index.tsx'));
const AdminTreatmentMedicationsPage = lazy(() => import('@/pages/dashboard/admin/treatment_medications/index.tsx'));
const AdminTreatmentMedicationsFormPage = lazy(() => import('@/pages/dashboard/admin/treatment_medications/form.tsx'));
const AdminTreatmentMedicationsDetailPage = lazy(() => import('@/pages/dashboard/admin/treatment_medications/detail.tsx'));
const AdminTreatmentVaccinesPage = lazy(() => import('@/pages/dashboard/admin/treatment_vaccines/index.tsx'));
const AdminTreatmentVaccinesFormPage = lazy(() => import('@/pages/dashboard/admin/treatment_vaccines/form.tsx'));
const AdminTreatmentVaccinesDetailPage = lazy(() => import('@/pages/dashboard/admin/treatment_vaccines/detail.tsx'));
const AdminAnimalDiseasesPage = lazy(() => import('@/pages/dashboard/admin/animalDiseases/index.tsx'));
const AdminAnimalFieldsPage = lazy(() => import('@/pages/dashboard/admin/animalFields/index.tsx'));
const AdminBaseModelPage = lazy(() => import('@/pages/dashboard/admin/base_model/index.tsx'));
const AdminControlPage = lazy(() => import('@/pages/dashboard/admin/control/index.tsx'));
const AdminSpeciesPage = lazy(() => import('@/pages/dashboard/admin/species/index.tsx'));
const AdminBreedsPage = lazy(() => import('@/pages/dashboard/admin/breeds/index.tsx'));
const AdminTreatmentsPage = lazy(() => import('@/pages/dashboard/admin/treatments/index.tsx'));
const AdminTreatmentFormPage = lazy(() => import('@/pages/dashboard/admin/treatments/form.tsx'));
const AdminTreatmentDetailPage = lazy(() => import('@/pages/dashboard/admin/treatments/detail.tsx'));
// NUEVO: AdminAnimalsPage para reutilizar en apprentice/instructor y admin
const AdminAnimalsPage = lazy(() => import('@/pages/dashboard/admin/animals/index.tsx'));

// Analytics Pages
const DashboardExecutive = lazy(() => import('@/pages/analytics/DashboardExecutive'));
const FieldsPage = lazy(() => import('@/pages/analytics/FieldsPage'));
const CustomReports = lazy(() => import('@/pages/analytics/CustomReports'));

// NUEVO: compuerta global de auth
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/common/LoadingScreen';

// NUEVO: Helper para generar rutas comunes por rol (Aprendiz/Instructor)
const renderRoleRoutes = (prefix: string) => (
  <>
    {/* Analytics Routes */}
    <Route path={`${prefix}/analytics/executive`} element={<DashboardExecutive />} />
    <Route path={`${prefix}/analytics/fields`} element={<FieldsPage />} />
    <Route path={`${prefix}/analytics/reports`} element={<CustomReports />} />

    {/* Animales */}
    <Route path={`${prefix}/animals`} element={<AdminAnimalsPage />} />

    {/* Campos */}
    <Route path={`${prefix}/fields`} element={<AdminFieldsPage />} />

    {/* Vacunas y vacunaciones */}
    <Route path={`${prefix}/vaccines`} element={<AdminVaccinesPage />} />
    <Route path={`${prefix}/vaccinations`} element={<AdminVaccinationsPage />} />

    {/* Medicamentos */}
    <Route path={`${prefix}/medications`} element={<AdminMedicationsPage />} />

    {/* Enfermedades */}
    <Route path={`${prefix}/diseases`} element={<AdminDiseasesPage />} />

    {/* Tratamientos */}
    <Route path={`${prefix}/treatments`} element={<AdminTreatmentsPage />} />

    {/* Controles */}
    <Route path={`${prefix}/controls`} element={<AdminControlPage />} />

    {/* Relación Animal-Campo */}
    <Route path={`${prefix}/animal-fields`} element={<AdminAnimalFieldsPage />} />

    {/* Relación Animal-Enfermedad */}
    <Route path={`${prefix}/disease-animals`} element={<AdminAnimalDiseasesPage />} />

    {/* Mejoras genéticas */}
    <Route path={`${prefix}/genetic-improvements`} element={<AdminGeneticImprovementsPage />} />

    {/* Especies y Razas (separadas) */}
    <Route path={`${prefix}/species`} element={<AdminSpeciesPage />} />
    <Route path={`${prefix}/breeds`} element={<AdminBreedsPage />} />

    {/* Tipos de alimento (solo vista lista en no-admin) */}
    <Route path={`${prefix}/food-types`} element={<AdminFoodTypesPage />} />
  </>
);

const AppRoutes = () => {
  // Gate global: no renderizar rutas hasta resolver autenticación
  const { loading } = useAuth() as any;
  const location = useLocation();

  // Forzar scroll al inicio en cambios de ruta (especialmente en móvil)
  useEffect(() => {
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    } catch (_) {
      // noop
    }
  }, [location.pathname]);
  if (loading) {
    return <LoadingScreen message="Verificando autenticación..." />;
  }

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Routes */}
        <Route element={<DashboardLayout />}> 
          <Route element={<ProtectedRoute allowedRoles={['Administrador', 'Instructor', 'Aprendiz']} />}>
            <Route path="/dashboard" element={<RoleDashboardRedirect />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Administrador']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* Analytics Routes (Admin) */}
            <Route path="/admin/analytics/executive" element={<DashboardExecutive />} />
            <Route path="/admin/analytics/fields" element={<FieldsPage />} />
            <Route path="/admin/analytics/reports" element={<CustomReports />} />

            <Route path="/admin/users" element={<AdminUsersPage />} />
            {/* Admin animals ahora usa AdminAnimalsPage (migrado de All/*) */}
            <Route path="/admin/animals" element={<AdminAnimalsPage />} />
            <Route path="/admin/fields" element={<AdminFieldsPage />} />
            <Route path="/admin/species" element={<AdminSpeciesPage />} />
            <Route path="/admin/breeds" element={<AdminBreedsPage />} />
            <Route path="/admin/control" element={<AdminControlPage />} />
            <Route path="/admin/treatment_medications" element={<AdminTreatmentMedicationsPage />} />
            <Route path="/admin/treatment_medications/form" element={<AdminTreatmentMedicationsFormPage />} />
            <Route path="/admin/treatment_medications/form/:id" element={<AdminTreatmentMedicationsFormPage />} />
            <Route path="/admin/treatment_medications/detail/:id" element={<AdminTreatmentMedicationsDetailPage />} />
            <Route path="/admin/treatment_vaccines" element={<AdminTreatmentVaccinesPage />} />
            <Route path="/admin/treatment_vaccines/form" element={<AdminTreatmentVaccinesFormPage />} />
            <Route path="/admin/treatment_vaccines/form/:id" element={<AdminTreatmentVaccinesFormPage />} />
            <Route path="/admin/treatment_vaccines/detail/:id" element={<AdminTreatmentVaccinesDetailPage />} />
            {/* Canonical hyphen-case admin routes */}
            <Route path="/admin/disease-animals" element={<AdminAnimalDiseasesPage />} />
            <Route path="/admin/animal-fields" element={<AdminAnimalFieldsPage />} />
            {/* Legacy redirects (cleanup compatibility) */}
            <Route path="/admin/animalDiseases" element={<Navigate to="/admin/disease-animals" replace />} />
            <Route path="/admin/animalFields" element={<Navigate to="/admin/fields" replace />} />
            {/* Legacy: removed /admin/user page - route redirected to modern user management */}
            <Route path="/admin/user" element={<Navigate to="/admin/users" replace />} />
            {/* fallback */}
            <Route path="/admin/base_model" element={<AdminBaseModelPage />} />
            <Route path="/admin/route_administration" element={<AdminRouteAdministrationPage />} />
            <Route path="/admin/user" element={<AdminUserPage />} />
            <Route path="/admin/vaccinations" element={<AdminVaccinationsPage />} />
            <Route path="/admin/vaccines" element={<AdminVaccinesPage />} />
            <Route path="/admin/diseases" element={<AdminDiseasesPage />} />
            <Route path="/admin/medications" element={<AdminMedicationsPage />} />
            {/* Food Types: rutas canónicas */}
            <Route path="/admin/food-types" element={<AdminFoodTypesPage />} />
            <Route path="/admin/food-types/create" element={<FoodTypesCreatePage />} />
            <Route path="/admin/food-types/edit/:id" element={<FoodTypesEditPage />} />
            <Route path="/admin/genetic_improvements" element={<AdminGeneticImprovementsPage />} />
            {/* Rutas adicionales para consistencia con otros roles */}
            <Route path="/admin/genetic-improvements" element={<AdminGeneticImprovementsPage />} />
            <Route path="/admin/controls" element={<AdminControlPage />} />
            {/* Treatments (admin) */}
            <Route path="/admin/treatments" element={<AdminTreatmentsPage />} />
            <Route path="/admin/treatments/form" element={<AdminTreatmentFormPage />} />
            <Route path="/admin/treatments/form/:id" element={<AdminTreatmentFormPage />} />
            <Route path="/admin/treatments/detail/:id" element={<AdminTreatmentDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Aprendiz', 'Administrador']} />}> 
            <Route path="/apprentice/dashboard" element={<ApprenticeDashboard />} />
            {/* Rutas generadas para Aprendiz */}
            {renderRoleRoutes('/apprentice')}
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Instructor', 'Administrador']} />}> 
            <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
            {/* Rutas generadas para Instructor */}
            {renderRoleRoutes('/instructor')}
          </Route>
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
