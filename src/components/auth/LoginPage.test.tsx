import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './LoginPage';

// Mock only our own Supabase module — no need to mock react-router-dom.
// Navigation is verified by checking which route component rendered.
const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

function makeFromChain(role: string | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: role ? { role } : null,
      error: null,
    }),
  };
}

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sponsor" element={<div>Sponsor dashboard</div>} />
        <Route path="/athlete" element={<div>Athlete dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no active session → show login form
  mockOnAuthStateChange.mockImplementation((callback: any) => {
    callback('INITIAL_SESSION', null);
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });
});

describe('LoginPage', () => {
  it('shows the login form when there is no active session', () => {
    renderWithRoutes();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows a spinner while checking for an existing session', () => {
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    renderWithRoutes();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('navigates to /sponsor after a sponsor logs in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'sponsor-123' } },
      error: null,
    });
    mockFrom.mockReturnValue(makeFromChain('sponsor'));

    renderWithRoutes();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'sponsor@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText('Sponsor dashboard')).toBeInTheDocument()
    );
  });

  it('navigates to /athlete after an athlete logs in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'athlete-456' } },
      error: null,
    });
    mockFrom.mockReturnValue(makeFromChain('athlete'));

    renderWithRoutes();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'athlete@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText('Athlete dashboard')).toBeInTheDocument()
    );
  });

  it('shows an error message on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    renderWithRoutes();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    );
    expect(screen.queryByText('Sponsor dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Athlete dashboard')).not.toBeInTheDocument();
  });

  it('auto-navigates to /sponsor when an existing sponsor session is detected', async () => {
    mockOnAuthStateChange.mockImplementation((callback: any) => {
      callback('INITIAL_SESSION', { user: { id: 'sponsor-123' } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    mockFrom.mockReturnValue(makeFromChain('sponsor'));

    renderWithRoutes();

    await waitFor(() =>
      expect(screen.getByText('Sponsor dashboard')).toBeInTheDocument()
    );
  });
});
