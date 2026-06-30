import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_HOURS = 24;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const PADEL_API_BASE = "https://padelapi.org/api";

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

    const padelApiToken = Deno.env.get("PADEL_API_TOKEN");
    if (!padelApiToken) {
      return new Response(
        JSON.stringify({ error: "PADEL_API_TOKEN secret not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    const padelHeaders = {
      "Authorization": `Bearer ${padelApiToken}`,
      "Accept": "application/json",
    };

    // Step 1: find player ID by name (slug "megan-ward" → query "megan ward")
    const name = slug.replace(/-/g, " ");
    const searchRes = await fetch(
      `${PADEL_API_BASE}/players?name=${encodeURIComponent(name)}`,
      { headers: padelHeaders },
    );

    if (!searchRes.ok) {
      return new Response(
        JSON.stringify({ error: `Padel API player search responded ${searchRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const searchJson: { data: Array<{ id: number; name: string; category: string }> } =
      await searchRes.json();

    if (!searchJson.data.length) {
      return new Response(
        JSON.stringify({ error: `No player found for slug "${slug}"` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const player = searchJson.data[0];

    // Step 2: fetch official ranking for that player
    const rankRes = await fetch(
      `${PADEL_API_BASE}/players/${player.id}/rankings?type=official`,
      { headers: padelHeaders },
    );

    if (!rankRes.ok) {
      return new Response(
        JSON.stringify({ error: `Padel API rankings responded ${rankRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rankings: Array<{
      ranking: number | "hidden_free_plan";
      points: number | "hidden_free_plan";
      category: string;
      type: string;
    }> = await rankRes.json();

    const latest = rankings[0];
    if (!latest) {
      return new Response(
        JSON.stringify({ error: "No ranking data available for this player" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Delete stale cache and insert fresh row
    await supabase
      .from("ambassador_rankings")
      .delete()
      .eq("ambassador_id", ambassador_id)
      .eq("source", "fip");

    const { data: inserted, error: insertError } = await supabase
      .from("ambassador_rankings")
      .insert({
        ambassador_id,
        source: "fip",
        category: capitalize(latest.category ?? player.category ?? "Open"),
        rank: typeof latest.ranking === "number" ? latest.ranking : null,
        points_value: typeof latest.points === "number" ? latest.points : null,
      })
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
