import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRole } from '@/services/authService';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const location = useLocation();
  const { isAuthenticated, user, role, loading } = useAuth() as any;

  // 1) Mientras esté cargando la sesión, no redirigir ni mostrar unauthorized
  if (loading) {
    return null; // AppRoutes muestra LoadingScreen como compuerta global
  }

  // 2) Si no está autenticado tras cargar, ir a login y recordar destino
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3) Si no hay restricción de roles, permitir acceso
  if (!allowedRoles || allowedRoles.length === 0) {
    return <Outlet />;
  }

  // 4) Evaluar rol sólo cuando existe y normalizar valores para comparación robusta
  const currentRoleRaw = role || user?.role || null;
  const currentRole = currentRoleRaw ? (normalizeRole(currentRoleRaw) || String(currentRoleRaw)) : null;
  const allowed = allowedRoles.map(r => normalizeRole(r) || String(r));

  // Importante: si el usuario está autenticado pero el rol aún no está resuelto,
  // no lo redirigimos a /unauthorized; esperamos a que el contexto lo resuelva.
  if (!currentRole) {
    return null; // mostrar nada (la compuerta global ya gestionó loading inicial)
  }

  const isAllowed = allowed.includes(currentRole);
  if (!isAllowed) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
