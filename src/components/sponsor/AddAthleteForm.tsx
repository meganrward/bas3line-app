import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { SponsorshipPackage } from "../../lib/types";

export function AddAthleteForm() {
  const navigate = useNavigate();
  const { sponsorId } = useAuth();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [packageId, setPackageId] = useState("");
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sponsorId) return;
    async function load() {
      const packagesResult = await supabase
        .from("sponsorship_packages")
        .select("*")
        .eq("sponsor_id", sponsorId!)
        .order("name");
      setPackages((packagesResult.data ?? []) as SponsorshipPackage[]);
    }
    load();
  }, [sponsorId]);

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!sponsorId) {
      setError("Sponsor not found.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const result = await supabase.functions.invoke("invite-athlete", {
      body: {
        email,
        full_name: fullName,
        package_id: packageId || undefined,
      },
    });

    const responseData = result.data as {
      user_id?: string;
      error?: string;
    } | null;
    const errorMessage =
      responseData?.error ?? (result.error ? result.error.message : null);

    if (errorMessage) {
      setError(errorMessage);
      setSubmitting(false);
      return;
    }

    navigate(`/sponsor/athletes/${responseData?.user_id}`);
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/sponsor/athletes"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Athletes
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="heading-page">Invite athlete</h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <p className="text-sm text-gray-500">
          The athlete will receive an email with a link to set their password
          and access the portal.
        </p>

        <div>
          <label className="input-label">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="input-label">
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="input-label">
            Package{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="input"
          >
            <option value="">No package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="alert-error">{error}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Sending invite…" : "Send invite"}
          </button>
        </div>
      </form>
    </div>
  );
}
