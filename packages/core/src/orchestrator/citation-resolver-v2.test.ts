/**
 * Citation resolver v2: bounded logical units and every anchor of a
 * compound phrase (RV4208, the sixth comparison experiment). The
 * experiment confirmed the v1 window's failure modes against real
 * files: a section HEADING cited as the anchor with its support living
 * below the fixed window (a false negative the judge overturned by
 * reading the section), and compound sentences citing three files for
 * three claims with only the first anchor ever sampled. It equally
 * confirmed two GENUINE unsupported citations that no resolver may
 * launder: a bullet whose own line does not carry the claimed meaning,
 * and a code line about settle draining cited as billing-lane
 * evidence. The gold corpus below reproduces those structures and pins
 * both directions: the window artifacts disappear, the genuine
 * findings stay findings.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import type { CitationTarget } from './finish-validators.js';
import {
  citationExcerptOf,
  citationGroundingLines,
  citationUnitExcerptOf,
  clauseAround,
  MAX_GROUNDING_WINDOW_FINDINGS,
  resolveCitationAuditPlan,
  sampleCitationRows,
} from './citation-audit.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

/** A line-addressed fixture corpus, the citedValueValidator channel. */
const FILES: Record<string, string[]> = {
  'guide.md': [
    /* 1 */ '# The store guide',
    /* 2 */ '',
    /* 3 */ 'The journal is the source of truth for every resume, and the',
    /* 4 */ 'meta row is a cache over it that reconcileRunMeta can rebuild.',
    /* 5 */ '',
    /* 6 */ '## Durable stores',
    /* 7 */ '',
    /* 8 */ 'Operational notes:',
    /* 9 */ '',
    /* 10 */ '- The sqlite store keeps blobs and lease rows in one database,',
    /* 11 */ '  so fenced writes verify the lease atomically with the blob.',
    /* 12 */ '- The file store is single-writer by contract.',
    /* 13 */ '',
    /* 14 */ '## Retention',
    /* 15 */ '',
    /* 16 */ 'Deletion cascades over a run prefix.',
    /* 17 */ '',
    /* 18 */ 'The engine deletes every blob transcripts.list returns, then the',
    /* 19 */ 'journal itself, so no orphan survives a deleteRun.',
    /* 20 */ '',
    /* 21 */ '| store | fenced |',
    /* 22 */ '| --- | --- |',
    /* 23 */ '| sqlite | yes |',
    /* 24 */ '| file | no |',
    /* 25 */ '',
    /* 26 */ '- A giant bullet: the args of a tool call are recorded verbatim on',
    /* 27 */ '  the journal entry that admitted it, and nothing else rides there.',
    /* 28 */ '- Scope and IAM identity ride the NEXT entry, the execution record.',
    /* 29 */ '',
    /* 30 */ '## Resume',
    /* 31 */ '',
    /* 32 */ 'A resumed segment replays the decision prefix byte for byte.',
  ],
  'engine.ts': [
    /* 1 */ 'function settleRun(run: RunState): void {',
    /* 2 */ '  // Drain the children first: a settle that races its own',
    /* 3 */ '  // children would strand their terminals past the seal.',
    /* 4 */ '  drainChildren(run);',
    /* 5 */ '  sealJournal(run);',
    /* 6 */ '}',
    /* 7 */ '',
    /* 8 */ 'function reserveQuota(run: RunState): void {',
    /* 9 */ '  // The reservation debits the tenant BEFORE dispatch.',
    /* 10 */ '  quota.reserve(run.tenant);',
    /* 11 */ '}',
  ],
};

const resolve = (target: CitationTarget): string | undefined =>
  FILES[target.path]?.[target.line - 1];

describe('citationUnitExcerptOf shapes (RV4208)', () => {
  it('a heading excerpts its whole section to the next heading', () => {
    const resolved = citationUnitExcerptOf(resolve, { path: 'guide.md', line: 14 });
    expect(resolved?.unit.type).toBe('section');
    // The support three lines below the anchor, PAST the v1 window's
    // reach once blank lines spend it, is inside the unit.
    expect(resolved?.excerpt).toContain('no orphan survives a deleteRun');
    // The section ends at the table, not at the next heading here?
    // No: the unit runs to the next HEADING, so the table rides too.
    expect(resolved?.excerpt).toContain('| sqlite | yes |');
    expect(resolved?.excerpt).not.toContain('## Resume');
  });

  it('a list item carries its continuation lines and stops at the next item', () => {
    const resolved = citationUnitExcerptOf(resolve, { path: 'guide.md', line: 10 });
    expect(resolved?.unit.type).toBe('list-item');
    expect(resolved?.excerpt).toContain('fenced writes verify the lease');
    expect(resolved?.excerpt).not.toContain('single-writer by contract');
  });

  it('a table row brings its header pair when adjacent', () => {
    const resolved = citationUnitExcerptOf(resolve, { path: 'guide.md', line: 23 });
    expect(resolved?.unit.type).toBe('table-row');
    expect(resolved?.excerpt).toContain('| store | fenced |');
    expect(resolved?.excerpt).toContain('| sqlite | yes |');
    expect(resolved?.excerpt).not.toContain('| file | no |');
  });

  it('a paragraph expands upward as well as downward', () => {
    const resolved = citationUnitExcerptOf(resolve, { path: 'guide.md', line: 4 });
    expect(resolved?.unit.type).toBe('paragraph');
    expect(resolved?.excerpt).toContain('source of truth');
  });

  it('a code comment carries its block and the declaration it documents', () => {
    const resolved = citationUnitExcerptOf(resolve, { path: 'engine.ts', line: 3 });
    expect(resolved?.unit.type).toBe('comment-declaration');
    expect(resolved?.excerpt).toContain('Drain the children first');
    expect(resolved?.excerpt).toContain('drainChildren(run);');
  });

  it('an explicit range keeps range semantics and an unresolved anchor stays undefined', () => {
    const ranged = citationUnitExcerptOf(resolve, { path: 'guide.md', line: 18, endLine: 19 });
    expect(ranged?.excerpt).toContain('L18:');
    expect(ranged?.excerpt).toContain('L19:');
    expect(ranged?.excerpt).not.toContain('L20:');
    expect(citationUnitExcerptOf(resolve, { path: 'guide.md', line: 99 })).toBeUndefined();
  });
});

