/**
 * ULID with a monotonic factory (task M0-T08).
 *
 * First-party implementation of the ULID spec
 * (https://github.com/ulid/spec): a 48-bit millisecond timestamp plus 80
 * bits of randomness, Crockford base32, 26 characters, lexicographically
 * sortable. Zero dependencies by design: engine-minted CanonicalIds are
 * ULIDs (docs/04-model-layer-spec.md, section "Wire contract (L0)") and
 * @rulvar/core must stay dependency-free (docs/13-toolchain-repo.md,
 * section "Dependency baseline pins").
 *
 * The monotonic factory guarantees strictly increasing ids within one
 * process: ids minted in the same millisecond (or after a clock regression)
 * reuse the previous timestamp and increment the 80-bit random component as
 * a big-endian counter, per the spec's monotonicity clause.
 */

/** Crockford base32 alphabet (no I, L, O, U). */
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const TIME_LENGTH = 10;
const RANDOM_BYTES = 10; // 80 bits
const RANDOM_LENGTH = 16; // 80 bits / 5 bits per char
const TIME_MAX = 2 ** 48 - 1;

/** Mints one ULID per call; monotonic factories mint strictly increasing ids. */
export type UlidFactory = () => string;

function defaultRandom(byteLength: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(byteLength));
}

function encodeTime(time: number): string {
  let out = '';
  let t = time;
  for (let i = 0; i < TIME_LENGTH; i++) {
    out = ENCODING[t % 32] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function encodeRandom(bytes: Uint8Array): string {
  // Pack 10 bytes (80 bits) into 16 base32 characters, most significant
  // bits first, via a rolling bit buffer.
  let out = '';
  let buffer = 0;
  let bitsInBuffer = 0;
  for (let i = 0; i < RANDOM_BYTES; i++) {
    buffer = (buffer << 8) | bytes[i];
    bitsInBuffer += 8;
    while (bitsInBuffer >= 5) {
      out += ENCODING[(buffer >>> (bitsInBuffer - 5)) & 0x1f];
      bitsInBuffer -= 5;
      buffer &= (1 << bitsInBuffer) - 1;
    }
  }
  return out;
}

/** Increments a big-endian byte counter in place; throws RangeError on overflow. */
function incrementBytes(bytes: Uint8Array): void {
  for (let i = bytes.length - 1; i >= 0; i--) {
    if (bytes[i] < 0xff) {
      bytes[i] = bytes[i] + 1;
      return;
    }
    bytes[i] = 0;
  }
  throw new RangeError(
    'ULID monotonic counter overflow: more than 2^80 ids minted in one millisecond',
  );
}

function assertValidTime(time: number): void {
  if (!Number.isInteger(time) || time < 0 || time > TIME_MAX) {
    throw new RangeError(`ULID timestamp out of range: ${time}`);
  }
}

/**
 * Creates a monotonic ULID factory. Ids from one factory are strictly
 * increasing (as strings) even when the clock does not advance or runs
 * backwards; in both cases the previous timestamp is reused and the random
 * component is incremented.
 *
 * `now` and `random` are injectable for tests; defaults are `Date.now` and
 * `globalThis.crypto.getRandomValues`.
 */
export function monotonicUlidFactory(options?: {
  now?: () => number;
  random?: (byteLength: number) => Uint8Array;
}): UlidFactory {
  const now = options?.now ?? Date.now;
  const random = options?.random ?? defaultRandom;
  let lastTime = -1;
  let lastRandom: Uint8Array | null = null;

  return () => {
    const time = now();
    assertValidTime(time);
    if (lastRandom !== null && time <= lastTime) {
      incrementBytes(lastRandom);
    } else {
      lastTime = time;
      const bytes = random(RANDOM_BYTES);
      if (bytes.length !== RANDOM_BYTES) {
        throw new RangeError(
          `ULID random source must return ${RANDOM_BYTES} bytes, got ${bytes.length}`,
        );
      }
      lastRandom = bytes;
    }
    return encodeTime(lastTime) + encodeRandom(lastRandom);
  };
}

/** Extracts the millisecond timestamp from a ULID. */
export function decodeTime(id: string): number {
  if (id.length !== TIME_LENGTH + RANDOM_LENGTH) {
    throw new RangeError(`ULID must be 26 characters, got ${id.length}`);
  }
  let time = 0;
  for (let i = 0; i < TIME_LENGTH; i++) {
    const value = ENCODING.indexOf(id[i]);
    if (value === -1) {
      throw new RangeError(`ULID contains invalid character: ${id[i]}`);
    }
    time = time * 32 + value;
  }
  if (time > TIME_MAX) {
    throw new RangeError(`ULID timestamp out of range: ${time}`);
  }
  return time;
}
