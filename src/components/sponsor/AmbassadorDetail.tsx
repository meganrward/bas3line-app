import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  loadAmbassadorProfile,
  loadInstagramAnalytics,
  updateAmbassadorProfile,
} from '../../lib/queries';
import { SalesCommissions } from './SalesCommissions';
import { usePadelClubs } from '../../hooks/usePadelClubs';
import { useRankings } from '../../hooks/useRankings';
import { RankingsTable } from '../shared/RankingsTable';
import { formatLastUpdated, latestFetchedAt } from '../../lib/profile.utils';
import { ClubPicker } from '../shared/ClubPicker';
import { buildProfileSubtitle, normalizeOptionalText } from '../../lib/clubs.utils';
import { AmbassadorProfileData, InstagramAnalyticsData } from '../../lib/queryTypes';
import { InstagramPost, AmbassadorRanking } from '../../lib/types';
import {
  buildInstagramKpis,
  formatFollowerGrowth,
  formatNullable,
  formatNumber,
} from './AmbassadorDetail.utils';

type Tab = 'instagram' | 'rankings' | 'sales';

export function AmbassadorDetail() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<AmbassadorProfileData | null>(null);
  const [tab, setTab] = useState<Tab>('instagram');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!id) return;
      setProfile(await loadAmbassadorProfile(id));
      setLoading(false);
    }
    fetch();
  }, [id]);

  if (loading) return <div className="spinner" />;
  if (!profile) return <p className="alert-error">Ambassador not found.</p>;

  const subtitle = buildProfileSubtitle(profile);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link to="/sponsor/ambassadors" className="text-sm text-gray-400 hover:text-gray-600">
          Ambassadors
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600">{profile.full_name ?? '—'}</span>
      </div>

      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="heading-page">{profile.full_name ?? '—'}</h1>
          {subtitle && <p className="text-muted">{subtitle}</p>}
          {profile.instagram_handle && (
            <p className="text-sm text-gray-400">@{profile.instagram_handle}</p>
          )}
        </div>
        <button className="btn-secondary text-sm mt-1" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing && (
        <EditPanel
          ambassadorId={id!}
          profile={profile}
          onSave={(updated: Partial<AmbassadorProfileData>) => {
            setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
            setEditing(false);
          }}
        />
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(['instagram', 'rankings', 'sales'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'instagram' && 'Instagram'}
            {t === 'rankings' && 'Rankings'}
            {t === 'sales' && 'Sales & Commissions'}
          </button>
        ))}
      </div>

      {tab === 'instagram' && <InstagramTab instagramUserId={profile.instagram_user_id} />}
      {tab === 'rankings' && (
        <RankingsTab
          ambassadorId={id!}
          fipPlayerSlug={profile.fip_player_slug}
          ltaPlayerId={profile.lta_player_id}
        />
      )}
      {tab === 'sales' && <SalesCommissions ambassadorId={id!} />}
    </div>
  );
}

