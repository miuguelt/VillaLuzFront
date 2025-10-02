import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from './LoadingScreen';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps): React.ReactElement => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Verifying authentication..." />;
  }

  return <>{children}</>;
};

export default AuthWrapper;