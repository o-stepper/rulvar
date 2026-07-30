/**
 * The durable JSONL reference of the two-phase effect ledger (RV404,
 * hardened by RV501/RV502): it writes one line per phase, pairs an
 * outcome with EXACTLY the intent of its own attempt (attemptId, with
 * the legacy (idempotencyKey, startedAt) join for rows written before
 * attemptId shipped), repairs a torn tail before appending over it, and
 * surfaces corruption instead of swallowing it. The orphaned intents it
 * reports are the host's reconciliation signal after a crash between
 * the effect and the outcome write.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LedgerCorruptionError, jsonlEffectLedger, loadEffectLedger } from './ledger.js';
import type { ToolEffectIntent, ToolEffectRecord } from './spi.js';

const DIR = mkdtempSync(join(tmpdir(), 'rulvar-ledger-tests-'));
let fileSeq = 0;
const freshPath = (): string => join(DIR, `ledger-${(fileSeq += 1)}.jsonl`);

function intentOf(key: string, startedAt: number, attemptId?: string): ToolEffectIntent {
  return {
    idempotencyKey: key,
    runId: 'run-1',
    spanId: 's1',
    tool: 'charge',
    argsHash: 'a'.repeat(64),
    executor: 'subprocess',
    workdir: '/tmp/w',
    startedAt,
    ...(attemptId === undefined ? {} : { attemptId }),
  };
}

function outcomeOf(
  key: string,
  startedAt: number,
  attemptId?: string,
  outcome: ToolEffectRecord['outcome'] = 'ok',
): ToolEffectRecord {
  return {
    ...intentOf(key, startedAt, attemptId),
    durationMs: 5,
    outcome,
    exitCode: outcome === 'ok' ? 0 : null,
    signal: null,
  };
}

describe('jsonlEffectLedger and loadEffectLedger (RV404 + RV501)', () => {
  it('writes both phases and loads them back paired', async () => {
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-1', 100, 'a-1'));
    await ledger.record(outcomeOf('k-1', 100, 'a-1'));
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(1);
    expect(scan.intents[0]?.idempotencyKey).toBe('k-1');
    expect(scan.intents[0]?.attemptId).toBe('a-1');
    expect(scan.outcomes[0]?.outcome).toBe('ok');
    expect(scan.orphanedIntents).toHaveLength(0);
    expect(scan.corrupt).toHaveLength(0);
    expect(scan.tornArtifacts).toHaveLength(0);
    expect(scan.tornTail).toBeUndefined();
  });

  it('reports an intent whose attempt never got an outcome as orphaned', async () => {
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-dead', 100, 'a-dead'));
    await ledger.intent?.(intentOf('k-live', 200, 'a-live'));
    await ledger.record(outcomeOf('k-live', 200, 'a-live'));
    const scan = await loadEffectLedger(path);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.orphanedIntents[0]?.idempotencyKey).toBe('k-dead');
    // The orphan carries the full provider-lookup set.
    expect(scan.orphanedIntents[0]?.tool).toBe('charge');
    expect(scan.orphanedIntents[0]?.argsHash).toBe('a'.repeat(64));
    expect(scan.orphanedIntents[0]?.runId).toBe('run-1');
  });

  it("a sibling attempt's ok outcome never resolves another attempt (RV501)", async () => {
    // Before RV501 the key-level rule let ANY outcome of the key clear
    // every intent of that key, so attempt 1 (crash between phases, its
    // effect possibly applied) vanished from the reconciliation queue
    // the moment attempt 2 completed. That inference belongs to the
    // host's provider reconciliation, never to this scan: attempt 1 is
    // still unknown and stays orphaned.
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-retry', 100, 'a-1'));
    await ledger.intent?.(intentOf('k-retry', 200, 'a-2'));
    await ledger.record(outcomeOf('k-retry', 200, 'a-2', 'ok'));
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(2);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.orphanedIntents[0]?.attemptId).toBe('a-1');
  });

  it("a sibling attempt's error outcome never resolves another attempt (the ninth-experiment counterexample)", async () => {
    // Attempt 1 wrote its intent and crashed: the effect MAY have
    // applied. Retry attempt 2 failed before dispatch (a credentials or
    // spawn failure ledgers 'error'). The pre-RV501 scan returned zero
    // orphans here, hiding the unknown effect behind a retry that
    // provably did nothing.
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('same-key', 100, 'a-1'));
    await ledger.intent?.(intentOf('same-key', 200, 'a-2'));
    await ledger.record(outcomeOf('same-key', 200, 'a-2', 'error'));
    const scan = await loadEffectLedger(path);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.orphanedIntents[0]?.attemptId).toBe('a-1');
    expect(scan.orphanedIntents[0]?.startedAt).toBe(100);
  });

  it('pairs attempts sharing a millisecond by attemptId, not by clock', async () => {
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-ms', 100, 'a-1'));
    await ledger.intent?.(intentOf('k-ms', 100, 'a-2'));
    await ledger.record(outcomeOf('k-ms', 100, 'a-2'));
    const scan = await loadEffectLedger(path);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.orphanedIntents[0]?.attemptId).toBe('a-1');
  });

  it('pairs legacy rows without attemptId by (idempotencyKey, startedAt)', async () => {
    // Files written before v1.96.0 carry no attemptId: the documented
    // legacy join is the (key, startedAt) pair the SPI always named.
    // Key-level resolution is gone for them too: the outcome of attempt
    // 200 says nothing about attempt 100.
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-legacy', 100));
    await ledger.intent?.(intentOf('k-legacy', 200));
    await ledger.record(outcomeOf('k-legacy', 200));
    const scan = await loadEffectLedger(path);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.orphanedIntents[0]?.startedAt).toBe(100);
  });

  it('pairs a mixed file: legacy intent stays orphaned beside a new resolved attempt', async () => {
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-mixed', 100));
    await ledger.intent?.(intentOf('k-mixed', 200, 'a-new'));
    await ledger.record(outcomeOf('k-mixed', 200, 'a-new'));
    const scan = await loadEffectLedger(path);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.orphanedIntents[0]?.attemptId).toBeUndefined();
    expect(scan.orphanedIntents[0]?.startedAt).toBe(100);
  });

  it('pairs by identity, not by line order', async () => {
    // An outcome landing before its intent in the file (interleaved
    // writers on separate attempts) still resolves exactly its attempt.
    const path = freshPath();
    writeFileSync(
      path,
      `${JSON.stringify({ phase: 'outcome', ...outcomeOf('k-order', 100, 'a-1') })}\n` +
        `${JSON.stringify({ phase: 'intent', ...intentOf('k-order', 100, 'a-1') })}\n`,
      'utf8',
    );
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(1);
    expect(scan.orphanedIntents).toHaveLength(0);
  });
});

describe('torn tails and corruption (RV502)', () => {
  it('reports a live torn trailing line instead of failing the whole scan', async () => {
    // A crash mid-write leaves exactly this artifact: a complete line
    // followed by a torn tail with no newline. The scan keeps the
    // durable rows and names the tail instead of staying silent.
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-torn', 100, 'a-torn'));
    appendFileSync(path, '{"phase":"outcome","idempo');
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(0);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.corrupt).toHaveLength(0);
    expect(scan.tornTail?.preview).toContain('{"phase":"outcome","idempo');
  });

  it('appending after a torn tail preserves the next record (the reproduced P0)', async () => {
    // Before RV502 the next append glued onto the torn fragment: ONE
    // invalid line, BOTH records invisible, while the awaited intent
    // write reported success and the effect dispatched untracked.
    const path = freshPath();
    writeFileSync(
      path,
      `${JSON.stringify({ phase: 'intent', ...intentOf('k-prior', 1, 'a-prior') })}\n` +
        '{"phase":"intent","idempotencyKey":"torn',
      'utf8',
    );
    const ledger = jsonlEffectLedger(path, { now: () => 777 });
    await ledger.intent?.(intentOf('k-next', 2, 'a-next'));
    const scan = await loadEffectLedger(path);
    expect(scan.intents.map((entry) => entry.idempotencyKey)).toEqual(['k-prior', 'k-next']);
    expect(scan.orphanedIntents).toHaveLength(2);
    // The fragment is quarantined with its raw bytes, never lost.
    expect(scan.tornArtifacts).toHaveLength(1);
    expect(scan.tornArtifacts[0]?.bytes).toBe('{"phase":"intent","idempotencyKey":"torn');
    expect(scan.tornArtifacts[0]?.recoveredAt).toBe(777);
    expect(scan.corrupt).toHaveLength(0);
    expect(scan.tornTail).toBeUndefined();
  });

  it('terminates a parseable unterminated tail in place, losing nothing', async () => {
    // A crash exactly between the JSON bytes and the newline leaves a
    // COMPLETE record missing only its terminator: the repair appends
    // the newline instead of quarantining real data.
    const path = freshPath();
    writeFileSync(
      path,
      JSON.stringify({ phase: 'intent', ...intentOf('k-whole', 1, 'a-whole') }),
      'utf8',
    );
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-after', 2, 'a-after'));
    const scan = await loadEffectLedger(path);
    expect(scan.intents.map((entry) => entry.idempotencyKey)).toEqual(['k-whole', 'k-after']);
    expect(scan.tornArtifacts).toHaveLength(0);
    expect(scan.corrupt).toHaveLength(0);
  });

  it('repair is lazy, idempotent, and leaves a clean file byte for byte', async () => {
    const path = freshPath();
    const first = jsonlEffectLedger(path);
    await first.intent?.(intentOf('k-clean', 1, 'a-clean'));
    const before = readFileSync(path, 'utf8');
    // A second instance on the already-clean file repairs nothing.
    const second = jsonlEffectLedger(path);
    await second.record(outcomeOf('k-clean', 1, 'a-clean'));
    const after = readFileSync(path, 'utf8');
    expect(after.startsWith(before)).toBe(true);
    const scan = await loadEffectLedger(path);
    expect(scan.tornArtifacts).toHaveLength(0);
    expect(scan.orphanedIntents).toHaveLength(0);
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(1);
  });

  it('fails closed on interior corruption with offsets and hashes', async () => {
    const path = freshPath();
    writeFileSync(
      path,
      `{malformed}\n${JSON.stringify({ phase: 'intent', ...intentOf('k-visible', 3, 'a-visible') })}\n`,
      'utf8',
    );
    await expect(loadEffectLedger(path)).rejects.toMatchObject({ name: 'LedgerCorruptionError' });
    const thrown = await loadEffectLedger(path).catch((err: unknown) => err);
    expect(thrown).toBeInstanceOf(LedgerCorruptionError);
    const corruption = thrown as LedgerCorruptionError;
    expect(corruption.lines).toHaveLength(1);
    expect(corruption.lines[0]?.line).toBe(1);
    expect(corruption.lines[0]?.offset).toBe(0);
    expect(corruption.lines[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(corruption.lines[0]?.preview).toBe('{malformed}');
  });

  it('tolerateCorrupt surfaces interior corruption as data instead of throwing', async () => {
    const path = freshPath();
    const valid = JSON.stringify({ phase: 'intent', ...intentOf('k-visible', 3, 'a-visible') });
    writeFileSync(path, `${valid}\n{malformed}\n`, 'utf8');
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.intents).toHaveLength(1);
    expect(scan.corrupt).toHaveLength(1);
    expect(scan.corrupt[0]?.line).toBe(2);
    expect(scan.corrupt[0]?.offset).toBe(Buffer.byteLength(valid, 'utf8') + 1);
    expect(scan.corrupt[0]?.preview).toBe('{malformed}');
  });
});

describe('byte-true quarantine (RV707)', () => {
  it('a torn fragment with invalid UTF-8 round-trips from quarantine byte for byte', async () => {
    // The lossy string quarantine collapsed every invalid byte to
    // U+FFFD: two different byte tails produced one quarantine row, and
    // the exact bytes were unrecoverable, while the scan itself refuses
    // U+FFFD as key forgery. The row now carries the exact bytes and
    // their hash; the string field stays for old readers, marked lossy.
    const path = freshPath();
    const rawFragment = Buffer.concat([
      Buffer.from('{"phase":"intent","idempotencyKey":"torn-', 'utf8'),
      Buffer.from([0xff, 0xfe, 0x80]),
    ]);
    writeFileSync(
      path,
      Buffer.concat([
        Buffer.from(
          `${JSON.stringify({ phase: 'intent', ...intentOf('k-prior', 1, 'a-prior') })}\n`,
          'utf8',
        ),
        rawFragment,
      ]),
    );
    const ledger = jsonlEffectLedger(path, { now: () => 777 });
    await ledger.intent?.(intentOf('k-next', 2, 'a-next'));
    const scan = await loadEffectLedger(path);
    expect(scan.corrupt).toHaveLength(0);
    expect(scan.tornArtifacts).toHaveLength(1);
    const artifact = scan.tornArtifacts[0];
    expect(artifact?.bytesBase64).toBe(rawFragment.toString('base64'));
    expect(Buffer.from(artifact?.bytesBase64 ?? '', 'base64').equals(rawFragment)).toBe(true);
    expect(artifact?.sha256).toBe(createHash('sha256').update(rawFragment).digest('hex'));
    expect(artifact?.bytes).toBe(rawFragment.toString('utf8'));
    expect(artifact?.recoveredAt).toBe(777);
  });

  it('the parseable decision is made on bytes: a lossy-parseable fragment is quarantined, not terminated', async () => {
    // The manufactured-corruption path: this fragment contains invalid
    // UTF-8 INSIDE a JSON string literal, so the lossy decode produced
    // '{"a":"�"}', which parses. The old repair then appended a
    // newline, keeping a terminated line of invalid bytes, and the next
    // scan failed closed on damage the repair itself created. Strict
    // decoding first makes the fragment unparseable, so it quarantines.
    const path = freshPath();
    const rawFragment = Buffer.concat([
      Buffer.from('{"a":"', 'utf8'),
      Buffer.from([0xff]),
      Buffer.from('"}', 'utf8'),
    ]);
    writeFileSync(path, rawFragment);
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-after', 1, 'a-after'));
    const scan = await loadEffectLedger(path);
    expect(scan.corrupt).toHaveLength(0);
    expect(scan.intents.map((entry) => entry.idempotencyKey)).toEqual(['k-after']);
    expect(scan.tornArtifacts).toHaveLength(1);
    expect(
      Buffer.from(scan.tornArtifacts[0]?.bytesBase64 ?? '', 'base64').equals(rawFragment),
    ).toBe(true);
  });

  it('a legacy quarantine row without the byte fields still scans, fields absent', async () => {
    const path = freshPath();
    writeFileSync(
      path,
      `${JSON.stringify({ phase: 'torn', bytes: 'old-fragment', recoveredAt: 5 })}\n`,
      'utf8',
    );
    const scan = await loadEffectLedger(path);
    expect(scan.tornArtifacts).toEqual([{ bytes: 'old-fragment', recoveredAt: 5 }]);
  });
});

describe('fail-closed parse (RV607)', () => {
  const validLine = (): string =>
    `${JSON.stringify({ phase: 'intent', ...intentOf('k-ok', 1, 'a-ok') })}\n`;

  it('invalid UTF-8 in a terminated line is corruption, never a replacement-character key', async () => {
    // 0xC3 0x28 is an invalid UTF-8 sequence. Decoded with replacement
    // characters it still parses as JSON, so a mangled idempotency key
    // used to enter reconciliation as genuine. The strict decode makes
    // it corruption with the exact bytes pinned by the hash.
    const path = freshPath();
    const bad = Buffer.concat([
      Buffer.from('{"phase":"intent","idempotencyKey":"k-', 'utf8'),
      Buffer.from([0xc3, 0x28]),
      Buffer.from(
        '","runId":"r","spanId":"s","tool":"t","argsHash":"h","executor":"subprocess",' +
          '"workdir":"/w","startedAt":1}\n',
        'utf8',
      ),
    ]);
    writeFileSync(path, Buffer.concat([Buffer.from(validLine(), 'utf8'), bad]));
    await expect(loadEffectLedger(path)).rejects.toBeInstanceOf(LedgerCorruptionError);
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.intents).toHaveLength(1);
    expect(scan.intents[0]?.idempotencyKey).toBe('k-ok');
    expect(scan.corrupt).toHaveLength(1);
    expect(scan.corrupt[0]?.line).toBe(2);
    expect(scan.corrupt[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a null line surfaces typed in both modes, never a raw TypeError', async () => {
    // JSON.parse('null') succeeds, and the phase dereference used to
    // throw a raw TypeError that pierced BOTH the typed refusal and
    // tolerateCorrupt.
    const path = freshPath();
    writeFileSync(path, `${validLine()}null\n`, 'utf8');
    await expect(loadEffectLedger(path)).rejects.toBeInstanceOf(LedgerCorruptionError);
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.intents).toHaveLength(1);
    expect(scan.corrupt).toHaveLength(1);
    expect(scan.corrupt[0]?.preview).toBe('null');
  });

  it('an intent missing required fields is corruption, not a half-empty orphan', async () => {
    const path = freshPath();
    writeFileSync(path, `${validLine()}{"phase":"intent","idempotencyKey":"k-bare"}\n`, 'utf8');
    await expect(loadEffectLedger(path)).rejects.toBeInstanceOf(LedgerCorruptionError);
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.intents).toHaveLength(1);
    expect(scan.intents[0]?.idempotencyKey).toBe('k-ok');
    expect(scan.orphanedIntents.map((entry) => entry.idempotencyKey)).toEqual(['k-ok']);
    expect(scan.corrupt).toHaveLength(1);
  });

  it('an unknown phase is corruption, never silence', async () => {
    // One flipped character in the phase used to erase the whole row,
    // orphan and all. Forward compatibility with future phases is
    // versioning's job, not silence's.
    const path = freshPath();
    const flipped = JSON.stringify({ phase: 'Intent', ...intentOf('k-flip', 2, 'a-flip') });
    writeFileSync(path, `${validLine()}${flipped}\n`, 'utf8');
    await expect(loadEffectLedger(path)).rejects.toBeInstanceOf(LedgerCorruptionError);
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.intents).toHaveLength(1);
    expect(scan.corrupt).toHaveLength(1);
    expect(scan.corrupt[0]?.preview).toContain('"Intent"');
  });

  it('JSON primitives are corruption', async () => {
    const path = freshPath();
    writeFileSync(path, `${validLine()}42\n"str"\ntrue\n[]\n`, 'utf8');
    await expect(loadEffectLedger(path)).rejects.toBeInstanceOf(LedgerCorruptionError);
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.intents).toHaveLength(1);
    expect(scan.corrupt.map((entry) => entry.preview)).toEqual(['42', '"str"', 'true', '[]']);
  });

  it('a torn quarantine record with a bad shape is corruption', async () => {
    const path = freshPath();
    writeFileSync(path, `${validLine()}{"phase":"torn","bytes":7}\n`, 'utf8');
    await expect(loadEffectLedger(path)).rejects.toBeInstanceOf(LedgerCorruptionError);
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.tornArtifacts).toHaveLength(0);
    expect(scan.corrupt).toHaveLength(1);
  });

  it('a parseable unterminated tail with a bad shape is corruption, not real data', async () => {
    // A torn prefix of the writer's own flat record can never parse as
    // JSON, so an unterminated line that parses but fails the shape is
    // a foreign or damaged row, not a crash artifact to terminate in
    // place.
    const path = freshPath();
    writeFileSync(path, `${validLine()}{"phase":"intent"}`, 'utf8');
    await expect(loadEffectLedger(path)).rejects.toBeInstanceOf(LedgerCorruptionError);
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.intents).toHaveLength(1);
    expect(scan.corrupt).toHaveLength(1);
    expect(scan.tornTail).toBeUndefined();
  });

  it('invalid UTF-8 in an unterminated tail stays a named torn tail', async () => {
    const path = freshPath();
    writeFileSync(
      path,
      Buffer.concat([Buffer.from(validLine(), 'utf8'), Buffer.from([0xff, 0xfe])]),
    );
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(1);
    expect(scan.corrupt).toHaveLength(0);
    expect(scan.tornTail).toBeDefined();
  });

  it('a mixed file reads the valid rows and collects each defect', async () => {
    const path = freshPath();
    const intact = JSON.stringify({ phase: 'intent', ...intentOf('k-mixed', 5, 'a-mixed') });
    const settled = JSON.stringify({ phase: 'outcome', ...outcomeOf('k-mixed', 5, 'a-mixed') });
    const flipped = JSON.stringify({ phase: 'Outcome', ...outcomeOf('k-mixed', 6, 'a-late') });
    writeFileSync(path, `${intact}\nnull\n${settled}\n${flipped}\n42\n`, 'utf8');
    const scan = await loadEffectLedger(path, { tolerateCorrupt: true });
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(1);
    expect(scan.orphanedIntents).toHaveLength(0);
    expect(scan.corrupt.map((entry) => entry.line)).toEqual([2, 4, 5]);
  });
});