function EditPanel({
  ambassadorId,
  profile,
  onSave,
}: Readonly<{
  ambassadorId: string;
  profile: AmbassadorProfileData;
  onSave: (updated: Partial<AmbassadorProfileData>) => void;
}>) {
  const [gender, setGender] = useState<'male' | 'female' | ''>(profile.gender ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [instagramHandle, setInstagramHandle] = useState(profile.instagram_handle ?? '');
  const [instagramUserId, setInstagramUserId] = useState(profile.instagram_user_id ?? '');
  const [fipSlug, setFipSlug] = useState(profile.fip_player_slug ?? '');
  const [ltaMembershipNumber, setLtaMembershipNumber] = useState(
    profile.lta_membership_number ?? '',
  );
  const [ltaPlayerId, setLtaPlayerId] = useState(profile.lta_player_id ?? '');
  const [discountCode, setDiscountCode] = useState(profile.discount_code ?? '');
  const [commissionRate, setCommissionRate] = useState(
    profile.commission_rate != null ? String(profile.commission_rate) : '10',
  );
  const [teamRole, setTeamRole] = useState(profile.team_role ?? '');
  const [trainingLocation, setTrainingLocation] = useState(profile.training_location ?? '');
  const [homeClubId, setHomeClubId] = useState(profile.home_club_id ?? '');
  const { clubs, addClub } = usePadelClubs();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const parsedRate = parseFloat(commissionRate);
    const fields = {
      gender: (gender || null) as 'male' | 'female' | null,
      bio: bio.trim() || null,
      instagram_handle: instagramHandle.trim() || null,
      instagram_user_id: instagramUserId.trim() || null,
      fip_player_slug: fipSlug.trim() || null,
      lta_membership_number: ltaMembershipNumber.trim() || null,
      lta_player_id: ltaPlayerId.trim() || null,
      discount_code: discountCode.trim().toLowerCase() || null,
      commission_rate: isNaN(parsedRate) ? null : parsedRate,
      team_role: normalizeOptionalText(teamRole),
      training_location: normalizeOptionalText(trainingLocation),
      home_club_id: homeClubId || null,
    };

    const { error: saveError } = await updateAmbassadorProfile(ambassadorId, fields);
    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }

    const homeClub =
      clubs.find((club) => club.id === homeClubId) ??
      (profile.home_club?.id === homeClubId ? profile.home_club : null);
    onSave({ ...fields, home_club: homeClub });
  }

  return (
    <div className="card p-5 mb-6">
      {error && <p className="alert-error mb-4">{error}</p>}
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Gender</label>
            <select
              className="input"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
            >
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div>
            <label className="input-label">FIP player slug</label>
            <input
              className="input"
              value={fipSlug}
              onChange={(e) => setFipSlug(e.target.value)}
              placeholder="megan-ward"
            />
            <p className="text-xs text-gray-400 mt-1">
              From padelfip.com/player/<em>slug</em>/
            </p>
          </div>
          <div>
            <label className="input-label">LTA membership number</label>
            <input
              className="input"
              value={ltaMembershipNumber}
              onChange={(e) => setLtaMembershipNumber(e.target.value)}
              placeholder="118985501"
            />
            <p className="text-xs text-gray-400 mt-1">The number on their LTA membership card</p>
          </div>
          <div>
            <label className="input-label">LTA competitions UUID</label>
            <input
              className="input"
              value={ltaPlayerId}
              onChange={(e) => setLtaPlayerId(e.target.value)}
              placeholder="bc84334e-5412-4154-99f6-467b897c184d"
            />
            <p className="text-xs text-gray-400 mt-1">
              From competitions.lta.org.uk/player-profile/<em>uuid</em>/ — needed for the rankings
              API
            </p>
          </div>
          <div>
            <label className="input-label">Instagram handle</label>
            <input
              className="input"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="meganward"
            />
          </div>
          <div>
            <label className="input-label">Instagram user ID</label>
            <input
              className="input"
              value={instagramUserId}
              onChange={(e) => setInstagramUserId(e.target.value)}
              placeholder="17841400000000000"
            />
            <p className="text-xs text-gray-400 mt-1">
              Numeric Meta ID — ask your colleague, it's in the monitor's ambassadors table
            </p>
          </div>
          <div>
            <label className="input-label">WooCommerce discount code</label>
            <input
              className="input"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="megan10"
            />
            <p className="text-xs text-gray-400 mt-1">
              The ambassador's discount code in the WordPress store (stored lowercase)
            </p>
          </div>
          <div>
            <label className="input-label">Commission rate (%)</label>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="10"
            />
            <p className="text-xs text-gray-400 mt-1">
              Percentage of order total paid as commission
            </p>
          </div>
          <div>
            <label htmlFor="team-role" className="input-label">
              Team role
            </label>
            <input
              id="team-role"
              className="input"
              value={teamRole}
              onChange={(e) => setTeamRole(e.target.value)}
              placeholder="Team captain"
            />
            <p className="text-hint mt-1">Shown on the ambassador's profile</p>
          </div>
          <div>
            <label htmlFor="training-location" className="input-label">
              City / region
            </label>
            <input
              id="training-location"
              className="input"
              value={trainingLocation}
              onChange={(e) => setTrainingLocation(e.target.value)}
              placeholder="Leeds, Yorkshire"
            />
          </div>
          <div className="sm:col-span-2">
            <ClubPicker
              id="home-club"
              clubs={clubs}
              value={homeClubId}
              onChange={setHomeClubId}
              onAddClub={addClub}
            />
          </div>
        </div>
        <div>
          <label className="input-label">Bio</label>
          <textarea
            className="input"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function RankingsTab({
  ambassadorId,
  fipPlayerSlug,
  ltaPlayerId,
}: Readonly<{
  ambassadorId: string;
  fipPlayerSlug: string | null;
  ltaPlayerId: string | null;
}>) {
  const { data, loading, fipRefreshing, ltaRefreshing, refreshFip, refreshLta, removeLta } =
    useRankings(ambassadorId, fipPlayerSlug, ltaPlayerId);

  if (loading) return <div className="spinner" />;

  return (
    <div className="flex flex-col gap-6">
      {/* FIP */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-section">FIP ranking</h2>
          {fipPlayerSlug && (
            <button className="btn-secondary text-xs" onClick={refreshFip} disabled={fipRefreshing}>
              {fipRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
        <FipRankings playerSlug={fipPlayerSlug} rankings={data.fip} />
      </div>

      {/* LTA */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-section">LTA rankings</h2>
          {ltaPlayerId && (
            <button className="btn-secondary text-xs" onClick={refreshLta} disabled={ltaRefreshing}>
              {ltaRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
        {data.lta.length > 0 && <RankingsTable rankings={data.lta} onRemove={removeLta} />}
      </div>
    </div>
  );
}

function FipRankings({
  playerSlug,
  rankings,
}: Readonly<{
  playerSlug: string | null;
  rankings: AmbassadorRanking[];
}>) {
  if (!playerSlug) {
    return (
      <p className="text-sm text-gray-400">
        No FIP player slug set — add it via the Edit button above.
      </p>
    );
  }

  if (rankings.length === 0) {
    return <p className="text-sm text-gray-400">No data yet. Click Refresh to fetch from FIP.</p>;
  }

  return (
    <>
      <RankingsTable rankings={rankings} />
      <p className="text-xs text-gray-300 mt-3">{formatLastUpdated(latestFetchedAt(rankings))}</p>
    </>
  );
}

function InstagramTab({ instagramUserId }: Readonly<{ instagramUserId: string | null }>) {
  const [data, setData] = useState<InstagramAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!instagramUserId) {
        setLoading(false);
        return;
      }
      setData(await loadInstagramAnalytics(instagramUserId));
      setLoading(false);
    }
    fetch();
  }, [instagramUserId]);

  if (!instagramUserId) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm">
        No Instagram account linked for this ambassador.
      </div>
    );
  }

  if (loading) return <div className="spinner" />;

  const posts = data?.posts ?? [];
  const dailyMetrics = data?.dailyMetrics ?? [];

  const kpis = buildInstagramKpis(posts, dailyMetrics, new Date());

  return (
    <div className="flex flex-col gap-6">
      {posts.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          No Instagram data yet. Make sure the monitor connection is configured.
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Posts (30d)" value={String(kpis.postCount)} />
            <KpiCard
              label="Avg engagement"
              value={formatNullable(
                kpis.averageEngagement,
                (engagement) => `${engagement.toFixed(1)}%`,
              )}
            />
            <KpiCard
              label="Avg reach / post"
              value={formatNullable(kpis.averageReach, (reach) => formatNumber(Math.round(reach)))}
            />
            <KpiCard
              label="Follower growth (30d)"
              value={formatFollowerGrowth(kpis.followerGrowth)}
            />
          </div>

          {/* Recent posts table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="heading-section">Recent posts</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-col-header">Date</th>
                  <th className="table-col-header">Type</th>
                  <th className="table-col-header text-right">Likes</th>
                  <th className="table-col-header text-right">Saves</th>
                  <th className="table-col-header text-right">Reach</th>
                  <th className="table-col-header text-right">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {posts.slice(0, 30).map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function PostRow({ post }: Readonly<{ post: InstagramPost }>) {
  const date = post.timestamp
    ? new Date(post.timestamp).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })
    : '—';

  const mediaLabel: Record<string, string> = {
    IMAGE: 'Post',
    CAROUSEL_ALBUM: 'Carousel',
    VIDEO: 'Video',
    REEL: 'Reel',
    STORY: 'Story',
  };

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2.5 text-gray-500">{date}</td>
      <td className="px-4 py-2.5 text-gray-500">
        {post.media_type ? (mediaLabel[post.media_type] ?? post.media_type) : '—'}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {formatNullable(post.likes, formatNumber)}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {formatNullable(post.saves, formatNumber)}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {formatNullable(post.reach, formatNumber)}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {formatNullable(post.engagement_rate, (rate) => `${rate.toFixed(1)}%`)}
      </td>
    </tr>
  );
}
