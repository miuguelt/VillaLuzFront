import '@testing-library/jest-dom';

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