describe('clauseAround (RV4208)', () => {
  it('returns the clause segment containing the anchor position', () => {
    const sentence =
      'The settle drains children [engine.ts:4], the quota debits the tenant [engine.ts:10], ' +
      'and deletion cascades [guide.md:16].';
    expect(clauseAround(sentence, sentence.indexOf('engine.ts:4'))).toBe(
      'The settle drains children [engine.ts:4],',
    );
    expect(clauseAround(sentence, sentence.indexOf('engine.ts:10'))).toBe(
      'the quota debits the tenant [engine.ts:10],',
    );
    expect(clauseAround(sentence, sentence.indexOf('guide.md:16'))).toBe(
      'and deletion cascades [guide.md:16].',
    );
  });
});

describe('resolver v2 samples every anchor of a compound phrase (RV4208)', () => {
  const DOC =
    '## One\n' +
    'The settle drains children first [engine.ts:4], the reservation debits the tenant ' +
    'before dispatch [engine.ts:10], and retention cascades over the prefix [guide.md:16].';

  it('v1 keeps the first anchor only, byte identical', () => {
    const plan = resolveCitationAuditPlan({});
    const rows = sampleCitationRows(DOC, plan, 'seed');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.anchor).toBe('engine.ts:4');
    expect(rows[0]?.anchorOrdinal).toBeUndefined();
    expect(rows[0]?.clause).toBeUndefined();
  });

  it('v2 expands the picked sentence into one row per anchor with its clause', () => {
    const plan = resolveCitationAuditPlan({ resolver: 2 });
    const rows = sampleCitationRows(DOC, plan, 'seed');
    expect(rows.map((row) => row.anchor)).toEqual(['engine.ts:4', 'engine.ts:10', 'guide.md:16']);
    expect(rows.map((row) => row.anchorOrdinal)).toEqual([0, 1, 2]);
    expect(rows[1]?.clause).toContain('debits the tenant');
    expect(rows.map((row) => row.row)).toEqual([0, 1, 2]);
  });

  it('the maxSampled cap is a hard row ceiling across the expansion', () => {
    const plan = resolveCitationAuditPlan({ resolver: 2, maxSampled: 2 });
    const rows = sampleCitationRows(DOC, plan, 'seed');
    expect(rows).toHaveLength(2);
  });

  it('the resolver literal gate refuses garbage', () => {
    expect(() => resolveCitationAuditPlan({ resolver: 3 as never })).toThrow(
      /resolver must be 1 or 2/,
    );
  });
});

/**
 * The gold corpus (RV4208): 24 rows, 10 whose designated support must
 * be INSIDE the v2 excerpt and 14 findings whose claimed meaning must
 * NOT be laundered in, mirroring the sixth run's 10 supported / 14
 * findings split. `support` is the entailing text for adequate rows;
 * `absent` is the claimed-but-false meaning for finding rows, which no
 * excerpt may contain because the corpus never says it.
 */
const GOLD: Array<
  | { path: string; line: number; endLine?: number; support: string }
  | { path: string; line: number; endLine?: number; absent: string }
