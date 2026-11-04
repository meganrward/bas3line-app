import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loadAmbassadorProfile } from '../../lib/queries';
import { AmbassadorProfileData } from '../../lib/queryTypes';
import { buildProfileSubtitle } from '../../lib/clubs.utils';
import { INSTAGRAM_CONNECT_URL } from '../../lib/links';
import { profileDetailRows } from '../../lib/profile.utils';
import { MyProfileEditForm } from './MyProfileEditForm';
import { MyRankings } from './MyRankings';

function InstagramCard({ handle }: Readonly<{ handle: string | null }>) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <h2 className="heading-section">Instagram</h2>
      <p className="text-muted">
        {handle ? `@${handle}` : 'No Instagram handle linked yet.'} Connect your account so your
        engagement can be tracked.
      </p>
      <div>
        <a
          href={INSTAGRAM_CONNECT_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary inline-block"
        >
          Connect Instagram
        </a>
      </div>
    </div>
  );
}

export function MyProfile() {
  const { user } = useAuth();
  const ambassadorId = user?.id;
  const [profile, setProfile] = useState<AmbassadorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!ambassadorId) return;
      setProfile(await loadAmbassadorProfile(ambassadorId));
      setLoading(false);
    }
    load();
  }, [ambassadorId]);

  if (loading) return <div className="spinner" />;
  if (!ambassadorId || !profile) {
    return <p className="alert-error">Your ambassador profile isn&apos;t set up yet.</p>;
  }

  const subtitle = buildProfileSubtitle(profile);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="heading-page">{profile.full_name ?? 'Your Profile'}</h1>
          {subtitle && <p className="text-muted">{subtitle}</p>}
        </div>
        {!editing && (
          <button className="btn-secondary text-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <MyProfileEditForm
          ambassadorId={ambassadorId}
          profile={profile}
          onSaved={(updated) => {
            setProfile((previous) => (previous ? { ...previous, ...updated } : previous));
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <dl className="card p-5 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
          {profileDetailRows(profile).map((row) => (
            <div key={row.label} className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
              <dt className="input-label">{row.label}</dt>
              <dd className="sm:col-span-2">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <MyRankings
        ambassadorId={ambassadorId}
        fipPlayerSlug={profile.fip_player_slug}
        ltaPlayerId={profile.lta_player_id}
      />

      <InstagramCard handle={profile.instagram_handle} />
    </div>
  );
}
