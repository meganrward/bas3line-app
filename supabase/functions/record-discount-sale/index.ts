import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseSalePayload } from "../_shared/sale-payload.ts";
import { verifyWebhook } from "../_shared/webhook-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-secret, x-webhook-signature",
};

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("DISCOUNT_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return respond({ error: "Webhook secret not configured" }, 500);
  }

  // The signature covers the exact bytes sent, so read the body as text before parsing it.
  // Set WEBHOOK_REQUIRE_SIGNATURE=true once the WordPress snippet sends X-Webhook-Signature.
  const rawBody = await req.text();
  const authentication = await verifyWebhook(
    rawBody,
    req.headers,
    webhookSecret,
    Deno.env.get("WEBHOOK_REQUIRE_SIGNATURE") === "true",
  );
  if (!authentication.ok) {
    return respond({ error: authentication.error }, 401);
  }

  let body: Record<string, unknown>;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return respond({ error: "Invalid JSON body" }, 400);
  }

  const parsed = parseSalePayload(body);
  if (!parsed.ok) {
    return respond({ error: parsed.error }, 400);
  }

  const { discountCode, orderId, orderTotal, saleDate, status } = parsed.payload;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!,
  );

  if (status === "refunded") {
    // Mark the original sale refunded, found by order id alone: the ambassador and their
    // code are not needed, so a code that was changed since the sale cannot block a refund.
    // Amounts are left as recorded, so the audit trail shows what was originally earned.
    // Idempotent: re-sending changes nothing.
    const { data: refundedRows, error: refundError } = await supabase
      .from("discount_code_sales")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("status", "completed")
      .select("id");

    if (refundError) {
      console.error("Refund error:", refundError);
      return respond({ error: "Failed to record refund" }, 500);
    }

    if (refundedRows && refundedRows.length > 0) {
      return respond({ success: true, refunded: true });
    }

    const { data: existingSale, error: existingError } = await supabase
      .from("discount_code_sales")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingError) {
      console.error("Refund lookup error:", existingError);
      return respond({ error: "Failed to record refund" }, 500);
    }

    // The sale is already refunded; nothing more to do.
    if (existingSale) {
      return respond({ success: true, refunded: false });
    }

    // The refund arrived before its sale. Record the sale already refunded, so the later
    // "completed" webhook is ignored as a duplicate and the commission nets to zero.
    return await recordSale(supabase, { discountCode, orderId, orderTotal, saleDate }, true);
  }

  return await recordSale(supabase, { discountCode, orderId, orderTotal, saleDate }, false);
});

type SaleDetails = {
  discountCode: string;
  orderId: string;
  orderTotal: number;
  saleDate: string;
};

async function recordSale(
  supabase: SupabaseClient,
  { discountCode, orderId, orderTotal, saleDate }: SaleDetails,
  alreadyRefunded: boolean,
): Promise<Response> {
  // Look up ambassador by discount code (stored lowercase)
  const { data: ambassador, error: lookupError } = await supabase
    .from("ambassador_profiles")
    .select("id, commission_rate")
    .eq("discount_code", discountCode)
    .maybeSingle();

  if (lookupError) {
    console.error("Lookup error:", lookupError);
    return respond({ error: "Database error during lookup" }, 500);
  }

  if (!ambassador) {
    return respond({ error: `No ambassador found for discount code "${discountCode}"` }, 404);
  }

  const commissionRate = ambassador.commission_rate ?? 10;
  const commissionAmount = Number(((orderTotal * commissionRate) / 100).toFixed(2));

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
        ...(alreadyRefunded && { status: "refunded", refunded_at: new Date().toISOString() }),
      },
      { onConflict: "order_id", ignoreDuplicates: true },
    )
    .select("id");

  if (insertError) {
    console.error("Insert error:", insertError);
    return respond({ error: "Failed to record sale" }, 500);
  }

  const duplicate = !insertedRows || insertedRows.length === 0;

  if (alreadyRefunded) {
    return respond({ success: true, refunded: !duplicate, recorded_before_sale: !duplicate });
  }

  return respond({ success: true, duplicate, commission_amount: commissionAmount });
}
