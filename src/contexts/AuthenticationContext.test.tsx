import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useContext } from 'react';

import { AuthProvider, AuthContext } from '../context/AuthenticationContext';
import * as authServiceModule from '@/services/authService'

// Use spyOn to override only getUserProfile while keeping other exports (like normalizeRole)
const getUserProfileSpy = jest.spyOn(authServiceModule, 'getUserProfile');

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Consumer = () => {
  const ctx = useContext(AuthContext)!;
  return <div data-testid="role">{ctx?.role ?? ''}</div>;
};

// Stub BroadcastChannel for test environment
class MockBroadcastChannel {
  name: string
  onmessage: ((ev: MessageEvent) => any) | null = null
  constructor(name: string) { this.name = name }
  postMessage(_msg: any) { /* noop */ }
  close() { /* noop */ }
}
// @ts-ignore
(global as any).BroadcastChannel = MockBroadcastChannel as any

describe('AuthProvider (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserProfileSpy.mockResolvedValue({ user: { id: 1, role: 'Administrador', fullname: 'Test User' } } as any);
  });

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders children and sets role from /auth/me', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div>child</div>
            <Consumer />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('child')).toBeInTheDocument();

    // Wait for checkAuthStatus to complete and set role
    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('Administrador');
    });
  });
});

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Spy on getUserProfile and provide role variants to validate normalizeRole
    jest.spyOn(authServiceModule, 'getUserProfile').mockResolvedValue({
      status: 200,
      data: { user: { id: 42, role: 'administrador' } },
    } as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders children and sets role from /auth/me', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div>child</div>
            <Consumer />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('child')).toBeInTheDocument();

    // Wait for checkAuthStatus to complete and set role
    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('Administrador');
    });
  });
});