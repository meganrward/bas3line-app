import assert from "node:assert/strict";
import { signBody, verifyWebhook } from "./webhook-auth.ts";

const secret = "s3cret-value";
const body = '{"order_id":1234}';

function headersWith(values: Record<string, string>): Headers {
  return new Headers(values);
}

Deno.test("signBody matches a known HMAC-SHA256 value", async () => {
  // printf '%s' hello | openssl dgst -sha256 -hmac key -binary | base64
  assert.equal(
    await signBody("hello", "key"),
    "kwezuRXvtRcf8U2MtV+8x5jGwO8UVtZt7RpqpyOli3s=",
  );
});

Deno.test("signBody changes when the body or the secret changes", async () => {
  const original = await signBody(body, secret);
  assert.notEqual(original, await signBody(body + " ", secret));
  assert.notEqual(original, await signBody(body, "other-secret"));
});

Deno.test("accepts a valid signature", async () => {
  const headers = headersWith({ "X-Webhook-Signature": await signBody(body, secret) });
  assert.deepEqual(await verifyWebhook(body, headers, secret, true), { ok: true });
});

Deno.test("rejects a signature for a different body", async () => {
  const headers = headersWith({ "X-Webhook-Signature": await signBody(body, secret) });
  const result = await verifyWebhook('{"order_id":9999}', headers, secret, false);
  assert.equal(result.ok, false);
});

Deno.test("rejects a signature made with the wrong secret", async () => {
  const headers = headersWith({ "X-Webhook-Signature": await signBody(body, "wrong") });
  assert.equal((await verifyWebhook(body, headers, secret, false)).ok, false);
});

Deno.test("a bad signature never falls back to the shared secret", async () => {
  const headers = headersWith({
    "X-Webhook-Signature": "bogus",
    "X-Webhook-Secret": secret,
  });
  assert.equal((await verifyWebhook(body, headers, secret, false)).ok, false);
});

Deno.test("accepts the legacy shared secret when a signature is not required", async () => {
  const headers = headersWith({ "X-Webhook-Secret": secret });
  assert.deepEqual(await verifyWebhook(body, headers, secret, false), { ok: true });
});

Deno.test("rejects a wrong legacy secret", async () => {
  const headers = headersWith({ "X-Webhook-Secret": "wrong" });
  assert.equal((await verifyWebhook(body, headers, secret, false)).ok, false);
});

Deno.test("rejects the legacy secret once a signature is required", async () => {
  const headers = headersWith({ "X-Webhook-Secret": secret });
  assert.equal((await verifyWebhook(body, headers, secret, true)).ok, false);
});

Deno.test("rejects a request with no credentials", async () => {
  assert.equal((await verifyWebhook(body, new Headers(), secret, false)).ok, false);
});
