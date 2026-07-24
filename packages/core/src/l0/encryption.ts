/**
 * Envelope encryption over the serialization hook (RV-217): the
 * reference implementation of "PII never persists in plaintext". The
 * hook seam (l0/serialization.ts) is the single policy point between
 * the engine and persistence; this module puts real cryptography on
 * it, KMS-shaped.
 *
 * The envelope pattern, exactly as cloud KMS services frame it:
 *
 * - A DataKeyProvider is the KMS seam. It mints a fresh DATA key and
 *   returns it in two forms (plaintext for this process's memory,
 *   wrapped for storage), and it unwraps previously wrapped keys. The
 *   shipped `localKeyProvider` derives its key-encryption key from a
 *   host secret via HKDF-SHA256; an AWS KMS provider maps 1:1 onto
 *   GenerateDataKey and Decrypt (the guide shows the sketch), and
 *   tenant-scoped keys are providers constructed per tenant (the
 *   `info` input partitions one master secret into unrelated KEKs).
 * - All provider calls are ASYNC and happen ONCE, in
 *   `createEnvelopeEncryption`, never per entry: the hook contract is
 *   synchronous, so the factory unwraps everything up front and the
 *   hooks run on in-memory data keys. Entries carry the WRAPPED key in
 *   every envelope, so decrypt needs only the provider registration,
 *   not a live KMS on the read path.
 * - Payload encryption is AES-256-GCM with a random IV per write and
 *   the entry identity as ASSOCIATED DATA (`seq` and `key` for journal
 *   entries, the ref for transcript blobs), so a ciphertext moved to a
 *   different entry fails authentication instead of decrypting into
 *   the wrong place.
 * - Journal entries keep the kernel ordering/identity fields plus the
 *   operational timestamps and spanId in plaintext (stores index and
 *   humans operate on them; none carry payload content); EVERYTHING
 *   else (value, error, usage, servedBy, cost attribution, refs) is
 *   inside the ciphertext. `fromStored(toStored(e))` reproduces the
 *   entry, so replay, content keys, and the folds are untouched.
 * - Reads of NON-enveloped stored data fail closed by default
 *   (`plaintextReads: 'reject'`); `'passthrough'` is the explicit
 *   migration mode for stores with pre-encryption history.
 *
 * Docs: https://docs.rulvar.com/guide/data-protection
 */
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { ConfigError } from './errors.js';
import type { JournalEntry } from './entries.js';
import type { Bytes, Json } from './json.js';
import type {
  JournalSerializationHook,
  SerializationHook,
  TranscriptSerializationHook,
} from './serialization.js';

/**
 * The KMS seam. `keyId` is a stable routing id stamped into every
 * envelope (a KMS key ARN or alias, or a local rotation label); the
 * two methods are the exact shape of KMS GenerateDataKey and Decrypt.
 * Both are called only inside `createEnvelopeEncryption`.
 */
export interface DataKeyProvider {
  readonly keyId: string;
  generateDataKey(): Promise<{ plaintext: Bytes; wrapped: Bytes }>;
  unwrapDataKey(wrapped: Bytes): Promise<Bytes>;
}

const HKDF_SALT = 'rulvar-envelope-kek-v1';
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;
const DATA_KEY_BYTES = 32;

/**
 * The local reference DataKeyProvider: the key-encryption key is
 * HKDF-SHA256(secret, info), data keys are random 32-byte AES keys,
 * and wrapping is AES-256-GCM under the KEK. `info` partitions one
 * master secret into unrelated KEKs (tenant-scoped keys: one provider
 * per tenant with `info: tenantId`); a provider with different
 * secret or info CANNOT unwrap this provider's keys. For production
 * KMS, implement the same interface over GenerateDataKey/Decrypt.
 */
