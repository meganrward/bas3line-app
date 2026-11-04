import { DailyMetric, InstagramPost } from '../../lib/types';

const RECENT_WINDOW_DAYS = 30;
const EMPTY_VALUE = '—';

export interface InstagramKpis {
  postCount: number;
  averageEngagement: number | null;
  averageReach: number | null;
  followerGrowth: number | null;
}

export function formatNumber(value: number): string {
  return String(value);
}

export function formatNullable<T>(value: T | null, format: (present: T) => string): string {
  return value === null ? EMPTY_VALUE : format(value);
}

export function formatRankingCategory(category: string | null): string {
  if (!category) return 'Open';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function formatFollowerGrowth(growth: number | null): string {
  if (growth === null) return EMPTY_VALUE;
  const sign = growth >= 0 ? '+' : '';
  return `${sign}${formatNumber(growth)}`;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function selectRecentPosts(posts: InstagramPost[], now: Date): InstagramPost[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RECENT_WINDOW_DAYS);
  return posts.filter((post) => post.timestamp && new Date(post.timestamp) >= cutoff);
}

// dailyMetrics is ordered newest first, so index 0 is today and the last
// index of the 30-day window is RECENT_WINDOW_DAYS - 1.
export function calculateFollowerGrowth(dailyMetrics: DailyMetric[]): number | null {
  const recent = dailyMetrics[0]?.follower_count ?? null;
  const old = dailyMetrics[RECENT_WINDOW_DAYS - 1]?.follower_count ?? null;
  if (recent === null || old === null) return null;
  return recent - old;
}

export function buildInstagramKpis(
  posts: InstagramPost[],
  dailyMetrics: DailyMetric[],
  now: Date,
): InstagramKpis {
  const recentPosts = selectRecentPosts(posts, now);
  return {
    postCount: recentPosts.length,
    averageEngagement: average(recentPosts.map((post) => post.engagement_rate ?? 0)),
    averageReach: average(recentPosts.map((post) => post.reach ?? 0)),
    followerGrowth: calculateFollowerGrowth(dailyMetrics),
  };
}
