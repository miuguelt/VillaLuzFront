import '@testing-library/jest-dom';

// Mock import.meta for Jest compatibility
(globalThis as any).import = {
  meta: {
    env: {
      DEV: false,
      VITE_API_BASE_URL: 'http://localhost:8081/api/v1',
      VITE_ENABLE_PERFORMANCE_MONITORING: 'false'
    }
  }
};
(globalThis as any).__VITE_IMPORT_META_ENV__ = (globalThis as any).import.meta.env;

// Mock ResizeObserver for Jest compatibility
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for Jest compatibility
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia for Jest compatibility
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const originalWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  const msg = args?.[0];
  if (typeof msg === 'string' && msg.includes('Missing `Description` or `aria-describedby')) return;
  originalWarn(...args);
};

const originalError = console.error.bind(console);
console.error = (...args: any[]) => {
  const msg = args?.[0];
  if (typeof msg === 'string' && msg.includes('`DialogContent` requires a `DialogTitle`')) return;
  originalError(...args);
};
