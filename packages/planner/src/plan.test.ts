import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatEvent, ChatRequest, Engine, ModelCaps, ProviderAdapter } from '@rulvar/core';
import { createEngine, JsonlFileStore, ScriptRejected } from '@rulvar/core';
import { FAKE_MODEL_REF, FakeAdapter, type FakeResponder } from '@rulvar/testing';
import { afterAll, describe, expect, it } from 'vitest';

import { extractScript, lintScript, plan, planRunIdOf, runPlanned } from './plan.js';
import { WorkerSandboxRunner } from './sandbox-runner.js';

const WORKER_URL = new URL('../dist/sandbox-worker.js', import.meta.url);

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const BAD_SCRIPT = [
  '```js',
  'const startedAt = Date.now();',
  "const result = await agent('work step');",
  'return { startedAt, result };',
  '```',
].join('\n');

const GOOD_SCRIPT = [
  '```js',
  'const startedAt = now();',
  "const result = await agent('work step');",
  'return { startedAt, result };',
  '```',
].join('\n');

function makeEngine(options: {
  planner: FakeResponder;
  store?: JsonlFileStore;
  withLoopRouting?: boolean;
}): { engine: Engine; adapter: FakeAdapter } {
  const planner = options.planner;
  const respond: FakeResponder = (call) =>
    call.prompt.includes('GOAL:')
      ? typeof planner === 'function'
        ? planner(call)
        : planner
      : 'worked';
  const adapter = new FakeAdapter({ agents: { '*': respond } });
  const engine = createEngine({
    adapters: [adapter],
    ...(options.store === undefined ? {} : { stores: { journal: options.store } }),
    defaults: {
      // Only the plan role routes by default: resolving the planner
      // conversation PROVES AgentOpts.role reached the resolution chain.
      routing: {
        plan: FAKE_MODEL_REF,
        ...(options.withLoopRouting === true ? { loop: FAKE_MODEL_REF } : {}),
      },
      profiles: {
        scout: { description: 'finds things' },
      },
    },
    runners: { sandbox: new WorkerSandboxRunner({ workerUrl: WORKER_URL }) },
  });
  return { engine, adapter };
}

