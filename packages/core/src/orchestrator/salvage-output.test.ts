/**
 * Terminal-output salvage (the 1.64.0 experiment review, P0.4 + P1.1).
 * Reproduced on published 1.64.0: a limit child whose finalization
 * reserve summary VALIDATED into typed output (journaled, replayable,
 * paid work since v1.60.0) was discarded by every orchestrator surface.
 * The digest said only 'tool budget exhausted: ...', the finish
 * validator children snapshot carried the same bare line, the evidence
 * pool excluded the child, and acceptance rejected the run even with
 * acceptPartialChildren set. These tests pin the contract: the digest
 * and get_child_result surface the output UNCONDITIONALLY (paid,
 * journaled evidence is never withheld), acceptance salvages the child
 * only under acceptValidatedTerminalOutputOnLimit (validated output
 * only: an invalid summary keeps output null and still rejects), the
 * output arm wins over the partial arm, evidencePreservedValidator
 * counts the salvaged child's citations only under the option, the
 * coordination prompt line appears only when the option is on, and an
 * engine-level resume replays the identical envelope with zero live
 * calls.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ChatRequest } from '../l0/messages.js';
import { ConfigError, FailRunError } from '../l0/errors.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { progressReportTool } from '../tools/progress.js';
import { tool } from '../tools/tool.js';
import { evidencePreservedValidator } from './finish-validators.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const ROUTING = { loop: 'fake:model', orchestrate: 'fake:model', extract: 'fake:model' } as const;

/** The reserve summary: valid against 'verdict', citing cache.ts:12. */
const SUMMARY = '{"verdict":"cache.ts:12 doubles at dawn","sources":1}';

const REPORT = {
  facts: ['moon-fact: the cache doubles at dawn'],
  evidence: ['cache.ts:12'],
  questions: ['who resets it?'],
};

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function lastUserTextOf(req: ChatRequest): string {
  for (let i = req.messages.length - 1; i >= 0; i -= 1) {
    const msg = req.messages[i];
    if (msg?.role === 'user') {
      const part = msg.parts.find((p) => p.type === 'text');
      return (part as { text?: string } | undefined)?.text ?? '';
    }
  }
  return '';
}

function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number; handles?: number[] };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
        if (Array.isArray(result?.handles)) {
          handles.push(...result.handles.filter((h): h is number => typeof h === 'number'));
        }
      }
    }
  }
  return handles;
}

const noop = () =>
  tool({
    name: 'noop',
    description: 'does nothing',
    parameters: z.strictObject({}),
    execute: () => Promise.resolve('noop'),
  });

/**
 * 'reserve' burns its one tool call with a batch of two, then answers
 * the reserve turn; 'reserveReporting' records a progress report first,
 * so its limit terminal carries BOTH a partial and an output.
 */
const PROFILES = {
  solid: { description: 'settles ok' },
  reserve: {
    description: 'burns the tool budget, then answers via the reserve',
    tools: [noop()],
    limits: { maxTurns: 8, maxToolCalls: 1, finalizationReserve: {} },
  },
  reserveReporting: {
    description: 'reports progress, burns out, then answers via the reserve',
    tools: [progressReportTool(), noop()],
    limits: { maxTurns: 8, maxToolCalls: 2, finalizationReserve: {} },
  },
};

const SCHEMAS = { verdict: z.strictObject({ verdict: z.string(), sources: z.number() }) };

/**
 * Coordination: spawn solid plus the given reserve profile (its spawn
 * declares outputSchemaRef 'verdict'), await both, finish. Captures the
 * first orchestrator prompt and the digest text the finish turn saw.
 */
