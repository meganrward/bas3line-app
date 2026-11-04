import { ClubSummary } from './types';

const MAX_FIELD_LENGTH = 120;

export interface NewClubInput {
  name: string;
  town: string;
}

export function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function formatClubLabel(club: ClubSummary): string {
  return club.town ? `${club.name} (${club.town})` : club.name;
}

export function sortClubs<T extends ClubSummary>(clubs: readonly T[]): T[] {
  return [...clubs].sort((first, second) =>
    formatClubLabel(first).localeCompare(formatClubLabel(second), 'en-GB', {
      sensitivity: 'base',
    }),
  );
}

// Matches the database's unique rule: same name and town, ignoring case and spacing.
function clubKey(name: string, town: string | null): string {
  return `${name.trim().toLowerCase()}|${(town ?? '').trim().toLowerCase()}`;
}

export function findDuplicateClub<T extends ClubSummary>(
  clubs: readonly T[],
  input: NewClubInput,
): T | undefined {
  const inputKey = clubKey(input.name, input.town);
  return clubs.find((club) => clubKey(club.name, club.town) === inputKey);
}

export function validateNewClub(input: NewClubInput): string | null {
  if (input.name.trim() === '') return 'Enter the club name.';
  if (input.name.trim().length > MAX_FIELD_LENGTH) return 'The club name is too long.';
  if (input.town.trim().length > MAX_FIELD_LENGTH) return 'The town is too long.';
  return null;
}

interface SubtitleParts {
  team_role: string | null;
  home_club: ClubSummary | null;
  training_location: string | null;
}

// "Team captain · Padel Club Leeds (Leeds) · Yorkshire", skipping anything not set.
export function buildProfileSubtitle(parts: SubtitleParts): string {
  return [
    parts.team_role,
    parts.home_club ? formatClubLabel(parts.home_club) : null,
    parts.training_location,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}
