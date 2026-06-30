import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const webhookSecret = Deno.env.get("DISCOUNT_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const incomingSecret = req.headers.get("X-Webhook-Secret");
  if (!incomingSecret || incomingSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    discount_code: string;
    order_id: string;
    order_total: number;
    sale_date: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { discount_code, order_id, order_total, sale_date } = body;

  if (!discount_code || !order_id || order_total == null || !sale_date) {
    return new Response(
      JSON.stringify({ error: "discount_code, order_id, order_total, and sale_date are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!,
  );

  // Look up ambassador by discount code (case-insensitive)
  const { data: ambassador, error: lookupError } = await supabase
    .from("ambassador_profiles")
    .select("id, commission_rate")
    .eq("discount_code", discount_code.toLowerCase())
    .maybeSingle();

  if (lookupError) {
    console.error("Lookup error:", lookupError);
    return new Response(JSON.stringify({ error: "Database error during lookup" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ambassador) {
    return new Response(
      JSON.stringify({ error: `No ambassador found for discount code "${discount_code}"` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const commissionRate = ambassador.commission_rate ?? 10;
  const commissionAmount = Number(
    ((order_total * commissionRate) / 100).toFixed(2),
  );

  const { error: insertError } = await supabase.from("discount_code_sales").insert({
    ambassador_id: ambassador.id,
    discount_code: discount_code.toLowerCase(),
    order_id: String(order_id),
    order_total: Number(order_total),
    commission_amount: commissionAmount,
    sale_date,
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return new Response(JSON.stringify({ error: "Failed to record sale" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: true, commission_amount: commissionAmount }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
