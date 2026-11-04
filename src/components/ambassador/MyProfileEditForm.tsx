import { useState } from 'react';
import { usePadelClubs } from '../../hooks/usePadelClubs';
import { updateAmbassadorProfile } from '../../lib/queries';
import { AmbassadorProfileData } from '../../lib/queryTypes';
import {
  buildProfileEditFields,
  MAX_BIO_LENGTH,
  MAX_LOCATION_LENGTH,
  validateProfileEdit,
} from '../../lib/profile.utils';
import { ClubPicker } from '../shared/ClubPicker';

interface Props {
  ambassadorId: string;
  profile: AmbassadorProfileData;
  onSaved: (updated: Partial<AmbassadorProfileData>) => void;
  onCancel: () => void;
}

// Only the fields an ambassador may change. Sponsor-managed fields (team role, codes,
// commission, IDs) are deliberately absent, and the database rejects them anyway.
export function MyProfileEditForm({ ambassadorId, profile, onSaved, onCancel }: Readonly<Props>) {
  const [bio, setBio] = useState(profile.bio ?? '');
  const [trainingLocation, setTrainingLocation] = useState(profile.training_location ?? '');
  const [homeClubId, setHomeClubId] = useState(profile.home_club_id ?? '');
  const { clubs, addClub } = usePadelClubs();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    const input = { bio, trainingLocation, homeClubId };

    const validationError = validateProfileEdit(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    const fields = buildProfileEditFields(input);
    const { error: saveError } = await updateAmbassadorProfile(ambassadorId, fields);
    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }

    const homeClub =
      clubs.find((club) => club.id === homeClubId) ??
      (profile.home_club?.id === homeClubId ? profile.home_club : null);
    onSaved({ ...fields, home_club: homeClub });
  }

  return (
    <form onSubmit={handleSave} className="card p-5 flex flex-col gap-4">
      {error && <p className="alert-error">{error}</p>}

      <div>
        <label htmlFor="my-training-location" className="input-label">
          City / region
        </label>
        <input
          id="my-training-location"
          className="input"
          maxLength={MAX_LOCATION_LENGTH}
          value={trainingLocation}
          onChange={(event) => setTrainingLocation(event.target.value)}
          placeholder="Leeds, Yorkshire"
        />
      </div>

      <ClubPicker
        id="my-home-club"
        clubs={clubs}
        value={homeClubId}
        onChange={setHomeClubId}
        onAddClub={addClub}
      />

      <div>
        <label htmlFor="my-bio" className="input-label">
          Bio
        </label>
        <textarea
          id="my-bio"
          className="input"
          rows={4}
          maxLength={MAX_BIO_LENGTH}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
