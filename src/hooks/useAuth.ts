import { useContext } from 'react';
import { AuthContext } from '@/context/AuthenticationContext';
import { AuthContextType } from '@/types/userTypes';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
