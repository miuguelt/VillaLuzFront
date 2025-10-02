import React from 'react';
import { createPortal } from 'react-dom';
import { ToastType, useToast } from '@/context/ToastContext';

const toastColors: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
  warning: 'bg-yellow-500',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return createPortal(
    <div className="fixed z-[1000] bottom-4 right-4 flex flex-col gap-2 items-end" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[220px] max-w-xs px-4 py-3 rounded shadow-lg text-white flex items-center gap-2 ${toastColors[toast.type || 'info']} animate-fade-in`}
          role="status"
          tabIndex={0}
        >
          <span className="flex-1">{toast.message}</span>
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
