/**
 * A UUID version 7 (RFC 9562): 48 bits of Unix time in milliseconds, then
 * random bits, with the version nibble 7 and the variant bits 10. New ids are
 * time-ordered, which is the estate's rule for every id we create.
 *
 * `now` and `fill` are parameters only so a test can fix them; callers use the
 * defaults (the clock and the browser's crypto random source).
 */
export function newUuidV7(
  now: number = Date.now(),
  fill: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  const bytes = fill(new Uint8Array(16));
  let ms = Math.floor(now);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** True for a lower-case UUID version 7 string, the form newUuidV7 produces. */
export function isUuidV7(value: string): boolean {
  return V7.test(value);
}
