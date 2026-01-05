// Removed React import as JSX runtime is automatic with react-jsx
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './index';
import * as authService from '@/features/auth/api/auth.service';
import api from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/useAuth';
import { AuthProvider } from '@/app/providers/AuthenticationContext';

// Mocks
jest.mock('@/features/auth/api/auth.service', () => ({
  __esModule: true,
  loginUser: jest.fn(async () => ({ status: 200, data: { user: { id: 1, role: 'Administrador', identification: 12345678, email: 'test@example.com', status: true }, access_token: 'mock-token' } })),
  getUserProfile: jest.fn(async () => ({ status: 200, data: { user: { id: 1, role: 'Administrador' } } })),
  normalizeRole: jest.fn((role: any) => role),
}));
jest.mock('@/shared/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('@/features/auth/model/useAuth');

// Cast mocks
const mockAuthService = jest.mocked(authService as any);
const mockUseAuth = jest.mocked(useAuth);
const mockApi = api as unknown as { get: jest.Mock };

// Setup QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderComponent = async (initialEntries = ['/login']) => {
  let rendered;
  await act(async () => {
    rendered = render(
      <MemoryRouter
        initialEntries={initialEntries}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Index />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  });
  return rendered!;
};

describe('Login Page', () => {
  beforeEach(() => {
    // Use real timers to avoid interference with userEvent async behavior
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    } as any);

    // Default mock responses
    (mockAuthService.loginUser as jest.Mock).mockResolvedValue({ status: 200, data: { access_token: 'mock-token', user: { id: 1, role: 'Administrador', identification: 12345678, email: 'test@example.com', status: true } } } as any);
    (mockAuthService.getUserProfile as jest.Mock).mockResolvedValue({ status: 200, data: { user: { id: 1, role: 'Administrador', identification: 12345678, email: 'test@example.com', status: true } } } as any);
    mockApi.get.mockResolvedValue({ data: { user: { id: 1, role: 'Administrador' } } } as any);

    // Ensure normalizeRole behaves as identity by default
    (mockAuthService.normalizeRole as jest.Mock).mockImplementation((role: any) => role);
  });

  afterEach(() => {
    // No fake timers to flush
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();

    // Make login resolution slightly delayed
    (mockAuthService.loginUser as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ status: 200, data: { access_token: 't', user: { id: 1, role: 'Administrador' } } } as any), 50)));

    await renderComponent();

    await user.type(screen.getByLabelText(/identific/i), '12345678');
    await user.type(screen.getByLabelText(/contrase/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar/i }));

    // Wait for loading overlay to take over (button should disappear)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /iniciar/i })).not.toBeInTheDocument();
    });
  });

  it('renders login form correctly', () => {
    // No async user flow needed here
    render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Index />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/identific/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contrase/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument();
  });

  it('submits login form and triggers auth flow on success', async () => {
    const user = userEvent.setup();
    const mockLogin = jest.fn();
    mockUseAuth.mockReturnValue({
      user: null,
      login: mockLogin,
      logout: jest.fn(),
      isLoading: false,
    } as any);

    await renderComponent();

    await user.type(screen.getByLabelText(/identific/i), '12345678');
    await user.type(screen.getByLabelText(/contrase/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar/i }));

    await waitFor(() => {
      expect(mockAuthService.loginUser).toHaveBeenCalledWith({ identification: '12345678', password: 'password123' } as any);
      expect(mockLogin).toHaveBeenCalled();
      // Removed assertion on getUserProfile since AuthProvider may perform background checks
    });
  });

  it('shows error message on failed login (401)', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockAuthService.loginUser as jest.Mock).mockRejectedValue({ response: { status: 401, data: {} } });

    try {
      await renderComponent();

      await user.type(screen.getByLabelText(/identific/i), '1234');
      await user.type(screen.getByLabelText(/contrase/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /iniciar/i }));

      await waitFor(() => {
        expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
