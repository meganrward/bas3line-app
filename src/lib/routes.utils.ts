import { UserRole } from './types';

const HOME_PATH_BY_ROLE: Record<UserRole, string> = {
  sponsor: '/sponsor',
  ambassador: '/ambassador',
};

// Where a signed-in user lands. Returns null for a missing or unrecognised role
// (for example a profile row that was never created), so callers can show an
// error instead of redirecting in a loop.
export function homePathForRole(role: string | null | undefined): string | null {
  if (!role || !Object.hasOwn(HOME_PATH_BY_ROLE, role)) return null;
  return HOME_PATH_BY_ROLE[role as UserRole];
}