> = [
  // Adequate rows: the unit carries the entailing text.
  { path: 'guide.md', line: 14, support: 'no orphan survives a deleteRun' },
  { path: 'guide.md', line: 6, support: 'fenced writes verify the lease' },
  { path: 'guide.md', line: 10, support: 'one database' },
  { path: 'guide.md', line: 12, support: 'single-writer by contract' },
  { path: 'guide.md', line: 23, support: 'sqlite' },
  { path: 'guide.md', line: 4, support: 'source of truth' },
  { path: 'guide.md', line: 18, endLine: 19, support: 'then the' },
  { path: 'engine.ts', line: 3, support: 'drainChildren' },
  { path: 'engine.ts', line: 9, support: 'quota.reserve' },
  { path: 'guide.md', line: 30, support: 'replays the decision prefix' },
  // Finding rows: the corpus never carries the claimed meaning, and
  // the unit expansion must not fabricate it. The first two are the
  // experiment's confirmed genuine unsupported citations by shape:
  // the args bullet cited for scope/IAM (which lives on the NEXT
  // list item, a different unit), and the settle drain cited as
  // billing lanes.
  { path: 'guide.md', line: 26, absent: 'Scope and IAM' },
  { path: 'engine.ts', line: 4, absent: 'billing lanes' },
  { path: 'guide.md', line: 3, absent: 'billing lanes' },
  { path: 'guide.md', line: 8, absent: 'SLO observations' },
  { path: 'guide.md', line: 10, absent: 'network egress' },
  { path: 'guide.md', line: 12, absent: 'multi-writer' },
  { path: 'guide.md', line: 16, absent: 'retention is disabled' },
  { path: 'guide.md', line: 21, absent: 'postgres' },
  { path: 'guide.md', line: 24, absent: 'fenced file writes' },
  { path: 'guide.md', line: 28, absent: 'args are redacted' },
  { path: 'guide.md', line: 32, absent: 'replays the transcript' },
  { path: 'engine.ts', line: 1, absent: 'executor isolation' },
  { path: 'engine.ts', line: 8, absent: 'capability inference' },
  { path: 'engine.ts', line: 10, absent: 'refund path' },
];

describe('the gold corpus (RV4208)', () => {
  it('v2 excerpt adequacy matches gold 24/24; the genuine findings stay findings', () => {
    let matches = 0;
    for (const row of GOLD) {
      const resolved = citationUnitExcerptOf(resolve, row);
      expect(resolved).toBeDefined();
      if (resolved === undefined) {
        continue;
      }
      if ('support' in row) {
        if (resolved.excerpt.includes(row.support)) {
          matches += 1;
        }
      } else if (!resolved.excerpt.includes(row.absent)) {
        matches += 1;
      }
    }
    // The acceptance floor is 0.95; the corpus is built to read 24/24
    // so a single regression is visible as the exact row it breaks.
    expect(matches).toBe(GOLD.length);
    expect(matches / GOLD.length).toBeGreaterThanOrEqual(0.95);
  });

  it('the confirmed v1 false negative disappears and stays honest under v1', () => {
    // The stores.md:180 shape: a section heading cited as the anchor,
    // support below the window once the blank lines spend it.
    const v1 = citationExcerptOf(resolve, { path: 'guide.md', line: 14 }, 3);
    expect(v1).not.toContain('no orphan survives a deleteRun');
    const v2 = citationUnitExcerptOf(resolve, { path: 'guide.md', line: 14 });
    expect(v2?.excerpt).toContain('no orphan survives a deleteRun');
  });
});

describe('the declared resolver 2 rides the audit end to end (RV4208)', () => {
  it('stamps resolverVersion 2 on the meta and hands the judge per-anchor rows with clauses', async () => {
    const FINAL =
      'final: the settle drains children first [engine.ts:4], and the reservation debits ' +
      'the tenant before dispatch [engine.ts:10].';
    const textOf = (req: ChatRequest): string =>
      req.messages
        .flatMap((msg) => msg.parts)
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n');
    let orchTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)
        ?.rulvar;
      if (rulvar?.agentType === 'worker') {
        return { text: 'the recorded reading' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read' } },
        };
      }
      if (orchTurn === 2) {
        const handles: number[] = [];
        for (const msg of req.messages) {
          for (const part of msg.parts) {
            if (part.type === 'tool-result') {
              const result = part.result as { handle?: number };
              if (typeof result?.handle === 'number') {
                handles.push(result.handle);
              }
            }
          }
        }
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft' } } };
    });
    const judge = scriptedAdapter(
      (req): ScriptedTurn => {
        const verdicts: { row: number; verdict: string; reason: string }[] = [];
        for (const match of textOf(req).matchAll(/"row":(\d+)/gu)) {
          verdicts.push({ row: Number(match[1]), verdict: 'supported', reason: 'entails' });
        }
        return { text: JSON.stringify({ verdicts }) };
      },
      { id: 'judge' },
    );
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: FINAL } } }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: { worker: { description: 'reads one span' } },
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        citationAudit: { resolve, resolver: 2, judge: { model: 'judge:model' } },
      }),
      undefined,
    )) as Record<string, unknown>;
    const meta = outcome.citationAuditMeta as Record<string, unknown>;
    expect(meta.resolverVersion).toBe(2);
    // One compound sentence, two anchors: two rows, both judged.
    expect(meta.sampled).toBe(2);
    expect(meta.supported).toBe(2);
    const judgeText = judge.calls[0] === undefined ? '' : textOf(judge.calls[0]);
    expect(judgeText).toContain('"clause":');
    expect(judgeText).toContain('"unit":');
    expect(judgeText).toContain('Rows carrying a `clause`');
  });
});

/**
 * The seventh comparison experiment's citation findings, frozen
 * (RV4401). The built-in judge returned 10 unsupported of 24 sampled,
 * and re-adjudication against the frozen tree showed seven of the ten
 * were EXCERPT artifacts, not candidate defects: docstring anchors
 * whose `* `-led lines matched the markdown list rule and excerpted
 * alone (support 3..9 lines away), one section cut mid-unit by the
 * v1-sized char cap, and one table HEADER excerpted without the body
 * rows it names. The corpus freezes the exact line texts of the ten
 * findings' files at v1.248.0 (54c04dc7) and pins both directions:
 * the artifact excerpts now carry their support, and the genuinely
 * wrong citations stay exactly as damning as the judge read them.
 */
