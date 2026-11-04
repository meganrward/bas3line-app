import {
  formatNullable,
  formatNumber,
  formatRankingCategory,
} from '../sponsor/AmbassadorDetail.utils';
import { AmbassadorRanking } from '../../lib/types';

interface Props {
  rankings: readonly AmbassadorRanking[];
  // Sponsors can remove a row; ambassadors see a read-only table.
  onRemove?: (rankingId: string) => void;
}

export function RankingsTable({ rankings, onRemove }: Readonly<Props>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="table-col-header">Category</th>
          <th className="table-col-header text-right">Rank</th>
          <th className="table-col-header text-right">Points</th>
          {onRemove && <th className="table-col-header" />}
        </tr>
      </thead>
      <tbody>
        {rankings.map((ranking) => (
          <tr key={ranking.id} className="border-b border-gray-50 last:border-0">
            <td className="px-4 py-2.5 text-gray-700">{formatRankingCategory(ranking.category)}</td>
            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
              {formatNullable(ranking.rank, (rank) => `#${rank}`)}
            </td>
            <td className="px-4 py-2.5 text-right text-gray-500">
              {formatNullable(ranking.points_value, formatNumber)}
            </td>
            {onRemove && (
              <td className="px-4 py-2.5 text-right">
                <button onClick={() => onRemove(ranking.id)} className="btn-danger-text text-xs">
                  Remove
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
