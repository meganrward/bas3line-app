// Edge function: fetch LTA rankings for a player UUID and cache in ambassador_rankings.
//
// TODO: Find the real LTA JSON endpoint by opening
//   https://competitions.lta.org.uk/player-profile/<uuid>/ranking
// in Chrome DevTools → Network → XHR/Fetch, then replace ENDPOINT_URL below.
// The LTA platform is likely a Next.js/React app that calls an internal API —
// look for a call like /api/player/<uuid>/rankings or similar.
//
// Call with: POST { "player_id": "<uuid>", "ambassador_id": "<uuid>" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_HOURS = 24;

// Replace with the real LTA internal API endpoint once identified via DevTools.
// Example: "https://competitions.lta.org.uk/api/player-ranking/"
const LTA_ENDPOINT_BASE = "TODO_REPLACE_WITH_REAL_LTA_API_ENDPOINT";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { player_id, ambassador_id }: { player_id: string; ambassador_id: string } =
      await req.json();

    if (!player_id || !ambassador_id) {
      return new Response(
        JSON.stringify({ error: "player_id and ambassador_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    // Return cached data if fresh enough
    const { data: cached } = await supabase
      .from("ambassador_rankings")
      .select("*")
      .eq("ambassador_id", ambassador_id)
      .eq("source", "lta")
      .order("fetched_at", { ascending: false });

    if (cached && cached.length > 0) {
      const ageHours =
        (Date.now() - new Date(cached[0].fetched_at).getTime()) / 3_600_000;
      if (ageHours < CACHE_TTL_HOURS) {
        return new Response(JSON.stringify({ data: cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch from LTA
    if (LTA_ENDPOINT_BASE === "TODO_REPLACE_WITH_REAL_LTA_API_ENDPOINT") {
      return new Response(
        JSON.stringify({
          error:
            "LTA endpoint not yet configured. Inspect network traffic on competitions.lta.org.uk to find the API URL.",
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ltaRes = await fetch(`${LTA_ENDPOINT_BASE}${player_id}`);
    if (!ltaRes.ok) {
      return new Response(
        JSON.stringify({ error: `LTA API responded ${ltaRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ltaData = await ltaRes.json();

    // TODO: Adapt this mapping once you know the real LTA response shape.
    // The LTA has multiple ranking categories per player (Open, U18, U16, 40+, etc.)
    // so we expect an array. Adjust the mapping to match the real response.
    const rankings: Array<{ category: string; rank: number; points?: number }> =
      Array.isArray(ltaData) ? ltaData : ltaData.rankings ?? [];

    // Delete stale cache rows and insert fresh ones
    await supabase
      .from("ambassador_rankings")
      .delete()
      .eq("ambassador_id", ambassador_id)
      .eq("source", "lta");

    if (rankings.length === 0) {
      return new Response(JSON.stringify({ data: [], cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = rankings.map((r) => ({
      ambassador_id,
      source: "lta" as const,
      category: r.category,
      rank: r.rank,
      points_value: r.points ?? null,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("ambassador_rankings")
      .insert(rows)
      .select();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: inserted, cached: false }), {
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
