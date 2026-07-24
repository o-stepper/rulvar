/**
 * The L0 serialization hook and the default secret-masking policy
 * (M8-T04; OQ-20/OQ-22 interim rules executed).
 *
 * The hook is the single policy point between the engine and
 * persistence: redact/encrypt at the append and put boundaries,
 * symmetric on load and get. The engine applies it by WRAPPING its
 * configured stores, and `Engine.stores` exposes the wrapped instances,
 * so stored bytes and every reader pass one policy point. Symmetry is
 * normative: `fromStored(toStored(e))` MUST reproduce the entry
 * byte-identically, because content keys, the replay predicate, and the
 * folds all read loaded entries; lossy journal redaction is a
 * deliberate host trade, never a default.
 *
 * `maskSecrets` is the DEFAULT policy at the telemetry boundary: every
 * emitted WorkflowEvent passes it (opt out per engine via
 * `redaction: { maskEvents: false }`); the OTel exporter applies it to
 * string attributes. It masks strings that look like credentials; it is
 * deliberately conservative (the pattern set is
 * tuned on dogfood payloads, OQ-22 stays open for that).
 */
import { ConfigError } from './errors.js';
import type { Json, Bytes } from './json.js';
import type { JournalEntry } from './entries.js';
import type { JournalStore, LeasableStore, Lease, MetaLookupStore } from './spi/store.js';
import type { TranscriptStore } from './spi/transcript.js';

export interface JournalSerializationHook {
  /** Applied at append; kernel ordering/identity fields MUST pass through. */
  toStored(e: JournalEntry): JournalEntry;
  /** Applied at load; MUST be symmetric with toStored for replay to hold. */
  fromStored(e: JournalEntry): JournalEntry;
}

export interface TranscriptSerializationHook {
  /** Applied at put. */
  toStored(ref: string, blob: Bytes): Bytes;
  /** Applied at get; MUST be symmetric with toStored. */
  fromStored(ref: string, blob: Bytes): Bytes;
}

/** createEngine({ serialization }): absent means identity, no wrapping. */
export interface SerializationHook {
  journal?: JournalSerializationHook;
  transcripts?: TranscriptSerializationHook;
}

/**
 * The kernel orders and matches on these BEFORE values are consulted;
 * a hook that rewrites them would corrupt replay silently, so drift is
 * a loud ConfigError at the boundary.
 */
const PINNED_FIELDS = [
  'hashVersion',
  'seq',
  'ref',
  'scope',
  'key',
  'ordinal',
  'kind',
  'status',
] as const;

function assertPinnedFields(before: JournalEntry, after: JournalEntry, site: string): void {
  for (const field of PINNED_FIELDS) {
    if (before[field] !== after[field]) {
      throw new ConfigError(
        `serialization hook ${site} modified the kernel field '${field}' ` +
          `(ordering and identity fields MUST pass through unmodified)`,
      );
    }
  }
}

/**
 * Wraps a journal store with the hook; the lease and meta lookup
 * capabilities are preserved (meta is never hooked, exactly like
 * putMeta/listRuns pass through).
 */
export function wrapJournalStore(
  inner: JournalStore,
  hook: JournalSerializationHook,
): JournalStore {
  const wrapped: JournalStore & Partial<LeasableStore> & Partial<MetaLookupStore> = {
    append: async (runId: string, e: JournalEntry, lease?: Lease) => {
      const stored = hook.toStored(e);
      assertPinnedFields(e, stored, 'journal.toStored');
      await inner.append(runId, stored, lease);
    },
    load: async (runId: string) =>
      (await inner.load(runId)).map((stored) => {
        const loaded = hook.fromStored(stored);
        assertPinnedFields(stored, loaded, 'journal.fromStored');
        return loaded;
      }),
    putMeta: (m, lease?: Lease) => inner.putMeta(m, lease),
    listRuns: (f) => inner.listRuns(f),
    delete: (runId, lease?: Lease) => inner.delete(runId, lease),
    // The fenced writes marker is a promise the INNER store keeps; the
    // wrapper forwards every lease untouched, so the promise survives.
    ...(inner.fencedWrites === true ? { fencedWrites: true as const } : {}),
  };
  const leasable = inner as Partial<LeasableStore>;
  if (
    typeof leasable.acquire === 'function' &&
    typeof leasable.renew === 'function' &&
    typeof leasable.release === 'function'
  ) {
    wrapped.acquire = (runId, owner) => (inner as LeasableStore).acquire(runId, owner);
    wrapped.renew = (l) => (inner as LeasableStore).renew(l);
    wrapped.release = (l) => (inner as LeasableStore).release(l);
  }
  if (typeof (inner as Partial<MetaLookupStore>).getMeta === 'function') {
    wrapped.getMeta = (runId) => (inner as MetaLookupStore).getMeta(runId);
  }
  return wrapped;
}

