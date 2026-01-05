import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Import pages using lazy loading for better performance
const LandingPage = lazy(() => import('@/pages/landing/index'));
const LoginPage = lazy(() => import('@/pages/auth/login/index.tsx'));
const SignUpPage = lazy(() => import('@/pages/auth/signup/index.tsx'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password/index.tsx'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password/index.tsx'));
const DashboardLayout = lazy(() => import('@/widgets/dashboard-layout/DashboardLayout.tsx'));
const AdminDashboard = lazy(() => import('@/pages/dashboard/admin/AdminDashboard.tsx'));
const AdminUsersPage = lazy(() => import('@/pages/dashboard/admin/users/index.tsx'));
const UnauthorizedPage = lazy(() => import('@/pages/errors/unauthorized/index.tsx'));
const ApprenticeDashboard = lazy(() => import('@/pages/dashboard/apprentice/ApprenticeDashboard.tsx'));
const InstructorDashboard = lazy(() => import('@/pages/dashboard/instructor/InstructorDashboard.tsx'));
const NotFoundPage = lazy(() => import('@/pages/errors/not-found/index.tsx'));
const RoleDashboardRedirect = lazy(() => import('@/pages/dashboard/RoleDashboardRedirect'));
const UserProfilePage = lazy(() => import('@/pages/dashboard/user/UserProfile'));

const AdminDiseasesPage = lazy(() => import('@/pages/dashboard/admin/diseases/index.tsx'));
const AdminMedicationsPage = lazy(() => import('@/pages/dashboard/admin/medications/index.tsx'));
const AdminGeneticImprovementsPage = lazy(() => import('@/pages/dashboard/admin/genetic_improvements/index.tsx'));
const AdminRouteAdministrationPage = lazy(() => import('@/pages/dashboard/admin/route_administration/index.tsx'));
const AdminVaccinationsPage = lazy(() => import('@/pages/dashboard/admin/vaccinations/index.tsx'));
const AdminVaccinesPage = lazy(() => import('@/pages/dashboard/admin/vaccines/index.tsx'));
const AdminFoodTypesPage = lazy(() => import('@/pages/dashboard/admin/food-types/index.tsx'));
const FoodTypesCreatePage = lazy(() => import('@/pages/dashboard/admin/food-types/create.tsx'));
const FoodTypesEditPage = lazy(() => import('@/pages/dashboard/admin/food-types/edit.tsx'));

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
const AdminAnimalsPage = lazy(() => import('@/pages/dashboard/admin/animals/index.tsx'));

// Analytics Pages
const DashboardExecutive = lazy(() => import('@/pages/dashboard/admin/analytics/DashboardExecutive'));
const FieldsPage = lazy(() => import('@/pages/dashboard/admin/analytics/FieldsPage'));
const CustomReports = lazy(() => import('@/pages/dashboard/admin/analytics/CustomReports'));

// Auth & Loading
import { useAuth } from '@/features/auth/model/useAuth';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';

// Helper for generating common routes for different roles
const renderRoleRoutes = (prefix: string) => (
  <>
    <Route path={`${prefix}/analytics/executive`} element={<DashboardExecutive />} />
    <Route path={`${prefix}/analytics/fields`} element={<FieldsPage />} />
    <Route path={`${prefix}/analytics/reports`} element={<CustomReports />} />
    <Route path={`${prefix}/animals`} element={<AdminAnimalsPage />} />
    <Route path={`${prefix}/fields`} element={<AdminFieldsPage />} />
    <Route path={`${prefix}/vaccines`} element={<AdminVaccinesPage />} />
    <Route path={`${prefix}/vaccinations`} element={<AdminVaccinationsPage />} />
    <Route path={`${prefix}/medications`} element={<AdminMedicationsPage />} />
    <Route path={`${prefix}/diseases`} element={<AdminDiseasesPage />} />
    <Route path={`${prefix}/treatments`} element={<AdminTreatmentsPage />} />
    <Route path={`${prefix}/controls`} element={<AdminControlPage />} />
    <Route path={`${prefix}/animal-fields`} element={<AdminAnimalFieldsPage />} />
    <Route path={`${prefix}/disease-animals`} element={<AdminAnimalDiseasesPage />} />
    <Route path={`${prefix}/genetic-improvements`} element={<AdminGeneticImprovementsPage />} />
    <Route path={`${prefix}/species`} element={<AdminSpeciesPage />} />
    <Route path={`${prefix}/breeds`} element={<AdminBreedsPage />} />
    <Route path={`${prefix}/food-types`} element={<AdminFoodTypesPage />} />
  </>
);

const AppRoutes = () => {
  const { loading } = useAuth() as any;
  const location = useLocation();

  useEffect(() => {
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    } catch (_) {
      return;
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Routes */}
        <Route element={<DashboardLayout />}>
          <Route element={<ProtectedRoute allowedRoles={['Administrador', 'Instructor', 'Aprendiz']} />}>
            <Route path="/dashboard" element={<RoleDashboardRedirect />} />
            <Route path="/profile" element={<UserProfilePage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Administrador']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/analytics/executive" element={<DashboardExecutive />} />
            <Route path="/admin/analytics/fields" element={<FieldsPage />} />
            <Route path="/admin/analytics/reports" element={<CustomReports />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
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
            <Route path="/admin/disease-animals" element={<AdminAnimalDiseasesPage />} />
            <Route path="/admin/animal-fields" element={<AdminAnimalFieldsPage />} />
            <Route path="/admin/animalDiseases" element={<Navigate to="/admin/disease-animals" replace />} />
            <Route path="/admin/animalFields" element={<Navigate to="/admin/fields" replace />} />
            <Route path="/admin/user" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/base_model" element={<AdminBaseModelPage />} />
            <Route path="/admin/route_administration" element={<AdminRouteAdministrationPage />} />
            <Route path="/admin/vaccinations" element={<AdminVaccinationsPage />} />
            <Route path="/admin/vaccines" element={<AdminVaccinesPage />} />
            <Route path="/admin/diseases" element={<AdminDiseasesPage />} />
            <Route path="/admin/medications" element={<AdminMedicationsPage />} />
            <Route path="/admin/food-types" element={<AdminFoodTypesPage />} />
            <Route path="/admin/food-types/create" element={<FoodTypesCreatePage />} />
            <Route path="/admin/food-types/edit/:id" element={<FoodTypesEditPage />} />
            <Route path="/admin/genetic_improvements" element={<AdminGeneticImprovementsPage />} />
            <Route path="/admin/genetic-improvements" element={<AdminGeneticImprovementsPage />} />
            <Route path="/admin/controls" element={<AdminControlPage />} />
            <Route path="/admin/treatments" element={<AdminTreatmentsPage />} />
            <Route path="/admin/treatments/form" element={<AdminTreatmentFormPage />} />
            <Route path="/admin/treatments/form/:id" element={<AdminTreatmentFormPage />} />
            <Route path="/admin/treatments/detail/:id" element={<AdminTreatmentDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Aprendiz', 'Administrador']} />}>
            <Route path="/apprentice/dashboard" element={<ApprenticeDashboard />} />
            {renderRoleRoutes('/apprentice')}
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Instructor', 'Administrador']} />}>
            <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
            {renderRoleRoutes('/instructor')}
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
