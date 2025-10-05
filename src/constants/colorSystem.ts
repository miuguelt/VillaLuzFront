export type UIState = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'disabled';

export const ColorTokens: Record<UIState, {
  hex: string;
  bg: string;
  text: string;
  border: string;
  ring: string;
}> = {
  success: {
    hex: '#10b981',
    bg: 'bg-[#10b981]',
    text: 'text-white',
    border: 'border-[#10b981]',
    ring: 'ring-[#10b981]'
  },
  error: {
    hex: '#ef4444',
    bg: 'bg-[#ef4444]',
    text: 'text-white',
    border: 'border-[#ef4444]',
    ring: 'ring-[#ef4444]'
  },
  warning: {
    hex: '#f59e0b',
    bg: 'bg-[#f59e0b]',
    text: 'text-white',
    border: 'border-[#f59e0b]',
    ring: 'ring-[#f59e0b]'
  },
  info: {
    hex: '#3b82f6',
    bg: 'bg-[#3b82f6]',
    text: 'text-white',
    border: 'border-[#3b82f6]',
    ring: 'ring-[#3b82f6]'
  },
  neutral: {
    hex: '#3b82f6',
    bg: 'bg-[#3b82f6]',
    text: 'text-white',
    border: 'border-[#3b82f6]',
    ring: 'ring-[#3b82f6]'
  },
  disabled: {
    hex: '#6b7280',
    bg: 'bg-[#6b7280]',
    text: 'text-white',
    border: 'border-[#6b7280]',
    ring: 'ring-[#6b7280]'
  }
};

export const ToastDurations: Record<'success' | 'error' | 'warning' | 'info', number> = {
  success: 2500,
  error: 4500,
  warning: 4000,
  info: 3000,
};