/** Wraps a transcript store with the hook. */
export function wrapTranscriptStore(
  inner: TranscriptStore,
  hook: TranscriptSerializationHook,
): TranscriptStore {
  return {
    put: (ref, blob, lease?: Lease) => inner.put(ref, hook.toStored(ref, blob), lease),
    get: async (ref) => {
      const blob = await inner.get(ref);
      return blob === null ? null : hook.fromStored(ref, blob);
    },
    list: (runId) => inner.list(runId),
    delete: (ref, lease?: Lease) => inner.delete(ref, lease),
    ...(inner.fencedWrites === true ? { fencedWrites: true as const } : {}),
  };
}

/** The replacement marker; deterministic and greppable. */
export const MASKED_SECRET = '[masked-secret]';

// The default key-masking pattern set (at minimum,
// strings that look like API keys and other credentials). Conservative
// by design; tuning on dogfood payloads is the open part of OQ-22.
const SECRET_PATTERNS: RegExp[] = [
  // Provider-style API keys (OpenAI sk-..., Anthropic sk-ant-...).
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  // AWS access key ids.
  /\bAKIA[0-9A-Z]{16}\b/g,
  // GitHub tokens (classic and fine-grained).
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  // Slack tokens.
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  // Google API keys.
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  // Bearer/authorization tokens.
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/g,
  // JWTs (three base64url segments).
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  // PEM private key blocks.
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

/** Masks credential-shaped substrings in one string. */
export function maskSecrets(text: string): string {
  let masked = text;
  for (const pattern of SECRET_PATTERNS) {
    masked = masked.replace(pattern, MASKED_SECRET);
  }
  return masked;
}

/**
 * Deep-masks every string value in a JSON tree; non-strings pass
 * through. Returns the input identity when nothing matched, so the
 * default-on policy costs no allocation on clean events.
 */
export function maskSecretsDeep<T>(value: T): T {
  if (typeof value === 'string') {
    const masked = maskSecrets(value);
    return (masked === value ? value : masked) as unknown as T;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item: unknown) => {
      const masked = maskSecretsDeep(item);
      if (masked !== item) {
        changed = true;
      }
      return masked;
    });
    return (changed ? next : value) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const masked = maskSecretsDeep(item);
      if (masked !== item) {
        changed = true;
      }
      next[key] = masked;
    }
    return (changed ? next : value) as unknown as T;
  }
  return value;
}

/** Convenience for hosts: masks a Json value (alias of the deep walk). */
export function maskSecretsJson(value: Json): Json {
  return maskSecretsDeep(value);
}

/** A compiled masking policy: text and deep-JSON forms of one pattern set. */
export interface SecretMasker {
  maskText(text: string): string;
  maskDeep<T>(value: T): T;
}

/**
 * Compiles the redaction policy: the DEFAULT credential pattern set
 * plus host-defined patterns (RV-217), for the telemetry boundary
 * (events and traces; never the journal, where lossless encryption is
 * the right tool). String patterns compile as global regexes; RegExp
 * patterns are recompiled with the global flag when it is missing, so
 * replace-all semantics always hold. An invalid pattern is a typed
 * ConfigError at compile time, before anything runs under the policy.
 */
export function compileSecretMasker(
  patterns: ReadonlyArray<RegExp | string> = [],
  site = 'redaction.patterns',
): SecretMasker {
  const raw: unknown = patterns;
  if (!Array.isArray(raw)) {
    throw new ConfigError(`${site} must be an array of RegExp or string patterns`);
  }
  const compiled: RegExp[] = raw.map((pattern: unknown, index) => {
    const at = `${site}[${String(index)}]`;
    if (pattern instanceof RegExp) {
      return pattern.flags.includes('g')
        ? pattern
        : new RegExp(pattern.source, `${pattern.flags}g`);
    }
    if (typeof pattern !== 'string' || pattern === '') {
      throw new ConfigError(`${at} must be a RegExp or a nonempty pattern string`);
    }
    try {
      return new RegExp(pattern, 'g');
    } catch (thrown) {
      const detail = thrown instanceof Error ? thrown.message : String(thrown);
      throw new ConfigError(`${at} is not a valid regular expression: ${detail}`);
    }
  });
  const maskText = (text: string): string => {
    let masked = maskSecrets(text);
    for (const pattern of compiled) {
      masked = masked.replace(pattern, MASKED_SECRET);
    }
    return masked;
  };
  const maskDeep = <T>(value: T): T => deepMap(value, maskText);
  return { maskText, maskDeep };
}

/** Shared deep string walk preserving identity when nothing changed. */
function deepMap<T>(value: T, mapText: (text: string) => string): T {
  if (typeof value === 'string') {
    const masked = mapText(value);
    return (masked === value ? value : masked) as unknown as T;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item: unknown) => {
      const masked = deepMap(item, mapText);
      if (masked !== item) {
        changed = true;
      }
      return masked;
    });
    return (changed ? next : value) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const masked = deepMap(item, mapText);
      if (masked !== item) {
        changed = true;
      }
      next[key] = masked;
    }
    return (changed ? next : value) as unknown as T;
  }
  return value;
}
