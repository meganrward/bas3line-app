# Plan: Sales & Commissions — WordPress Webhook Integration

## Context

Bas3line ambassadors have personalised coupon codes in a WooCommerce WordPress store. When a customer uses one of those codes, the sponsor needs to see the resulting sale and the ambassador's commission on the Bas3line app. There is no public WooCommerce API we can poll; instead, we'll mirror the existing "email notification" code snippet pattern: a PHP snippet hooks into WooCommerce's order-completion event and POSTs the sale data to a new Supabase edge function. The edge function validates a shared secret, maps the coupon code to an ambassador, computes commission, and writes the record. The `SalesCommissions` tab in `AmbassadorDetail` then reads that data directly from Supabase.

---

## 1. Database migration

**New migration file:** `supabase/migrations/20260630000002_sales_commissions.sql`

```sql
-- Coupon code + commission rate per ambassador
ALTER TABLE ambassador_profiles
  ADD COLUMN coupon_code       text unique,
  ADD COLUMN commission_rate   numeric(5,2) default 10.00;  -- percentage, e.g. 10.00 = 10%

-- Sales recorded from WordPress webhook
CREATE TABLE coupon_sales (
  id                uuid primary key default gen_random_uuid(),
  ambassador_id     uuid references ambassador_profiles(id) on delete cascade,
  coupon_code       text not null,
  order_id          text not null,
  order_total       numeric(10,2) not null,
  commission_amount numeric(10,2) not null,
  sale_date         timestamptz not null,
  created_at        timestamptz default now()
);

-- RLS: sponsors see all sales for their ambassadors; ambassadors see their own
ALTER TABLE coupon_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors read their ambassador sales"
  ON coupon_sales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ambassador_profiles ap
      JOIN sponsor_staff ss ON ss.sponsor_id = ap.sponsor_id
      WHERE ap.id = coupon_sales.ambassador_id
        AND ss.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM sponsors s
      JOIN ambassador_profiles ap ON ap.sponsor_id = s.id
      WHERE ap.id = coupon_sales.ambassador_id
        AND s.id IN (SELECT sponsor_id FROM sponsor_staff WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Ambassadors read own sales"
  ON coupon_sales FOR SELECT
  USING (ambassador_id = auth.uid());

-- Service role can insert (used by edge function)
GRANT INSERT, SELECT ON coupon_sales TO service_role;
GRANT SELECT, UPDATE ON ambassador_profiles TO service_role;
```

Also update `src/lib/types.ts` to add:
- `coupon_code: string | null` and `commission_rate: number | null` to `AmbassadorProfile`
- New `CouponSale` interface

---

## 2. Supabase edge function — `record-coupon-sale`

**New file:** `supabase/functions/record-coupon-sale/index.ts`

Auth approach: shared secret (no Supabase user session — this comes from WordPress server-to-server). The function reads `COUPON_WEBHOOK_SECRET` from Supabase secrets and checks `X-Webhook-Secret` request header.

**Logic:**
1. Reject non-POST and missing/wrong secret header → 401
2. Parse body: `{ coupon_code, order_id, order_total, sale_date }`
3. Look up `ambassador_profiles` where `coupon_code = $1` (service role client)
4. If not found → 404 (WordPress snippet will see this and can log it)
5. Compute `commission_amount = order_total * (ambassador.commission_rate / 100)`
6. Insert into `coupon_sales`
7. Return 200 `{ success: true }`

**Supabase secret to set:**
```bash
supabase secrets set COUPON_WEBHOOK_SECRET=<random-string>
```

**Deploy:**
```bash
supabase functions deploy record-coupon-sale
```

---

## 3. WordPress code snippet (PHP)

Provided to the user to paste into the WordPress admin Code Snippets plugin (same place as the existing email notification snippet). Hooks into `woocommerce_order_status_completed`.

```php
add_action( 'woocommerce_order_status_completed', 'bas3line_notify_sale' );

function bas3line_notify_sale( $order_id ) {
    $order   = wc_get_order( $order_id );
    $coupons = $order->get_coupon_codes();
    if ( empty( $coupons ) ) return;

    $endpoint = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/record-coupon-sale';
    $secret   = 'YOUR_COUPON_WEBHOOK_SECRET';

    foreach ( $coupons as $coupon_code ) {
        $body = json_encode( [
            'coupon_code' => strtolower( $coupon_code ),
            'order_id'    => (string) $order_id,
            'order_total' => (float)  $order->get_total(),
            'sale_date'   => $order->get_date_completed()
                               ? $order->get_date_completed()->format( 'c' )
                               : current_time( 'c' ),
        ] );

        wp_remote_post( $endpoint, [
            'method'  => 'POST',
            'timeout' => 15,
            'headers' => [
                'Content-Type'     => 'application/json',
                'X-Webhook-Secret' => $secret,
            ],
            'body' => $body,
        ] );
    }
}
```

Two placeholders to fill in: the Supabase project URL and the webhook secret.

---

## 4. Frontend — `SalesCommissions.tsx`

Replace the stub with a real component. It receives `ambassadorId: string` as a prop.

**Queries:** Direct Supabase client query on `coupon_sales` for the given ambassador, ordered by `sale_date` descending.

**UI layout:**
- Summary row: total sales count, total order value (£), total commission earned (£)
- Table: Date | Order ID | Order Total | Commission
- Empty state if no sales yet (keep the current placeholder copy)
- Loading spinner while fetching

**Update `AmbassadorDetail.tsx`** (line 111): pass `ambassadorId` prop:
```tsx
{tab === "sales" && <SalesCommissions ambassadorId={ambassador.id} />}
```

Also add `coupon_code` and `commission_rate` to the ambassador edit panel in `AmbassadorDetail` so the sponsor can set each ambassador's coupon code.

---

## 5. Update queries.ts

Add `fetchCouponSales(ambassadorId: string)` — queries `coupon_sales` ordered by `sale_date desc`.

---

## Critical files

| File | Change |
|------|--------|
| `supabase/migrations/20260630000002_sales_commissions.sql` | New — schema |
| `supabase/functions/record-coupon-sale/index.ts` | New — webhook receiver |
| `src/lib/types.ts` | Add `CouponSale`, extend `AmbassadorProfile` |
| `src/lib/queries.ts` | Add `fetchCouponSales` |
| `src/components/sponsor/SalesCommissions.tsx` | Replace stub with real UI |
| `src/components/sponsor/AmbassadorDetail.tsx` | Pass `ambassadorId` prop + add coupon/commission fields to edit panel |

---

## Verification

1. Run migration: `supabase db push`
2. Deploy edge function: `supabase functions deploy record-coupon-sale`
3. Set secret: `supabase secrets set COUPON_WEBHOOK_SECRET=test-secret-123`
4. Test with curl:
   ```bash
   curl -X POST https://YOUR_REF.supabase.co/functions/v1/record-coupon-sale \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: test-secret-123" \
     -d '{"coupon_code":"MEGAN10","order_id":"999","order_total":120.00,"sale_date":"2026-06-30T12:00:00Z"}'
   ```
   (first set coupon_code on an ambassador via the edit panel so the lookup resolves)
5. In the app, open an ambassador's Sales & Commissions tab — sale should appear
6. Add the PHP snippet to WordPress (staging first), complete a test order using an ambassador coupon, confirm the record appears in the app
