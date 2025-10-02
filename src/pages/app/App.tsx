import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthenticationContext';
import React, { Suspense } from 'react';
const LoginForm = React.lazy(() => import('../login'));
const SignUpForm = React.lazy(() => import('../signUp'));
const Dashboard = React.lazy(() => import('../dashboard/index'));
const LandingPage = React.lazy(() => import('../landing'));
import { useAuth } from '@/hooks/useAuth';
import { I18nProvider } from '@/i18n';
import { ToastProvider } from '@/context/ToastContext';

// Component to protect routes
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-green-700">Cargando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Dynamic redirection from '/dashboard' for authenticated users
// const DashboardRedirect = () => {
//   const { isAuthenticated } = useAuth();
//   if (!isAuthenticated) return <Navigate to="/" replace />;
//   return <Dashboard />;
// };

function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<div className="p-8 text-center text-green-700">Cargando módulo...</div>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signUp" element={<SignUpForm />} />
              <Route path="/register" element={<Navigate to="/signUp" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

export default App;