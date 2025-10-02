const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/context/(.*)$': '<rootDir>/src/context/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.jest.json',
    }],
    '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/jest.transform.cjs',
  },
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.jest.json',
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/types/**/*.ts',
    '!src/services/api.ts',
    '!src/contexts/AuthContext.tsx',
    '!src/hooks/useAuth.ts',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};

export default config;