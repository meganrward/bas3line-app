import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

jest.mock('../../lib/supabase', () => ({ supabase: { auth: { onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) } } }));
jest.mock('../../hooks/useAuth');

import { useAuth } from '../../hooks/useAuth';
const mockUseAuth = useAuth as jest.Mock;

function renderProtectedRoute(requiredRole: 'sponsor' | 'athlete', initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/sponsor" element={<div>Sponsor dashboard</div>} />
        <Route path="/athlete" element={<div>Athlete dashboard</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute role={requiredRole}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows a spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true });
    renderProtectedRoute('sponsor');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('redirects to /login when there is no authenticated user', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false });
    renderProtectedRoute('sponsor');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders children when the user role matches the required role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'sponsor-123' },
      profile: { role: 'sponsor' },
      loading: false,
    });
    renderProtectedRoute('sponsor');
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects a sponsor to /sponsor when they try to access an athlete route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'sponsor-123' },
      profile: { role: 'sponsor' },
      loading: false,
    });
    renderProtectedRoute('athlete');
    expect(screen.getByText('Sponsor dashboard')).toBeInTheDocument();
  });

  it('redirects an athlete to /athlete when they try to access a sponsor route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'athlete-456' },
      profile: { role: 'athlete' },
      loading: false,
    });
    renderProtectedRoute('sponsor');
    expect(screen.getByText('Athlete dashboard')).toBeInTheDocument();
  });
});
