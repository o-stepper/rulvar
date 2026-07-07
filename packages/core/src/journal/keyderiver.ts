/**
 * hashVersion mechanism (M2-T05, DEF-6): frozen KeyDeriver profiles, the
 * per-engine deriver registry, the support-window compatibility scan, and
 * the versioned KeyRing for matching. A profile is immutable after
 * release and versions the ENTIRE identity and replay pipeline as one
 * unit (docs/03, section "hashVersion").
 */
import { createHash } from 'node:crypto';
import { ConfigError, JournalCompatibilityError } from '../l0/errors.js';
import { CURRENT_HASH_VERSION, type HashVersion, type JournalEntry } from '../l0/entries.js';
import type { Effort } from '../l0/messages.js';
import { jcsSerialize } from '../l0/jcs.js';
import { schemaHash as schemaHashV2, toolsetHash as toolsetHashV2 } from '../l0/schema.js';
import type { JsonSchema, ToolContract } from '../l0/messages.js';
import { projectIdentity, type IdentityInput } from './identity.js';
import type { DerivedKey, KeyRing } from './matching.js';

/** The projected, JCS-serializable identity under one profile. */
export type CanonicalIdentity = Record<string, unknown>;

/**
 * Per-effective-status disposition rules; DATA on the profile, consumed
 * only by the single canonical replayDisposition function (docs/03,
 * section 4.2: there is NO replayAction method).
 */
export type DispositionRule =
  | 'replay'
  | 'rerun'
  /** rerun unless memoizeOutcome is fixed in the entry (limit is always task-class). */
  | 'memoize-limit'
  /** rerun unless memoizeOutcome AND the classifier yields task-class. */
  | 'memoize-task-error';

export type DispositionTable = Readonly<
  Partial<Record<'ok' | 'escalated' | 'limit' | 'error' | 'cancelled' | 'running', DispositionRule>>
>;

export interface KeyDeriver {
  readonly hashVersion: HashVersion;
  /** Features not expressible in this profile yield 'incomparable' (a guaranteed non-match). */
  project(input: IdentityInput): CanonicalIdentity | 'incomparable';
  deriveKey(c: CanonicalIdentity): string;
  schemaHash(schema: JsonSchema): string;
  toolsetHash(tools: ToolContract[]): string;
  readonly dispositionTable: DispositionTable;
  readonly foldDefaults: Readonly<{
    effort: Effort;
    memoizeOutcome: boolean;
    budgetAccount: 'root';
  }>;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** The full v2 table; the three kernel amendments live in these rules (docs/03, section 6.3). */
const V2_TABLE: DispositionTable = {
  ok: 'replay',
  escalated: 'replay',
  limit: 'memoize-limit',
  error: 'memoize-task-error',
  cancelled: 'rerun',
  running: 'rerun',
};

/** Round-1: only ok replays; error, limit, cancelled, and dangling running rerun. */
const V1_TABLE: DispositionTable = {
  ok: 'replay',
  limit: 'rerun',
  error: 'rerun',
  cancelled: 'rerun',
  running: 'rerun',
};

/** The current (hashVersion 2) frozen profile. */
export const deriverV2: KeyDeriver = {
  hashVersion: 2,
  project(input: IdentityInput): CanonicalIdentity {
    return projectIdentity(input);
  },
  deriveKey(c: CanonicalIdentity): string {
    return sha256Hex(jcsSerialize(c));
  },
  schemaHash: schemaHashV2,
  toolsetHash: toolsetHashV2,
  dispositionTable: V2_TABLE,
  foldDefaults: { effort: 'medium', memoizeOutcome: false, budgetAccount: 'root' },
};

/** Kinds that did not exist in round 1: incomparable under v1 (docs/03, section 4.3). */
const V1_INEXPRESSIBLE_KINDS = new Set([
  'decision',
  'plan.revision',
  'plan.decision',
  'ledger.op',
  'node.link',
  'termination.init',
  'termination.denied',
]);

/**
 * The frozen v1 (round 1) profile: the projection removes effort from the
 * requested modelSpec (the v1 predicate is effort-insensitive by
 * construction); features outside the v1 domain are incomparable.
 */
export const deriverV1: KeyDeriver = {
  hashVersion: 1,
  project(input: IdentityInput): CanonicalIdentity | 'incomparable' {
    if (V1_INEXPRESSIBLE_KINDS.has(input.kind)) {
      return 'incomparable';
    }
    const projected = projectIdentity(input);
    if (input.kind === 'agent') {
      const modelSpec = { ...(projected.modelSpec as Record<string, unknown>) };
      delete modelSpec.effort;
      return { ...projected, modelSpec };
    }
    return projected;
  },
  deriveKey(c: CanonicalIdentity): string {
    return sha256Hex(jcsSerialize(c));
  },
  // Round 1 used the same canonicalization rules; the derivations are
  // frozen as shipped (docs/03, section 4.3).
  schemaHash: schemaHashV2,
  toolsetHash: toolsetHashV2,
  dispositionTable: V1_TABLE,
  foldDefaults: { effort: 'medium', memoizeOutcome: false, budgetAccount: 'root' },
};

export type DeriverRegistry = ReadonlyMap<HashVersion, KeyDeriver>;

function isKeyDeriver(value: unknown): value is KeyDeriver {
  const candidate = value as Partial<KeyDeriver> | null;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.hashVersion === 'number' &&
    typeof candidate.project === 'function' &&
    typeof candidate.deriveKey === 'function' &&
    typeof candidate.schemaHash === 'function' &&
    typeof candidate.toolsetHash === 'function' &&
    typeof candidate.dispositionTable === 'object' &&
    typeof candidate.foldDefaults === 'object'
  );
}

