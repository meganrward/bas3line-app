import assert from "node:assert/strict";
import { parseSalePayload } from "./sale-payload.ts";

const valid = {
  discount_code: "MEGAN10",
  order_id: 1234,
  order_total: "59.90",
  sale_date: "2026-07-01T10:00:00Z",
};

Deno.test("accepts a valid body and lowercases the code", () => {
  const result = parseSalePayload(valid);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payload.discountCode, "megan10");
    assert.equal(result.payload.orderId, "1234");
    assert.equal(result.payload.orderTotal, 59.9);
  }
});

Deno.test("status defaults to completed", () => {
  const result = parseSalePayload(valid);
  assert.equal(result.ok && result.payload.status, "completed");
});

Deno.test("accepts refunded", () => {
  const result = parseSalePayload({ ...valid, status: "refunded" });
  assert.equal(result.ok && result.payload.status, "refunded");
});

Deno.test("rejects an unknown status", () => {
  assert.equal(parseSalePayload({ ...valid, status: "lost" }).ok, false);
});

Deno.test("rejects missing fields", () => {
  assert.equal(parseSalePayload({ ...valid, order_id: undefined }).ok, false);
  assert.equal(parseSalePayload({ ...valid, sale_date: "" }).ok, false);
});

Deno.test("accepts a zero total but rejects negative or non-numeric totals", () => {
  assert.equal(parseSalePayload({ ...valid, order_total: 0 }).ok, true);
  assert.equal(parseSalePayload({ ...valid, order_total: -5 }).ok, false);
  assert.equal(parseSalePayload({ ...valid, order_total: "abc" }).ok, false);
});
