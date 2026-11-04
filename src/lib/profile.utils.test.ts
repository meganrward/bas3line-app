import {
  buildProfileEditFields,
  formatLastUpdated,
  latestFetchedAt,
  MAX_BIO_LENGTH,
  MAX_LOCATION_LENGTH,
  NOT_SET,
  profileDetailRows,
  validateProfileEdit,
} from './profile.utils';
import { AmbassadorRanking } from './types';

function ranking(id: string, fetchedAt: string): AmbassadorRanking {
  return {
    id,
    ambassador_id: 'ambassador-1',
    source: 'fip',
    category: 'Open',
    rank: 1,
    points_value: 10,
    fetched_at: fetchedAt,
  };
}

describe('profileDetailRows', () => {
  it('shows every field that is set', () => {
    const rows = profileDetailRows({
      team_role: 'Team captain',
      home_club: { id: '1', name: 'Padel Club Leeds', town: 'Leeds' },
      training_location: 'Yorkshire',
      bio: 'Plays most weekends.',
    });
    expect(rows).toEqual([
      { label: 'Team role', value: 'Team captain' },
      { label: 'Home club', value: 'Padel Club Leeds (Leeds)' },
      { label: 'City / region', value: 'Yorkshire' },
      { label: 'Bio', value: 'Plays most weekends.' },
    ]);
  });

  it('says "Not set" for anything missing', () => {
    const rows = profileDetailRows({
      team_role: null,
      home_club: null,
      training_location: null,
      bio: null,
    });
    expect(rows.map((row) => row.value)).toEqual([NOT_SET, NOT_SET, NOT_SET, NOT_SET]);
  });
});

describe('latestFetchedAt', () => {
  it('returns null with no rankings', () => {
    expect(latestFetchedAt([])).toBeNull();
  });

  it('returns the most recent fetch time whatever the order', () => {
    const rankings = [
      ranking('a', '2026-11-01T10:00:00+00:00'),
      ranking('b', '2026-11-03T09:00:00+00:00'),
      ranking('c', '2026-11-02T12:00:00+00:00'),
    ];
    expect(latestFetchedAt(rankings)).toBe('2026-11-03T09:00:00+00:00');
  });
});

describe('formatLastUpdated', () => {
  it('formats a date for UK readers', () => {
    expect(formatLastUpdated('2026-11-04T10:30:00+00:00')).toBe('Updated 4 Nov 2026');
  });

  it('returns null when there is no date', () => {
    expect(formatLastUpdated(null)).toBeNull();
  });
});

describe('validateProfileEdit', () => {
  const valid = { bio: 'Hello', trainingLocation: 'Leeds', homeClubId: '' };

  it('accepts reasonable input', () => {
    expect(validateProfileEdit(valid)).toBeNull();
  });

  it('accepts a bio exactly at the limit', () => {
    expect(validateProfileEdit({ ...valid, bio: 'x'.repeat(MAX_BIO_LENGTH) })).toBeNull();
  });

  it('rejects a bio over the limit', () => {
    expect(validateProfileEdit({ ...valid, bio: 'x'.repeat(MAX_BIO_LENGTH + 1) })).toMatch(/bio/i);
  });

  it('rejects a city / region over the limit', () => {
    expect(
      validateProfileEdit({ ...valid, trainingLocation: 'x'.repeat(MAX_LOCATION_LENGTH + 1) }),
    ).toMatch(/city/i);
  });
});

describe('buildProfileEditFields', () => {
  it('trims text and turns blanks into null', () => {
    expect(
      buildProfileEditFields({ bio: '  Hi  ', trainingLocation: '   ', homeClubId: '' }),
    ).toEqual({ bio: 'Hi', training_location: null, home_club_id: null });
  });

  it('passes the chosen club through', () => {
    expect(
      buildProfileEditFields({ bio: '', trainingLocation: 'Leeds', homeClubId: 'club-1' }),
    ).toEqual({ bio: null, training_location: 'Leeds', home_club_id: 'club-1' });
  });

  it('only ever contains fields an ambassador may edit', () => {
    const keys = Object.keys(
      buildProfileEditFields({ bio: '', trainingLocation: '', homeClubId: '' }),
    );
    expect(keys).toHaveLength(3);
    expect(keys).toEqual(expect.arrayContaining(['bio', 'home_club_id', 'training_location']));
  });
});
