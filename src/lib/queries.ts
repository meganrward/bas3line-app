import { supabase } from './supabase';
import { supabaseMonitor } from './supabaseMonitor';
import {
  AmbassadorListItem,
  AmbassadorProfileData,
  InstagramAnalyticsData,
  RankingsData,
} from './queryTypes';
import {
  InstagramPost,
  DailyMetric,
  AmbassadorRanking,
  CommissionBalance,
  DiscountCodeSale,
  PadelClub,
  PayoutQueueItem,
  PayoutRequest,
  PayoutType,
} from './types';
import { NewClubInput, normalizeOptionalText } from './clubs.utils';

// ─── Sponsor queries ───────────────────────────────────────────────────────────

export async function loadAmbassadors(): Promise<AmbassadorListItem[]> {
  const result = await supabase
    .from('ambassador_profiles')
    .select(
      'id, gender, instagram_handle, fip_player_slug, lta_membership_number, lta_player_id, profiles(full_name)',
    )
    .order('id');

  return ((result.data ?? []) as any[]).map((row) => ({
    id: row.id,
    full_name: row.profiles?.full_name ?? null,
    gender: row.gender,
    instagram_handle: row.instagram_handle,
    fip_player_slug: row.fip_player_slug,
    lta_membership_number: row.lta_membership_number,
    lta_player_id: row.lta_player_id,
  }));
}

export async function loadAmbassadorProfile(
  ambassadorId: string,
): Promise<AmbassadorProfileData | null> {
  const result = await (supabase as any)
    .from('ambassador_profiles')
    .select(
      'gender, bio, instagram_handle, instagram_user_id, fip_player_slug, lta_membership_number, lta_player_id, discount_code, commission_rate, team_role, training_location, home_club_id, home_club:padel_clubs(id, name, town), profiles(full_name)',
    )
    .eq('id', ambassadorId)
    .single();

  if (result.error || !result.data) return null;

  const row = result.data as any;
  return {
    full_name: row.profiles?.full_name ?? null,
    gender: row.gender,
    bio: row.bio,
    instagram_handle: row.instagram_handle,
    instagram_user_id: row.instagram_user_id,
    fip_player_slug: row.fip_player_slug,
    lta_membership_number: row.lta_membership_number,
    lta_player_id: row.lta_player_id,
    discount_code: row.discount_code,
    commission_rate: row.commission_rate,
    team_role: row.team_role,
    training_location: row.training_location,
    home_club_id: row.home_club_id,
    home_club: row.home_club ?? null,
  };
}

export async function getAmbassadorIds(sponsorId: string): Promise<string[]> {
  const result = await supabase
    .from('ambassador_profiles')
    .select('id')
    .eq('sponsor_id', sponsorId);
  return ((result.data ?? []) as any[]).map((row) => row.id);
}

// ─── Rankings queries ──────────────────────────────────────────────────────────

export async function loadRankings(ambassadorId: string): Promise<RankingsData> {
  const result = await supabase
    .from('ambassador_rankings')
    .select('*')
    .eq('ambassador_id', ambassadorId)
    .order('fetched_at', { ascending: false });

  const rows = (result.data ?? []) as AmbassadorRanking[];
  return {
    fip: rows.filter((r) => r.source === 'fip'),
    lta: rows.filter((r) => r.source === 'lta'),
  };
}

export async function refreshFipRanking(
  ambassadorId: string,
  fipPlayerSlug: string,
): Promise<RankingsData['fip']> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return [];

  const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-fip-ranking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ slug: fipPlayerSlug, ambassador_id: ambassadorId }),
  });

  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as AmbassadorRanking[];
}

export async function refreshLtaRanking(
  ambassadorId: string,
  ltaPlayerId: string,
): Promise<RankingsData['lta']> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return [];

  const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-lta-ranking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ player_id: ltaPlayerId, ambassador_id: ambassadorId }),
  });

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
      .from('posts')
      .select('*')
      .eq('ambassador_id', instagramUserId)
      .order('timestamp', { ascending: false })
      .limit(90),
    supabaseMonitor
      .from('daily_metrics')
      .select('*')
      .eq('ambassador_id', instagramUserId)
      .order('date', { ascending: false })
      .limit(90),
  ]);

  return {
    posts: (postsResult.data ?? []) as InstagramPost[],
    dailyMetrics: (metricsResult.data ?? []) as DailyMetric[],
  };
}

export async function deleteRanking(rankingId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('ambassador_rankings').delete().eq('id', rankingId);
  return { error: error?.message ?? null };
}

export async function fetchDiscountCodeSales(ambassadorId: string): Promise<DiscountCodeSale[]> {
  const { data } = await supabase
    .from('discount_code_sales')
    .select('*')
    .eq('ambassador_id', ambassadorId)
    .order('sale_date', { ascending: false });
  return (data ?? []) as DiscountCodeSale[];
}

export async function updateAmbassadorProfile(
  ambassadorId: string,
  fields: {
    gender?: 'male' | 'female' | null;
    bio?: string | null;
    instagram_handle?: string | null;
    instagram_user_id?: string | null;
    fip_player_slug?: string | null;
    lta_membership_number?: string | null;
    lta_player_id?: string | null;
    discount_code?: string | null;
    commission_rate?: number | null;
    team_role?: string | null;
    training_location?: string | null;
    home_club_id?: string | null;
  },
): Promise<{ error: string | null }> {
  const { error } = await (supabase as any)
    .from('ambassador_profiles')
    .update(fields)
    .eq('id', ambassadorId);
  return { error: error?.message ?? null };
}

