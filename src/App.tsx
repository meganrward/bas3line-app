import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SponsorLayout } from './components/layout/SponsorLayout';
import { AthleteLayout } from './components/layout/AthleteLayout';
import { MyProfile } from './components/athlete/MyProfile';
import { CreatePost } from './components/athlete/CreatePost';
import { MyPosts } from './components/athlete/MyPosts';
import { PointsDashboard } from './components/athlete/PointsDashboard';
import { VoucherRedemption } from './components/athlete/VoucherRedemption';

function Placeholder({ label }: { label: string }) {
  return <p className="text-gray-400 text-sm">{label} — coming soon</p>;
}

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
          <Route index element={<Navigate to="athletes" replace />} />
          <Route path="athletes" element={<Placeholder label="Athletes list" />} />
          <Route path="athletes/:id" element={<Placeholder label="Athlete detail" />} />
          <Route path="posts" element={<Placeholder label="Review posts" />} />
          <Route path="post-types" element={<Placeholder label="Post types" />} />
          <Route path="packages" element={<Placeholder label="Packages" />} />
          <Route path="vouchers" element={<Placeholder label="Vouchers" />} />
        </Route>

        <Route
          path="/athlete"
          element={
            <ProtectedRoute role="athlete">
              <AthleteLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="posts" element={<MyPosts />} />
          <Route path="submit" element={<CreatePost />} />
          <Route path="points" element={<PointsDashboard />} />
          <Route path="vouchers" element={<VoucherRedemption />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
