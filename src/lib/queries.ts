import { supabase } from "./supabase";
import { supabaseMonitor } from "./supabaseMonitor";
import {
  AmbassadorListItem,
  AmbassadorProfileData,
  InstagramAnalyticsData,
  RankingsData,
} from "./queryTypes";
import { InstagramPost, DailyMetric, AmbassadorRanking } from "./types";

// ─── Sponsor queries ───────────────────────────────────────────────────────────

export async function loadAmbassadors(): Promise<AmbassadorListItem[]> {
  const result = await supabase
    .from("ambassador_profiles")
    .select("id, instagram_handle, fip_player_slug, lta_player_id, profiles(full_name)")
    .order("id");

  return ((result.data ?? []) as any[]).map((row) => ({
    id: row.id,
    full_name: row.profiles?.full_name ?? null,
    instagram_handle: row.instagram_handle,
    fip_player_slug: row.fip_player_slug,
    lta_player_id: row.lta_player_id,
  }));
}

export async function loadAmbassadorProfile(
  ambassadorId: string,
): Promise<AmbassadorProfileData | null> {
  const result = await (supabase as any)
    .from("ambassador_profiles")
    .select("bio, instagram_handle, instagram_user_id, fip_player_slug, lta_player_id, profiles(full_name)")
    .eq("id", ambassadorId)
    .single();

  if (result.error || !result.data) return null;

  const row = result.data as any;
  return {
    full_name: row.profiles?.full_name ?? null,
    bio: row.bio,
    instagram_handle: row.instagram_handle,
    instagram_user_id: row.instagram_user_id,
    fip_player_slug: row.fip_player_slug,
    lta_player_id: row.lta_player_id,
  };
}

export async function getAmbassadorIds(sponsorId: string): Promise<string[]> {
  const result = await supabase
    .from("ambassador_profiles")
    .select("id")
    .eq("sponsor_id", sponsorId);
  return ((result.data ?? []) as any[]).map((row) => row.id);
}

// ─── Rankings queries ──────────────────────────────────────────────────────────

export async function loadRankings(ambassadorId: string): Promise<RankingsData> {
  const result = await supabase
    .from("ambassador_rankings")
    .select("*")
    .eq("ambassador_id", ambassadorId)
    .order("fetched_at", { ascending: false });

  const rows = (result.data ?? []) as AmbassadorRanking[];
  return {
    fip: rows.filter((r) => r.source === "fip"),
    lta: rows.filter((r) => r.source === "lta"),
  };
}

export async function refreshFipRanking(
  ambassadorId: string,
  fipPlayerSlug: string,
): Promise<RankingsData["fip"]> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return [];

  const res = await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-fip-ranking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ slug: fipPlayerSlug, ambassador_id: ambassadorId }),
    },
  );

  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as AmbassadorRanking[];
}

export async function refreshLtaRanking(
  ambassadorId: string,
  ltaPlayerId: string,
): Promise<RankingsData["lta"]> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return [];

  const res = await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-lta-ranking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ player_id: ltaPlayerId, ambassador_id: ambassadorId }),
    },
  );

  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as AmbassadorRanking[];
}

// ─── Instagram analytics queries (from bas3line-ambassador-monitor) ────────────

export async function loadInstagramAnalytics(
  instagramUserId: string,
): Promise<InstagramAnalyticsData> {
  if (!supabaseMonitor) {
    return { posts: [], dailyMetrics: [] };
  }

  const [postsResult, metricsResult] = await Promise.all([
    supabaseMonitor
      .from("posts")
      .select("*")
      .eq("ambassador_id", instagramUserId)
      .order("timestamp", { ascending: false })
      .limit(90),
    supabaseMonitor
      .from("daily_metrics")
      .select("*")
      .eq("ambassador_id", instagramUserId)
      .order("date", { ascending: false })
      .limit(90),
  ]);

  return {
    posts: (postsResult.data ?? []) as InstagramPost[],
    dailyMetrics: (metricsResult.data ?? []) as DailyMetric[],
  };
}

// ─── Ambassador-side queries ───────────────────────────────────────────────────

export async function loadAmbassadorSponsorId(
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("ambassador_profiles")
    .select("sponsor_id")
    .eq("id", userId)
    .single();
  return (data as { sponsor_id: string } | null)?.sponsor_id ?? null;
}
