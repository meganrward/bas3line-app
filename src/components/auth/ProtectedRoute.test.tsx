import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

jest.mock('../../lib/supabase', () => ({ supabase: { auth: { onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) } } }));
jest.mock('../../hooks/useAuth');

import { useAuth } from '../../hooks/useAuth';
const mockUseAuth = useAuth as jest.Mock;

function renderProtectedRoute(requiredRole: 'sponsor', initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/sponsor" element={<div>Sponsor dashboard</div>} />
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

  it('redirects an ambassador to /login when they try to access the sponsor route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'ambassador-456' },
      profile: { role: 'ambassador' },
      loading: false,
    });
    renderProtectedRoute('sponsor');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
