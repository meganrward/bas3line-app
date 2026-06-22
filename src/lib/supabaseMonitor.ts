import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The ambassador-monitor backend writes Instagram analytics to its own Supabase project.
// Set REACT_APP_MONITOR_SUPABASE_URL and REACT_APP_MONITOR_SUPABASE_ANON_KEY to enable.
// If they point to the same project as the main app, set them to the same values.
const monitorUrl = process.env.REACT_APP_MONITOR_SUPABASE_URL;
const monitorAnonKey = process.env.REACT_APP_MONITOR_SUPABASE_ANON_KEY;

export const supabaseMonitor: SupabaseClient | null =
  monitorUrl && monitorAnonKey
    ? createClient(monitorUrl, monitorAnonKey)
    : null;