/**
 * Builds the per-engine deriver registry: the shipped v1/v2 profiles plus
 * EngineOptions.extraDerivers, the ONLY window extender (docs/03, section
 * 4.5). A malformed extra deriver is a ConfigError before any run effect.
 */
export function buildDeriverRegistry(extraDerivers?: readonly unknown[]): DeriverRegistry {
  const registry = new Map<HashVersion, KeyDeriver>([
    [deriverV1.hashVersion, deriverV1],
    [deriverV2.hashVersion, deriverV2],
  ]);
  for (const extra of extraDerivers ?? []) {
    if (!isKeyDeriver(extra)) {
      throw new ConfigError(
        'extraDerivers entries must implement the KeyDeriver SPI (docs/03, section 4.2)',
      );
    }
    registry.set(extra.hashVersion, extra);
  }
  return registry;
}

/**
 * The one compatibility scan: immediately after load, strictly BEFORE any
 * live call, any append, and any admission reserve; repeated at lease
 * acquire in queue mode (docs/03, section 4.5). Side-effect free.
 */
export function scanJournalCompatibility(
  runId: string,
  entries: readonly JournalEntry[],
  registry: DeriverRegistry,
): void {
  const versions = [...registry.keys()];
  const min = Math.min(...versions);
  const max = Math.max(...versions);
  for (const entry of entries) {
    if (registry.has(entry.hashVersion)) {
      continue;
    }
    const tooNew = entry.hashVersion > CURRENT_HASH_VERSION;
    throw new JournalCompatibilityError(
      `journal of run '${runId}' contains hashVersion ${entry.hashVersion} at seq ` +
        `${entry.seq}, outside the supported window [${min}, ${max}]`,
      {
        subCode: tooNew ? 'HASH_VERSION_TOO_NEW' : 'HASH_VERSION_TOO_OLD',
        runId,
        entrySeq: entry.seq,
        entryHashVersion: entry.hashVersion,
        supportedRange: { min, max },
        hint: tooNew
          ? 'upgrade lurker'
          : `enable deriverV${entry.hashVersion} from @lurker/compat via extraDerivers`,
      },
    );
  }
}

/**
 * KeyRing over the registry: the live call is projected DOWN into the
 * profile of the stored entry; there is no upward canonization (docs/03,
 * section 4.7).
 */
export function registryKeyRing(registry: DeriverRegistry): KeyRing {
  return {
    keyFor(identity: IdentityInput, hashVersion: number): DerivedKey {
      const deriver = registry.get(hashVersion);
      if (deriver === undefined) {
        return 'incomparable';
      }
      const projected = deriver.project(identity);
      if (projected === 'incomparable') {
        return 'incomparable';
      }
      return { key: deriver.deriveKey(projected) };
    },
  };
}
