/**
 * The durable JSONL reference of the two-phase effect ledger (RV404,
 * hardened by RV501/RV502): one JSON line per phase, appended and
 * awaited, so the intent row is on disk before the external effect is
 * dispatched and survives a host process crash between the effect and
 * the outcome write. What it is NOT: a transactional outbox, business
 * authorization, or monetary reconciliation; those stay host
 * obligations, this file is the strict interface the host reconciles
 * FROM.
 *
 * Identity (RV501): every reference-executor dispatch is one ATTEMPT
 * with its own `attemptId`, and an outcome resolves exactly the intent
 * of its own attempt. A sibling retry's outcome, whatever its class,
 * says nothing about another attempt, so it never clears one: closing
 * the logical idempotency key is the host reconciler's job, against
 * the effect provider's receipt.
 *
 * Recovery (RV502): before its first append the writer repairs a torn
 * tail (the artifact of a crash mid-write): a complete record missing
 * only its newline is terminated in place, an unparseable fragment is
 * truncated and quarantined verbatim as a `{"phase":"torn"}` line. A
 * later scan therefore treats an unparseable INTERIOR line as real
 * damage and fails closed instead of skipping it silently.
 *
 * Durability boundary, stated honestly: an awaited append survives a
 * process crash (the write has entered the kernel), not necessarily a
 * power loss before the OS flushes; a host that needs power-loss
 * durability wraps the seam over its own fsync or database write.
 */
import { createHash } from 'node:crypto';
import { appendFile, readFile, truncate } from 'node:fs/promises';
import type { ToolEffectIntent, ToolEffectLedger, ToolEffectRecord } from './spi.js';

// Bound at module load, before any RV-209 dev-mode bare-Date.now patch
// can replace it: this clock stamps quarantine records, not run identity.
const wallClock: () => number = Date.now.bind(globalThis);

/** One parsed line of the JSONL ledger file. */
type LedgerLine =
  | ({ phase: 'intent' } & ToolEffectIntent)
  | ({ phase: 'outcome' } & ToolEffectRecord)
  | { phase: 'torn'; bytes: string; recoveredAt: number };

/**
 * Repairs the file's tail so an append can never glue onto a torn
 * fragment (RV502): a parseable unterminated record gets its newline, a
 * torn fragment is truncated and preserved verbatim in a quarantine
 * line old readers parse and skip. Runs under the ledger's documented
 * single-writer discipline.
 */
