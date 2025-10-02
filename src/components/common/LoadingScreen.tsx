import { FC } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: FC<LoadingScreenProps> = ({ 
  message = 'Verificando autenticación...' 
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center space-y-6">
        {/* Logo o icono */}
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto bg-green-600 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
        </div>
        
        {/* Spinner */}
        <Spinner 
          size="xl"
          label={message}
          className="text-green-600"
        />
        
        {/* Mensaje adicional */}
        <div className="text-gray-600 text-sm max-w-md">
          <p>Estamos verificando tu sesión para ofrecerte la mejor experiencia.</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;