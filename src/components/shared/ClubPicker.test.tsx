import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClubPicker } from './ClubPicker';

const clubs = [
  { id: 'club-1', name: 'Padel Club London', town: 'London' },
  { id: 'club-2', name: 'Garden Padel', town: null },
];

function renderPicker(overrides: Partial<React.ComponentProps<typeof ClubPicker>> = {}) {
  const onChange = jest.fn();
  const onAddClub = jest.fn();
  render(
    <ClubPicker
      id="club"
      clubs={clubs}
      value=""
      onChange={onChange}
      onAddClub={onAddClub}
      {...overrides}
    />,
  );
  return { onChange, onAddClub };
}

async function openAddForm() {
  await userEvent.click(screen.getByRole('button', { name: /my club isn't listed/i }));
}

describe('ClubPicker', () => {
  it('lists the clubs with their towns', () => {
    renderPicker();
    expect(screen.getByRole('option', { name: 'Padel Club London (London)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Garden Padel' })).toBeInTheDocument();
  });

  it('reports the chosen club', async () => {
    const { onChange } = renderPicker();
    await userEvent.selectOptions(screen.getByLabelText('Home club'), 'club-2');
    expect(onChange).toHaveBeenCalledWith('club-2');
  });

  it('adds a missing club and selects it', async () => {
    const { onChange, onAddClub } = renderPicker();
    onAddClub.mockResolvedValue({
      club: { id: 'club-3', name: 'New Club', town: 'Bath' },
      error: null,
    });

    await openAddForm();
    await userEvent.type(screen.getByLabelText('Club name'), 'New Club');
    await userEvent.type(screen.getByLabelText('Town'), 'Bath');
    await userEvent.click(screen.getByRole('button', { name: 'Add club' }));

    expect(onAddClub).toHaveBeenCalledWith({ name: 'New Club', town: 'Bath' });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('club-3'));
    await waitFor(() => expect(screen.queryByLabelText('Club name')).not.toBeInTheDocument());
  });

  it('shows the error and keeps the form open when adding fails', async () => {
    const { onChange, onAddClub } = renderPicker();
    onAddClub.mockResolvedValue({ club: null, error: 'Enter the club name.' });

    await openAddForm();
    await userEvent.click(screen.getByRole('button', { name: 'Add club' }));

    expect(await screen.findByText('Enter the club name.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Club name')).toBeInTheDocument();
  });

  it('adds the club on Enter instead of submitting the surrounding form', async () => {
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
    const onAddClub = jest.fn().mockResolvedValue({ club: clubs[0], error: null });
    render(
      <form onSubmit={onSubmit}>
        <ClubPicker id="club" clubs={clubs} value="" onChange={jest.fn()} onAddClub={onAddClub} />
      </form>,
    );

    await openAddForm();
    await userEvent.type(screen.getByLabelText('Club name'), 'New Club{enter}');

    // Let the add finish and the form close before the test ends.
    await waitFor(() => expect(screen.queryByLabelText('Club name')).not.toBeInTheDocument());
    expect(onAddClub).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
