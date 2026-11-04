const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

// Checks the shared secret that the scheduled job sends in `X-Cron-Secret`.
// Compares fixed-length hashes, so the time taken doesn't reveal how much of a
// guess was correct. A missing or empty secret on either side never matches.
export async function matchesCronSecret(
  provided: string | null,
  expected: string | undefined,
): Promise<boolean> {
  if (!provided || !expected) return false;

  const [providedHash, expectedHash] = await Promise.all([sha256(provided), sha256(expected)]);

  let difference = 0;
  for (let index = 0; index < providedHash.length; index++) {
    difference |= providedHash[index] ^ expectedHash[index];
  }
  return difference === 0;
}
