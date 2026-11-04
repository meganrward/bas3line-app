import { useRankings } from '../../hooks/useRankings';
import { formatLastUpdated, latestFetchedAt } from '../../lib/profile.utils';
import { AmbassadorRanking } from '../../lib/types';
import { RankingsTable } from '../shared/RankingsTable';

interface CardProps {
  title: string;
  linked: boolean;
  notLinkedMessage: string;
  refreshing: boolean;
  onRefresh: () => void;
  rankings: readonly AmbassadorRanking[];
}

function RankingsCard({
  title,
  linked,
  notLinkedMessage,
  refreshing,
  onRefresh,
  rankings,
}: Readonly<CardProps>) {
  const lastUpdated = formatLastUpdated(latestFetchedAt(rankings));

  let body: React.ReactNode;
  if (!linked) {
    body = <p className="text-muted">{notLinkedMessage}</p>;
  } else if (rankings.length === 0) {
    body = <p className="text-muted">No ranking yet. Tap Refresh to fetch it.</p>;
  } else {
    body = (
      <>
        <RankingsTable rankings={rankings} />
        {lastUpdated && <p className="text-hint mt-3">{lastUpdated}</p>}
      </>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-section">{title}</h2>
        {linked && (
          <button className="btn-secondary text-xs" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>
      {body}
    </div>
  );
}

interface Props {
  ambassadorId: string;
  fipPlayerSlug: string | null;
  ltaPlayerId: string | null;
}

export function MyRankings({ ambassadorId, fipPlayerSlug, ltaPlayerId }: Readonly<Props>) {
  const { data, loading, fipRefreshing, ltaRefreshing, refreshFip, refreshLta } = useRankings(
    ambassadorId,
    fipPlayerSlug,
    ltaPlayerId,
  );

  if (loading) return <div className="spinner" />;

  return (
    <div className="flex flex-col gap-6">
      <RankingsCard
        title="LTA ranking"
        linked={Boolean(ltaPlayerId)}
        notLinkedMessage="Your LTA profile hasn't been linked yet. Ask Bas3line to add it."
        refreshing={ltaRefreshing}
        onRefresh={refreshLta}
        rankings={data.lta}
      />
      <RankingsCard
        title="FIP ranking"
        linked={Boolean(fipPlayerSlug)}
        notLinkedMessage="Your FIP profile hasn't been linked yet. Ask Bas3line to add it."
        refreshing={fipRefreshing}
        onRefresh={refreshFip}
        rankings={data.fip}
      />
    </div>
  );
}
