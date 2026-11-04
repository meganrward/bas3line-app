import {
  buildProfileSubtitle,
  findDuplicateClub,
  formatClubLabel,
  normalizeOptionalText,
  sortClubs,
  validateNewClub,
} from './clubs.utils';

const london = { id: '1', name: 'Padel Club London', town: 'London' };
const leeds = { id: '2', name: 'Padel Club Leeds', town: 'Leeds' };
const noTown = { id: '3', name: 'Garden Padel', town: null };

describe('normalizeOptionalText', () => {
  it('trims text', () => {
    expect(normalizeOptionalText('  Bristol  ')).toBe('Bristol');
  });

  it.each(['', '   '])('turns blank input (%p) into null', (value) => {
    expect(normalizeOptionalText(value)).toBeNull();
  });
});

describe('formatClubLabel', () => {
  it('includes the town when there is one', () => {
    expect(formatClubLabel(london)).toBe('Padel Club London (London)');
  });

  it('shows just the name without a town', () => {
    expect(formatClubLabel(noTown)).toBe('Garden Padel');
  });
});

describe('sortClubs', () => {
  it('sorts by label ignoring case, without changing the input', () => {
    const clubs = [london, noTown, leeds];
    expect(sortClubs(clubs).map((club) => club.id)).toEqual(['3', '2', '1']);
    expect(clubs.map((club) => club.id)).toEqual(['1', '3', '2']);
  });
});

describe('findDuplicateClub', () => {
  it('matches the same name and town ignoring case and spacing', () => {
    expect(findDuplicateClub([london], { name: '  padel club LONDON ', town: 'london' })).toBe(
      london,
    );
  });

  it('treats the same name in another town as a different club', () => {
    expect(
      findDuplicateClub([london], { name: 'Padel Club London', town: 'Leeds' }),
    ).toBeUndefined();
  });

  it('matches a club with no town against an empty town', () => {
    expect(findDuplicateClub([noTown], { name: 'garden padel', town: '' })).toBe(noTown);
  });
});

describe('validateNewClub', () => {
  it('accepts a name with or without a town', () => {
    expect(validateNewClub({ name: 'Garden Padel', town: '' })).toBeNull();
    expect(validateNewClub({ name: 'Garden Padel', town: 'Leeds' })).toBeNull();
  });

  it('requires a name', () => {
    expect(validateNewClub({ name: '   ', town: 'Leeds' })).toBe('Enter the club name.');
  });

  it('rejects over-long fields', () => {
    const tooLong = 'x'.repeat(121);
    expect(validateNewClub({ name: tooLong, town: '' })).toBe('The club name is too long.');
    expect(validateNewClub({ name: 'Club', town: tooLong })).toBe('The town is too long.');
  });
});

describe('buildProfileSubtitle', () => {
  it('joins everything that is set', () => {
    expect(
      buildProfileSubtitle({
        team_role: 'Team captain',
        home_club: leeds,
        training_location: 'Yorkshire',
      }),
    ).toBe('Team captain · Padel Club Leeds (Leeds) · Yorkshire');
  });

  it('skips missing parts', () => {
    expect(
      buildProfileSubtitle({ team_role: null, home_club: null, training_location: 'Bristol' }),
    ).toBe('Bristol');
  });

  it('is empty when nothing is set', () => {
    expect(
      buildProfileSubtitle({ team_role: null, home_club: null, training_location: null }),
    ).toBe('');
  });
});