const SEVENTH: Record<string, Record<string, string>> = {
  'packages/store-sqlite/src/store.ts': {
    '1': '/**',
    '2': ' * SqliteStore (M5-T02): JournalStore plus LeasableStore with fencing',
    '3': ' * epochs over the builtin node:sqlite driver; the reference',
    '4': ' * implementation for community stores (see',
    '5': ' * https://docs.rulvar.com/guide/stores). Zero native dependencies by',
    '6': ' * design.',
    '7': ' *',
    '8': ' * Contract highlights (executable definition: @rulvar/store-conformance):',
    '9': ' * - A1-A4: single-statement inserts are atomic; per-run order is the',
    '10': ' *   append order (rowid); payloads are opaque JSON, unknown fields pass',
    '11': ' *   through untouched.',
    '12': " * - Fencing: the epoch is monotonic per runId for the store's lifetime",
    '13': ' *   INCLUDING across deleteRun and recreate (the epochs row is a',
    '14': ' *   tombstone deletion preserves, so a zombie lease from a deleted',
    '15': ' *   incarnation can never fence green against a recreated run);',
    '16': ' *   an append carrying a stale or released lease rejects with the typed',
    '17': ' *   LeaseHeldError and the entry never becomes visible. The fence check',
    '18': " *   and the guarded mutation (append's insert, renew's extension,",
    '19': " *   release's deletion) commit as ONE immediate transaction: checking in",
    '20': ' *   one autocommit statement and mutating in the next left a',
  },
  'packages/store-postgres/src/store.ts': {
    '1': '/**',
    '2': ' * PostgresStore (RV-214): JournalStore plus LeasableStore with fencing',
    '3': ' * epochs over node-postgres (`pg`); the production reference for',
    '4': " * multi-process AND multi-host deployments, where SqliteStore's",
    '5': ' * one-file-per-host boundary ends.',
    '6': ' *',
    '7': ' * Contract highlights (executable definition: @rulvar/store-conformance):',
    '8': ' * - A1-A4: a single INSERT is atomic; per-run order is the append order',
    '9': ' *   (a BIGSERIAL id); payloads are opaque TEXT JSON, unknown fields pass',
    '10': ' *   through byte-for-byte (deliberately NOT a jsonb column: jsonb',
    '11': ' *   normalizes key order and duplicate keys, and A4 forbids',
    '12': ' *   normalization; jsonb is used only in query-side casts and',
    '13': ' *   expression indexes).',
    '14': ' * - Serialization: every run-scoped mutation (fenced or not) runs inside',
    '15': ' *   one transaction that first takes a per-run advisory transaction lock',
    '16': ' *   (`pg_advisory_xact_lock` over a hash of schema and runId). That is',
    '17': " *   this store's translation of the sqlite BEGIN IMMEDIATE lesson (the",
    '18': ' *   fenced-run-state RFC, F3): the fence check and the guarded mutation',
    '19': ' *   commit as ONE serialized unit, so a takeover from another process or',
    '20': ' *   HOST cannot land between the check and the write. The lock is',
    '21': ' *   per-run, so unrelated runs never queue behind each other.',
    '22': " * - Fencing: the epoch is monotonic per runId for the store's lifetime",
    '23': ' *   INCLUDING across deleteRun and recreate (the epochs row is a',
    '24': ' *   tombstone deletion preserves, so a zombie lease from a deleted',
    '25': ' *   incarnation can never fence green against a recreated run); an',
    '26': ' *   append carrying a stale or released lease rejects with the typed',
    '27': ' *   LeaseHeldError and the entry never becomes visible. `fencedWrites:',
    '28': ' *   true` on both the journal side and the transcript twin: putMeta,',
    '29': ' *   delete, and blob writes accept the same optional lease under the',
    '30': ' *   same atomic rule, and every lease-guarded mutation additionally',
    '31': " *   requires the lease's runId to BE the mutated run.",
    '32': ' * - A5 monotonic seq: the tail check and the insert are one conditional',
    '33': " *   INSERT under the run's advisory lock, so a second writer racing the",
    '34': ' *   journal from a stale tail loses with a typed JournalOrderViolation.',
    '35': ' * - Concurrent boot: the idempotent schema bootstrap runs lazily on',
    '36': ' *   first use, inside a schema-scoped advisory transaction lock, so a',
    '37': ' *   fleet start over one fresh database serializes instead of colliding',
    '38': ' *   in the DDL (the sqlite boot-race lesson, translated: postgres',
    '39': ' *   queues on the lock and needs no busy retry).',
    '40': ' * - Clocks: lease expiry uses the CLIENT clock (injectable `now`),',
    '41': ' *   mirroring SqliteStore, so coordinating worker hosts must be',
    '42': ' *   NTP-synced and the lease ttl must dwarf their skew (the default',
    '43': ' *   60000 ms dwarfs sane NTP drift). One write region per run: this',
    '44': ' *   store proves single-region multi-host fencing; a multi-region',
    '45': ' *   protocol is out of scope until proven.',
    '46': ' * - Pooling and backpressure: one pg Pool per store (default max 10',
  },
  'packages/core/src/tools/toolset-hash.ts': {
    '36': '',
    '37': '/**',
    '38': ' * The authority projection of one tool (RV1802): what the tool may DO',
    '39': ' * and under what gate, beside WHAT the model sees. The contract hash',
    '40': ' * pins the model-facing tuple; risk, needsApproval, executor, and the',
    '41': ' * executorSpec digest are the declarations that never enter',
    '42': ' * toolsetHash by design, yet every one of them changes what the ask',
    '43': ' * rules and the approval flow will do. Execute bodies stay',
    '44': ' * deliberately unhashable: `version` remains the lever for behavior',
    '45': ' * drift under an unchanged contract.',
    '46': ' */',
    '47': 'export interface ToolAuthority {',
    '48': '  /** toolContractHash of the model-facing contract tuple. */',
    '49': '  contract: string;',
    '50': "  /** The tool's approval gate (default false at build time). */",
  },
  'packages/core/src/orchestrator/semantic-verdict.ts': {
    '67': 'const countOf = (value: unknown): number =>',
    '68': "  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;",
    '69': '',
    '70': '/**',
    '71': ' * Folds the one semantic verdict out of envelope facts (RV4209).',
    '72': ' * Returns undefined when NO semantic meta is present: nothing was',
    '73': ' * configured, nothing judged anything, and absence must keep meaning',
    '74': ' * NOT RECORDED rather than a fabricated verdict. Never throws on',
    '75': ' * malformed shapes: an untyped field reads as absent, and the verdict',
    '76': " * degrades toward 'not-judged', the fail-closed direction.",
    '77': ' */',
    '78': 'export function semanticTerminalVerdictOf(',
    '79': '  input: SemanticVerdictInput,',
    '80': '): SemanticTerminalVerdict | undefined {',
    '81': '  const claim = input.claimConsistencyMeta;',
    '82': '  const audit = input.citationAuditMeta;',
  },
  'packages/openai/src/compatible.ts': {
    '1': '/**',
    '2': ' * openaiCompatible factory (M3-T06): a ProviderAdapter for',
    '3': ' * OpenAI-compatible endpoints (Ollama, vLLM, Mistral, OpenRouter,',
    '4': ' * arbitrary gateways) speaking the Chat Completions dialect by',
    '5': ' * construction. Explicit ids let several endpoints coexist in one',
    '6': ' * engine; a duplicate adapterId at createEngine is a typed ConfigError',
    '7': ' * raised by the adapter registry.',
    '8': ' *',
    '9': ' * Guide: https://docs.rulvar.com/guide/providers',
    '10': ' */',
    '11': "import OpenAI from 'openai';",
    '12': 'import {',
    '13': '  ConfigError,',
    '14': '  createCanonicalIdMinter,',
    '15': '  type ChatEvent,',
    '16': '  type ChatRequest,',
    '17': '  type ModelCaps,',
    '18': '  type ProviderAdapter,',
    '19': "} from '@rulvar/core';",
    '20': "import type { OpenAiClientLike } from './adapter.js';",
  },
  'packages/evals/src/fault-injection.ts': {
    '1': '/**',
    '2': ' * The fault-injection kit (RV811): the comparison experiments left a',
    '3': ' * standing list of fail-closed branches never observed live, and a',
    '4': ' * branch nobody has ever driven is a claim, not a guarantee. Each',
    '5': ' * scenario here DELIBERATELY drives one such branch on the real engine',
    '6': ' * with scripted adapters (zero provider calls, zero keys), verifies the',
    '7': ' * documented typed observable, and leaves experiment-grade artifacts',
    '8': ' * (the outcome, the journal, the raw bytes where the fault is a byte',
    '9': ' * fault). Fail closed like everything else in this package: a scenario',
    '10': ' * whose branch stops producing its documented observable reports',
    '11': ' * `matched: false` and the whole report says so, instead of the list',
    '12': ' * quietly becoming untested again. The RV909 scenarios extend the list',
    '13': " * with the thirteenth experiment's fixed defects, so each fix's probe",
    '14': ' * is a permanent gate: reverting the fixed behavior reports',
    '15': ' * `matched: false` here, not only in the unit suite that shipped it.',
    '16': ' */',
    '17': "import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';",
    '18': "import { appendFileSync, mkdtempSync } from 'node:fs';",
    '19': "import { tmpdir } from 'node:os';",
    '20': "import { join } from 'node:path';",
  },
  'packages/core/src/journal/replayer.ts': {
    '74': 'export interface Ledger {',
    '75': '  usage: Usage;',
    '76': '  usd: number;',
    '77': '  agentsSpawned: number;',
    '78': '}',
    '79': '',
    '80': '/**',
    '81': ' * The budget ledger fold as a PURE function over entries (extracted in',
    '82': ' * RV1209 so an offline reader folds the identical arithmetic instead',
    '83': ' * of a lookalike): usage sums over terminal entries once, never twice;',
    '84': ' * agentsSpawned counts agent dispatches. Dollars fold on the settled',
    '85': " * billing basis (RV801): per provider call where the entry's records",
    '86': ' * cover its usage, the per-slice aggregate otherwise, the same basis',
    '87': ' * as the CostReport and the invoice.',
    '88': ' */',
    '89': 'export function foldLedger(',
    '90': '  entries: readonly JournalEntry[],',
    '91': '  abandonFold: AbandonFold,',
    '92': '  priceUsd?: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined,',
    '93': '): Ledger {',
    '94': '  let usage: Usage = {',
  },
  'docs/guide/adaptive-orchestration.md': {
    '1': '---',
    '2': 'title: PlanRunner and extensions',
    '3': 'description: The opt-in @rulvar/plan extension for wide fan-out workloads, where the task plan is typed engine-owned data with journaled revisions, reuse, escalations, model ladders, and guaranteed termination.',
    '4': '---',
    '5': '',
    '6': '# PlanRunner and extensions',
    '7': '',
    '8': '`@rulvar/plan` ships PlanRunner, the opt-in extension of the dynamic orchestrator ([mode (c)](/guide/orchestration-modes)). It exists for one workload shape: wide fan-out where the plan must change mid-run. The design position is deliberate: mid-run replanning is the only real justification for an LLM orchestrator, and if the plan never changes, a script is strictly better. For most workloads the documented default remains a phase chain with replanning between phases; reach for PlanRunner when dozens of children run in parallel, some of them escalate, and the plan has to absorb what they report without redoing paid work.',
    '9': '',
    '10': '```bash',
    '11': 'pnpm add @rulvar/core @rulvar/anthropic @rulvar/plan @rulvar/store-sqlite',
    '12': '```',
    '13': '',
    '14': 'The extension holds a hard line everywhere: the plan is typed data owned by the engine, never prose in a transcript. The orchestrator model proposes typed diffs; the engine mints identifiers, admits spawns, schedules ready nodes, and journals every dynamic decision strictly before its effects. Nondeterminism is eliminated not by forbidding dynamism but by recording it.',
    '15': '',
    '16': '## Quick start',
  },
  'docs/reference/versioning.md': {
    '8': 'Rulvar follows semver with one deliberate simplification: every package releases together under one identical version. There is exactly one exemption, and it exists to protect frozen data. This page explains the policy, what a release contains, and what an upgrade means for your code and for your journals.',
    '9': '',
    '10': '| Line | Current version | Policy |',
    '11': '|---|---|---|',
    '12': '| The fixed group (fifteen packages) | <!-- version:lockstep -->1.248.0<!-- /version --> | Lockstep: identical versions, released together |',
    '13': '| `@rulvar/compat` | <!-- version:compat -->0.1.1<!-- /version --> | Independent: releases when a frozen profile moves in, or for rare packaging-only fixes |',
    '14': '',
    '15': '## Lockstep semver across the fixed group',
  },
  '.github/workflows/release.yml': {
    '60': '          cache: pnpm',
    '61': "          registry-url: 'https://registry.npmjs.org'",
    '62': '      - run: pnpm install --frozen-lockfile',
    '63': '      # Retries once on the tsdown pack flake; scripts/turbo-retry.mjs',
    '64': '      # documents why that is safe. A flaked first build must not cost',
    '65': '      # the release train a manual re-run.',
    '66': '      - run: node scripts/turbo-retry.mjs build',
  },
};

