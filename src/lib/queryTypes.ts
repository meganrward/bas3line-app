import { VoucherCode, PostStatus, PointsTransaction } from './types';

export interface AthleteListItem {
  id: string;
  full_name: string | null;
  package_name: string | null;
  points_balance: number;
}

export interface AthleteProfileData {
  full_name: string | null;
  bio: string | null;
  ranking: string | null;
  clubs: string | null;
  training_location: string | null;
  racket_brand: string | null;
  racket_model: string | null;
  instagram_handle: string | null;
  points_balance: number;
  package_name: string | null;
  package_id: string | null;
}

export interface PendingPost {
  id: string;
  title: string;
  content: string | null;
  link_url: string | null;
  created_at: string;
  athlete_name: string | null;
  post_type_name: string;
  points_value: number;
}

export interface VoucherRow extends VoucherCode {
  used_by_name: string | null;
}

export interface PostRow {
  id: string;
  title: string;
  content: string | null;
  link_url: string | null;
  status: PostStatus;
  points_awarded: number | null;
  created_at: string;
  post_type_name: string;
}

export interface PointsDashboardData {
  balance: number;
  transactions: PointsTransaction[];
}

export interface AthleteVouchersData {
  balance: number;
  available: (VoucherCode & { canAfford: boolean })[];
  redeemed: VoucherCode[];
}
