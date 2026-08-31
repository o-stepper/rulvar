/**
 * The digest fold (RV4807, the ninth experiment): a specialist starved
 * at its tool cap was invisible to the coordinator at await, so
 * nothing respawned or accepted the degradation knowingly. The digest
 * now folds the REPLAY-STABLE tool budget subset (`used` and `cap`
 * journal at the terminal per RV3002, `extensionsGranted` and
 * `finalizationWindowEntered` ride decision entries, `capHit` derives
 * from the durable pair); the live-only fidelity fields stay out, so
 * a digest folds byte-identically live and resumed.
 */
import { describe, expect, it } from 'vitest';

import type { AgentResult } from '../runtime/agent-loop.js';
import { digestOf, type SpawnRecord } from './handles.js';

const record: SpawnRecord = {
  handle: 7,
  spawnOrdinal: 0,
  nodeId: 'n0',
  logicalTaskId: 'lt-0',
  result: Promise.resolve({} as AgentResult<unknown>),
  abort: () => undefined,
};

function resultOf(overrides: Partial<AgentResult<unknown>>): AgentResult<unknown> {
  return {
    status: 'ok',
    output: 'done',
    costUsd: 0.1,
    usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
    ...overrides,
  } as AgentResult<unknown>;
}

describe('the digest tool budget subset (RV4807)', () => {
  it('a child without a tool budget folds byte identically to before', () => {
    const digest = digestOf(record, resultOf({}));
    expect('toolBudget' in digest).toBe(false);
  });

  it('the starved child surfaces used, cap, and the derived capHit', () => {
    const digest = digestOf(
      record,
      resultOf({
        status: 'limit',
        toolBudget: { used: 30, cap: 30, unitsUsed: 12, limiter: 'maxToolCalls' },
      }),
    );
    expect(digest.toolBudget).toEqual({ used: 30, cap: 30, capHit: true });
  });

  it('pressure below the cap carries no capHit, and decision-backed fields ride along', () => {
    const digest = digestOf(
      record,
      resultOf({
        toolBudget: {
          used: 4,
          cap: 10,
          extensionsGranted: 1,
          finalizationWindowEntered: true,
          noticesFired: [0.5],
        },
      }),
    );
    expect(digest.toolBudget).toEqual({
      used: 4,
      cap: 10,
      extensionsGranted: 1,
      finalizationWindowEntered: true,
    });
  });

  it('a units-only budget folds used without a cap or a capHit claim', () => {
    const digest = digestOf(
      record,
      resultOf({ toolBudget: { used: 3, unitsUsed: 9, unitsMax: 9 } }),
    );
    expect(digest.toolBudget).toEqual({ used: 3 });
  });
});
