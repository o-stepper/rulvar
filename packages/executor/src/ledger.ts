/**
 * The durable JSONL reference of the two-phase effect ledger (RV404,
 * hardened by RV501/RV502, cross-process repair exclusion RV606,
 * fail-closed scan validation RV607): one JSON line per phase, appended
 * and awaited, so the intent row is on disk before the external effect
 * is dispatched and survives a host process crash between the effect
 * and the outcome write. What it is NOT: a transactional outbox,
 * business authorization, or monetary reconciliation; those stay host
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
 * Recovery (RV502, exclusive per RV606): before its first append the
 * writer repairs a torn tail (the artifact of a crash mid-write): a
 * complete record missing only its newline is terminated in place, an
 * unparseable fragment is truncated and quarantined verbatim as a
 * `{"phase":"torn"}` line. The destructive step runs under a sidecar
 * O_EXCL lock and re-reads the file after capture, so two writer
 * processes repairing the same file can no longer erase each other's
 * confirmed rows. A later scan therefore treats an unparseable INTERIOR
 * line as real damage and fails closed instead of skipping it silently.
 *
 * Durability boundary, stated honestly: an awaited append survives a
 * process crash (the write has entered the kernel), not necessarily a
 * power loss before the OS flushes; a host that needs power-loss
 * durability wraps the seam over its own fsync or database write.
 */
import { createHash, randomUUID } from 'node:crypto';
import { appendFile, readFile, rm, stat, truncate, writeFile } from 'node:fs/promises';
import type { ToolEffectIntent, ToolEffectLedger, ToolEffectRecord } from './spi.js';

// Bound at module load, before any RV-209 dev-mode bare-Date.now patch
// can replace it: this clock stamps quarantine records, not run identity.
const wallClock: () => number = Date.now.bind(globalThis);

/** One parsed line of the JSONL ledger file. */
type LedgerLine =
  | ({ phase: 'intent' } & ToolEffectIntent)
  | ({ phase: 'outcome' } & ToolEffectRecord)
  | { phase: 'torn'; bytes: string; recoveredAt: number };

/** How stale a repair lock's mtime must be before a writer may presume
 * its holder crashed and steal it. Repairs take milliseconds; ten
 * seconds is a crash verdict, not a performance budget. */
const REPAIR_LOCK_TTL_MS = 10_000;

/** How often a writer waiting on another process's repair re-checks. */
const REPAIR_POLL_MS = 25;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * The destructive half of the tail repair, mutually exclusive between
 * processes (RV606): a sidecar `<path>.repair-lock` created with O_EXCL
 * serializes repairers, and the ledger file is re-read AFTER the lock
 * is held, so a boundary computed from a read another repairer has
 * since invalidated is never truncated. A writer that loses the race
 * polls; a lock whose mtime is further than the TTL from now (either
 * direction, so a skewed clock cannot pin the file forever) is presumed
 * abandoned by a crashed holder and stolen. The residual window (a
 * holder stalled past the TTL, stolen mid-repair) is shrunk by
 * re-verifying ownership immediately before the truncate; against a
 * millisecond repair and a ten-second TTL it needs a scheduler pause no
 * healthy host exhibits.
 */
