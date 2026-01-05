import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

type RequestFeedbackProps = {
  loading: boolean;
  error: string | null;
  success?: string | null;
  children: ReactNode;
};

export function RequestFeedback({
  loading,
  error,
  success,
  children,
}: RequestFeedbackProps) {
  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4 bg-green-50">
          <AlertTitle className="text-green-800">Éxito</AlertTitle>
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}
      
      {children}
    </div>
  );
}