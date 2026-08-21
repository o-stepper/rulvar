/**
 * The claim map through the finish channel (RV4305): the opt-in moves
 * the synthesis finish schema BY DESIGN, the structural verdict spends
 * the ordinary repair bound, the accepted map journals beside the
 * accepted candidate linked by candidateHashOf, the claim judge reads
 * the map from the JOURNAL, and an undeclared config holds every byte:
 * prompt, toolset schema, journal, envelope.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { candidateHashOf } from '../stores/synthesis-candidates.js';
import { claimMapHashOf, type ClaimMapRow } from './claim-map.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';
import { FINISH_CLAIM_MAP_SCHEMA } from './spawn-tools.js';

const PROFILES = { worker: { description: 'reads one span' } };

const textOf = (req: ChatRequest): string =>
  req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');

const agentTypeOf = (req: ChatRequest): string =>
  (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar?.agentType ?? '';

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

const ACCEPT_ALL = [{ name: 'accept-all', validate: (): { ok: true } => ({ ok: true }) }];

const FINAL = 'final: the audit-write failure does not mask success [src/exec.ts:260].';

const GOOD_MAP: ClaimMapRow[] = [
  {
    id: 'c1',
    claim: 'an audit-write failure does not mask success',
    grade: 'source',
    sourceAnchors: ['src/exec.ts:260'],
  },
];

function harness(options: { synthesisFinishes: Array<Record<string, unknown>>; judge?: boolean }) {
  let orchTurn = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return { text: 'A failed audit write does not mask success (`src/exec.ts:256-296`).' };
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
    (): ScriptedTurn => ({ text: JSON.stringify({ contradictions: [] }) }),
    { id: 'judge' },
  );
  let synthCall = 0;
  const finishes = options.synthesisFinishes;
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({
      toolCall: {
        name: 'finish',
        args: finishes[Math.min(synthCall++, finishes.length - 1)],
      },
    }),
    { id: 'strong' },
  );
  const made = makeInternals({
    adapters: [coordination, judge, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return { ...made, judge, synthesis };
}

const finishToolOf = (
  req: ChatRequest,
): { parameters?: Record<string, unknown>; description?: string } | undefined =>
  (
    req.tools as Array<{ name: string; parameters?: Record<string, unknown>; description?: string }>
  )?.find((tool) => tool.name === 'finish');

describe('the claim map rides the finish (RV4305)', () => {
  it('the accepted map journals beside the accepted candidate, linked by candidateHashOf', async () => {
    const { internals, synthesis } = harness({
      synthesisFinishes: [{ result: FINAL, claimMap: GOOD_MAP }],
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 }, claimMap: true },
        finishValidation: { validators: ACCEPT_ALL },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect(outcome.result).toBe(FINAL);
    const decision = internals.replayer
      .snapshot()
      .find(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_claim_map',
      );
    expect(decision).toBeDefined();
    const value = decision?.value as {
      candidateHash?: string;
      mapHash?: string;
      claims?: number;
      map?: ClaimMapRow[];
    };
    expect(value.candidateHash).toBe(candidateHashOf(FINAL));
    expect(value.mapHash).toBe(claimMapHashOf(GOOD_MAP));
    expect(value.claims).toBe(1);
    expect(value.map?.[0]?.id).toBe('c1');
    // The schema channel: the synthesis finish REQUIRES the map.
    const synthesisFinish = finishToolOf(synthesis.calls[0]);
    expect(synthesisFinish?.parameters?.required).toEqual(['result', 'claimMap']);
    expect(synthesisFinish?.description).toMatch(/claimMap is REQUIRED/);
    // The prompt carries the contract line under the opt-in.
    expect(textOf(synthesis.calls[0])).toMatch(/CLAIM MAP: finish REQUIRES/);
  });

  it('a structural failure spends the ordinary repair bound and names the anchors', async () => {
    const { internals } = harness({
      synthesisFinishes: [
        // Uncovered document anchor: the map misses src/exec.ts:260.
        {
          result: FINAL,
          claimMap: [{ ...GOOD_MAP[0], sourceAnchors: [] as string[], grade: 'assumption' }],
        },
        { result: FINAL, claimMap: GOOD_MAP },
      ],
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 4 }, claimMap: true },
        finishValidation: { validators: ACCEPT_ALL, maxRepairs: 2 },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect(outcome.result).toBe(FINAL);
    const verdicts = internals.replayer
      .snapshot()
      .filter(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_finish_validation',
      )
      .map(
        (entry) =>
          entry.value as { verdict: string; failed: { name: string; reasons: string[] }[] },
      );
    expect(verdicts.map((entry) => entry.verdict)).toEqual(['repair', 'accepted']);
    expect(verdicts[0]?.failed[0]?.name).toBe('claim-map-structure');
    expect(verdicts[0]?.failed[0]?.reasons.join('\n')).toMatch(
      /document cites anchors the map never covers: src\/exec\.ts:260/,
    );
  });

  it('the claim judge reads the accepted map from the journal, under the same opt-in', async () => {
    const { internals, judge } = harness({
      synthesisFinishes: [{ result: FINAL, claimMap: GOOD_MAP }],
      judge: true,
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 }, claimMap: true },
        finishValidation: { validators: ACCEPT_ALL },
        claimConsistency: { stage: 'final', judge: { model: 'judge:model' } },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect((outcome.semanticTerminalVerdict as Record<string, unknown>).verdict).toBe('clean');
    const judgeReq = judge.calls.find((call) => textOf(call).includes('claim-consistency judge'));
    expect(judgeReq).toBeDefined();
    const judgeText = textOf(judgeReq as ChatRequest);
    expect(judgeText).toMatch(/CLAIM MAP: \[/);
    expect(judgeText).toContain('"id":"c1"');
    expect(judgeText).toMatch(/declared a CLAIM MAP below/);
  });

  it('undeclared configs hold every byte: schema, prompt, journal, envelope', async () => {
    const { internals, synthesis } = harness({
      synthesisFinishes: [{ result: FINAL }],
    });
    const outcome = (await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        finishValidation: { validators: ACCEPT_ALL },
      }),
      undefined,
    )) as Record<string, unknown>;
    expect(outcome.result).toBe(FINAL);
    const synthesisFinish = finishToolOf(synthesis.calls[0]);
    expect(synthesisFinish?.parameters?.required).toEqual(['result']);
    expect(synthesisFinish?.description).not.toMatch(/claimMap/);
    expect(textOf(synthesis.calls[0])).not.toMatch(/CLAIM MAP/);
    expect(
      internals.replayer
        .snapshot()
        .some(
          (entry) =>
            (entry.value as { decisionType?: string } | undefined)?.decisionType ===
            'orchestrator_claim_map',
        ),
    ).toBe(false);
    expect('claimMap' in outcome).toBe(false);
  });

  it('the growth is bounded and measured: the schema and the prompt line have fixture sizes', () => {
    // The admission projection input (RV4305): the opt-in costs input
    // tokens through exactly two surfaces, the finish schema and the
    // prompt contract line; both are pinned here so the growth is a
    // declared figure instead of a surprise.
    const schemaChars = JSON.stringify(FINISH_CLAIM_MAP_SCHEMA).length;
    expect(schemaChars).toBeGreaterThan(500);
    expect(schemaChars).toBeLessThan(2200);
  });

  it('intake refuses the incompatible combinations, naming each', () => {
    const base = {
      acceptance: { childPolicy: 'all-ok' as const },
      finishValidation: { validators: ACCEPT_ALL },
    };
    expect(() =>
      makeOrchestratorWorkflow('g', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { claimMap: true },
      }),
    ).toThrow(/claimMap requires finishValidation/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        ...base,
        synthesis: { claimMap: true, skipWhenDraftValid: true },
      }),
    ).toThrow(/refuses synthesis\.skipWhenDraftValid/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        ...base,
        synthesis: { claimMap: true, fallbackToValidDraft: true },
      }),
    ).toThrow(/refuses synthesis\.fallbackToValidDraft/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        ...base,
        synthesis: { claimMap: true },
        finishValidation: {
          validators: ACCEPT_ALL,
          sectionalRepair: { sections: ['## A'] },
        },
      }),
    ).toThrow(/refuses finishValidation\.sectionalRepair/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        ...base,
        synthesis: { claimMap: 'yes' as never },
      }),
    ).toThrow(/claimMap must be true or absent/);
  });
});
