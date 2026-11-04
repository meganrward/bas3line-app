import { useState } from 'react';
import { formatClubLabel, NewClubInput } from '../../lib/clubs.utils';
import { ClubSummary } from '../../lib/types';

interface Props {
  id: string;
  clubs: readonly ClubSummary[];
  value: string;
  onChange: (clubId: string) => void;
  onAddClub: (input: NewClubInput) => Promise<{ club: ClubSummary | null; error: string | null }>;
  disabled?: boolean;
}

// Dropdown of known clubs, with an inline way to add one that is missing.
// Deliberately not a <form>: it sits inside the parent's form.
export function ClubPicker({ id, clubs, value, onChange, onAddClub, disabled }: Readonly<Props>) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [town, setTown] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setBusy(true);
    setError(null);
    const result = await onAddClub({ name, town });
    setBusy(false);

    if (result.error || !result.club) {
      setError(result.error ?? 'Could not add the club.');
      return;
    }

    onChange(result.club.id);
    setAdding(false);
    setName('');
    setTown('');
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleAdd();
  }

  return (
    <div>
      <label htmlFor={id} className="input-label">
        Home club
      </label>
      <select
        id={id}
        className="input"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">No club selected</option>
        {clubs.map((club) => (
          <option key={club.id} value={club.id}>
            {formatClubLabel(club)}
          </option>
        ))}
      </select>

      {adding ? (
        <div className="mt-3 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-new-name`} className="input-label">
                Club name
              </label>
              <input
                id={`${id}-new-name`}
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div>
              <label htmlFor={`${id}-new-town`} className="input-label">
                Town
              </label>
              <input
                id={`${id}-new-town`}
                className="input"
                value={town}
                onChange={(event) => setTown(event.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
          {error && <p className="alert-error">{error}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-primary" disabled={busy} onClick={handleAdd}>
              {busy ? 'Adding…' : 'Add club'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-muted-text mt-1"
          disabled={disabled}
          onClick={() => setAdding(true)}
        >
          My club isn&apos;t listed
        </button>
      )}
    </div>
  );
}
