import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  loadAmbassadorProfile,
  loadInstagramAnalytics,
  loadRankings,
  refreshFipRanking,
  refreshLtaRanking,
} from "../../lib/queries";
import { SalesCommissions } from "./SalesCommissions";
import { AmbassadorProfileData, InstagramAnalyticsData, RankingsData } from "../../lib/queryTypes";
import { InstagramPost, AmbassadorRanking } from "../../lib/types";

type Tab = "instagram" | "rankings" | "sales";

export function AmbassadorDetail() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<AmbassadorProfileData | null>(null);
  const [tab, setTab] = useState<Tab>("instagram");
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link to="/sponsor/ambassadors" className="text-sm text-gray-400 hover:text-gray-600">
          Ambassadors
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600">{profile.full_name ?? "—"}</span>
      </div>

      <h1 className="heading-page mb-1">{profile.full_name ?? "—"}</h1>
      {profile.instagram_handle && (
        <p className="text-sm text-gray-400 mb-6">@{profile.instagram_handle}</p>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(["instagram", "rankings", "sales"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "instagram" && "Instagram"}
            {t === "rankings" && "Rankings"}
            {t === "sales" && "Sales & Commissions"}
          </button>
        ))}
      </div>

      {tab === "instagram" && (
        <InstagramTab instagramUserId={profile.instagram_user_id} />
      )}
      {tab === "rankings" && (
        <RankingsTab
          ambassadorId={id!}
          fipPlayerSlug={profile.fip_player_slug}
          ltaPlayerId={profile.lta_player_id}
        />
      )}
      {tab === "sales" && <SalesCommissions />}
    </div>
  );
}

function RankingsTab({
  ambassadorId,
  fipPlayerSlug,
  ltaPlayerId,
}: {
  ambassadorId: string;
  fipPlayerSlug: string | null;
  ltaPlayerId: string | null;
}) {
  const [data, setData] = useState<RankingsData>({ fip: [], lta: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<"fip" | "lta" | null>(null);

  useEffect(() => {
    async function fetch() {
      setData(await loadRankings(ambassadorId));
      setLoading(false);
    }
    fetch();
  }, [ambassadorId]);

  async function handleRefreshFip() {
    if (!fipPlayerSlug) return;
    setRefreshing("fip");
    const fip = await refreshFipRanking(ambassadorId, fipPlayerSlug);
    setData((prev) => ({ ...prev, fip }));
    setRefreshing(null);
  }

  async function handleRefreshLta() {
    if (!ltaPlayerId) return;
    setRefreshing("lta");
    const lta = await refreshLtaRanking(ambassadorId, ltaPlayerId);
    setData((prev) => ({ ...prev, lta }));
    setRefreshing(null);
  }

  if (loading) return <div className="spinner" />;

  return (
    <div className="flex flex-col gap-6">
      {/* FIP */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-section">FIP ranking</h2>
          {fipPlayerSlug && (
            <button
              className="btn-secondary text-xs"
              onClick={handleRefreshFip}
              disabled={refreshing === "fip"}
            >
              {refreshing === "fip" ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
        {!fipPlayerSlug ? (
          <p className="text-sm text-gray-400">No FIP player slug set for this ambassador.</p>
        ) : data.fip.length === 0 ? (
          <p className="text-sm text-gray-400">
            No cached data yet. Click Refresh to fetch from FIP.
          </p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-col-header">Category</th>
                  <th className="table-col-header text-right">Rank</th>
                  <th className="table-col-header text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.fip.map((r) => (
                  <RankingRow key={r.id} ranking={r} />
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-300 mt-3">
              Updated {new Date(data.fip[0].fetched_at).toLocaleDateString()}
            </p>
          </>
        )}
      </div>

      {/* LTA */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-section">LTA rankings</h2>
          {ltaPlayerId && (
            <button
              className="btn-secondary text-xs"
              onClick={handleRefreshLta}
              disabled={refreshing === "lta"}
            >
              {refreshing === "lta" ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
        {!ltaPlayerId ? (
          <p className="text-sm text-gray-400">No LTA player ID set for this ambassador.</p>
        ) : data.lta.length === 0 ? (
          <p className="text-sm text-gray-400">
            No cached data yet. Click Refresh to fetch from LTA.
          </p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-col-header">Category</th>
                  <th className="table-col-header text-right">Rank</th>
                  <th className="table-col-header text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.lta.map((r) => (
                  <RankingRow key={r.id} ranking={r} />
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-300 mt-3">
              Updated {new Date(data.lta[0].fetched_at).toLocaleDateString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function RankingRow({ ranking }: { ranking: AmbassadorRanking }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-4 py-2.5 text-gray-700">{ranking.category ?? "Open"}</td>
      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
        {ranking.rank !== null ? `#${ranking.rank}` : "—"}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-500">
        {ranking.points_value !== null ? formatNumber(ranking.points_value) : "—"}
      </td>
    </tr>
  );
}

function InstagramTab({ instagramUserId }: { instagramUserId: string | null }) {
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

  const recentFollowers = dailyMetrics[0]?.follower_count ?? null;
  const oldFollowers = dailyMetrics[29]?.follower_count ?? null;
  const followerGrowth =
    recentFollowers !== null && oldFollowers !== null
      ? recentFollowers - oldFollowers
      : null;

  const last30Posts = posts.filter((p) => {
    if (!p.timestamp) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return new Date(p.timestamp) >= cutoff;
  });

  const avgEngagement =
    last30Posts.length > 0
      ? last30Posts.reduce((sum, p) => sum + (p.engagement_rate ?? 0), 0) /
        last30Posts.length
      : null;

  const avgReach =
    last30Posts.length > 0
      ? last30Posts.reduce((sum, p) => sum + (p.reach ?? 0), 0) /
        last30Posts.length
      : null;

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
            <KpiCard label="Posts (30d)" value={String(last30Posts.length)} />
            <KpiCard
              label="Avg engagement"
              value={avgEngagement !== null ? `${avgEngagement.toFixed(1)}%` : "—"}
            />
            <KpiCard
              label="Avg reach / post"
              value={avgReach !== null ? formatNumber(Math.round(avgReach)) : "—"}
            />
            <KpiCard
              label="Follower growth (30d)"
              value={
                followerGrowth !== null
                  ? `${followerGrowth >= 0 ? "+" : ""}${formatNumber(followerGrowth)}`
                  : "—"
              }
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function PostRow({ post }: { post: InstagramPost }) {
  const date = post.timestamp
    ? new Date(post.timestamp).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "—";

  const mediaLabel: Record<string, string> = {
    IMAGE: "Post",
    CAROUSEL_ALBUM: "Carousel",
    VIDEO: "Video",
    REEL: "Reel",
    STORY: "Story",
  };

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2.5 text-gray-500">{date}</td>
      <td className="px-4 py-2.5 text-gray-500">
        {post.media_type ? (mediaLabel[post.media_type] ?? post.media_type) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {post.likes !== null ? formatNumber(post.likes) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {post.saves !== null ? formatNumber(post.saves) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {post.reach !== null ? formatNumber(post.reach) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {post.engagement_rate !== null ? `${post.engagement_rate.toFixed(1)}%` : "—"}
      </td>
    </tr>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
