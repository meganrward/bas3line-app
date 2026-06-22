import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { SponsorshipPackage } from "../../lib/types";
import { useAuth } from "../../hooks/useAuth";
import { loadAthleteProfile, loadPackages } from "../../lib/queries";

interface AthleteFormState {
  full_name: string;
  bio: string;
  ranking: string;
  clubs: string;
  training_location: string;
  racket_model: string;
  instagram_handle: string;
  package_id: string;
}

const emptyForm: AthleteFormState = {
  full_name: "",
  bio: "",
  ranking: "",
  clubs: "",
  training_location: "",
  racket_model: "",
  instagram_handle: "",
  package_id: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

export function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const { sponsorId } = useAuth();
  const [form, setForm] = useState<AthleteFormState>(emptyForm);
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [athlete, pkgs] = await Promise.all([
        loadAthleteProfile(id!),
        sponsorId ? loadPackages(sponsorId) : Promise.resolve([]),
      ]);

      if (!athlete) {
        setError("Athlete not found");
        setLoading(false);
        return;
      }

      setForm({
        full_name: athlete.full_name ?? "",
        bio: athlete.bio ?? "",
        ranking: athlete.ranking ?? "",
        clubs: athlete.clubs ?? "",
        training_location: athlete.training_location ?? "",
        racket_model: athlete.racket_model ?? "",
        instagram_handle: athlete.instagram_handle ?? "",
        package_id: athlete.package_id ?? "",
      });
      setPointsBalance(athlete.points_balance ?? 0);
      setPackages(pkgs);
      setLoading(false);
    }
    load();
  }, [id, sponsorId]);

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);

    const [profileResult, athleteResult] = await Promise.all([
      (supabase.from("profiles") as any)
        .update({ full_name: form.full_name })
        .eq("id", id!),
      (supabase.from("athlete_profiles") as any)
        .update({
          bio: form.bio || null,
          ranking: form.ranking || null,
          clubs: form.clubs || null,
          training_location: form.training_location || null,
          racket_model: form.racket_model || null,
          instagram_handle: form.instagram_handle || null,
          package_id: form.package_id || null,
        } as any)
        .eq("id", id!),
    ]);

    if (profileResult.error || athleteResult.error) {
      setError(
        profileResult.error?.message ??
          athleteResult.error?.message ??
          "Save failed",
      );
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  function set(field: keyof AthleteFormState) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    );
  if (error && !form.full_name) return <p className="alert-error">{error}</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/sponsor/athletes"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Athletes
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="heading-page">{form.full_name || "Athlete"}</h1>
        <span className="ml-auto badge-brand">{pointsBalance} pts</span>
      </div>

      {saved && <p className="alert-success mb-4">Saved successfully.</p>}
      {error && <p className="alert-error mb-4">{error}</p>}

      <form onSubmit={handleSave} className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <Field label="Full name">
              <input
                type="text"
                value={form.full_name}
                onChange={set("full_name")}
                className="input"
              />
            </Field>
          </div>

          <div className="col-span-2">
            <Field label="Bio">
              <textarea
                rows={3}
                value={form.bio}
                onChange={set("bio")}
                className="input"
              />
            </Field>
          </div>

          <Field label="Package">
            <select
              value={form.package_id}
              onChange={set("package_id")}
              className="input"
            >
              <option value="">No package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ranking">
            <input
              type="text"
              value={form.ranking}
              onChange={set("ranking")}
              className="input"
            />
          </Field>

          <Field label="Racket model">
            <input
              type="text"
              value={form.racket_model}
              onChange={set("racket_model")}
              className="input"
            />
          </Field>

          <Field label="Trains at">
            <input
              type="text"
              value={form.training_location}
              onChange={set("training_location")}
              className="input"
            />
          </Field>

          {packages
            .find((pkg) => pkg.id === form.package_id)
            ?.name.toLowerCase()
            .includes("coach") && (
            <Field label="Coaches at">
              <input
                type="text"
                value={form.clubs}
                onChange={set("clubs")}
                className="input"
              />
            </Field>
          )}

          <Field label="Instagram handle">
            <div className="flex rounded-lg shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                @
              </span>
              <input
                type="text"
                value={form.instagram_handle}
                onChange={set("instagram_handle")}
                className="flex-1 min-w-0 block rounded-none rounded-r-lg border-gray-300 focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
              />
            </div>
          </Field>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
