import { supabase } from "./supabase";
import {
  SponsorshipPackage,
  PostType,
  VoucherCode,
  PointsTransaction,
} from "./types";
import {
  AthleteListItem,
  AthleteProfileData,
  PendingPost,
  VoucherRow,
  PostRow,
  PointsDashboardData,
  AthleteVouchersData,
} from "./queryTypes";

// ─── Sponsor queries ───────────────────────────────────────────────────────────

export async function loadAthletes(): Promise<AthleteListItem[]> {
  const result = await supabase
    .from("athlete_profiles")
    .select(
      "id, points_balance, profiles(full_name), sponsorship_packages(name)",
    )
    .order("id");

  return ((result.data ?? []) as any[]).map((row) => ({
    id: row.id,
    full_name: row.profiles?.full_name ?? null,
    package_name: row.sponsorship_packages?.name ?? null,
    points_balance: row.points_balance,
  }));
}

export async function loadAthleteProfile(
  athleteId: string,
): Promise<AthleteProfileData | null> {
  const result = await (supabase as any)
    .from("athlete_profiles")
    .select("*, profiles(full_name), sponsorship_packages(name)")
    .eq("id", athleteId)
    .single();

  if (result.error || !result.data) return null;

  const row = result.data as any;
  return {
    full_name: row.profiles?.full_name ?? null,
    bio: row.bio,
    ranking: row.ranking,
    clubs: row.clubs,
    training_location: row.training_location,
    racket_model: row.racket_model,
    instagram_handle: row.instagram_handle,
    points_balance: row.points_balance,
    package_name: row.sponsorship_packages?.name ?? null,
    package_id: row.package_id ?? null,
  };
}

export async function loadPackages(
  sponsorId: string,
): Promise<SponsorshipPackage[]> {
  const result = await supabase
    .from("sponsorship_packages")
    .select("*")
    .eq("sponsor_id", sponsorId)
    .order("name");
  return (result.data ?? []) as SponsorshipPackage[];
}

export async function loadPostTypes(sponsorId: string): Promise<PostType[]> {
  const result = await supabase
    .from("post_types")
    .select("*")
    .eq("sponsor_id", sponsorId)
    .order("name");
  return (result.data ?? []) as PostType[];
}

export async function loadActivePostTypes(
  sponsorId: string,
): Promise<PostType[]> {
  const result = await supabase
    .from("post_types")
    .select("*")
    .eq("sponsor_id", sponsorId)
    .eq("is_active", true)
    .order("name");
  return (result.data ?? []) as PostType[];
}

export async function loadVouchers(sponsorId: string): Promise<VoucherRow[]> {
  const result = await supabase
    .from("voucher_codes")
    .select("*, profiles(full_name)")
    .eq("sponsor_id", sponsorId)
    .order("created_at", { ascending: false });

  return ((result.data ?? []) as any[]).map((row) => ({
    ...row,
    used_by_name: row.profiles?.full_name ?? null,
  }));
}

export async function getAthleteIds(sponsorId: string): Promise<string[]> {
  const result = await supabase
    .from("athlete_profiles")
    .select("id")
    .eq("sponsor_id", sponsorId);
  return ((result.data ?? []) as any[]).map((row) => row.id);
}

export async function loadPendingPosts(sponsorId: string): Promise<PendingPost[]> {
  const athleteIds = await getAthleteIds(sponsorId);
  if (athleteIds.length === 0) return [];

  const result = await supabase
    .from("posts")
    .select(
      "id, title, content, link_url, created_at, profiles(full_name), post_types(name, points_value)",
    )
    .eq("status", "pending")
    .in("athlete_id", athleteIds)
    .order("created_at", { ascending: true });

  return ((result.data ?? []) as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    link_url: row.link_url,
    created_at: row.created_at,
    athlete_name: row.profiles?.full_name ?? null,
    post_type_name: row.post_types?.name ?? "—",
    points_value: row.post_types?.points_value ?? 0,
  }));
}

// ─── Athlete queries ───────────────────────────────────────────────────────────

export async function loadMyAthleteProfile(
  userId: string,
): Promise<AthleteProfileData | null> {
  const result = await supabase
    .from("athlete_profiles")
    .select(
      `
      bio, ranking, clubs, training_location,
      racket_model, instagram_handle, points_balance,
      profiles!inner(full_name),
      sponsorship_packages(name)
    `,
    )
    .eq("id", userId)
    .maybeSingle();

  if (result.error || !result.data) return null;

  const row = result.data as any;
  return {
    full_name: row.profiles?.full_name ?? null,
    bio: row.bio,
    ranking: row.ranking,
    clubs: row.clubs,
    training_location: row.training_location,
    racket_model: row.racket_model,
    instagram_handle: row.instagram_handle,
    points_balance: row.points_balance,
    package_name: row.sponsorship_packages?.name ?? null,
    package_id: null,
  };
}

export async function loadMyPosts(userId: string): Promise<PostRow[]> {
  const { data } = await supabase
    .from("posts")
    .select(
      "id, title, content, link_url, status, points_awarded, created_at, post_types(name)",
    )
    .eq("athlete_id", userId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    post_type_name: row.post_types?.name ?? "—",
  }));
}

export async function loadPointsDashboard(
  userId: string,
): Promise<PointsDashboardData> {
  const [profileResult, transactionResult] = await Promise.all([
    supabase
      .from("athlete_profiles")
      .select("points_balance")
      .eq("id", userId)
      .single(),
    supabase
      .from("points_transactions")
      .select("*")
      .eq("athlete_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    balance: (profileResult.data as any)?.points_balance ?? 0,
    transactions: (transactionResult.data ?? []) as PointsTransaction[],
  };
}

export async function loadAthleteVouchers(
  userId: string,
): Promise<AthleteVouchersData> {
  const [profileResult, voucherResult] = await Promise.all([
    supabase
      .from("athlete_profiles")
      .select("points_balance")
      .eq("id", userId)
      .single(),
    supabase.from("voucher_codes").select("*").order("points_required"),
  ]);

  const balance = (profileResult.data as any)?.points_balance ?? 0;
  const all = (voucherResult.data ?? []) as VoucherCode[];

  return {
    balance,
    available: all
      .filter((v) => !v.is_used)
      .map((v) => ({ ...v, canAfford: balance >= v.points_required })),
    redeemed: all.filter((v) => v.is_used && v.used_by === userId),
  };
}

export async function loadAthleteSponsorId(
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("athlete_profiles")
    .select("sponsor_id")
    .eq("id", userId)
    .single();
  return (data as { sponsor_id: string } | null)?.sponsor_id ?? null;
}
