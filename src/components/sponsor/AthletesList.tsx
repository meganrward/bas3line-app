import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAthletes } from "../../lib/queries";
import { AthleteListItem } from "../../lib/queryTypes";

export function AthletesList() {
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setAthletes(await loadAthletes());
      setLoading(false);
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-page">Athletes</h1>
        <Link to="/sponsor/athletes/new" className="btn-primary">
          + Invite athlete
        </Link>
      </div>

      {athletes.length === 0 ? (
        <p className="text-sm text-gray-500">
          No athletes yet. Invite one to get started.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-col-header">Name</th>
                <th className="table-col-header">Package</th>
                <th className="table-col-header">Points</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {athletes.map((athlete) => (
                <tr
                  key={athlete.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {athlete.full_name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {athlete.package_name ?? (
                      <span className="italic text-gray-400">No package</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {athlete.points_balance}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/sponsor/athletes/${athlete.id}`}
                      className="text-sm text-brand-blue hover:text-brand-navy font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