const resolveSeventh = (target: CitationTarget): string | undefined =>
  SEVENTH[target.path]?.[String(target.line)];

describe('the seventh run findings corpus (RV4401)', () => {
  it('a docstring anchor is a comment block, not a one-line list', () => {
    const resolved = citationUnitExcerptOf(resolveSeventh, {
      path: 'packages/store-sqlite/src/store.ts',
      line: 8,
    });
    expect(resolved?.unit.type).toBe('comment-declaration');
    // The judged claim: fence and mutation commit in one immediate
    // transaction. Support lives 11 lines below the anchor; the
    // one-line excerpt hid it and the judge ruled unsupported.
    expect(resolved?.excerpt).toContain('ONE immediate transaction');
    expect(resolved?.unit.lines).toBe(20);
    expect(resolved?.unit.truncated).toBe(true);
  });

  it('a stripped list item inside a docstring excerpts the ITEM with its continuations', () => {
    const resolved = citationUnitExcerptOf(resolveSeventh, {
      path: 'packages/store-postgres/src/store.ts',
      line: 40,
    });
    expect(resolved?.unit.type).toBe('list-item');
    // The judged claim: no multi-region protocol. Support is the
    // item's own continuation five lines down.
    expect(resolved?.excerpt).toContain('out of scope until proven');
    expect(resolved?.excerpt).not.toContain('Pooling');
  });

  it('the authority-projection docstring carries its declaration list', () => {
    const resolved = citationUnitExcerptOf(resolveSeventh, {
      path: 'packages/core/src/tools/toolset-hash.ts',
      line: 38,
    });
    expect(resolved?.unit.type).toBe('comment-declaration');
    expect(resolved?.excerpt).toContain('risk, needsApproval, executor, and the');
  });

  it('the semantic-verdict docstring shows its fail-closed sentence', () => {
    const resolved = citationUnitExcerptOf(resolveSeventh, {
      path: 'packages/core/src/orchestrator/semantic-verdict.ts',
      line: 71,
    });
    expect(resolved?.unit.type).toBe('comment-declaration');
    expect(resolved?.excerpt).toContain('the fail-closed direction');
  });

  it('the fault-kit docstring shows the typed observable and artifact promise', () => {
    const resolved = citationUnitExcerptOf(resolveSeventh, {
      path: 'packages/evals/src/fault-injection.ts',
      line: 2,
    });
    expect(resolved?.unit.type).toBe('comment-declaration');
    expect(resolved?.excerpt).toContain('documented typed observable');
  });

  it('a truthful excerpt does not launder a claim the unit never carries', () => {
    // The candidate cited compatible.ts:2 for conservative default
    // caps; the factory docstring says nothing about caps (the
    // support lives in a DIFFERENT unit the sentence also anchored).
    // The fix widens the excerpt to the true unit and the verdict
    // stays honestly unsupported.
    const factory = citationUnitExcerptOf(resolveSeventh, {
      path: 'packages/openai/src/compatible.ts',
      line: 2,
    });
    expect(factory?.unit.type).toBe('comment-declaration');
    expect(factory?.unit.lines).toBeGreaterThan(1);
    expect(factory?.excerpt).not.toContain('conservative');
    // The candidate cited the budget-ledger fold as append/ordinal
    // serialization evidence; the full docstring proves the judge
    // RIGHT, in more detail than the one-line excerpt did.
    const fold = citationUnitExcerptOf(resolveSeventh, {
      path: 'packages/core/src/journal/replayer.ts',
      line: 81,
    });
    expect(fold?.unit.type).toBe('comment-declaration');
    expect(fold?.excerpt).toContain('budget ledger fold');
    expect(fold?.excerpt).not.toContain('serializ');
  });

  it('the unit char cap fits a guide section whose support sat past the v1-sized cap', () => {
    const resolved = citationUnitExcerptOf(resolveSeventh, {
      path: 'docs/guide/adaptive-orchestration.md',
      line: 6,
    });
    expect(resolved?.unit.type).toBe('section');
    // The judged claim: the engine keeps identifiers, admission,
    // scheduling and journal ownership. The support line sits past
    // 800 chars of section body, exactly where the old cap cut.
    expect(resolved?.excerpt.length).toBeGreaterThan(800);
    expect(resolved?.excerpt).toContain('journals every dynamic decision');
  });

  it('a table HEADER anchor carries the body rows it names', () => {
    const resolved = citationUnitExcerptOf(resolveSeventh, {
      path: 'docs/reference/versioning.md',
      line: 10,
    });
    expect(resolved?.unit.type).toBe('table-row');
    // The judged claim: compat is independent at 0.1.1. The header
    // alone names columns; the body rows carry the versions.
    expect(resolved?.excerpt).toContain('0.1.1');
    expect(resolved?.excerpt).toContain('Independent');
  });

  it('a genuinely weak YAML anchor stays exactly as the judge read it', () => {
    const resolved = citationUnitExcerptOf(resolveSeventh, {
      path: '.github/workflows/release.yml',
      line: 62,
    });
    expect(resolved?.unit.type).toBe('list-item');
    expect(resolved?.unit.lines).toBe(1);
    expect(resolved?.excerpt).toContain('pnpm install');
  });
});

