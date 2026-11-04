import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AmbassadorIds = {
  fip_player_slug: string | null;
  lta_player_id: string | null;
};

type Authorization =
  | { ok: true; serviceClient: SupabaseClient; ambassador: AmbassadorIds }
  | { ok: false; response: Response };

function jsonError(error: string, status: number): Authorization {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  };
}

// Verifies the caller's JWT and that they may act on `ambassadorId`: sponsor/staff,
// or the ambassador themselves. Returns a service-role client plus the ambassador's
// stored external IDs, so callers never have to trust IDs sent in the request body.
export async function authorizeAmbassadorAccess(
  req: Request,
  ambassadorId: string,
): Promise<Authorization> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Unauthorized", 401);

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Rejects the public anon key: it is a valid JWT but has no user behind it.
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return jsonError("Unauthorized", 401);

  if (user.id !== ambassadorId) {
    const { data: isSponsorOrStaff } = await callerClient.rpc("is_sponsor_or_staff");
    if (!isSponsorOrStaff) return jsonError("Forbidden", 403);
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!,
  );

  const { data: ambassador } = await serviceClient
    .from("ambassador_profiles")
    .select("fip_player_slug, lta_player_id")
    .eq("id", ambassadorId)
    .maybeSingle();

  if (!ambassador) return jsonError("Ambassador not found", 404);

  return { ok: true, serviceClient, ambassador };
}
