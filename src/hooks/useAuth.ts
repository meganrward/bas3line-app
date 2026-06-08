import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, StaffRole } from '../lib/types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  sponsorId: string | null;   // non-null for sponsor-role users
  staffRole: StaffRole | null; // non-null for sponsor-role users
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sponsorId, setSponsorId] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setSponsorId(null);
        setStaffRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const [profileResult, staffResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('sponsor_staff').select('sponsor_id, staff_role').eq('user_id', userId).maybeSingle(),
    ]);

    setProfile(profileResult.data as Profile | null);

    const staffRow = staffResult.data as { sponsor_id: string; staff_role: StaffRole } | null;
    setSponsorId(staffRow?.sponsor_id ?? null);
    setStaffRole(staffRow?.staff_role ?? null);
    setLoading(false);
  }

  return { user, profile, sponsorId, staffRole, loading };
}