export function localKeyProvider(options: {
  secret: string | Bytes;
  /** Stamped into envelopes; default 'local:v1'. */
  keyId?: string;
  /** KEK partition label (e.g. a tenant id); default ''. */
  info?: string;
}): DataKeyProvider {
  const raw = options.secret;
  if ((typeof raw !== 'string' || raw === '') && !(raw instanceof Uint8Array)) {
    throw new ConfigError('localKeyProvider secret must be a nonempty string or bytes');
  }
  if (raw instanceof Uint8Array && raw.length < 16) {
    throw new ConfigError('localKeyProvider secret bytes must be at least 16 bytes');
  }
  const keyId = options.keyId ?? 'local:v1';
  if (typeof keyId !== 'string' || keyId === '') {
    throw new ConfigError('localKeyProvider keyId must be a nonempty string when given');
  }
  const kek = Buffer.from(
    hkdfSync(
      'sha256',
      typeof raw === 'string' ? Buffer.from(raw, 'utf8') : Buffer.from(raw),
      Buffer.from(HKDF_SALT, 'utf8'),
      Buffer.from(options.info ?? '', 'utf8'),
      DATA_KEY_BYTES,
    ),
  );
  return {
    keyId,
    // eslint-disable-next-line @typescript-eslint/require-await
    async generateDataKey(): Promise<{ plaintext: Bytes; wrapped: Bytes }> {
      const plaintext = randomBytes(DATA_KEY_BYTES);
      const iv = randomBytes(GCM_IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', kek, iv);
      const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const wrapped = Buffer.concat([iv, cipher.getAuthTag(), ct]);
      return { plaintext: new Uint8Array(plaintext), wrapped: new Uint8Array(wrapped) };
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async unwrapDataKey(wrapped: Bytes): Promise<Bytes> {
      const buffer = Buffer.from(wrapped);
      if (buffer.length <= GCM_IV_BYTES + GCM_TAG_BYTES) {
        throw new ConfigError('localKeyProvider: the wrapped data key is truncated');
      }
      const iv = buffer.subarray(0, GCM_IV_BYTES);
      const tag = buffer.subarray(GCM_IV_BYTES, GCM_IV_BYTES + GCM_TAG_BYTES);
      const ct = buffer.subarray(GCM_IV_BYTES + GCM_TAG_BYTES);
      const decipher = createDecipheriv('aes-256-gcm', kek, iv);
      decipher.setAuthTag(tag);
      try {
        const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
        return new Uint8Array(plaintext);
      } catch {
        throw new ConfigError(
          `localKeyProvider '${keyId}': cannot unwrap the data key (wrong secret, wrong ` +
            'info partition, or a corrupted wrapped key)',
        );
      }
    },
  };
}

/** The journal envelope marker; a stored entry's whole value is this. */
export const JOURNAL_ENVELOPE_MARKER = '__rulvarEnvelope';

/** The transcript blob envelope magic (version 1). */
const BLOB_MAGIC = Buffer.from('RVE1', 'utf8');

/**
 * Plaintext fields of a stored journal entry: the kernel
 * ordering/identity fields the hook contract pins, plus the
 * operational metadata stores index and operators read (timestamps,
 * spanId). None carry payload content.
 */
const CLEAR_FIELDS = [
  'hashVersion',
  'seq',
  'ref',
  'scope',
  'key',
  'ordinal',
  'kind',
  'status',
  'spanId',
  'startedAt',
  'endedAt',
] as const;
type ClearField = (typeof CLEAR_FIELDS)[number];

interface JournalEnvelope {
  v: 1;
  keyId: string;
  wrapped: string;
  iv: string;
  tag: string;
  data: string;
}

export interface EnvelopeEncryption {
  /** Pass as `createEngine({ serialization })`. */
  hook: SerializationHook;
  /** The provider's routing id, stamped into every envelope. */
  keyId: string;
  /**
   * The CURRENT wrapped data key. Every write stamps it into the
   * envelope, so nothing else must be persisted; it is exposed for
   * hosts that keep a rotation ledger.
   */
  wrappedDataKey: Bytes;
}

export interface EnvelopeEncryptionOptions {
  provider: DataKeyProvider;
  /**
   * Wrapped data keys from earlier sessions or rotations that this
   * process must still read. Unwrapped once at creation; an envelope
   * carrying an UNREGISTERED wrapped key fails typed at read, naming
   * this list.
   */
  historicalWrappedKeys?: readonly Bytes[];
  /**
   * What a NON-enveloped stored entry or blob means at read:
   * 'reject' (default, fail closed) or 'passthrough' (explicit
   * migration mode for stores with pre-encryption history).
   */
  plaintextReads?: 'reject' | 'passthrough';
}

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function isEnvelope(value: unknown): value is { [JOURNAL_ENVELOPE_MARKER]: JournalEnvelope } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== JOURNAL_ENVELOPE_MARKER) {
    return false;
  }
  const env = (value as Record<string, unknown>)[JOURNAL_ENVELOPE_MARKER] as
    Partial<JournalEnvelope> | undefined;
  return (
    typeof env === 'object' &&
    env !== null &&
    env.v === 1 &&
    typeof env.keyId === 'string' &&
    typeof env.wrapped === 'string' &&
    typeof env.iv === 'string' &&
    typeof env.tag === 'string' &&
    typeof env.data === 'string'
  );
}

