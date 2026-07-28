/**
 * The durable JSONL reference of the two-phase effect ledger (RV404):
 * one JSON line per phase, appended and awaited, so the intent row is
 * on disk before the external effect is dispatched and survives a host
 * process crash between the effect and the outcome write. What it is
 * NOT: a transactional outbox, business authorization, or monetary
 * reconciliation; those stay host obligations, this file is the strict
 * interface the host reconciles FROM.
 *
 * Durability boundary, stated honestly: an awaited append survives a
 * process crash (the write has entered the kernel), not necessarily a
 * power loss before the OS flushes; a host that needs power-loss
 * durability wraps the seam over its own fsync or database write.
 */
import { appendFile, readFile } from 'node:fs/promises';
import type { ToolEffectIntent, ToolEffectLedger, ToolEffectRecord } from './spi.js';

/** One parsed line of the JSONL ledger file. */
type LedgerLine =
  ({ phase: 'intent' } & ToolEffectIntent) | ({ phase: 'outcome' } & ToolEffectRecord);

/**
 * A two-phase ToolEffectLedger appending JSON lines to `path`
 * (`{ phase: 'intent' | 'outcome', ... }`). Pass it to
 * `subprocessExecutor({ ledger })` or `containerExecutor({ ledger })`;
 * scan it back with {@link loadEffectLedger}.
 */
export function jsonlEffectLedger(path: string): ToolEffectLedger {
  const append = (line: LedgerLine): Promise<void> =>
    appendFile(path, `${JSON.stringify(line)}\n`, 'utf8');
  return {
    intent(entry) {
      return append({ phase: 'intent', ...entry });
    },
    record(entry) {
      return append({ phase: 'outcome', ...entry });
    },
  };
}

/** What {@link loadEffectLedger} reads back from a JSONL ledger file. */
export interface EffectLedgerScan {
  intents: ToolEffectIntent[];
  outcomes: ToolEffectRecord[];
  /**
   * The reconciliation signal (RV404): every intent whose idempotency
   * key has NO outcome row at all. A key with a later outcome (an
   * at-least-once retry of the same logical call that completed) is not
   * orphaned: the retry resolved it. For each orphan, look the key up
   * with the effect's provider before retrying or compensating.
   */
  orphanedIntents: ToolEffectIntent[];
}

/**
 * Scans a JSONL ledger file into intents, outcomes, and the orphaned
 * intents a host must reconcile. A torn trailing line (the artifact of
 * a crash mid-write) is skipped, never a scan failure: the durable rows
 * before it are exactly what reconciliation needs.
 */
export async function loadEffectLedger(path: string): Promise<EffectLedgerScan> {
  const raw = await readFile(path, 'utf8');
  const intents: ToolEffectIntent[] = [];
  const outcomes: ToolEffectRecord[] = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    let parsed: LedgerLine;
    try {
      parsed = JSON.parse(line) as LedgerLine;
    } catch {
      continue;
    }
    if (parsed.phase === 'intent') {
      const { phase: _phase, ...entry } = parsed;
      intents.push(entry);
    } else if (parsed.phase === 'outcome') {
      const { phase: _phase, ...entry } = parsed;
      outcomes.push(entry);
    }
  }
  const resolvedKeys = new Set(outcomes.map((entry) => entry.idempotencyKey));
  const orphanedIntents = intents.filter((entry) => !resolvedKeys.has(entry.idempotencyKey));
  return { intents, outcomes, orphanedIntents };
}
