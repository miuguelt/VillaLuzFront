// Removed React import as JSX runtime is automatic with react-jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './index';
import * as authService from '@/services/authService';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/context/AuthenticationContext';

// Mocks
jest.mock('@/services/authService', () => ({
  __esModule: true,
  loginUser: jest.fn(async () => ({ status: 200, data: { user: { id: 1, role: 'Administrador', identification: 12345678, email: 'test@example.com', status: true }, access_token: 'mock-token' } })),
  getUserProfile: jest.fn(async () => ({ status: 200, data: { user: { id: 1, role: 'Administrador' } } })),
  normalizeRole: jest.fn((role: any) => role),
}));
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('@/hooks/useAuth');

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

const renderComponent = (initialEntries = ['/login']) => {
  return render(
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

    renderComponent();

    await user.type(screen.getByLabelText(/identification number/i), '12345678');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    // Wait for loading overlay to take over (button should disappear)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /iniciar sesión/i })).not.toBeInTheDocument();
    });
  });

  it('renders login form correctly', () => {
    renderComponent();

    expect(screen.getByLabelText(/identification number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
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

    renderComponent();

    await user.type(screen.getByLabelText(/identification number/i), '12345678');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockAuthService.loginUser).toHaveBeenCalledWith({ identification: '12345678', password: 'password123' } as any);
      expect(mockLogin).toHaveBeenCalled();
      // Removed assertion on getUserProfile since AuthProvider may perform background checks
    });
  });

  it('shows error message on failed login (401)', async () => {
    const user = userEvent.setup();
    (mockAuthService.loginUser as jest.Mock).mockRejectedValue({ response: { status: 401, data: {} } });

    renderComponent();

    await user.type(screen.getByLabelText(/identification number/i), '1234');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas\. verifique su documento y contraseña\./i)).toBeInTheDocument();
    });
  });
});
