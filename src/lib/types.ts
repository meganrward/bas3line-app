// ─── Row types ────────────────────────────────────────────────────────────────

export type UserRole = 'sponsor' | 'athlete';
export type PostStatus = 'pending' | 'approved' | 'rejected';

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

export interface SponsorshipPackage {
  id: string;
  sponsor_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface AthleteProfile {
  id: string;
  sponsor_id: string;
  package_id: string | null;
  ranking: string | null;
  clubs: string | null;
  training_location: string | null;
  racket_model: string | null;
  bio: string | null;
  instagram_handle: string | null;
  points_balance: number;
  created_at: string;
}

export interface PostType {
  id: string;
  sponsor_id: string;
  name: string;
  points_value: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  athlete_id: string;
  post_type_id: string;
  title: string;
  content: string | null;
  link_url: string | null;
  status: PostStatus;
  points_awarded: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PointsTransaction {
  id: string;
  athlete_id: string;
  post_id: string | null;
  points: number;
  description: string | null;
  created_at: string;
}

export interface VoucherCode {
  id: string;
  sponsor_id: string;
  code: string;
  points_required: number;
  description: string | null;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

// ─── Joined / extended types used in the UI ───────────────────────────────────

export interface AthleteProfileWithDetails extends AthleteProfile {
  profiles: Pick<Profile, 'full_name' | 'avatar_url'>;
  sponsorship_packages: Pick<SponsorshipPackage, 'name'> | null;
}

export interface PostWithDetails extends Post {
  post_types: Pick<PostType, 'name' | 'points_value'>;
  profiles: Pick<Profile, 'full_name'>;
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
      sponsorship_packages: {
        Row: SponsorshipPackage;
        Insert: Omit<SponsorshipPackage, 'id' | 'created_at'>;
        Update: Partial<Omit<SponsorshipPackage, 'id' | 'created_at'>>;
      };
      athlete_profiles: {
        Row: AthleteProfile;
        Insert: Omit<AthleteProfile, 'created_at' | 'points_balance'> & { points_balance?: number };
        Update: Partial<Omit<AthleteProfile, 'id' | 'created_at'>>;
      };
      post_types: {
        Row: PostType;
        Insert: Omit<PostType, 'id' | 'created_at'>;
        Update: Partial<Omit<PostType, 'id' | 'created_at'>>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, 'id' | 'created_at' | 'status' | 'points_awarded' | 'reviewed_by' | 'reviewed_at'>;
        Update: Partial<Omit<Post, 'id' | 'created_at'>>;
      };
      points_transactions: {
        Row: PointsTransaction;
        Insert: Omit<PointsTransaction, 'id' | 'created_at'>;
        Update: never;
      };
      voucher_codes: {
        Row: VoucherCode;
        Insert: Omit<VoucherCode, 'id' | 'created_at' | 'is_used' | 'used_by' | 'used_at'>;
        Update: Partial<Omit<VoucherCode, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      redeem_voucher: {
        Args: { voucher_id: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
  };
};
