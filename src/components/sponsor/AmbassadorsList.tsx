import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAmbassadors } from "../../lib/queries";
import { AmbassadorListItem } from "../../lib/queryTypes";

export function AmbassadorsList() {
  const [ambassadors, setAmbassadors] = useState<AmbassadorListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setAmbassadors(await loadAmbassadors());
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-page">Ambassadors</h1>
        <Link to="/sponsor/ambassadors/new" className="btn-primary">
          Add ambassador
        </Link>
      </div>

      {ambassadors.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No ambassadors yet.{" "}
          <Link to="/sponsor/ambassadors/new" className="text-brand-blue underline">
            Add your first one.
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-col-header">Name</th>
                <th className="table-col-header">Instagram</th>
                <th className="table-col-header">FIP slug</th>
                <th className="table-col-header">LTA ID</th>
                <th className="table-col-header" />
              </tr>
            </thead>
            <tbody>
              {ambassadors.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {a.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.instagram_handle ? `@${a.instagram_handle}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.fip_player_slug ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {a.lta_player_id ? `${a.lta_player_id.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/sponsor/ambassadors/${a.id}`}
                      className="text-brand-blue text-sm hover:underline"
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