async function repairUnderLock(path: string, now: () => number): Promise<void> {
  const lockPath = `${path}.repair-lock`;
  const token = `${String(process.pid)}-${randomUUID()}`;
  for (;;) {
    let acquired = true;
    try {
      await writeFile(lockPath, token, { flag: 'wx' });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      acquired = false;
    }
    if (!acquired) {
      let held: { mtimeMs: number };
      try {
        held = await stat(lockPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
        continue; // released between the attempt and the stat: retry now
      }
      if (Math.abs(wallClock() - held.mtimeMs) > REPAIR_LOCK_TTL_MS) {
        await rm(lockPath, { force: true });
        continue;
      }
      await delay(REPAIR_POLL_MS);
      continue;
    }
    try {
      let raw: Buffer;
      try {
        raw = await readFile(path);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw err;
      }
      // The fresh read is the whole point: the previous holder may have
      // repaired already, and then there is nothing to cut.
      if (raw.length === 0 || raw[raw.length - 1] === 0x0a) return;
      const boundary = raw.lastIndexOf(0x0a) + 1;
      const fragment = raw.subarray(boundary).toString('utf8');
      let parseable = true;
      try {
        JSON.parse(fragment);
      } catch {
        parseable = false;
      }
      if (parseable) {
        // A complete record missing only its terminator: real data, keep it.
        await appendFile(path, '\n', 'utf8');
        return;
      }
      const owner = await readFile(lockPath, 'utf8').catch(() => '');
      if (owner !== token) continue; // stolen mid-repair: reacquire and re-read
      await truncate(path, boundary);
      await appendFile(
        path,
        `${JSON.stringify({ phase: 'torn', bytes: fragment, recoveredAt: now() })}\n`,
        'utf8',
      );
      return;
    } finally {
      const owner = await readFile(lockPath, 'utf8').catch(() => '');
      if (owner === token) await rm(lockPath, { force: true });
    }
  }
}

/**
 * Repairs the file's tail so an append can never glue onto a torn
 * fragment (RV502): a parseable unterminated record gets its newline, a
 * torn fragment is truncated and preserved verbatim in a quarantine
 * line old readers parse and skip. A clean file returns untouched, byte
 * for byte, without the lock ever existing; the repair itself runs
 * under the cross-process exclusion of {@link repairUnderLock} (RV606).
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
  await repairUnderLock(path, now);
}

/**
 * A two-phase ToolEffectLedger appending JSON lines to `path`
 * (`{ phase: 'intent' | 'outcome', ... }`). Pass it to
 * `subprocessExecutor({ ledger })` or `containerExecutor({ ledger })`;
 * scan it back with {@link loadEffectLedger}. The first append lazily
 * repairs a torn tail left by a crashed predecessor (RV502).
 *
 * Writer contract (RV606), stated publicly: appends are whole-line
 * O_APPEND writes, and the destructive tail repair is mutually
 * exclusive across processes (a sidecar `<path>.repair-lock` taken with
 * O_EXCL, the file re-read after capture, a stale lock stolen after a
 * ten-second TTL), so several writer processes on one LOCAL path can no
 * longer truncate away each other's confirmed rows while repairing.
 * Still, prefer ONE WRITER PER PATH, a `effects.<worker>.jsonl` file
 * per worker process merged at reconciliation time: per-line append
 * atomicity is a local-filesystem property, and neither O_APPEND nor
 * O_EXCL is dependable on network filesystems.
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

/** One malformed line of the ledger file, surfaced for triage. */
export interface CorruptLedgerLine {
  /** 1-based physical line number in the file. */
  line: number;
  /** Byte offset of the line's first byte within the file. */
  offset: number;
  /** sha256 (hex) of the raw line bytes: forensics without re-reading. */
  sha256: string;
  /** The first 120 characters of the line (lossy-decoded when the bytes
   * are not valid UTF-8; the hash pins the exact bytes). */
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
 * The fail-closed refusal of {@link loadEffectLedger} (RV502, widened
 * by RV607): the file holds at least one line the scan cannot admit,
 * unparseable bytes on an interior line, invalid UTF-8, a JSON value
 * that is not an object, a missing or mistyped required field, or an
 * unknown phase, none of which the writer's tail repair can produce, so
 * it means external damage or a foreign writer, never a normal crash
 * artifact. Reconciling from a partial scan would silently drop
 * intents; triage the named lines instead (`tolerateCorrupt: true`
 * surfaces them as data).
 */
export class LedgerCorruptionError extends Error {
  readonly lines: CorruptLedgerLine[];
  constructor(path: string, lines: CorruptLedgerLine[]) {
    const first = lines[0];
    super(
      `effect ledger '${path}' has ${String(lines.length)} corrupt line(s); first at ` +
        `line ${String(first?.line)}, byte ${String(first?.offset)}, sha256 ${String(first?.sha256)}. ` +
        'A line the scan cannot decode, parse, and validate means external damage or a ' +
        'foreign writer; reconciliation must not proceed from a partial scan ' +
        '(loadEffectLedger with { tolerateCorrupt: true } surfaces the lines for triage).',
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
   * Lines the scan refused to admit (RV607): unparseable interior
   * bytes, invalid UTF-8, non-object JSON, a missing or mistyped
   * required field, or an unknown phase. Populated only under
   * `tolerateCorrupt` (the default scan throws
   * {@link LedgerCorruptionError} instead). Empty on a healthy file.
   */
  corrupt: CorruptLedgerLine[];
  /** Fragments the writer quarantined while repairing torn tails (RV502). */
  tornArtifacts: TornLedgerArtifact[];
  /**
   * A live unterminated, unparseable trailing fragment: the artifact of
   * a crash mid-write no writer has repaired yet. Tolerated and named,
   * never silent. (An unterminated line that PARSES but fails the shape
   * is corruption instead: a torn prefix of the writer's own flat
   * record can never parse, so such a line is foreign, not a crash
   * artifact.)
   */
  tornTail?: { preview: string };
}

/** Strict per-line decode (RV607): invalid UTF-8 is damage, never a
 * replacement character that forges a key. */
const decodeStrict = (bytes: Buffer): string =>
  new TextDecoder('utf-8', { fatal: true }).decode(bytes);

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasIntentShape = (value: Record<string, unknown>): boolean =>
  typeof value.idempotencyKey === 'string' &&
  typeof value.runId === 'string' &&
  typeof value.spanId === 'string' &&
  typeof value.tool === 'string' &&
  typeof value.argsHash === 'string' &&
  typeof value.executor === 'string' &&
  typeof value.workdir === 'string' &&
  typeof value.startedAt === 'number' &&
  (value.attemptId === undefined || typeof value.attemptId === 'string');

const OUTCOME_CLASSES = new Set<unknown>(['ok', 'error', 'timeout']);

/**
 * Validates one parsed line's shape BEFORE anything downstream touches
 * it (RV607): the phase must be exactly one of the three the writer
 * emits, and every required field of that phase must carry its type
 * (extra fields pass through untouched). Anything else, a primitive, a
 * null, a missing field, an unknown phase, returns undefined and
 * becomes a {@link CorruptLedgerLine}: forward compatibility with
 * future phases is versioning's job, never silence's.
 */
function asLedgerLine(parsed: unknown): LedgerLine | undefined {
  if (!isRecordObject(parsed)) return undefined;
  if (parsed.phase === 'intent') {
    return hasIntentShape(parsed) ? (parsed as unknown as LedgerLine) : undefined;
  }
  if (parsed.phase === 'outcome') {
    return hasIntentShape(parsed) &&
      typeof parsed.durationMs === 'number' &&
      OUTCOME_CLASSES.has(parsed.outcome) &&
      (typeof parsed.exitCode === 'number' || parsed.exitCode === null) &&
      (typeof parsed.signal === 'string' || parsed.signal === null)
      ? (parsed as unknown as LedgerLine)
      : undefined;
  }
  if (parsed.phase === 'torn') {
    return typeof parsed.bytes === 'string' && typeof parsed.recoveredAt === 'number'
      ? (parsed as unknown as LedgerLine)
      : undefined;
  }
  return undefined;
}

/**
 * Scans a JSONL ledger file into intents, outcomes, and the orphaned
 * intents a host must reconcile, pairing attempts exactly (RV501). A
 * torn TRAILING fragment (the crash-mid-write artifact) is tolerated
 * and reported; everything else the scan cannot decode, parse, and
 * validate, invalid UTF-8, non-object JSON, a missing required field,
 * an unknown phase (RV607), fails the scan closed with a typed
 * {@link LedgerCorruptionError} unless `tolerateCorrupt` asks for the
 * lines as data (RV502). Under `tolerateCorrupt` the scan never throws
 * anything rawer than that: a malformed line is data, not an exception.
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
  const markCorrupt = (lineNo: number, offset: number, bytes: Buffer, preview: string): void => {
    corrupt.push({
      line: lineNo,
      offset,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      preview: preview.slice(0, 120),
    });
  };
  for (let i = 0; i <= raw.length; i += 1) {
    const atEnd = i === raw.length;
    if (!atEnd && raw[i] !== 0x0a) continue;
    const bytes = raw.subarray(start, i);
    const offset = start;
    const terminated = !atEnd;
    start = i + 1;
    if (atEnd && bytes.length === 0) break;
    line += 1;
    let text: string;
    try {
      text = decodeStrict(bytes);
    } catch {
      if (terminated) markCorrupt(line, offset, bytes, bytes.toString('utf8'));
      else tornTail = { preview: bytes.toString('utf8').slice(0, 120) };
      continue;
    }
    if (text.trim() === '') continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      if (terminated) markCorrupt(line, offset, bytes, text);
      else tornTail = { preview: text.slice(0, 120) };
      continue;
    }
    const entry = asLedgerLine(parsed);
    if (entry === undefined) {
      markCorrupt(line, offset, bytes, text);
      continue;
    }
    if (entry.phase === 'intent') {
      const { phase: _phase, ...rest } = entry;
      intents.push(rest);
    } else if (entry.phase === 'outcome') {
      const { phase: _phase, ...rest } = entry;
      outcomes.push(rest);
    } else {
      tornArtifacts.push({ bytes: entry.bytes, recoveredAt: entry.recoveredAt });
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
