import React from 'react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';
import { useAuth } from '@/features/auth/model/useAuth';
import { Role } from '@/entities/user/model/types';

const roleDestinations: Record<Role, string> = {
  Administrador: '/admin/dashboard',
  Instructor: '/instructor/dashboard',
  Aprendiz: '/apprentice/dashboard',
};

const RoleDashboardRedirect: React.FC = () => {
  const { role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen message="Preparando tu panel..." />;
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = role as Role;
  const destination = roleDestinations[normalizedRole] ?? '/admin/dashboard';

  return <Navigate to={destination} replace />;
};

export default RoleDashboardRedirect;
