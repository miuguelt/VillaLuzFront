import * as React from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import LoadingScreen from './LoadingScreen';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps): React.ReactElement => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Verificando autenticación..." />;
  }

  return <>{children}</>;
};

export default AuthWrapper;
