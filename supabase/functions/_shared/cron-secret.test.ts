import assert from "node:assert/strict";
import { matchesCronSecret } from "./cron-secret.ts";

Deno.test("accepts the matching secret", async () => {
  assert.equal(await matchesCronSecret("s3cret-value", "s3cret-value"), true);
});

Deno.test("rejects a different secret", async () => {
  assert.equal(await matchesCronSecret("wrong", "s3cret-value"), false);
});

Deno.test("rejects a secret that is only a prefix or extension of the real one", async () => {
  assert.equal(await matchesCronSecret("s3cret", "s3cret-value"), false);
  assert.equal(await matchesCronSecret("s3cret-value-extra", "s3cret-value"), false);
});

Deno.test("rejects a missing header", async () => {
  assert.equal(await matchesCronSecret(null, "s3cret-value"), false);
  assert.equal(await matchesCronSecret("", "s3cret-value"), false);
});

Deno.test("never matches when the secret is not configured", async () => {
  assert.equal(await matchesCronSecret("anything", undefined), false);
  assert.equal(await matchesCronSecret("", ""), false);
  assert.equal(await matchesCronSecret("", undefined), false);
});

Deno.test("is case sensitive", async () => {
  assert.equal(await matchesCronSecret("S3CRET-VALUE", "s3cret-value"), false);
});
