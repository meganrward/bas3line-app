import { AmbassadorProfileData } from './queryTypes';
import { AmbassadorRanking } from './types';
import { formatClubLabel, normalizeOptionalText } from './clubs.utils';

export const NOT_SET = 'Not set';
export const MAX_BIO_LENGTH = 500;
export const MAX_LOCATION_LENGTH = 120;

export interface ProfileDetailRow {
  label: string;
  value: string;
}

type DetailSource = Pick<
  AmbassadorProfileData,
  'team_role' | 'home_club' | 'training_location' | 'bio'
>;

export function profileDetailRows(profile: DetailSource): ProfileDetailRow[] {
  return [
    { label: 'Team role', value: profile.team_role ?? NOT_SET },
    { label: 'Home club', value: profile.home_club ? formatClubLabel(profile.home_club) : NOT_SET },
    { label: 'City / region', value: profile.training_location ?? NOT_SET },
    { label: 'Bio', value: profile.bio ?? NOT_SET },
  ];
}

export function latestFetchedAt(rankings: readonly AmbassadorRanking[]): string | null {
  if (rankings.length === 0) return null;
  return rankings.reduce((latest, ranking) =>
    new Date(ranking.fetched_at) > new Date(latest.fetched_at) ? ranking : latest,
  ).fetched_at;
}

// "Updated 4 Nov 2026". UTC so the text doesn't depend on the viewer's timezone.
export function formatLastUpdated(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
  return `Updated ${formatted}`;
}

export interface ProfileEditInput {
  bio: string;
  trainingLocation: string;
  homeClubId: string;
}

export function validateProfileEdit(input: ProfileEditInput): string | null {
  if (input.bio.trim().length > MAX_BIO_LENGTH) {
    return `Your bio can be at most ${MAX_BIO_LENGTH} characters.`;
  }
  if (input.trainingLocation.trim().length > MAX_LOCATION_LENGTH) {
    return `City / region can be at most ${MAX_LOCATION_LENGTH} characters.`;
  }
  return null;
}

// Only the columns an ambassador may change on their own profile (the database
// enforces the same list). Never add sponsor-managed fields here.
export function buildProfileEditFields(input: ProfileEditInput) {
  return {
    bio: normalizeOptionalText(input.bio),
    training_location: normalizeOptionalText(input.trainingLocation),
    home_club_id: input.homeClubId || null,
  };
}
