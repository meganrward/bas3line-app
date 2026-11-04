import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoleRedirect } from './RoleRedirect';
import { useAuth } from '../../hooks/useAuth';

const mockSignOut = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));
jest.mock('../../hooks/useAuth');

const mockUseAuth = useAuth as jest.Mock;

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/sponsor" element={<div>Sponsor home</div>} />
        <Route path="/ambassador" element={<div>Ambassador home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RoleRedirect', () => {
  it('shows a spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true });
    renderLanding();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('sends signed-out visitors to /login', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false });
    renderLanding();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('sends a sponsor to the sponsor portal', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'sponsor-123' },
      profile: { role: 'sponsor' },
      loading: false,
    });
    renderLanding();
    expect(screen.getByText('Sponsor home')).toBeInTheDocument();
  });

  it('sends an ambassador to the ambassador app', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'ambassador-456' },
      profile: { role: 'ambassador' },
      loading: false,
    });
    renderLanding();
    expect(screen.getByText('Ambassador home')).toBeInTheDocument();
  });

  it('shows a message instead of redirecting when a signed-in user has no profile', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'orphan-789' }, profile: null, loading: false });
    renderLanding();
    expect(screen.getByText(/account isn't set up yet/i)).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('lets a user with no profile sign out', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    mockUseAuth.mockReturnValue({ user: { id: 'orphan-789' }, profile: null, loading: false });
    renderLanding();
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
