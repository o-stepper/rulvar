/**
 * The byAgentType vacuum fill (RV4206, the RV3905 phase precedent).
 * The sixth comparison run's cost report read `byAgentType` 100%
 * 'unknown' over a run whose every dispatch had a nameable stage: the
 * orchestrator's own coordination, composition, and judge dispatches
 * declare no profile, so the whole engine-owned skeleton folded into
 * the vacuum bucket. The fill is attribution policy, never identity:
 * a spawned profile keeps its own name, an explicit host name wins,
 * and the events keep their agentType untouched.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { createEngine } from './engine.js';
import { scriptedAdapter, type ScriptedTurn } from './test-harness.js';
import { makeOrchestratorWorkflow } from '../orchestrator/orchestrate.js';

const agentTypeOf = (req: ChatRequest): string =>
  (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ?? '';

const textOf = (req: ChatRequest): string =>
  req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');

const handlesIn = (req: ChatRequest): number[] => {
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
  return handles;
};

const FINAL = 'final: an audit-write failure does not mask success [src/exec.ts:260].';

describe('the orchestrator names its own dispatches in byAgentType (RV4206)', () => {
  it('fills coordination, composition, and both judges; workers keep their profile name', async () => {
    let orchTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return {
          text: 'A failed audit write does not mask success (`src/exec.ts:256-296`).',
          usage: { inputTokens: 100, outputTokens: 10 },
        };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read the span' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft before synthesis' } } };
    });
    const judge = scriptedAdapter(
      (req): ScriptedTurn => {
        if (textOf(req).includes('You audit CITATIONS')) {
          const rows = /"row":(\d+)/gu;
          const verdicts: { row: number; verdict: string; reason: string }[] = [];
          for (const match of textOf(req).matchAll(rows)) {
            verdicts.push({ row: Number(match[1]), verdict: 'supported', reason: 'entails' });
          }
          return {
            text: JSON.stringify({ verdicts }),
            usage: { inputTokens: 100, outputTokens: 10 },
          };
        }
        return {
          text: JSON.stringify({ contradictions: [] }),
          usage: { inputTokens: 100, outputTokens: 10 },
        };
      },
      { id: 'judge' },
    );
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: FINAL } },
        usage: { inputTokens: 100, outputTokens: 10 },
      }),
      { id: 'strong' },
    );
    const engine = createEngine({
      adapters: [coordination, judge, synthesis],
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
        profiles: { worker: { description: 'reads one span' } },
      },
    });
    const outcome = await engine.run(
      makeOrchestratorWorkflow('name the buckets', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        claimConsistency: { stage: 'final', judge: { model: 'judge:model' } },
        citationAudit: {
          resolve: () => 'the cited line, verbatim',
          judge: { model: 'judge:model' },
        },
      }),
      undefined,
    ).result;
    expect(outcome.status).toBe('ok');
    const byAgentType = outcome.cost.byAgentType;
    // The spawned profile keeps its own name; the engine-owned
    // skeleton names itself; the vacuum bucket is EMPTY.
    expect(byAgentType.worker).toBeGreaterThan(0);
    expect(byAgentType.orchestrator).toBeGreaterThan(0);
    expect(byAgentType.synthesizer).toBeGreaterThan(0);
    expect(byAgentType['claim-judge']).toBeGreaterThan(0);
    expect(byAgentType['citation-judge']).toBeGreaterThan(0);
    expect(byAgentType.unknown).toBeUndefined();
    // The breakdown still covers the total exactly.
    const sum = Object.values(byAgentType).reduce((acc, usd) => acc + usd, 0);
    expect(sum).toBeCloseTo(outcome.cost.totalUsd, 12);
  });
});
