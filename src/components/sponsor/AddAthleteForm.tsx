import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { SponsorshipPackage } from '../../lib/types';

export function AddAthleteForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [packageId, setPackageId] = useState('');
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [sponsorId, setSponsorId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const sponsorResult = await supabase
        .from('sponsors')
        .select('id')
        .single();

      const resolvedSponsorId = (sponsorResult.data as any)?.id ?? null;
      setSponsorId(resolvedSponsorId);

      if (resolvedSponsorId) {
        const packagesResult = await supabase
          .from('sponsorship_packages')
          .select('*')
          .eq('sponsor_id', resolvedSponsorId)
          .order('name');
        setPackages((packagesResult.data ?? []) as SponsorshipPackage[]);
      }
    }
    load();
  }, []);

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!sponsorId) { setError('Sponsor not found.'); return; }
    setError(null);
    setSubmitting(true);

    const result = await supabase.functions.invoke('invite-athlete', {
      body: {
        email,
        full_name: fullName,
        sponsor_id: sponsorId,
        package_id: packageId || undefined,
      },
    });

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    const responseData = result.data as { user_id?: string; error?: string };
    if (responseData?.error) {
      setError(responseData.error);
      setSubmitting(false);
      return;
    }

    navigate(`/sponsor/athletes/${responseData.user_id}`);
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/sponsor/athletes" className="text-sm text-gray-400 hover:text-gray-600">← Athletes</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Invite athlete</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <p className="text-sm text-gray-500">
          The athlete will receive an email with a link to set their password and access the portal.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full name <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address <span className="text-red-500">*</span></label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package <span className="text-gray-400 font-normal">(optional)</span></label>
          <select
            value={packageId}
            onChange={e => setPackageId(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
          >
            <option value="">No package</option>
            {packages.map(pkg => (
              <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Sending invite…' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  );
}
