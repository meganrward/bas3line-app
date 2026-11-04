import { useEffect, useState } from 'react';
import { addPadelClub, loadPadelClubs } from '../lib/queries';
import { findDuplicateClub, NewClubInput, sortClubs, validateNewClub } from '../lib/clubs.utils';
import { PadelClub } from '../lib/types';

interface AddClubResult {
  club: PadelClub | null;
  error: string | null;
}

interface PadelClubsState {
  clubs: PadelClub[];
  loading: boolean;
  addClub: (input: NewClubInput) => Promise<AddClubResult>;
}

export function usePadelClubs(): PadelClubsState {
  const [clubs, setClubs] = useState<PadelClub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setClubs(sortClubs(await loadPadelClubs()));
      setLoading(false);
    }
    load();
  }, []);

  async function addClub(input: NewClubInput): Promise<AddClubResult> {
    const validationError = validateNewClub(input);
    if (validationError) return { club: null, error: validationError };

    // Already listed: select the existing club rather than hitting the unique rule.
    const existing = findDuplicateClub(clubs, input);
    if (existing) return { club: existing, error: null };

    const result = await addPadelClub(input);
    if (result.club) {
      const addedClub = result.club;
      setClubs((previous) => sortClubs([...previous, addedClub]));
    }
    return result;
  }

  return { clubs, loading, addClub };
}
