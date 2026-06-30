import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LTA_BASE = "https://competitions.lta.org.uk";
const LTA_RANKING_LIST_URL = `${LTA_BASE}/ranking/ranking.aspx?rid=305`;
// Short-circuit TTL: don't hit LTA at all if we fetched within this window.
const MIN_CHECK_HOURS = 1;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseCookies(headers: Headers): string {
  const cookies: string[] = [];
  headers.forEach((value, name) => {
    if (name.toLowerCase() === "set-cookie") {
      cookies.push(value.split(";")[0]);
    }
  });
  return cookies.join("; ");
}

function mergeCookieStrings(...parts: string[]): string {
  const map = new Map<string, string>();
  for (const part of parts) {
    for (const pair of part.split(";").map((s) => s.trim()).filter(Boolean)) {
      const eqIndex = pair.indexOf("=");
      const k = eqIndex > -1 ? pair.slice(0, eqIndex).trim() : pair.trim();
      const v = eqIndex > -1 ? pair.slice(eqIndex + 1) : "";
      if (k) map.set(k, v);
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

// Accepts the LTA cookie wall and returns cookies for subsequent requests.
async function acceptCookieWall(returnPath: string): Promise<string> {
  const wallRes = await fetch(
    `${LTA_BASE}/cookiewall/?returnurl=${encodeURIComponent(returnPath)}`,
    { headers: { "User-Agent": UA }, redirect: "follow" },
  );
  let cookies = parseCookies(wallRes.headers);

  const formBody = new URLSearchParams({ ReturnUrl: returnPath, SettingsOpen: "false" });
  for (const purpose of ["1", "2", "4", "8", "16"]) {
    formBody.append("CookiePurposes", purpose);
  }

  const acceptRes = await fetch(`${LTA_BASE}/cookiewall/Save`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Cookie": cookies,
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": `${LTA_BASE}/cookiewall/?returnurl=${encodeURIComponent(returnPath)}`,
    },
    body: formBody.toString(),
    redirect: "manual",
  });
  return mergeCookieStrings(cookies, parseCookies(acceptRes.headers));
}

// Fetches the LTA padel ranking list page and extracts the "Last updated" timestamp.
// Returns null if it can't be parsed.
async function fetchLtaLastUpdated(cookies: string): Promise<Date | null> {
  const res = await fetch(LTA_RANKING_LIST_URL, {
    headers: { "User-Agent": UA, "Cookie": cookies },
    redirect: "follow",
  });
  if (!res.ok) return null;

  const html = await res.text();
  // e.g. "Last updated: 26 June 2026 08:49"
  const match = html.match(/Last updated[:\s]+(\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2})/i);
  if (!match) return null;

  const parsed = new Date(match[1]);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseRankings(html: string): Array<{ category: string; rank: number | null; points: number | null }> {
  const rowPattern = /<th scope="row"[^>]*>[\s\S]*?<a[^>]*player\.aspx[^"]*">([^<]+)<\/a>[\s\S]*?<td[^>]*text--right[^>]*>[\s\S]*?(?:<a[^>]*>)?(\d+)(?:<\/a>)?[\s\S]*?(?:<td[^>]*-m-visible[^>]*>[\s\S]*?(?:<a[^>]*>)?(\d+)(?:<\/a>)?[\s\S]*?<\/td>)?/g;

  const results: Array<{ category: string; rank: number | null; points: number | null }> = [];
  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(html)) !== null) {
    results.push({
      category: match[1].trim(),
      rank: match[2] ? parseInt(match[2], 10) : null,
      points: match[3] ? parseInt(match[3], 10) : null,
    });
  }
  return results;
}

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

    const { data: cached } = await supabase
      .from("ambassador_rankings")
      .select("*")
      .eq("ambassador_id", ambassador_id)
      .eq("source", "lta")
      .order("fetched_at", { ascending: false });

    // Short-circuit: fetched within the last hour — don't touch LTA at all.
    if (cached && cached.length > 0) {
      const ageHours = (Date.now() - new Date(cached[0].fetched_at).getTime()) / 3_600_000;
      if (ageHours < MIN_CHECK_HOURS) {
        return new Response(JSON.stringify({ data: cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Accept the LTA cookie wall so we can make authenticated page requests.
    const rankingPath = `/player-profile/${player_id}/ranking`;
    const cookies = await acceptCookieWall(rankingPath);

    // Check LTA's actual "Last updated" timestamp on the ranking list page.
    const ltaLastUpdated = await fetchLtaLastUpdated(cookies);

    if (ltaLastUpdated && cached && cached.length > 0) {
      const cacheDate = new Date(cached[0].fetched_at);
      if (cacheDate > ltaLastUpdated) {
        // Our cache is newer than the LTA's last publish — no need to re-fetch.
        return new Response(JSON.stringify({ data: cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch the player's ranking page and parse it.
    const pageRes = await fetch(`${LTA_BASE}${rankingPath}`, {
      headers: { "User-Agent": UA, "Cookie": cookies },
      redirect: "follow",
    });

    if (!pageRes.ok) {
      return new Response(
        JSON.stringify({ error: `LTA page responded ${pageRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html = await pageRes.text();
    const rankings = parseRankings(html);

    if (!rankings.length) {
      return new Response(
        JSON.stringify({ error: "No ranking data found on LTA page — HTML structure may have changed." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase
      .from("ambassador_rankings")
      .delete()
      .eq("ambassador_id", ambassador_id)
      .eq("source", "lta");

    const rows = rankings.map((r) => ({
      ambassador_id,
      source: "lta" as const,
      category: r.category,
      rank: r.rank,
      points_value: r.points,
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
