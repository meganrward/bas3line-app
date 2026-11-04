import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyProfile } from './MyProfile';
import { useAuth } from '../../hooks/useAuth';
import {
  addPadelClub,
  deleteRanking,
  loadAmbassadorProfile,
  loadPadelClubs,
  loadRankings,
  refreshFipRanking,
  refreshLtaRanking,
  updateAmbassadorProfile,
} from '../../lib/queries';
import { AmbassadorProfileData } from '../../lib/queryTypes';

jest.mock('../../hooks/useAuth');
jest.mock('../../lib/queries', () => ({
  addPadelClub: jest.fn(),
  deleteRanking: jest.fn(),
  loadAmbassadorProfile: jest.fn(),
  loadPadelClubs: jest.fn(),
  loadRankings: jest.fn(),
  refreshFipRanking: jest.fn(),
  refreshLtaRanking: jest.fn(),
  updateAmbassadorProfile: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockLoadProfile = loadAmbassadorProfile as jest.Mock;
const mockLoadClubs = loadPadelClubs as jest.Mock;
const mockLoadRankings = loadRankings as jest.Mock;
const mockUpdateProfile = updateAmbassadorProfile as jest.Mock;

const leeds = { id: 'club-1', name: 'Padel Club Leeds', town: 'Leeds' };

function buildProfile(overrides: Partial<AmbassadorProfileData> = {}): AmbassadorProfileData {
  return {
    full_name: 'Sam Ambassador',
    gender: null,
    bio: 'Plays most weekends.',
    instagram_handle: 'sam.padel',
    instagram_user_id: null,
    fip_player_slug: 'sam-ambassador',
    lta_membership_number: null,
    lta_player_id: 'lta-uuid',
    discount_code: 'sam10',
    commission_rate: 12.5,
    team_role: 'Team captain',
    training_location: 'Yorkshire',
    home_club_id: 'club-1',
    home_club: leeds,
    ...overrides,
  };
}

function rankingRow(source: 'fip' | 'lta', rank: number) {
  return {
    id: `${source}-${rank}`,
    ambassador_id: 'amb-1',
    source,
    category: 'open',
    rank,
    points_value: 100,
    fetched_at: '2026-11-03T09:00:00+00:00',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'amb-1' }, loading: false });
  mockLoadProfile.mockResolvedValue(buildProfile());
  mockLoadClubs.mockResolvedValue([
    { ...leeds, county: null, region: null, created_by: null, created_at: '' },
  ]);
  mockLoadRankings.mockResolvedValue({ fip: [rankingRow('fip', 12)], lta: [rankingRow('lta', 3)] });
  (refreshFipRanking as jest.Mock).mockResolvedValue([]);
  (refreshLtaRanking as jest.Mock).mockResolvedValue([]);
  (addPadelClub as jest.Mock).mockResolvedValue({ club: null, error: null });
  (deleteRanking as jest.Mock).mockResolvedValue({ error: null });
});

// Opens the form and waits for the club list so no state update lands after the test ends.
async function openEditForm() {
  await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  await screen.findByRole('option', { name: 'Padel Club Leeds (Leeds)' });
}

describe('MyProfile', () => {
  it('shows the ambassador their own details', async () => {
    render(<MyProfile />);

    expect(await screen.findByRole('heading', { name: 'Sam Ambassador' })).toBeInTheDocument();
    expect(
      screen.getByText('Team captain · Padel Club Leeds (Leeds) · Yorkshire'),
    ).toBeInTheDocument();
    expect(screen.getByText('Plays most weekends.')).toBeInTheDocument();
    expect(mockLoadProfile).toHaveBeenCalledWith('amb-1');
  });

  it('shows their LTA and FIP rankings', async () => {
    render(<MyProfile />);

    expect(await screen.findByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#12')).toBeInTheDocument();
    expect(screen.getAllByText('Updated 3 Nov 2026')).toHaveLength(2);
  });

  it('explains when an ID has not been linked yet', async () => {
    mockLoadProfile.mockResolvedValue(buildProfile({ fip_player_slug: null }));
    render(<MyProfile />);

    expect(await screen.findByText(/FIP profile hasn't been linked/i)).toBeInTheDocument();
  });

  it('links to the Instagram connect page', async () => {
    render(<MyProfile />);

    const link = await screen.findByRole('link', { name: /connect instagram/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('bas3line-ambassador-connect'));
  });

  it('says so when the ambassador profile row does not exist', async () => {
    mockLoadProfile.mockResolvedValue(null);
    render(<MyProfile />);

    expect(await screen.findByText(/profile isn't set up yet/i)).toBeInTheDocument();
  });

  it('does not offer sponsor-managed fields when editing', async () => {
    render(<MyProfile />);
    await openEditForm();

    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.getByLabelText('City / region')).toBeInTheDocument();
    expect(screen.getByLabelText('Home club')).toBeInTheDocument();
    expect(screen.queryByLabelText(/team role/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/commission|discount/i)).not.toBeInTheDocument();
  });

  it('saves only the editable fields and shows the result', async () => {
    mockUpdateProfile.mockResolvedValue({ error: null });
    render(<MyProfile />);
    await openEditForm();

    const bio = screen.getByLabelText('Bio');
    await userEvent.clear(bio);
    await userEvent.type(bio, 'New bio');
    const location = screen.getByLabelText('City / region');
    await userEvent.clear(location);
    await userEvent.type(location, 'Bristol');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockUpdateProfile).toHaveBeenCalledWith('amb-1', {
      bio: 'New bio',
      training_location: 'Bristol',
      home_club_id: 'club-1',
    });
    // The textarea also contains the typed text, so wait for the form to close first.
    await waitFor(() => expect(screen.queryByLabelText('Bio')).not.toBeInTheDocument());
    expect(screen.getByText('New bio')).toBeInTheDocument();
    expect(screen.getByText('Bristol')).toBeInTheDocument();
  });

  it('shows the error and stays in edit mode when saving fails', async () => {
    mockUpdateProfile.mockResolvedValue({ error: 'Ambassadors can only edit: bio' });
    render(<MyProfile />);
    await openEditForm();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Ambassadors can only edit: bio')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });
});
