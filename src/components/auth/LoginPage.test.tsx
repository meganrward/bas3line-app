import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
    },
  },
}));

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sponsor" element={<div>Sponsor dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
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

  it('navigates to /sponsor after login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'sponsor-123' } },
      error: null,
    });

    renderWithRoutes();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'sponsor@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText('Sponsor dashboard')).toBeInTheDocument()
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
  });

  it('auto-navigates to /sponsor when an existing session is detected', async () => {
    mockOnAuthStateChange.mockImplementation((callback: any) => {
      callback('INITIAL_SESSION', { user: { id: 'sponsor-123' } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    renderWithRoutes();

    await waitFor(() =>
      expect(screen.getByText('Sponsor dashboard')).toBeInTheDocument()
    );
  });
});
