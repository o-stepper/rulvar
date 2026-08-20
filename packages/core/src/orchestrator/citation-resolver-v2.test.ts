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
  citationUnitExcerptOf,
  clauseAround,
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