// ─── Padel club queries ────────────────────────────────────────────────────────

export async function loadPadelClubs(): Promise<PadelClub[]> {
  const { data } = await supabase.from('padel_clubs').select('*').order('name');
  return (data ?? []) as PadelClub[];
}

const UNIQUE_VIOLATION = '23505';

export async function addPadelClub(
  input: NewClubInput,
): Promise<{ club: PadelClub | null; error: string | null }> {
  // Cast like updateAmbassadorProfile: the typed client resolves writes to `never` here.
  const { data, error } = await (supabase as any)
    .from('padel_clubs')
    .insert({ name: input.name.trim(), town: normalizeOptionalText(input.town) })
    .select()
    .single();

  if (error) {
    return {
      club: null,
      error: error.code === UNIQUE_VIOLATION ? 'That club is already in the list.' : error.message,
    };
  }
  return { club: data as PadelClub, error: null };
}

// ─── Ambassador-side queries ───────────────────────────────────────────────────

export async function loadAmbassadorSponsorId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('ambassador_profiles')
    .select('sponsor_id')
    .eq('id', userId)
    .single();
  return (data as { sponsor_id: string } | null)?.sponsor_id ?? null;
}

// ─── Redeem commission (ambassador) ──────────────────────────────────────────────────

export async function fetchCommissionBalance(ambassadorId: string): Promise<CommissionBalance> {
  const { data } = await (supabase as any)
    .from('commission_balance')
    .select('total_earned, total_paid_out, balance')
    .eq('ambassador_id', ambassadorId)
    .maybeSingle();

  return {
    totalEarned: Number(data?.total_earned ?? 0),
    totalPaidOut: Number(data?.total_paid_out ?? 0),
    balance: Number(data?.balance ?? 0),
  };
}

// Balance minus requests still waiting for approval: the most they can ask for now.
export async function fetchAvailableBalance(): Promise<number> {
  const { data } = await (supabase as any).rpc('my_available_balance');
  return Number(data ?? 0);
}

export async function fetchPayoutRequests(ambassadorId: string): Promise<PayoutRequest[]> {
  const { data } = await (supabase as any)
    .from('payout_requests')
    .select(
      'id, request_type, amount, kit_credit_value, kit_item_name, kit_item_price, note, status, sponsor_note, created_at',
    )
    .eq('ambassador_id', ambassadorId)
    .order('created_at', { ascending: false });

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    amount: Number(row.amount),
    kit_credit_value: row.kit_credit_value == null ? null : Number(row.kit_credit_value),
    kit_item_price: row.kit_item_price == null ? null : Number(row.kit_item_price),
  }));
}

export async function requestPayout(input: {
  type: PayoutType;
  amount: number;
  note: string | null;
  kitItemId: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await (supabase as any).rpc('request_payout', {
    p_type: input.type,
    p_amount: input.amount,
    p_note: input.note,
    p_kit_item_id: input.kitItemId,
  });
  return { error: error?.message ?? null };
}

// ─── Payout review queue (sponsor) ─────────────────────────────────────────────

export async function fetchPayoutQueue(): Promise<PayoutQueueItem[]> {
  const [requestsResult, balancesResult] = await Promise.all([
    (supabase as any)
      .from('payout_requests')
      .select(
        'id, ambassador_id, request_type, amount, kit_credit_value, kit_item_name, kit_item_price, note, status, sponsor_note, created_at, ambassador:ambassador_profiles(profiles(full_name))',
      )
      .order('created_at', { ascending: false }),
    (supabase as any).from('commission_balance').select('ambassador_id, balance'),
  ]);

  const balanceByAmbassador = new Map<string, number>(
    ((balancesResult.data ?? []) as any[]).map((row) => [row.ambassador_id, Number(row.balance)]),
  );

  return ((requestsResult.data ?? []) as any[]).map((row) => {
    const { ambassador, ...request } = row;
    return {
      ...request,
      amount: Number(request.amount),
      kit_credit_value: request.kit_credit_value == null ? null : Number(request.kit_credit_value),
      kit_item_price: request.kit_item_price == null ? null : Number(request.kit_item_price),
      ambassador_name: ambassador?.profiles?.full_name ?? null,
      ambassador_balance: balanceByAmbassador.get(row.ambassador_id) ?? 0,
    };
  });
}

export async function approvePayout(requestId: string): Promise<{ error: string | null }> {
  const { error } = await (supabase as any).rpc('approve_payout', { p_request_id: requestId });
  return { error: error?.message ?? null };
}

export async function rejectPayout(
  requestId: string,
  sponsorNote: string | null,
): Promise<{ error: string | null }> {
  const { error } = await (supabase as any).rpc('reject_payout', {
    p_request_id: requestId,
    p_sponsor_note: sponsorNote,
  });
  return { error: error?.message ?? null };
}

export async function markPayoutPaid(requestId: string): Promise<{ error: string | null }> {
  const { error } = await (supabase as any).rpc('mark_payout_paid', { p_request_id: requestId });
  return { error: error?.message ?? null };
}
