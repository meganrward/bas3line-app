import { AmbassadorRanking, InstagramPost, DailyMetric } from './types';

export interface AmbassadorListItem {
  id: string;
  full_name: string | null;
  instagram_handle: string | null;
  fip_player_slug: string | null;
  lta_membership_number: string | null;
  lta_player_id: string | null;
}

export interface AmbassadorProfileData {
  full_name: string | null;
  bio: string | null;
  instagram_handle: string | null;
  instagram_user_id: string | null;
  fip_player_slug: string | null;
  lta_membership_number: string | null;
  lta_player_id: string | null;
}

export interface InstagramAnalyticsData {
  posts: InstagramPost[];
  dailyMetrics: DailyMetric[];
}

export interface RankingsData {
  fip: AmbassadorRanking[];
  lta: AmbassadorRanking[];
}
