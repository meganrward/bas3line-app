import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseSalePayload } from "../_shared/sale-payload.ts";

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

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = parseSalePayload(body);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { discountCode, orderId, orderTotal, saleDate, status } = parsed.payload;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!,
  );

  // Look up ambassador by discount code (case-insensitive)
  const { data: ambassador, error: lookupError } = await supabase
    .from("ambassador_profiles")
    .select("id, commission_rate")
    .eq("discount_code", discountCode)
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
      JSON.stringify({ error: `No ambassador found for discount code "${discountCode}"` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const commissionRate = ambassador.commission_rate ?? 10;
  const commissionAmount = Number(((orderTotal * commissionRate) / 100).toFixed(2));

  if (status === "refunded") {
    // Mark the original sale refunded. Amounts are left as recorded, so the audit
    // trail shows what was originally earned. Idempotent: re-sending changes nothing.
    const { data: refundedRows, error: refundError } = await supabase
      .from("discount_code_sales")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("status", "completed")
      .select("id");

    if (refundError) {
      console.error("Refund error:", refundError);
      return new Response(JSON.stringify({ error: "Failed to record refund" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, refunded: (refundedRows?.length ?? 0) > 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // order_id is unique, so a retried webhook is ignored rather than duplicated
  const { data: insertedRows, error: insertError } = await supabase
    .from("discount_code_sales")
    .upsert(
      {
        ambassador_id: ambassador.id,
        discount_code: discountCode,
        order_id: orderId,
        order_total: orderTotal,
        commission_amount: commissionAmount,
        sale_date: saleDate,
      },
      { onConflict: "order_id", ignoreDuplicates: true },
    )
    .select("id");

  if (insertError) {
    console.error("Insert error:", insertError);
    return new Response(JSON.stringify({ error: "Failed to record sale" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const duplicate = !insertedRows || insertedRows.length === 0;

  return new Response(
    JSON.stringify({ success: true, duplicate, commission_amount: commissionAmount }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
