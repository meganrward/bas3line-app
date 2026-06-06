import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SponsorLayout } from './components/layout/SponsorLayout';
import { AthleteLayout } from './components/layout/AthleteLayout';
import { AthletesList } from './components/sponsor/AthletesList';
import { AthleteDetail } from './components/sponsor/AthleteDetail';
import { AddAthleteForm } from './components/sponsor/AddAthleteForm';
import { PackageManager } from './components/sponsor/PackageManager';
import { PostTypeManager } from './components/sponsor/PostTypeManager';
import { PostsReviewFeed } from './components/sponsor/PostsReviewFeed';
import { VoucherManager } from './components/sponsor/VoucherManager';
import { MyProfile } from './components/athlete/MyProfile';
import { CreatePost } from './components/athlete/CreatePost';
import { MyPosts } from './components/athlete/MyPosts';
import { PointsDashboard } from './components/athlete/PointsDashboard';
import { VoucherRedemption } from './components/athlete/VoucherRedemption';

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
          <Route path="athletes" element={<AthletesList />} />
          <Route path="athletes/new" element={<AddAthleteForm />} />
          <Route path="athletes/:id" element={<AthleteDetail />} />
          <Route path="posts" element={<PostsReviewFeed />} />
          <Route path="post-types" element={<PostTypeManager />} />
          <Route path="packages" element={<PackageManager />} />
          <Route path="vouchers" element={<VoucherManager />} />
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
