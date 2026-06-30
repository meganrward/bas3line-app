import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitePayload {
  email: string;
  full_name: string;
  gender?: "male" | "female";
  fip_player_slug?: string;
  lta_membership_number?: string;
  lta_player_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: staffRow } = await callerClient
      .from("sponsor_staff")
      .select("sponsor_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!staffRow?.sponsor_id) {
      console.error("No sponsor_staff record for user:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden: no sponsor staff record found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sponsorId = staffRow.sponsor_id;

    const payload: InvitePayload = await req.json();
    const { email, full_name, gender, fip_player_slug, lta_membership_number, lta_player_id } = payload;

    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: "email and full_name are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { role: "ambassador", full_name },
      });

    if (inviteError) {
      console.error("inviteUserByEmail error:", inviteError.message);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ambassadorId = inviteData.user.id;

    const { error: profileError } = await adminClient
      .from("ambassador_profiles")
      .insert({
        id: ambassadorId,
        sponsor_id: sponsorId,
        gender: gender ?? null,
        fip_player_slug: fip_player_slug ?? null,
        lta_membership_number: lta_membership_number ?? null,
        lta_player_id: lta_player_id ?? null,
      });

    if (profileError) {
      console.error("ambassador_profiles insert error:", profileError.message);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ user_id: ambassadorId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
