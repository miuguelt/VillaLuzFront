/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    // Configuración base para v4 con @theme support
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
      },
    },
    extend: {
      // Asegurar que las utilidades base estén disponibles
      borderRadius: {
        'none': '0px',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      zIndex: {
        '1': 1,
        '2': 2,
        '10': 10,
        '20': 20,
        '30': 30,
        '40': 40,
        '50': 50,
        '60': 60,
        '70': 70,
        '80': 80,
        '90': 90,
        '100': 100,
        'auto': 'auto',
      },
      colors: {
        // Mantener compatibilidad con variables CSS existentes
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        // Primary palette with full scale support
        primary: {
          50: 'hsl(var(--primary-50))',
          100: 'hsl(var(--primary-100))',
          200: 'hsl(var(--primary-200))',
          300: 'hsl(var(--primary-300))',
          400: 'hsl(var(--primary-400))',
          500: 'hsl(var(--primary-500))',
          600: 'hsl(var(--primary-600))',
          700: 'hsl(var(--primary-700))',
          800: 'hsl(var(--primary-800))',
          900: 'hsl(var(--primary-900))',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        // Secondary (neutral) palette
        secondary: {
          50: 'hsl(var(--secondary-50))',
          100: 'hsl(var(--secondary-100))',
          200: 'hsl(var(--secondary-200))',
          300: 'hsl(var(--secondary-300))',
          400: 'hsl(var(--secondary-400))',
          500: 'hsl(var(--secondary-500))',
          600: 'hsl(var(--secondary-600))',
          700: 'hsl(var(--secondary-700))',
          800: 'hsl(var(--secondary-800))',
          900: 'hsl(var(--secondary-900))',
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        // Success palette
        success: {
          50: 'hsl(var(--success-50))',
          100: 'hsl(var(--success-100))',
          200: 'hsl(var(--success-200))',
          300: 'hsl(var(--success-300))',
          400: 'hsl(var(--success-400))',
          500: 'hsl(var(--success-500))',
          600: 'hsl(var(--success-600))',
          700: 'hsl(var(--success-700))',
          800: 'hsl(var(--success-800))',
          900: 'hsl(var(--success-900))',
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        // Warning palette
        warning: {
          50: 'hsl(var(--warning-50))',
          100: 'hsl(var(--warning-100))',
          200: 'hsl(var(--warning-200))',
          300: 'hsl(var(--warning-300))',
          400: 'hsl(var(--warning-400))',
          500: 'hsl(var(--warning-500))',
          600: 'hsl(var(--warning-600))',
          700: 'hsl(var(--warning-700))',
          800: 'hsl(var(--warning-800))',
          900: 'hsl(var(--warning-900))',
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        // Danger/Destructive palette
        danger: {
          50: 'hsl(var(--danger-50))',
          100: 'hsl(var(--danger-100))',
          200: 'hsl(var(--danger-200))',
          300: 'hsl(var(--danger-300))',
          400: 'hsl(var(--danger-400))',
          500: 'hsl(var(--danger-500))',
          600: 'hsl(var(--danger-600))',
          700: 'hsl(var(--danger-700))',
          800: 'hsl(var(--danger-800))',
          900: 'hsl(var(--danger-900))',
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        // Info palette for neutral alerts
        info: {
          50: 'hsl(var(--info-50))',
          100: 'hsl(var(--info-100))',
          200: 'hsl(var(--info-200))',
          300: 'hsl(var(--info-300))',
          400: 'hsl(var(--info-400))',
          500: 'hsl(var(--info-500))',
          600: 'hsl(var(--info-600))',
          700: 'hsl(var(--info-700))',
          800: 'hsl(var(--info-800))',
          900: 'hsl(var(--info-900))',
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))'
        },
        // Neutral palette
        neutral: {
          50: 'hsl(var(--neutral-50))',
          100: 'hsl(var(--neutral-100))',
          200: 'hsl(var(--neutral-200))',
          300: 'hsl(var(--neutral-300))',
          400: 'hsl(var(--neutral-400))',
          500: 'hsl(var(--neutral-500))',
          600: 'hsl(var(--neutral-600))',
          700: 'hsl(var(--neutral-700))',
          800: 'hsl(var(--neutral-800))',
          900: 'hsl(var(--neutral-900))',
          DEFAULT: 'hsl(var(--muted))'
        },
        // Muted palette
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        // Surfaces for layout layers
        surface: {
          DEFAULT: 'hsl(var(--surface-primary))',
          primary: 'hsl(var(--surface-primary))',
          secondary: 'hsl(var(--surface-secondary))',
          tertiary: 'hsl(var(--surface-tertiary))'
        },
        // Text tokens
        text: {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))'
        },
        // Accent palette
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        // Destructive palette (alias)
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        // Border and input colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--color-input))',
        ring: 'hsl(var(--color-ring))',
        // State colors for interactions
        state: {
          hover: 'hsl(var(--surface-hover))',
          active: 'hsl(var(--surface-active))',
          disabled: 'hsl(var(--surface-disabled))'
        },
        // Overlay transparencies
        overlay: {
          strong: 'hsl(var(--overlay-strong))',
          soft: 'hsl(var(--overlay-soft))',
          muted: 'hsl(var(--overlay-muted))'
        },
        // Ghost tones for badges/alerts
        ghost: {
          primary: 'hsl(var(--primary-ghost))',
          'primary-strong': 'hsl(var(--primary-ghost-strong))',
          success: 'hsl(var(--success-ghost))',
          'success-strong': 'hsl(var(--success-ghost-strong))',
          warning: 'hsl(var(--warning-ghost))',
          'warning-strong': 'hsl(var(--warning-ghost-strong))',
          danger: 'hsl(var(--danger-ghost))',
          'danger-strong': 'hsl(var(--danger-ghost-strong))',
          info: 'hsl(var(--info-ghost))',
          'info-strong': 'hsl(var(--info-ghost-strong))'
        },
        // Chart colors for data visualization
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'sans-serif']
      },
      // Box shadows mejorados para v4 - más pronunciadas y opacas
      boxShadow: {
        sm: '0 2px 4px 0 hsl(var(--foreground) / 0.08)',
        DEFAULT: '0 2px 6px 0 hsl(var(--foreground) / 0.12), 0 1px 3px -1px hsl(var(--foreground) / 0.12)',
        md: '0 4px 8px -1px hsl(var(--foreground) / 0.12), 0 2px 6px -2px hsl(var(--foreground) / 0.12)',
        lg: '0 10px 20px -3px hsl(var(--foreground) / 0.15), 0 4px 8px -4px hsl(var(--foreground) / 0.15)',
        xl: '0 20px 30px -5px hsl(var(--foreground) / 0.18), 0 8px 12px -6px hsl(var(--foreground) / 0.18)',
        '2xl': '0 25px 50px -12px hsl(var(--foreground) / 0.25)',
        'inner': 'inset 0 2px 4px 0 hsl(var(--foreground) / 0.06)'
      },
      // Transiciones optimizadas
      transitionTimingFunction: {
        'in-out-standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'emphasized': 'cubic-bezier(0.2, 0, 0, 1)'
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms'
      },
      // Animaciones personalizadas
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'fade-out': 'fadeOut 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'pulse-once': 'pulseOnce 1s ease-in-out',
        // Animaciones CRUD mejoradas - más dramáticas y visibles
        'item-created': 'itemCreated 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'item-deleting': 'itemDeleting 0.6s cubic-bezier(0.4, 0, 1, 1)',
        'item-updated': 'itemUpdated 0.6s ease-in-out',
        'item-saving': 'itemSaving 1s ease-in-out infinite',
        'border-glow': 'borderGlow 1.5s ease-in-out',
        'shine': 'shine 1.5s ease-in-out',
        'confetti': 'confetti 1s ease-out',
        'pulse-glow': 'pulseGlow 1.2s ease-out'
      },
      // Keyframes para animaciones
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' }
        },
        pulseOnce: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)'
          },
          '50%': {
            opacity: '0.9',
            transform: 'scale(1.02)'
          }
        },
        // Animación MEJORADA para items creados - entrada dramática con bounce más rápido
        itemCreated: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.7) translateY(-50px)',
            filter: 'blur(4px)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.1) translateY(10px)',
            filter: 'blur(0px)',
          },
          '70%': {
            transform: 'scale(0.95) translateY(-4px)',
          },
          '85%': {
            transform: 'scale(1.03) translateY(2px)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
            filter: 'blur(0px)',
          }
        },
        // Animación MEJORADA para items eliminándose - shake + compresión + slide out más rápido
        itemDeleting: {
          '0%, 8%': {
            transform: 'translateX(-6px) scale(1, 1)',
            opacity: '1',
          },
          '4%, 12%': {
            transform: 'translateX(6px) scale(1, 1)',
          },
          '16%': {
            transform: 'translateX(0) scale(1, 1)',
          },
          '35%': {
            opacity: '0.6',
            transform: 'scale(0.96, 0.6) translateX(-20px)',
            filter: 'brightness(0.6)',
          },
          '100%': {
            opacity: '0',
            transform: 'scale(0.3, 0.1) translateX(-150px)',
            filter: 'brightness(0.3) blur(4px)',
          }
        },
        // Nueva animación para items editados - pulso de color
        itemUpdated: {
          '0%, 100%': {
            backgroundColor: 'transparent',
            transform: 'scale(1)',
          },
          '25%': {
            backgroundColor: 'hsl(var(--warning-100))',
            transform: 'scale(1.03)',
          },
          '50%': {
            backgroundColor: 'hsl(var(--warning-50))',
            transform: 'scale(1.015)',
          },
          '75%': {
            backgroundColor: 'hsl(var(--warning-50) / 0.5)',
            transform: 'scale(1.008)',
          }
        },
        // Animación para estado "guardando"
        itemSaving: {
          '0%, 100%': {
            opacity: '1',
            filter: 'brightness(1)',
          },
          '50%': {
            opacity: '0.6',
            filter: 'brightness(0.95)',
          }
        },
        // Animación de brillo en el borde
        borderGlow: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(var(--primary), 0)',
          },
          '50%': {
            boxShadow: '0 0 20px 2px rgba(var(--primary), 0.6), inset 0 0 20px 2px rgba(var(--primary), 0.2)',
          }
        },
        // Efecto shine mejorado que cruza el elemento
        shine: {
          '0%': {
            backgroundPosition: '-200% center',
            opacity: '0',
          },
          '30%': {
            opacity: '1',
          },
          '70%': {
            opacity: '1',
          },
          '100%': {
            backgroundPosition: '200% center',
            opacity: '0',
          }
        },
        // Efecto de confetti/partículas
        confetti: {
          '0%': {
            transform: 'translateY(0) scale(1)',
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(-50px) scale(0)',
            opacity: '0',
          }
        },
        // Pulso de brillo expansivo
        pulseGlow: {
          '0%': {
            boxShadow: '0 0 0 0 currentColor',
            opacity: '1',
          },
          '50%': {
            boxShadow: '0 0 30px 10px currentColor',
            opacity: '0.8',
          },
          '100%': {
            boxShadow: '0 0 0 0 currentColor',
            opacity: '0',
          }
        }
      }
    }
  },
  // Plugins para v4 - mantener mínimo para compatibilidad
  plugins: []
};
