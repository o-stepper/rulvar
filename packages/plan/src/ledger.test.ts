import { describe, expect, it } from 'vitest';
import { createEngine, InMemoryStore } from '@lurker/core';
import type { JournalEntry } from '@lurker/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned } from './plan-runner.js';
import {
  exportLedger,
  foldLedger,
  LEDGER_SECTION_CAPS,
  ledgerCapViolation,
  ledgerSufficiency,
  type LedgerOp,
} from './ledger.js';
import {
  agentTypeOf,
  lastToolError,
  lastToolResult,
  scriptedAdapter,
  type ScriptedTurn,
} from './test-harness.js';

let seqCounter = 0;
function ledgerEntry(op: LedgerOp, scope = ''): JournalEntry {
  seqCounter += 1;
  return {
    hashVersion: 2,
    seq: seqCounter,
    scope,
    key: '',
    ordinal: 0,
    kind: 'ledger.op',
    status: 'ok',
    value: { op },
    spanId: 's',
    startedAt: 't',
  };
}

describe('the ledger fold (docs/07, 9.3)', () => {
  it('folds authored ops with immutable brief and supersede chains', () => {
    const entries = [
      ledgerEntry({ op: 'brief_set', text: 'ship the feature' }),
      ledgerEntry({ op: 'brief_set', text: 'OVERWRITE ATTEMPT' }),
      ledgerEntry({ op: 'fact_add', factId: 'f1', text: 'v1', provenance: [3], confidence: 'low' }),
      ledgerEntry({
        op: 'fact_supersede',
        factId: 'f1',
        supersededBy: 'f2',
        text: 'v2',
        provenance: [4],
        confidence: 'high',
      }),
    ];
    const view = foldLedger(entries);
    expect(view.brief?.text).toBe('ship the feature');
    expect(view.discrepancies).toHaveLength(1);
    expect(view.facts.find((fact) => fact.factId === 'f1')?.supersededBy).toBe('f2');
    const exported = exportLedger(view);
    expect(exported.ledgerExportVersion).toBe('draft-1');
    expect(exported.brief).toBe('ship the feature');
    expect(ledgerSufficiency(view)).toBe(false);
  });

  it('ignores foreign-scope writers (single-writer discipline)', () => {
    const view = foldLedger([ledgerEntry({ op: 'brief_set', text: 'intruder' }, 'plan/X')], {
      ledgerScope: '',
    });
    expect(view.brief).toBeUndefined();
    expect(view.discrepancies).toHaveLength(1);
  });

  it('enforces the Appendix A section caps', () => {
    const facts = Array.from({ length: LEDGER_SECTION_CAPS.facts }, (_, index) =>
      ledgerEntry({
        op: 'fact_add',
        factId: `f${String(index)}`,
        text: 'x',
        provenance: [],
        confidence: 'low',
      }),
    );
    const view = foldLedger(facts);
    expect(
      ledgerCapViolation(view, {
        op: 'fact_add',
        factId: 'overflow',
        text: 'x',
        provenance: [],
        confidence: 'low',
      }),
    ).toMatch(/capped at 64/);
    expect(ledgerCapViolation(view, { op: 'brief_set', text: 'first' })).toBeUndefined();
  });
});

const EMPTY_PLAN_HASH = planHash(emptyPlan());

interface ViewNodeRender {
  logicalTaskId: string;
  lineage?: { approaches: Array<{ approachSig: string }> };
}

describe('RunLedger integration (M7-T09)', () => {
  it('journals authored ops, rejects unfounded lessons, and reads a pinned render', async () => {
    let phase = 0;
    let rejection: string | undefined;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'worker done' };
      }
      phase += 1;
      if (phase === 1) {
        return {
          toolCall: {
            name: 'ledger_append',
            args: { op: { op: 'brief_set', text: 'collect the facts' } },
          },
        };
      }
      if (phase === 2) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
              rationale: 'one worker',
            },
          },
        };
      }
      if (phase === 3) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      if (phase === 4) {
        // An unfounded lesson key is a typed tool error (bounded
        // re-prompt), never run death.
        return {
          toolCall: {
            name: 'ledger_append',
            args: {
              op: {
                op: 'lesson_add',
                key: { logicalTaskId: 'NOPE', approachSig: 'f'.repeat(64) },
                text: 'bogus',
              },
            },
          },
        };
      }
      if (phase === 5) {
        rejection = lastToolError(req);
        return { toolCall: { name: 'plan_view', args: {} } };
      }
      if (phase === 6) {
        // The real lesson key comes from the plan_view lineage render.
        const view = lastToolResult<{ nodes?: ViewNodeRender[] }>(req, (value) =>
          Array.isArray((value as { nodes?: unknown } | undefined)?.nodes),
        );
        const node = view?.nodes?.[0];
        const approach = node?.lineage?.approaches[0];
        return {
          toolCall: {
            name: 'ledger_append',
            args: {
              op: {
                op: 'lesson_add',
                key: {
                  logicalTaskId: node?.logicalTaskId ?? 'MISSING',
                  approachSig: approach?.approachSig ?? 'MISSING',
                },
                text: 'the default approach worked first try',
              },
            },
          },
        };
      }
      if (phase === 7) {
        return { toolCall: { name: 'ledger_read', args: {} } };
      }
      return { toolCall: { name: 'finish', args: { result: 'ledgered' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'worker' } },
      },
    });
    const handle = orchestratePlanned(engine, 'ledger test', { budget: { capUsd: 5 } });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    // The bogus lesson surfaced as a typed tool error naming the rule.
    expect(rejection).toContain('lesson_add rejected');

    const entries = await store.load(handle.runId);
    const ledgerOps = entries.filter((entry) => entry.kind === 'ledger.op');
    // brief_set plus the FOUNDED lesson only: the bogus lesson never
    // journaled.
    expect(ledgerOps).toHaveLength(2);
    const lessonEntry = ledgerOps.find((entry) =>
      JSON.stringify(entry.value).includes('lesson_add'),
    );
    expect(lessonEntry).toBeDefined();
    expect(JSON.stringify(lessonEntry?.value)).not.toContain('MISSING');

    // The pinned ledger_read render reached the model: the brief, the
    // auto-derived revision row, and the task digest (all under the
    // delivered-wake pin) show; the lesson landed AFTER the pin and
    // stays out of this turn's bytes.
    const readReq = adapter.calls.at(-1);
    expect(readReq).toBeDefined();
    const render = lastToolResult<{
      brief?: { text: string };
      lessons: unknown[];
      revisionHistory: Array<{ rationale: string }>;
      taskDigests: Array<{ status: string }>;
    }>(readReq as NonNullable<typeof readReq>, (value) =>
      Array.isArray((value as { revisionHistory?: unknown } | undefined)?.revisionHistory),
    );
    expect(render?.brief?.text).toBe('collect the facts');
    expect(render?.revisionHistory[0]?.rationale).toBe('one worker');
    expect(render?.taskDigests[0]?.status).toBe('ok');
    expect(render?.lessons).toHaveLength(0);
  });
});