describe('comment context boundaries (RV4401)', () => {
  const BOUNDARY: Record<string, Record<string, string>> = {
    'notes.md': {
      '1': 'Operational summary:',
      '2': '* the first item explains the fence,',
      '3': '* the second item explains the lease.',
    },
    'tool.py': {
      '1': '# The retry ladder caps at three attempts;',
      '2': '# the fourth is a typed refusal.',
      '3': 'def retry():',
    },
    'plain.md': {
      '1': '# The store guide',
      '2': '',
      '3': 'Prose below the title.',
    },
  };
  const resolveBoundary = (target: CitationTarget): string | undefined =>
    BOUNDARY[target.path]?.[String(target.line)];

  it('a bare markdown star chain has no opener and keeps list semantics', () => {
    const resolved = citationUnitExcerptOf(resolveBoundary, { path: 'notes.md', line: 2 });
    expect(resolved?.unit.type).toBe('list-item');
    expect(resolved?.unit.lines).toBe(1);
    expect(resolved?.excerpt).not.toContain('second item');
  });

  it('a hash line beside a same-family neighbor is a comment, not a heading', () => {
    const resolved = citationUnitExcerptOf(resolveBoundary, { path: 'tool.py', line: 1 });
    expect(resolved?.unit.type).toBe('comment-declaration');
    expect(resolved?.excerpt).toContain('typed refusal');
    expect(resolved?.excerpt).toContain('def retry():');
  });

  it('a lone markdown H1 stays a heading section', () => {
    const resolved = citationUnitExcerptOf(resolveBoundary, { path: 'plain.md', line: 1 });
    expect(resolved?.unit.type).toBe('section');
    expect(resolved?.excerpt).toContain('Prose below the title.');
  });
});

