import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SponsorLayout } from './components/layout/SponsorLayout';
import { AmbassadorsList } from './components/sponsor/AmbassadorsList';
import { AddAmbassadorForm } from './components/sponsor/AddAmbassadorForm';
import { AmbassadorDetail } from './components/sponsor/AmbassadorDetail';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
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

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
