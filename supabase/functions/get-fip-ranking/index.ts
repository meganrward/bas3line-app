// Edge function: fetch FIP ranking for a player slug and cache in ambassador_rankings.
//
// TODO: Find the real FIP JSON endpoint by opening
//   https://www.padelfip.com/player/<slug>/
// in Chrome DevTools → Network → XHR/Fetch, then replace ENDPOINT_URL below.
//
// Call with: POST { "slug": "megan-ward", "ambassador_id": "<uuid>" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_HOURS = 24;

// Replace this with the real FIP API endpoint once identified via DevTools.
// Example: "https://www.padelfip.com/wp-json/fip/v1/player-ranking?slug="
const FIP_ENDPOINT_BASE = "TODO_REPLACE_WITH_REAL_FIP_API_ENDPOINT";

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

    const { slug, ambassador_id }: { slug: string; ambassador_id: string } =
      await req.json();

    if (!slug || !ambassador_id) {
      return new Response(
        JSON.stringify({ error: "slug and ambassador_id are required" }),
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
      .eq("source", "fip")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      const ageHours =
        (Date.now() - new Date(cached.fetched_at).getTime()) / 3_600_000;
      if (ageHours < CACHE_TTL_HOURS) {
        return new Response(JSON.stringify({ data: [cached], cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch from FIP
    if (FIP_ENDPOINT_BASE === "TODO_REPLACE_WITH_REAL_FIP_API_ENDPOINT") {
      return new Response(
        JSON.stringify({
          error:
            "FIP endpoint not yet configured. Inspect network traffic on padelfip.com to find the API URL.",
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fipRes = await fetch(`${FIP_ENDPOINT_BASE}${slug}`);
    if (!fipRes.ok) {
      return new Response(
        JSON.stringify({ error: `FIP API responded ${fipRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fipData = await fipRes.json();

    // TODO: Adapt this mapping once you know the real FIP response shape.
    const rank: number = fipData.ranking ?? fipData.rank ?? null;
    const pointsValue: number = fipData.points ?? fipData.points_value ?? null;
    const category: string = fipData.category ?? "Open";

    // Delete stale cache rows and insert fresh ones
    await supabase
      .from("ambassador_rankings")
      .delete()
      .eq("ambassador_id", ambassador_id)
      .eq("source", "fip");

    const { data: inserted, error: insertError } = await supabase
      .from("ambassador_rankings")
      .insert({ ambassador_id, source: "fip", category, rank, points_value: pointsValue })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: [inserted], cached: false }), {
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