describe('plan (M6-T05)', () => {
  it('round-trips a failing draft through the self-repair loop', async () => {
    const { engine, adapter } = makeEngine({
      planner: (call) => (call.prompt.includes('DIAGNOSTICS (JSON)') ? GOOD_SCRIPT : BAD_SCRIPT),
    });
    const planned = await plan(engine, 'summarize the repo');
    expect(planned.source).toContain('const startedAt = now();');
    expect(planned.source).not.toContain('Date.now');
    expect(planned.lint).toEqual([]);
    expect(planned.workflow.kind).toBe('compiled-workflow');

    // Exactly two drafts: the failing one and the repaired one.
    const plannerCalls = adapter.calls.filter((c) => c.prompt.includes('GOAL:'));
    expect(plannerCalls).toHaveLength(2);
    // The repair prompt carried the machine-readable diagnostics.
    expect(plannerCalls[1].prompt).toContain('DIAGNOSTICS (JSON)');
    expect(plannerCalls[1].prompt).toContain('rulvar/no-bare-date');
    // The cards ride every draft prompt.
    expect(plannerCalls[0].prompt).toContain('Available globals');
    expect(plannerCalls[0].prompt).toContain('scout: finds things');
  });

  it('replays the unchanged planning prefix free on re-plan', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-plan-'));
    tempDirs.push(dir);
    const store = new JsonlFileStore({ dir });
    const { engine, adapter } = makeEngine({
      planner: (call) => (call.prompt.includes('DIAGNOSTICS (JSON)') ? GOOD_SCRIPT : BAD_SCRIPT),
      store,
    });
    const first = await plan(engine, 'stable goal');
    expect(adapter.calls).toHaveLength(2);

    const second = await plan(engine, 'stable goal');
    expect(second.source).toBe(first.source);
    // Both drafts replayed from the journal: zero new model calls.
    expect(adapter.calls).toHaveLength(2);
  });

  it('exhausts repairRounds with a typed ScriptRejected carrying diagnostics', async () => {
    const { engine, adapter } = makeEngine({ planner: () => BAD_SCRIPT });
    let caught: unknown;
    try {
      await plan(engine, 'hopeless goal', { repairRounds: 1 });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ScriptRejected);
    expect(adapter.calls.filter((c) => c.prompt.includes('GOAL:'))).toHaveLength(2);
    const data = (caught as ScriptRejected).data as { error?: { data?: unknown } };
    expect(JSON.stringify(data)).toContain('no-bare-date');
  });

  it('stops on the first truncated empty draft instead of burning repair rounds', async () => {
    // A planner model whose whole output allowance goes to reasoning:
    // finish 'max-tokens' with no visible text (v1.9.0 follow-up
    // review). Source repair cannot fix a completion that contains no
    // source, so plan() must stop after ONE provider call and surface
    // the typed truncation, not compile/empty-source.
    const truncCaps: ModelCaps = {
      structuredOutput: 'prompt',
      supportsTemperature: false,
      supportsParallelTools: false,
      reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
    };
    const calls: ChatRequest[] = [];
    const adapter: ProviderAdapter & { calls: ChatRequest[] } = {
      id: 'trunc',
      calls,
      caps: () => truncCaps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
        calls.push(req);
        yield {
          type: 'finish',
          finish: { reason: 'max-tokens' },
          usage: { inputTokens: 50, outputTokens: 1_600, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
      },
    };
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { plan: 'trunc:model' } },
    });
    let caught: unknown;
    try {
      await plan(engine, 'truncated goal', { repairRounds: 3 });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ScriptRejected);
    // One provider call, never repairRounds + 1.
    expect(adapter.calls).toHaveLength(1);
    const data = (caught as ScriptRejected).data as {
      status?: string;
      error?: { message?: string; data?: { kind?: string; abortClass?: string } };
    };
    expect(data.status).toBe('error');
    expect(data.error?.data?.abortClass).toBe('output-truncated');
    expect(data.error?.message).toContain('output token allowance');
    expect(JSON.stringify(data)).not.toContain('empty-source');
  });

  it('runPlanned composes plan-then-run in the sandbox', async () => {
    const { engine } = makeEngine({
      planner: () => GOOD_SCRIPT,
      withLoopRouting: true,
    });
    const handle = await runPlanned(engine, 'do the work');
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const value = outcome.value as { startedAt: number; result: string };
    expect(value.result).toBe('worked');
    expect(typeof value.startedAt).toBe('number');
  });
});

describe('plan helpers', () => {
  it('planRunIdOf is deterministic and goal-scoped', () => {
    expect(planRunIdOf('a')).toBe(planRunIdOf('a'));
    expect(planRunIdOf('a')).not.toBe(planRunIdOf('b'));
    expect(planRunIdOf('a')).toMatch(/^plan-[0-9a-f]{24}$/);
  });

  it('extractScript takes the first fenced block or the whole reply', () => {
    expect(extractScript('```js\nreturn 1;\n```')).toBe('return 1;');
    expect(extractScript('```\nreturn 2;\n```')).toBe('return 2;');
    expect(extractScript('  return 3;  ')).toBe('return 3;');
    expect(extractScript('prose\n```js\nreturn 4;\n```\nmore prose')).toBe('return 4;');
  });

  it('lintScript maps wrapped lines back onto the body source', () => {
    const outcome = lintScript('const t = Date.now();\nreturn t;');
    expect(outcome.errors).toHaveLength(1);
    expect(outcome.errors[0]).toMatchObject({ ruleId: 'rulvar/no-bare-date', line: 1 });
    expect(outcome.workflow).toBeUndefined();
  });

  it('lintScript merges compile rejections with lint findings', () => {
    const outcome = lintScript("await import('node:fs');\nreturn 1;");
    expect(outcome.errors.map((e) => e.ruleId)).toContain('compile/disallowed-import');
  });

  it('lintScript accepts a clean body and returns the compiled workflow', () => {
    const outcome = lintScript("return step('x', () => 1);");
    expect(outcome.errors).toEqual([]);
    expect(outcome.workflow?.kind).toBe('compiled-workflow');
  });
});
