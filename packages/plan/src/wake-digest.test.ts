import { describe, expect, it } from 'vitest';
import {
  createEngine,
  emptyDigestBlocks,
  InMemoryStore,
  WAKE_SUMMARY_RENDER_BUDGET_CHARS,
} from '@rulvar/core';
import type { ChatRequest, WakeDigest } from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned } from './plan-runner.js';
import { agentTypeOf, lastToolResult, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());

describe('WakeDigest final coordinated schema (M7-T13; docs/07, section 5)', () => {
  it('delivers every mandatory block in one coordinated shape', async () => {
    let delivered: WakeDigest | undefined;
    let phase = 0;
    const adapter = scriptedAdapter((req: ChatRequest): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return {
          text: 'a worker output long enough to exercise the render clamp deterministically',
        };
      }
      phase += 1;
      if (phase === 1) {
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
      if (phase === 2) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      delivered ??= lastToolResult<WakeDigest>(
        req,
        (value) => typeof (value as { digestSeq?: unknown } | undefined)?.digestSeq === 'number',
      );
      return { toolCall: { name: 'finish', args: { result: 'end' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'w' } },
      },
    });
    const handle = orchestratePlanned(engine, 'digest schema', {
      budget: { capUsd: 5, finalizeReserveUsd: 1 },
      renderBudgetChars: 24,
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(delivered).toBeDefined();
    const digest = delivered as WakeDigest;

    // The coordinated shape: every block present in ONE digest.
    expect(digest.digestSeq).toBe(1);
    expect(digest.planHash).toMatch(/^[0-9a-f]{64}$/);
    expect(digest.completedDigests).toHaveLength(1);
    expect(digest.escalations).toEqual([]);
    // DEF-2: the mandatory termination snapshot (spawn debited once).
    expect(digest.termination.spawnUnitsRemaining).toBe(127);
    expect(digest.termination.revisionUnitsRemaining).toBe(31);
    expect(digest.termination.phi).toBeGreaterThan(0);
    expect(Object.keys(digest.termination.perLineage)).toHaveLength(1);
    // DEF-7: the mandatory budget block.
    expect(digest.budget.orchestratorCapUsd).toBe(5);
    expect(digest.budget.finalizeReserveUsd).toBe(1);
    expect(digest.budget.softWarning).toBe(false);
    expect(digest.budget.orchestratorShare).toBeGreaterThanOrEqual(0);
    // DEF-5: the reuse stats block.
    expect(digest.reuse).toMatchObject({ abandonedUsd: 0, reclaimedUsd: 0, netLostUsd: 0 });
    // The deterministic render clamp (characters): the budget bounds the
    // WHOLE row, marker included (v1.35.0 review P2-2).
    expect(digest.completedDigests[0]?.outputSummary).toBe('a worker output long ...');
  });

  it('clamps outputSummary at the committed 400-char default (docs/06, Appendix A)', async () => {
    let delivered: WakeDigest | undefined;
    let phase = 0;
    const adapter = scriptedAdapter((req: ChatRequest): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'y'.repeat(3000) };
      }
      phase += 1;
      if (phase === 1) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
              rationale: 'one verbose worker',
            },
          },
        };
      }
      if (phase === 2) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      delivered ??= lastToolResult<WakeDigest>(
        req,
        (value) => typeof (value as { digestSeq?: unknown } | undefined)?.digestSeq === 'number',
      );
      return { toolCall: { name: 'finish', args: { result: 'end' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'w' } },
      },
    });
    // No renderBudgetChars: the engine default applies.
    const handle = orchestratePlanned(engine, 'default render budget', {
      budget: { capUsd: 5, finalizeReserveUsd: 1 },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const summary = (delivered as WakeDigest).completedDigests[0]?.outputSummary ?? '';
    // The budget is a HARD bound of the row, marker included (v1.35.0
    // review P2-2: the old render returned budget + 3).
    expect(summary).toBe(`${'y'.repeat(WAKE_SUMMARY_RENDER_BUDGET_CHARS - 3)}...`);
    expect(summary).toHaveLength(WAKE_SUMMARY_RENDER_BUDGET_CHARS);
    // The committed Appendix A value: one constant serves the
    // distillation cap and the render default.
    expect(WAKE_SUMMARY_RENDER_BUDGET_CHARS).toBe(400);
  });

  it('ships all-zero blocks outside PlanRunner (the CostReport convention)', () => {
    const blocks = emptyDigestBlocks();
    expect(blocks.planHash).toBe('');
    expect(blocks.termination.phi).toBe(0);
    expect(blocks.budget.orchestratorCapUsd).toBe(0);
    expect(blocks.budget.softWarning).toBe(false);
    expect(blocks.reuse.netLostUsd).toBe(0);
  });
});
