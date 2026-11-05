export type SaleStatus = "completed" | "refunded";

export type SalePayload = {
  discountCode: string;
  orderId: string;
  orderTotal: number;
  saleDate: string;
  status: SaleStatus;
};

type ParseResult = { ok: true; payload: SalePayload } | { ok: false; error: string };

// Validates the WooCommerce webhook body. `status` is optional and defaults to
// "completed", so the existing WordPress snippet keeps working unchanged.
export function parseSalePayload(body: Record<string, unknown>): ParseResult {
  const { discount_code, order_id, order_total, sale_date, status } = body;

  if (!discount_code || !order_id || order_total == null || !sale_date) {
    return {
      ok: false,
      error: "discount_code, order_id, order_total, and sale_date are required",
    };
  }

  const orderTotal = Number(order_total);
  if (!Number.isFinite(orderTotal) || orderTotal < 0) {
    return { ok: false, error: "order_total must be a non-negative number" };
  }

  if (status !== undefined && status !== "completed" && status !== "refunded") {
    return { ok: false, error: 'status must be "completed" or "refunded"' };
  }

  return {
    ok: true,
    payload: {
      discountCode: String(discount_code).toLowerCase(),
      orderId: String(order_id),
      orderTotal,
      saleDate: String(sale_date),
      status: status ?? "completed",
    },
  };
}