function salvageOutputAdapter(
  reserveProfile: 'reserve' | 'reserveReporting',
  captures: { prompt?: string; digest?: string },
  summaryText: string = SUMMARY,
) {
  let orchTurn = 0;
  return scriptedAdapter((req): ScriptedTurn => {
    const agentType = agentTypeOf(req);
    if (agentType === 'solid') {
      return { text: 'solid evidence' };
    }
    if (agentType === 'reserve' || agentType === 'reserveReporting') {
      if (lastUserTextOf(req).includes('The tool budget is exhausted')) {
        return { text: summaryText };
      }
      const turn = req.messages.filter((msg) => msg.role === 'tool').length;
      if (agentType === 'reserveReporting' && turn === 0) {
        return { toolCall: { name: 'report_progress', args: REPORT } };
      }
      return {
        toolCalls: [
          { name: 'noop', args: {} },
          { name: 'noop', args: {} },
        ],
      };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      const text = req.messages[0]?.parts.find((part) => part.type === 'text');
      captures.prompt = (text as { text?: string } | undefined)?.text ?? '';
      return {
        toolCalls: [
          { name: 'spawn_agent', args: { agentType: 'solid', prompt: 'task A' } },
          {
            name: 'spawn_agent',
            args: { agentType: reserveProfile, prompt: 'task B', outputSchemaRef: 'verdict' },
          },
        ],
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    for (const msg of req.messages) {
      for (const part of msg.parts) {
        if (part.type === 'tool-result' && part.name === 'await_all') {
          captures.digest = JSON.stringify(part.result);
        }
      }
    }
    return { toolCall: { name: 'finish', args: { result: 'the merged report' } } };
  });
}

type Envelope = {
  result: unknown;
  completion: string;
  childStatusCounts: Record<string, number>;
  degradedReasons: string[];
  salvagedPartialChildren?: string[];
  salvagedTerminalOutputChildren?: string[];
};

describe('terminal-output salvage (P0.4 + P1.1)', () => {
  it('accepts a validated limit output under the option and lists it on the envelope', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals, store } = makeInternals({
      adapters: [salvageOutputAdapter('reserve', captures)],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', acceptValidatedTerminalOutputOnLimit: true },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as Envelope;
    expect(outcome.result).toBe('the merged report');
    expect(outcome.completion).toBe('partial');
    expect(outcome.childStatusCounts).toEqual({ ok: 1, limit: 1 });
    expect(outcome.salvagedTerminalOutputChildren).toHaveLength(1);
    expect(outcome.salvagedPartialChildren).toBeUndefined();
    expect(outcome.degradedReasons).toEqual([
      expect.stringContaining('accepted with its validated terminal output'),
    ]);
    // The digest the orchestrator saw carries the validated output.
    expect(captures.digest).toContain('final:');
    expect(captures.digest).toContain('cache.ts:12 doubles at dawn');
    // The salvage contract rides the coordination prompt.
    expect(captures.prompt).toContain('Terminal-output salvage is on');
    // ONE journaled decision carries the verdict AND the salvage list.
    const decisions = (await store.load('test-run')).filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
    );
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.value).toMatchObject({
      verdict: 'accepted',
      completion: 'partial',
      salvagedTerminalOutputChildren: outcome.salvagedTerminalOutputChildren,
    });
  });

  it('an invalid reserve summary keeps output null and still rejects', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals } = makeInternals({
      adapters: [salvageOutputAdapter('reserve', captures, 'not json at all')],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', acceptValidatedTerminalOutputOnLimit: true },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      completion?: string;
      salvagedTerminalOutputChildren?: string[];
      degradedReasons?: string[];
    };
    expect(data.completion).toBe('rejected');
    expect(data.salvagedTerminalOutputChildren).toBeUndefined();
    expect(data.degradedReasons?.some((reason) => reason.includes("settled 'limit'"))).toBe(true);
    // The digest never carried a 'final:' segment: output stayed null.
    expect(captures.digest).not.toContain('final:');
  });

  it('without the option the output does not salvage but the digest still carries it', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals } = makeInternals({
      adapters: [salvageOutputAdapter('reserve', captures)],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', acceptPartialChildren: true },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      salvagedTerminalOutputChildren?: unknown;
      degradedReasons?: string[];
    };
    expect(data.salvagedTerminalOutputChildren).toBeUndefined();
    // The evidence surfacing is unconditional (paid, journaled work);
    // only the acceptance fold and the prompt line are gated.
    expect(captures.digest).toContain('final:');
    expect(captures.prompt).not.toContain('Terminal-output salvage');
  });

  it('the output arm wins when both salvage options apply', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals } = makeInternals({
      adapters: [salvageOutputAdapter('reserveReporting', captures)],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: {
        childPolicy: 'all-ok',
        acceptPartialChildren: true,
        acceptValidatedTerminalOutputOnLimit: true,
      },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as Envelope;
    expect(outcome.completion).toBe('partial');
    expect(outcome.salvagedTerminalOutputChildren).toHaveLength(1);
    expect(outcome.salvagedPartialChildren).toBeUndefined();
    expect(outcome.degradedReasons).toEqual([
      expect.stringContaining('accepted with its validated terminal output'),
    ]);
    // The digest carries BOTH segments: the final output and the partial.
    expect(captures.digest).toContain('final:');
    expect(captures.digest).toContain('partial:');
  });

  it('minSuccessful counts an output-salvaged child toward the minimum', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals } = makeInternals({
      adapters: [salvageOutputAdapter('reserve', captures)],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: {
        childPolicy: { minSuccessful: 2 },
        acceptValidatedTerminalOutputOnLimit: true,
      },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as Envelope;
    expect(outcome.completion).toBe('partial');
    expect(outcome.salvagedTerminalOutputChildren).toHaveLength(1);
  });

  it('get_child_result pages the FULL output of a limit child', async () => {
    let orchTurn = 0;
    let pageContent = '';
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const agentType = agentTypeOf(req);
      if (agentType === 'reserve') {
        if (lastUserTextOf(req).includes('The tool budget is exhausted')) {
          return { text: SUMMARY };
        }
        return {
          toolCalls: [
            { name: 'noop', args: {} },
            { name: 'noop', args: {} },
          ],
        };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: 'reserve', prompt: 'task B', outputSchemaRef: 'verdict' },
          },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      if (orchTurn === 3) {
        return {
          toolCall: { name: 'get_child_result', args: { handle: handlesIn(req)[0] } },
        };
      }
      for (const msg of req.messages) {
        for (const part of msg.parts) {
          if (part.type === 'tool-result' && part.name === 'get_child_result') {
            pageContent = String((part.result as { content?: string }).content ?? '');
          }
        }
      }
      return { toolCall: { name: 'finish', args: { result: pageContent } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('salvage the study', { exposeChildResultTools: true });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as string;
    const page = JSON.parse(outcome) as {
      error: string;
      output: { verdict: string; sources: number };
    };
    expect(page.error).toContain('tool budget exhausted');
    expect(page.output).toEqual({ verdict: 'cache.ts:12 doubles at dawn', sources: 1 });
  });

  it('evidencePreservedValidator counts a salvaged child only when marked', () => {
    const validator = evidencePreservedValidator({ requireKnown: true });
    const salvagedChild = {
      handle: 7,
      nodeId: 'n2',
      status: 'limit',
      text: '{"error":"tool budget exhausted","output":{"verdict":"cache.ts:12 doubles"}}',
      salvageableOutput: true,
    };
    const unmarkedChild = { handle: 7, nodeId: 'n2', status: 'limit', text: salvagedChild.text };
    // Marked: the citation is pooled, so a finish that drops it rejects
    // and a finish that quotes it passes requireKnown.
    const dropped = validator.validate({
      result: 'summary without the citation',
      text: 'summary without the citation',
      children: [salvagedChild],
    });
    expect(dropped.ok).toBe(false);
    const quoted = validator.validate({
      result: 'summary citing cache.ts:12',
      text: 'summary citing cache.ts:12',
      children: [salvagedChild],
    });
    expect(quoted.ok).toBe(true);
    // Unmarked (the option is off): the pool is empty, so the dropped
    // finish passes vacuously and the quoting finish is flagged as
    // fabricating an unknown citation, exactly the published behavior.
    const droppedUnmarked = validator.validate({
      result: 'summary without the citation',
      text: 'summary without the citation',
      children: [unmarkedChild],
    });
    expect(droppedUnmarked.ok).toBe(true);
    const quotedUnmarked = validator.validate({
      result: 'summary citing cache.ts:12',
      text: 'summary citing cache.ts:12',
      children: [unmarkedChild],
    });
    expect(quotedUnmarked.ok).toBe(false);
  });

  it('the runtime marks salvageableOutput on the children snapshot only under the option', async () => {
    const run = async (acceptOutput: boolean) => {
      const captures: { prompt?: string; digest?: string } = {};
      let captured: readonly { nodeId: string; salvageableOutput?: boolean; text: string }[] = [];
      const { internals } = makeInternals({
        adapters: [salvageOutputAdapter('reserve', captures)],
        routing: ROUTING,
        profiles: PROFILES,
        schemas: SCHEMAS,
      });
      const wf = makeOrchestratorWorkflow('collect', {
        acceptance: {
          childPolicy: { minSuccessful: 1 },
          ...(acceptOutput ? { acceptValidatedTerminalOutputOnLimit: true } : {}),
        },
        finishValidation: {
          validators: [
            {
              name: 'capture',
              validate: (input) => {
                captured = input.children ?? [];
                return { ok: true };
              },
            },
          ],
        },
      });
      await executeWorkflow(internals, wf, undefined);
      return captured;
    };
    const marked = await run(true);
    expect(marked[1]?.salvageableOutput).toBe(true);
    expect(marked[1]?.text).toContain('cache.ts:12 doubles at dawn');
    const unmarked = await run(false);
    expect(unmarked[1]?.salvageableOutput).toBeUndefined();
    // The text itself is unconditional evidence either way.
    expect(unmarked[1]?.text).toContain('cache.ts:12 doubles at dawn');
  });

  it('requireEvidenceFloor unmarks the below-floor child on the children snapshot (RV1403)', async () => {
    // The prediction respects the binding floor exactly as the arms do
    // (RV1207): a below-floor child is never counted by acceptance, so
    // its text must not enter the validators' cited evidence pool as if
    // it were, and the same child stays marked when the floor is not
    // required.
    const run = async (requireFloor: boolean) => {
      const captures: { prompt?: string; digest?: string } = {};
      let captured: readonly {
        nodeId: string;
        status: string;
        salvageableOutput?: boolean;
      }[] = [];
      const { internals } = makeInternals({
        adapters: [salvageOutputAdapter('reserve', captures)],
        routing: ROUTING,
        profiles: {
          ...PROFILES,
          reserve: {
            ...PROFILES.reserve,
            evidenceContract: { minEntries: 2, enforce: 'warn' as const },
          },
        },
        schemas: SCHEMAS,
      });
      const wf = makeOrchestratorWorkflow('collect', {
        acceptance: {
          childPolicy: { minSuccessful: 1 },
          acceptValidatedTerminalOutputOnLimit: true,
          ...(requireFloor ? { requireEvidenceFloor: true } : {}),
        },
        finishValidation: {
          validators: [
            {
              name: 'capture',
              validate: (input) => {
                captured = input.children ?? [];
                return { ok: true };
              },
            },
          ],
        },
      });
      await executeWorkflow(internals, wf, undefined);
      return captured;
    };
    const floored = await run(true);
    expect(floored[1]?.status).toBe('limit');
    expect(floored[1]?.salvageableOutput).toBeUndefined();
    const waived = await run(false);
    expect(waived[1]?.salvageableOutput).toBe(true);
  });

  it('rejects a non-boolean acceptValidatedTerminalOutputOnLimit at intake', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        acceptance: {
          childPolicy: 'all-ok',
          acceptValidatedTerminalOutputOnLimit: 'yes' as unknown as boolean,
        },
      }),
    ).toThrow(ConfigError);
  });

  it('an engine-level resume replays the identical salvage envelope from the journaled decision', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const defaults = { routing: ROUTING, profiles: PROFILES, schemas: SCHEMAS };
    const wfOpts = {
      acceptance: { childPolicy: 'all-ok' as const, acceptValidatedTerminalOutputOnLimit: true },
    };
    const captures: { prompt?: string; digest?: string } = {};
    const engineA = createEngine({
      adapters: [salvageOutputAdapter('reserve', captures)],
      stores: { journal: store, transcripts },
      defaults,
    });
    const first = await engineA.run(makeOrchestratorWorkflow('collect', wfOpts), undefined, {
      runId: 'SALVAGE-OUTPUT',
    }).result;
    expect(first.status).toBe('ok');
    expect((first.value as Envelope).salvagedTerminalOutputChildren).toHaveLength(1);
    // The RunOutcome completion mirror (P0.5) binds the real acceptance
    // path: the lifted envelope rides the outcome itself.
    expect(first.completion).toBe('partial');
    expect(first.childStatusCounts).toEqual({ ok: 1, limit: 1 });

    const replayAdapter = salvageOutputAdapter('reserve', {});
    const engineB = createEngine({
      adapters: [replayAdapter],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engineB.resume(
      'SALVAGE-OUTPUT',
      makeOrchestratorWorkflow('collect', wfOpts),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toEqual(first.value);
    expect(resumed.completion).toBe('partial');
    // The envelope rolls forward from the ONE journaled acceptance
    // decision, and the settled run replays with ZERO adapter calls,
    // the limit child's journaled terminal value included.
    expect(replayAdapter.calls).toEqual([]);
  });
});

