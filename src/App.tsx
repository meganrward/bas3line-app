import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleRedirect } from './components/auth/RoleRedirect';
import { SponsorLayout } from './components/layout/SponsorLayout';
import { AmbassadorLayout } from './components/layout/AmbassadorLayout';
import { AmbassadorsList } from './components/sponsor/AmbassadorsList';
import { AddAmbassadorForm } from './components/sponsor/AddAmbassadorForm';
import { AmbassadorDetail } from './components/sponsor/AmbassadorDetail';
import { ComingSoon } from './components/ambassador/ComingSoon';
import { MyProfile } from './components/ambassador/MyProfile';

export function App() {
  // The site is served from a subpath on GitHub Pages (see "homepage" in package.json).
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/sponsor"
          element={
            <ProtectedRoute role="sponsor">
              <SponsorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="ambassadors" replace />} />
          <Route path="ambassadors" element={<AmbassadorsList />} />
          <Route path="ambassadors/new" element={<AddAmbassadorForm />} />
          <Route path="ambassadors/:id" element={<AmbassadorDetail />} />
        </Route>

        <Route
          path="/ambassador"
          element={
            <ProtectedRoute role="ambassador">
              <AmbassadorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="progress" element={<ComingSoon title="Your Progress" />} />
          <Route path="sales" element={<ComingSoon title="Your Sales" />} />
          <Route path="marketplace" element={<ComingSoon title="Marketplace" />} />
          <Route path="cash-or-kit" element={<ComingSoon title="Cash or Kit" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
