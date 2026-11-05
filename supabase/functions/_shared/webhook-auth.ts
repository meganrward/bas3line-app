import { matchesCronSecret as matchesSecret } from "./cron-secret.ts";

const encoder = new TextEncoder();

// Base64 HMAC-SHA256 of the raw request body, the same scheme WooCommerce uses for
// `X-WC-Webhook-Signature`.
export async function signBody(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)));
  return btoa(String.fromCharCode(...signature));
}

export type WebhookAuthResult = { ok: true } | { ok: false; error: string };

// Checks who sent the webhook. Both comparisons are constant-time.
//   - `X-Webhook-Signature`: HMAC of the raw body. Proves the body was not changed and
//     that the sender knows the secret, without sending the secret itself.
//   - `X-Webhook-Secret`: the original shared-secret header. Still accepted so the existing
//     WordPress snippet keeps working, unless `requireSignature` is set.
// A signature header that is present must be valid; it never falls back to the secret.
export async function verifyWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
  requireSignature: boolean,
): Promise<WebhookAuthResult> {
  const signature = headers.get("X-Webhook-Signature");
  if (signature !== null) {
    const valid = await matchesSecret(signature, await signBody(rawBody, secret));
    return valid ? { ok: true } : { ok: false, error: "Unauthorized" };
  }

  if (requireSignature) return { ok: false, error: "Signature required" };

  const valid = await matchesSecret(headers.get("X-Webhook-Secret"), secret);
  return valid ? { ok: true } : { ok: false, error: "Unauthorized" };
}
