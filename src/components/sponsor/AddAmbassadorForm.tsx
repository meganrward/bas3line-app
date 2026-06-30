import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function AddAmbassadorForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [fipSlug, setFipSlug] = useState("");
  const [ltaMembershipNumber, setLtaMembershipNumber] = useState("");
  const [ltaPlayerId, setLtaPlayerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const res = await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/invite-athlete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          full_name: fullName,
          gender: gender || undefined,
          fip_player_slug: fipSlug.trim() || undefined,
          lta_membership_number: ltaMembershipNumber.trim() || undefined,
          lta_player_id: ltaPlayerId.trim() || undefined,
        }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Invite failed.");
      setLoading(false);
      return;
    }

    navigate(`/sponsor/ambassadors/${json.user_id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="heading-page mb-6">Add ambassador</h1>

      <div className="card p-6">
        {error && <p className="alert-error mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="input-label">Full name *</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Megan Ward"
            />
          </div>

          <div>
            <label className="input-label">Email address *</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ambassador@example.com"
            />
          </div>

          <div>
            <label className="input-label">Gender</label>
            <select
              className="input"
              value={gender}
              onChange={(e) => setGender(e.target.value as "male" | "female" | "")}
            >
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>

          <div>
            <label className="input-label">FIP player slug</label>
            <input
              className="input"
              value={fipSlug}
              onChange={(e) => setFipSlug(e.target.value)}
              placeholder="megan-ward"
            />
            <p className="text-xs text-gray-400 mt-1">
              From padelfip.com/player/<em>slug</em>/
            </p>
          </div>

          <div>
            <label className="input-label">LTA membership number</label>
            <input
              className="input"
              value={ltaMembershipNumber}
              onChange={(e) => setLtaMembershipNumber(e.target.value)}
              placeholder="118985501"
            />
            <p className="text-xs text-gray-400 mt-1">
              The number on their LTA membership card
            </p>
          </div>

          <div>
            <label className="input-label">LTA competitions UUID</label>
            <input
              className="input"
              value={ltaPlayerId}
              onChange={(e) => setLtaPlayerId(e.target.value)}
              placeholder="bc84334e-5412-4154-99f6-467b897c184d"
            />
            <p className="text-xs text-gray-400 mt-1">
              From competitions.lta.org.uk/player-profile/<em>uuid</em>/ — needed for rankings
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Sending invite…" : "Send invite"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/sponsor/ambassadors")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
