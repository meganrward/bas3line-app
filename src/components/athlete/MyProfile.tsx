import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ProfileData {
  full_name: string | null;
  bio: string | null;
  ranking: string | null;
  clubs: string | null;
  training_location: string | null;
  racket_brand: string | null;
  racket_model: string | null;
  instagram_handle: string | null;
  points_balance: number;
  package_name: string | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? <span className="text-gray-400 italic">Not set</span>}</dd>
    </div>
  );
}

export function MyProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const result = await supabase
        .from('athlete_profiles')
        .select(`
          bio, ranking, clubs, training_location,
          racket_brand, racket_model, instagram_handle, points_balance,
          profiles!inner(full_name),
          sponsorship_packages(name)
        `)
        .eq('id', user!.id)
        .maybeSingle();

      if (result.error) { setError(result.error.message); setLoading(false); return; }
      if (!result.data) { setError('Profile not set up yet — ask your sponsor to check the invite.'); setLoading(false); return; }

      const athleteProfile = result.data as any;
      setProfileData({
        full_name: athleteProfile.profiles?.full_name ?? null,
        bio: athleteProfile.bio,
        ranking: athleteProfile.ranking,
        clubs: athleteProfile.clubs,
        training_location: athleteProfile.training_location,
        racket_brand: athleteProfile.racket_brand,
        racket_model: athleteProfile.racket_model,
        instagram_handle: athleteProfile.instagram_handle,
        points_balance: athleteProfile.points_balance,
        package_name: athleteProfile.sponsorship_packages?.name ?? null,
      });
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!profileData) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{profileData.full_name ?? 'My Profile'}</h1>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-50 text-brand-700">
          {profileData.points_balance} pts
        </span>
      </div>

      {profileData.bio && (
        <p className="text-sm text-gray-600 leading-relaxed">{profileData.bio}</p>
      )}

      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Sponsorship</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Package" value={profileData.package_name} />
          </dl>
        </div>

        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Sport</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Ranking" value={profileData.ranking} />
            <Field label="Racket" value={profileData.racket_brand && profileData.racket_model ? `${profileData.racket_brand} ${profileData.racket_model}` : profileData.racket_brand ?? profileData.racket_model} />
          </dl>
        </div>

        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Location</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Trains at" value={profileData.training_location} />
            <Field label="Clubs" value={profileData.clubs} />
          </dl>
        </div>

        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Social</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Instagram" value={profileData.instagram_handle ? `@${profileData.instagram_handle}` : null} />
          </dl>
        </div>
      </div>
    </div>
  );
}