describe('the terminal-output acceptance floor (RV4704)', () => {
  // The eighth comparison experiment's first run: a limit child was
  // promoted as degraded-with-output on a 16-token finalize summary
  // that carried no answer, and the acceptance decision read
  // "validated terminal output" over bytes nobody could use.
  function plainSalvageAdapter(
    captures: { prompt?: string; digest?: string },
    summaryText: string,
  ) {
    let orchTurn = 0;
    return scriptedAdapter((req): ScriptedTurn => {
      const agentType = agentTypeOf(req);
      if (agentType === 'solid') {
        return { text: 'solid evidence' };
      }
      if (agentType === 'reserve') {
        if (lastUserTextOf(req).includes('The tool budget is exhausted')) {
          return { text: summaryText };
        }
        return {
          toolCalls: [
            { name: 'noop', args: {} },
            { name: 'noop', args: {} },
          ],
        };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        const text = req.messages[0]?.parts.find((part) => part.type === 'text');
        captures.prompt = (text as { text?: string } | undefined)?.text ?? '';
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'solid', prompt: 'task A' } },
            // No outputSchemaRef: the reserve summary lands as a PLAIN
            // STRING output, the eighth run's exact shape.
            { name: 'spawn_agent', args: { agentType: 'reserve', prompt: 'task B' } },
          ],
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'the merged report' } } };
    });
  }

  const SHORT_SUMMARY = 'inconclusive; ran out.';
  const CONTENTFUL_SUMMARY =
    'The cache doubles at dawn per cache.ts:12; writes reconcile before the audit row lands, ' +
    'and the retry ladder never re-enters a settled span.';

  it('a below-floor summary is a limit WITHOUT acceptance, its note naming the counts', async () => {
    const { internals } = makeInternals({
      adapters: [plainSalvageAdapter({}, SHORT_SUMMARY)],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', acceptValidatedTerminalOutputOnLimit: true },
    });
    const thrown = await executeWorkflow(internals, wf, undefined).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      degradedReasons?: string[];
      salvagedTerminalOutputChildren?: unknown;
    };
    expect(data.salvagedTerminalOutputChildren).toBeUndefined();
    const note = data.degradedReasons?.find((line) => line.includes('below the acceptance floor'));
    expect(note).toContain(`${String(SHORT_SUMMARY.trim().length)} of 80 characters`);
    expect(note).toContain('not accepted as validated output');
  });

  it('a contentful summary clears the default floor and salvages exactly as before', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals } = makeInternals({
      adapters: [plainSalvageAdapter(captures, CONTENTFUL_SUMMARY)],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', acceptValidatedTerminalOutputOnLimit: true },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as Envelope;
    expect(outcome.completion).toBe('partial');
    expect(outcome.salvagedTerminalOutputChildren).toHaveLength(1);
    // The coordination prompt states the floor the fold holds.
    expect(captures.prompt).toContain('80-character floor');
  });

  it('minTerminalOutputChars 0 restores the pre-RV4704 acceptance byte for byte', async () => {
    const { internals } = makeInternals({
      adapters: [plainSalvageAdapter({}, SHORT_SUMMARY)],
      routing: ROUTING,
      profiles: PROFILES,
      schemas: SCHEMAS,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: {
        childPolicy: 'all-ok',
        acceptValidatedTerminalOutputOnLimit: true,
        minTerminalOutputChars: 0,
      },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as Envelope;
    expect(outcome.completion).toBe('partial');
    expect(outcome.salvagedTerminalOutputChildren).toHaveLength(1);
  });

  it('a malformed floor refuses typed at construction', () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        acceptance: { childPolicy: 'all-ok', minTerminalOutputChars: -1 },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        acceptance: { childPolicy: 'all-ok', minTerminalOutputChars: 1.5 },
      }),
    ).toThrow(/minTerminalOutputChars/);
  });
});
