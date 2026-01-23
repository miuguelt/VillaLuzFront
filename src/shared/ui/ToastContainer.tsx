import React from 'react';
import { createPortal } from 'react-dom';
import { ToastType, useToast } from '@/app/providers/ToastContext';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';
import { ColorTokens } from '@/shared/constants/colorSystem';

const toastColors: Record<ToastType, string> = {
  success: ColorTokens.success.bg,
  error: ColorTokens.error.bg,
  info: ColorTokens.info.bg,
  warning: ColorTokens.warning.bg,
};

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" aria-hidden />,
  error: <XCircle className="h-5 w-5" aria-hidden />,
  info: <Info className="h-5 w-5" aria-hidden />,
  warning: <AlertTriangle className="h-5 w-5" aria-hidden />,
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return createPortal(
    <div className="fixed z-[100000] bottom-4 right-4 flex flex-col gap-2 items-end" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[240px] max-w-sm px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 ${toastColors[toast.type || 'info']} animate-fade-in border ${ColorTokens[(toast.type || 'info') as ToastType].border}`}
          role="status"
          tabIndex={0}
        >
          <span className="flex items-center gap-2">
            {toastIcons[toast.type || 'info']}
            <span className="flex-1">{toast.message}</span>
          </span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 text-white hover:text-white focus:outline-none"
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
};

// Animación fade-in (Tailwind v4)
// Ya definida en tailwind.config.js como 'animate-fade-in'; no se requiere CSS adicional.