/**
 * Builds the envelope-encryption SerializationHook. All DataKeyProvider
 * calls happen HERE (the hook itself is synchronous, on in-memory data
 * keys): a fresh data key is minted and wrapped for this instance, and
 * every historical wrapped key is unwrapped for the read path.
 */
export async function createEnvelopeEncryption(
  options: EnvelopeEncryptionOptions,
): Promise<EnvelopeEncryption> {
  const provider = options.provider as Partial<DataKeyProvider> | undefined;
  if (
    typeof provider !== 'object' ||
    provider === null ||
    typeof provider.keyId !== 'string' ||
    provider.keyId === '' ||
    typeof provider.generateDataKey !== 'function' ||
    typeof provider.unwrapDataKey !== 'function'
  ) {
    throw new ConfigError(
      'createEnvelopeEncryption: provider must implement DataKeyProvider ' +
        '(keyId, generateDataKey, unwrapDataKey)',
    );
  }
  const plaintextReads = options.plaintextReads ?? 'reject';
  if (plaintextReads !== 'reject' && plaintextReads !== 'passthrough') {
    throw new ConfigError(
      "createEnvelopeEncryption: plaintextReads must be 'reject' or 'passthrough'",
    );
  }
  const realProvider = options.provider;
  const current = await realProvider.generateDataKey();
  if (current.plaintext.length !== DATA_KEY_BYTES) {
    throw new ConfigError(
      `createEnvelopeEncryption: the provider returned a ${String(current.plaintext.length)}-byte ` +
        `data key; AES-256-GCM needs exactly ${String(DATA_KEY_BYTES)}`,
    );
  }
  // Key ring: wrapped-key bytes -> plaintext data key. Base64 of the
  // wrapped key is the lookup form the envelope carries.
  const ring = new Map<string, Buffer>();
  ring.set(b64(current.wrapped), Buffer.from(current.plaintext));
  for (const wrapped of options.historicalWrappedKeys ?? []) {
    const plaintext = await realProvider.unwrapDataKey(wrapped);
    if (plaintext.length !== DATA_KEY_BYTES) {
      throw new ConfigError(
        'createEnvelopeEncryption: a historical wrapped key unwrapped to ' +
          `${String(plaintext.length)} bytes; AES-256-GCM needs exactly ${String(DATA_KEY_BYTES)}`,
      );
    }
    ring.set(b64(wrapped), Buffer.from(plaintext));
  }
  const keyId = realProvider.keyId;
  const currentWrappedB64 = b64(current.wrapped);
  const currentKey = ring.get(currentWrappedB64) as Buffer;

  const keyFor = (envelopeKeyId: string, wrappedB64: string, site: string): Buffer => {
    const key = ring.get(wrappedB64);
    if (key === undefined) {
      throw new ConfigError(
        `${site}: the stored envelope carries a data key (keyId '${envelopeKeyId}') that this ` +
          'process has not registered; pass it in historicalWrappedKeys so the factory can ' +
          'unwrap it, and check the provider secret and info match the writing deployment',
      );
    }
    return key;
  };

  const encrypt = (key: Buffer, aad: Buffer, plaintext: Buffer): JournalEnvelope => {
    const iv = randomBytes(GCM_IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
      v: 1,
      keyId,
      wrapped: currentWrappedB64,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: ct.toString('base64'),
    };
  };

  const decrypt = (key: Buffer, aad: Buffer, env: JournalEnvelope, site: string): Buffer => {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(env.iv, 'base64'));
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(env.tag, 'base64'));
    try {
      return Buffer.concat([decipher.update(Buffer.from(env.data, 'base64')), decipher.final()]);
    } catch {
      throw new ConfigError(
        `${site}: envelope authentication failed (a tampered ciphertext, or a ciphertext ` +
          'moved to a different entry; the entry identity is associated data)',
      );
    }
  };

  const journal: JournalSerializationHook = {
    toStored(e: JournalEntry): JournalEntry {
      const clear: Partial<Record<ClearField, unknown>> = {};
      const rest: Record<string, unknown> = {};
      for (const [field, fieldValue] of Object.entries(e)) {
        if ((CLEAR_FIELDS as readonly string[]).includes(field)) {
          clear[field as ClearField] = fieldValue;
        } else {
          rest[field] = fieldValue;
        }
      }
      const aad = Buffer.from(`journal:${String(e.seq)}:${e.key}`, 'utf8');
      const envelope = encrypt(currentKey, aad, Buffer.from(JSON.stringify(rest), 'utf8'));
      return {
        ...(clear as unknown as JournalEntry),
        value: { [JOURNAL_ENVELOPE_MARKER]: envelope } as unknown as Json,
      };
    },
    fromStored(e: JournalEntry): JournalEntry {
      if (!isEnvelope(e.value)) {
        if (plaintextReads === 'passthrough') {
          return e;
        }
        throw new ConfigError(
          `envelope encryption: stored entry seq ${String(e.seq)} is not enveloped and ` +
            "plaintextReads is 'reject'; enable 'passthrough' only for a deliberate " +
            'migration of pre-encryption history',
        );
      }
      const env = e.value[JOURNAL_ENVELOPE_MARKER];
      const key = keyFor(env.keyId, env.wrapped, 'envelope encryption (journal read)');
      const aad = Buffer.from(`journal:${String(e.seq)}:${e.key}`, 'utf8');
      const rest = JSON.parse(
        decrypt(key, aad, env, 'envelope encryption (journal read)').toString('utf8'),
      ) as Record<string, unknown>;
      const clear: Record<string, unknown> = {};
      for (const field of CLEAR_FIELDS) {
        if (e[field] !== undefined) {
          clear[field] = e[field];
        }
      }
      return { ...clear, ...rest } as unknown as JournalEntry;
    },
  };

  const transcripts: TranscriptSerializationHook = {
    toStored(ref: string, blob: Bytes): Bytes {
      const iv = randomBytes(GCM_IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', currentKey, iv);
      cipher.setAAD(Buffer.from(`blob:${ref}`, 'utf8'));
      const ct = Buffer.concat([cipher.update(Buffer.from(blob)), cipher.final()]);
      const keyIdBytes = Buffer.from(keyId, 'utf8');
      const wrappedBytes = Buffer.from(currentWrappedB64, 'base64');
      const header = Buffer.alloc(4);
      header.writeUInt16BE(keyIdBytes.length, 0);
      header.writeUInt16BE(wrappedBytes.length, 2);
      return new Uint8Array(
        Buffer.concat([BLOB_MAGIC, header, keyIdBytes, wrappedBytes, iv, cipher.getAuthTag(), ct]),
      );
    },
    fromStored(ref: string, blob: Bytes): Bytes {
      const buffer = Buffer.from(blob);
      if (buffer.length < BLOB_MAGIC.length || !buffer.subarray(0, 4).equals(BLOB_MAGIC)) {
        if (plaintextReads === 'passthrough') {
          return blob;
        }
        throw new ConfigError(
          `envelope encryption: stored blob '${ref}' is not enveloped and plaintextReads ` +
            "is 'reject'; enable 'passthrough' only for a deliberate migration",
        );
      }
      let offset = BLOB_MAGIC.length;
      const keyIdLen = buffer.readUInt16BE(offset);
      const wrappedLen = buffer.readUInt16BE(offset + 2);
      offset += 4;
      const envelopeKeyId = buffer.subarray(offset, offset + keyIdLen).toString('utf8');
      offset += keyIdLen;
      const wrappedB64 = buffer.subarray(offset, offset + wrappedLen).toString('base64');
      offset += wrappedLen;
      const iv = buffer.subarray(offset, offset + GCM_IV_BYTES);
      const tag = buffer.subarray(offset + GCM_IV_BYTES, offset + GCM_IV_BYTES + GCM_TAG_BYTES);
      const ct = buffer.subarray(offset + GCM_IV_BYTES + GCM_TAG_BYTES);
      const key = keyFor(envelopeKeyId, wrappedB64, `envelope encryption (blob '${ref}')`);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(Buffer.from(`blob:${ref}`, 'utf8'));
      decipher.setAuthTag(tag);
      try {
        return new Uint8Array(Buffer.concat([decipher.update(ct), decipher.final()]));
      } catch {
        throw new ConfigError(
          `envelope encryption: blob '${ref}' authentication failed (tampered ciphertext ` +
            'or a ciphertext moved between refs; the ref is associated data)',
        );
      }
    },
  };

  return {
    hook: { journal, transcripts },
    keyId,
    wrappedDataKey: new Uint8Array(current.wrapped),
  };
}

/** Guards against non-constant-time comparisons in host key checks. */
export function constantTimeEqual(a: Bytes, b: Bytes): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
