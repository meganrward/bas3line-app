// ─── Row types ────────────────────────────────────────────────────────────────

export type UserRole = 'sponsor' | 'ambassador';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
}

export type StaffRole = 'manager' | 'athlete_manager' | 'ambassador_agent';

export interface SponsorStaff {
  id: string;
  user_id: string;
  sponsor_id: string;
  staff_role: StaffRole;
  created_at: string;
}

export interface AmbassadorProfile {
  id: string;
  sponsor_id: string;
  bio: string | null;
  instagram_handle: string | null;
  instagram_user_id: string | null;
  fip_player_slug: string | null;
  lta_player_id: string | null;
  created_at: string;
}

export interface AmbassadorRanking {
  id: string;
  ambassador_id: string;
  source: 'fip' | 'lta';
  category: string | null;
  rank: number | null;
  points_value: number | null;
  fetched_at: string;
}

// ─── Instagram analytics types (from bas3line-ambassador-monitor) ─────────────

export type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REEL' | 'STORY';

export interface InstagramPost {
  id: string;
  ambassador_id: string;
  media_type: InstagramMediaType | null;
  timestamp: string | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reach: number | null;
  impressions: number | null;
  engagement_rate: number | null;
  permalink: string | null;
  created_at: string;
}

export interface DailyMetric {
  id: string;
  ambassador_id: string;
  date: string;
  follower_count: number | null;
  created_at: string;
}

// ─── Supabase Database type (used to type the client) ─────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      sponsors: {
        Row: Sponsor;
        Insert: Omit<Sponsor, 'id' | 'created_at'>;
        Update: Partial<Omit<Sponsor, 'id' | 'created_at'>>;
      };
      sponsor_staff: {
        Row: SponsorStaff;
        Insert: Omit<SponsorStaff, 'id' | 'created_at'>;
        Update: Partial<Omit<SponsorStaff, 'id' | 'created_at'>>;
      };
      ambassador_profiles: {
        Row: AmbassadorProfile;
        Insert: Omit<AmbassadorProfile, 'created_at'>;
        Update: Partial<Omit<AmbassadorProfile, 'id' | 'created_at'>>;
      };
      ambassador_rankings: {
        Row: AmbassadorRanking;
        Insert: Omit<AmbassadorRanking, 'id' | 'fetched_at'>;
        Update: Partial<Omit<AmbassadorRanking, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
