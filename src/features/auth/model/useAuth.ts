import { useContext } from 'react';
import { AuthContext } from '@/app/providers/AuthContext';
import { AuthContextType } from '@/entities/user/model/types';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