describe('citationGroundingLines (RV4601)', () => {
  it('resolves the unit of each finding anchor, deduped, skipping the unresolvable', () => {
    const lines = citationGroundingLines(
      [{ anchor: 'engine.ts:2' }, { anchor: 'engine.ts:2' }, { anchor: 'missing.ts:1' }],
      resolve,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('engine.ts:2 (comment-declaration):');
    expect(lines[0]).toContain('drainChildren(run);');
  });

  it('keeps range semantics for a ranged anchor', () => {
    const lines = citationGroundingLines([{ anchor: 'guide.md:18-19' }], resolve);
    expect(lines[0]).toContain('guide.md:18-19 (paragraph):');
    expect(lines[0]).toContain('L19: journal itself');
    expect(lines[0]).not.toContain('L20:');
  });

  it('honors the finding and character budgets', () => {
    const findings = Array.from({ length: MAX_GROUNDING_WINDOW_FINDINGS + 3 }, (_, index) => ({
      anchor: `engine.ts:${String(index + 1)}`,
    }));
    expect(citationGroundingLines(findings, resolve).length).toBeLessThanOrEqual(
      MAX_GROUNDING_WINDOW_FINDINGS,
    );
    const long = Array.from({ length: 24 }, () => 'x'.repeat(400));
    const resolveLong = (target: CitationTarget): string | undefined =>
      target.path === 'long.md' ? long[target.line - 1] : undefined;
    const capped = citationGroundingLines(
      [{ anchor: 'long.md:1' }, { anchor: 'long.md:5' }, { anchor: 'long.md:9' }],
      resolveLong,
    );
    // Each unit clips at the excerpt char cap; the third would step
    // past the block budget and is absent, never truncated mid entry.
    expect(capped).toHaveLength(2);
  });
});

describe('the grounding windows ride the citation round (RV4601)', () => {
  const FINAL_BAD = 'final: the settle drains children first engine.ts:2.';
  const FINAL_FIXED = 'final: the settle drains children first engine.ts:4.';
  const textOfReq = (req: ChatRequest): string =>
    req.messages
      .flatMap((msg) => msg.parts)
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
  const rig = () => {
    let orchTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)
        ?.rulvar;
      if (rulvar?.agentType === 'worker') {
        return { text: 'the recorded reading' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read' } },
        };
      }
      if (orchTurn === 2) {
        const handles: number[] = [];
        for (const msg of req.messages) {
          for (const part of msg.parts) {
            if (part.type === 'tool-result') {
              const result = part.result as { handle?: number };
              if (typeof result?.handle === 'number') {
                handles.push(result.handle);
              }
            }
          }
        }
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft' } } };
    });
    let judgeCall = 0;
    const judge = scriptedAdapter(
      (req): ScriptedTurn => {
        judgeCall += 1;
        const verdict = judgeCall === 1 ? 'unsupported' : 'supported';
        const verdicts: { row: number; verdict: string; reason: string }[] = [];
        for (const match of textOfReq(req).matchAll(/"row":(\d+)/gu)) {
          verdicts.push({ row: Number(match[1]), verdict, reason: 'ruled' });
        }
        return { text: JSON.stringify({ verdicts }) };
      },
      { id: 'judge' },
    );
    let synthCall = 0;
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => {
        synthCall += 1;
        return {
          toolCall: {
            name: 'finish',
            args: { result: synthCall === 1 ? FINAL_BAD : FINAL_FIXED },
          },
        };
      },
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, judge, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: { worker: { description: 'reads one span' } },
    });
    return { internals, synthesis };
  };
  const optsWith = (auditExtras: Record<string, unknown>) => ({
    acceptance: { childPolicy: 'all-ok' as const },
    synthesis: { limits: { maxTurns: 3 } },
    citationAudit: {
      resolve,
      onFound: 'repair' as const,
      judge: { model: 'judge:model' as const },
      ...auditExtras,
    },
  });

  it('a resolver 2 round carries the resolved units of the judged anchors', async () => {
    const { internals, synthesis } = rig();
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', optsWith({ resolver: 2 })),
      undefined,
    );
    expect(synthesis.calls).toHaveLength(2);
    const roundPrompt = textOfReq(synthesis.calls[1]);
    expect(roundPrompt).toContain('CITATION AUDIT FINDINGS');
    expect(roundPrompt).toContain('CITATION GROUNDING:');
    expect(roundPrompt).toContain('engine.ts:2 (comment-declaration):');
    expect(roundPrompt).toContain('drainChildren(run);');
  });

  it('a resolver 1 round keeps its prompt bytes: no grounding block', async () => {
    const { internals, synthesis } = rig();
    await executeWorkflow(internals, makeOrchestratorWorkflow('goal', optsWith({})), undefined);
    expect(synthesis.calls).toHaveLength(2);
    const roundPrompt = textOfReq(synthesis.calls[1]);
    expect(roundPrompt).toContain('CITATION AUDIT FINDINGS');
    expect(roundPrompt).not.toContain('CITATION GROUNDING:');
  });
});
