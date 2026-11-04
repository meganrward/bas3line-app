import { homePathForRole } from './routes.utils';

describe('homePathForRole', () => {
  it('sends sponsors to the sponsor portal', () => {
    expect(homePathForRole('sponsor')).toBe('/sponsor');
  });

  it('sends ambassadors to the ambassador app', () => {
    expect(homePathForRole('ambassador')).toBe('/ambassador');
  });

  it.each([null, undefined, '', 'athlete', 'admin', 'toString'])(
    'returns null for a missing or unrecognised role (%p)',
    (role) => {
      expect(homePathForRole(role)).toBeNull();
    },
  );
});
