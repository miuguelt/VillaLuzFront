import { createContext } from 'react';
import { AuthContextType } from '@/entities/user/model/types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