async function repairTail(path: string, now: () => number): Promise<void> {
  let raw: Buffer;
  try {
    raw = await readFile(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }
  if (raw.length === 0 || raw[raw.length - 1] === 0x0a) return;
  const boundary = raw.lastIndexOf(0x0a) + 1;
  const fragment = raw.subarray(boundary).toString('utf8');
  try {
    JSON.parse(fragment);
  } catch {
    await truncate(path, boundary);
    await appendFile(
      path,
      `${JSON.stringify({ phase: 'torn', bytes: fragment, recoveredAt: now() })}\n`,
      'utf8',
    );
    return;
  }
  // A complete record missing only its terminator: real data, keep it.
  await appendFile(path, '\n', 'utf8');
}

/**
 * A two-phase ToolEffectLedger appending JSON lines to `path`
 * (`{ phase: 'intent' | 'outcome', ... }`). Pass it to
 * `subprocessExecutor({ ledger })` or `containerExecutor({ ledger })`;
 * scan it back with {@link loadEffectLedger}. The first append lazily
 * repairs a torn tail left by a crashed predecessor (RV502).
 */
export function jsonlEffectLedger(
  path: string,
  options?: { now?: () => number },
): ToolEffectLedger {
  const now = options?.now ?? wallClock;
  let boundaryReady: Promise<void> | undefined;
  const append = async (line: LedgerLine): Promise<void> => {
    boundaryReady ??= repairTail(path, now);
    await boundaryReady;
    await appendFile(path, `${JSON.stringify(line)}\n`, 'utf8');
  };
  return {
    intent(entry) {
      return append({ phase: 'intent', ...entry });
    },
    record(entry) {
      return append({ phase: 'outcome', ...entry });
    },
  };
}

/** One unparseable interior line of the ledger file, surfaced for triage. */
export interface CorruptLedgerLine {
  /** 1-based physical line number in the file. */
  line: number;
  /** Byte offset of the line's first byte within the file. */
  offset: number;
  /** sha256 (hex) of the raw line bytes: forensics without re-reading. */
  sha256: string;
  /** The first 120 characters of the line. */
  preview: string;
}

/** A torn fragment the writer quarantined while repairing a tail (RV502). */
export interface TornLedgerArtifact {
  /** The raw torn bytes, preserved verbatim. */
  bytes: string;
  /** Wall-clock ms when the writer quarantined the fragment. */
  recoveredAt: number;
}

/**
 * The fail-closed refusal of {@link loadEffectLedger} (RV502): the file
 * holds at least one unparseable INTERIOR line, which the writer's tail
 * repair can never produce, so it means external damage or a second
 * writer, never a normal crash artifact. Reconciling from a partial
 * scan would silently drop intents; triage the named lines instead
 * (`tolerateCorrupt: true` surfaces them as data).
 */
export class LedgerCorruptionError extends Error {
  readonly lines: CorruptLedgerLine[];
  constructor(path: string, lines: CorruptLedgerLine[]) {
    const first = lines[0];
    super(
      `effect ledger '${path}' has ${String(lines.length)} corrupt interior line(s); first at ` +
        `line ${String(first?.line)}, byte ${String(first?.offset)}, sha256 ${String(first?.sha256)}. ` +
        'An interior line the scan cannot parse means external damage or a second writer; ' +
        'reconciliation must not proceed from a partial scan (loadEffectLedger with ' +
        '{ tolerateCorrupt: true } surfaces the lines for triage).',
    );
    this.name = 'LedgerCorruptionError';
    this.lines = lines;
  }
}

/** What {@link loadEffectLedger} reads back from a JSONL ledger file. */
export interface EffectLedgerScan {
  intents: ToolEffectIntent[];
  outcomes: ToolEffectRecord[];
  /**
   * The reconciliation signal (RV501): every intent whose OWN attempt
   * never got an outcome row. Pairing is exact: an outcome resolves the
   * intent carrying the same `attemptId` (rows written before the id
   * shipped pair by the legacy (idempotencyKey, startedAt) join), and
   * an outcome of ANY class resolves only its own attempt. A sibling
   * retry's outcome, ok or error, says nothing about THIS attempt, so
   * it never clears it: closing the logical key belongs to the host
   * reconciler, against the effect provider's receipt. For each orphan,
   * look the key up with the effect's provider before retrying or
   * compensating.
   */
  orphanedIntents: ToolEffectIntent[];
  /**
   * Unparseable interior lines, populated only under `tolerateCorrupt`
   * (the default scan throws {@link LedgerCorruptionError} instead).
   * Empty on a healthy file.
   */
  corrupt: CorruptLedgerLine[];
  /** Fragments the writer quarantined while repairing torn tails (RV502). */
  tornArtifacts: TornLedgerArtifact[];
  /**
   * A live unterminated, unparseable trailing fragment: the artifact of
   * a crash mid-write no writer has repaired yet. Tolerated and named,
   * never silent.
   */
  tornTail?: { preview: string };
}

/**
 * Scans a JSONL ledger file into intents, outcomes, and the orphaned
 * intents a host must reconcile, pairing attempts exactly (RV501). A
 * torn TRAILING fragment (the crash-mid-write artifact) is tolerated
 * and reported; an unparseable INTERIOR line fails the scan closed with
 * a typed {@link LedgerCorruptionError} unless `tolerateCorrupt` asks
 * for the lines as data (RV502).
 */
export async function loadEffectLedger(
  path: string,
  options?: { tolerateCorrupt?: boolean },
): Promise<EffectLedgerScan> {
  const raw = await readFile(path);
  const intents: ToolEffectIntent[] = [];
  const outcomes: ToolEffectRecord[] = [];
  const corrupt: CorruptLedgerLine[] = [];
  const tornArtifacts: TornLedgerArtifact[] = [];
  let tornTail: { preview: string } | undefined;
  let line = 0;
  let start = 0;
  for (let i = 0; i <= raw.length; i += 1) {
    const atEnd = i === raw.length;
    if (!atEnd && raw[i] !== 0x0a) continue;
    const bytes = raw.subarray(start, i);
    const offset = start;
    const terminated = !atEnd;
    start = i + 1;
    if (atEnd && bytes.length === 0) break;
    line += 1;
    const text = bytes.toString('utf8');
    if (text.trim() === '') continue;
    let parsed: LedgerLine;
    try {
      parsed = JSON.parse(text) as LedgerLine;
    } catch {
      if (terminated) {
        corrupt.push({
          line,
          offset,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          preview: text.slice(0, 120),
        });
      } else {
        tornTail = { preview: text.slice(0, 120) };
      }
      continue;
    }
    if (parsed.phase === 'intent') {
      const { phase: _phase, ...entry } = parsed;
      intents.push(entry);
    } else if (parsed.phase === 'outcome') {
      const { phase: _phase, ...entry } = parsed;
      outcomes.push(entry);
    } else if (parsed.phase === 'torn') {
      tornArtifacts.push({ bytes: parsed.bytes, recoveredAt: parsed.recoveredAt });
    }
  }
  if (corrupt.length > 0 && options?.tolerateCorrupt !== true) {
    throw new LedgerCorruptionError(path, corrupt);
  }
  const resolvedAttempts = new Set<string>();
  const resolvedLegacy = new Set<string>();
  for (const outcome of outcomes) {
    if (outcome.attemptId === undefined) {
      resolvedLegacy.add(JSON.stringify([outcome.idempotencyKey, outcome.startedAt]));
    } else {
      resolvedAttempts.add(outcome.attemptId);
    }
  }
  const orphanedIntents = intents.filter((entry) =>
    entry.attemptId === undefined
      ? !resolvedLegacy.has(JSON.stringify([entry.idempotencyKey, entry.startedAt]))
      : !resolvedAttempts.has(entry.attemptId),
  );
  return {
    intents,
    outcomes,
    orphanedIntents,
    corrupt,
    tornArtifacts,
    ...(tornTail === undefined ? {} : { tornTail }),
  };
}
