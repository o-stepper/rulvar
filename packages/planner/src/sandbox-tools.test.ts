/**
 * The sandbox dialect's tools contract (v1.17.0 review P1-3): a string
 * in `agent(..., { tools })` names a registered toolset from
 * `defaults.toolsets`, exactly as the API card teaches. Before this the
 * dialect REQUIRED strings and the core rejected every string, so the
 * documented construct could never run. The tests drive the real
 * worker sandbox end to end: lint, compile, run, tool execution,
 * replay, resume, and every typed preflight rejection.
 */
import { describe, expect, it } from 'vitest';

import { createEngine, InMemoryStore, tool, type Engine, type ToolDef } from '@rulvar/core';
import { FakeAdapter, FAKE_MODEL_REF, fakeToolCalls } from '@rulvar/testing';

import { compileScript } from './compile.js';
import { lintScript } from './plan.js';
import { WorkerSandboxRunner } from './sandbox-runner.js';

const WORKER_URL = new URL('../dist/sandbox-worker.js', import.meta.url);

const TOOLS_SOURCE = "return await agent('use the lookup', { tools: ['lookup-set'] });";

interface Fixture {
  engine: Engine;
  store: InMemoryStore;
  /** A second engine over the SAME store: the fresh-process replay shape. */
  makeEngine: () => Engine;
  providerCalls: () => number;
  toolExecutions: () => number;
}

function fixture(options?: { toolsets?: false; denyTool?: boolean; extraTool?: ToolDef }): Fixture {
  let providerCalls = 0;
  let toolExecutions = 0;
  const fake = new FakeAdapter({
    agents: {
      '*': (call) => {
        providerCalls += 1;
        // First loop turn calls the tool; the follow-up turn answers.
        return call.prompt.includes('use the lookup') && providerCalls === 1
          ? fakeToolCalls({ name: 'lookup', args: { q: 'x' } })
          : 'looked: found';
      },
    },
  });
  const lookup = tool({
    name: 'lookup',
    description: 'looks things up',
    parameters: { type: 'object', properties: { q: { type: 'string' } } },
    execute: () => {
      toolExecutions += 1;
      return Promise.resolve('found');
    },
  });
  const store = new InMemoryStore();
  const makeEngine = (): Engine =>
    createEngine({
      adapters: [fake],
      stores: { journal: store },
      runners: { sandbox: new WorkerSandboxRunner({ workerUrl: WORKER_URL }) },
      defaults: {
        routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
        ...(options?.denyTool === true ? { permissions: { deny: [{ tool: 'lookup' }] } } : {}),
        ...(options?.toolsets === false
          ? {}
          : {
              toolsets: {
                'lookup-set':
                  options?.extraTool === undefined ? [lookup] : [lookup, options.extraTool],
              },
            }),
      },
    });
  return {
    engine: makeEngine(),
    store,
    makeEngine,
    providerCalls: () => providerCalls,
    toolExecutions: () => toolExecutions,
  };
}

describe('sandbox registered toolset names (v1.17.0 review P1-3)', () => {
  it('the documented construct lints, compiles, runs, and executes the tool once', async () => {
    const { engine, providerCalls, toolExecutions } = fixture();
    expect(lintScript(TOOLS_SOURCE).errors).toEqual([]);
    const compiled = compileScript(TOOLS_SOURCE);
    const outcome = await engine.run(compiled, null, { name: 'tools', runId: 'tools-1' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('looked: found');
    expect(toolExecutions()).toBe(1);
    expect(providerCalls()).toBe(2);
  });

  it('replay folds the journal: no provider call and no tool side effect repeats', async () => {
    const { engine, makeEngine, providerCalls, toolExecutions } = fixture();
    const compiled = compileScript(TOOLS_SOURCE);
    const first = await engine.run(compiled, null, { name: 'tools', runId: 'tools-2' }).result;
    expect(first.status).toBe('ok');
    const callsAfterFirst = providerCalls();
    // A fresh engine over the same journal: the fresh-process replay
    // (resume of a finished run replays it to the same outcome).
    const replayed = await makeEngine().resume('tools-2', compiled).result;
    expect(replayed.status).toBe('ok');
    expect(replayed.value).toBe('looked: found');
    expect(providerCalls()).toBe(callsAfterFirst);
    expect(toolExecutions()).toBe(1);
  });

  it('resume after the tool result never repeats the side effect', async () => {
    const { engine, providerCalls, toolExecutions } = fixture();
    const compiled = compileScript(
      "const found = await agent('use the lookup', { tools: ['lookup-set'] });\n" +
        "const extra = await awaitExternal('approval');\n" +
        'return { found, extra };',
    );
    const first = engine.run(compiled, null, { name: 'tools', runId: 'tools-3' });
    const suspended = await first.result;
    expect(suspended.status).toBe('suspended');
    expect(toolExecutions()).toBe(1);
    const callsAfterFirst = providerCalls();

    // Settled-handle resolution appends the value; the fresh segment
    // then folds the whole journal, tool result included.
    await first.resolveExternal('approval', 'granted');
    const outcome = await engine.resume('tools-3', compiled).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ found: 'looked: found', extra: 'granted' });
    expect(toolExecutions()).toBe(1);
    expect(providerCalls()).toBe(callsAfterFirst);
  });

  it('an unknown name is a typed preflight error before any provider call', async () => {
    const { engine, providerCalls, toolExecutions } = fixture({ toolsets: false });
    const compiled = compileScript(TOOLS_SOURCE);
    const outcome = await engine.run(compiled, null, { name: 'tools', runId: 'tools-4' }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain("unknown registered toolset 'lookup-set'");
    expect(providerCalls()).toBe(0);
    expect(toolExecutions()).toBe(0);
  });

  it('a collision inside the named set is a typed preflight error', async () => {
    const clashing = tool({
      name: 'lookup',
      description: 'a second lookup with the same name',
      parameters: { type: 'object', properties: {} },
      execute: () => Promise.resolve('other'),
    });
    const { engine, providerCalls } = fixture({ extraTool: clashing });
    const compiled = compileScript(TOOLS_SOURCE);
    const outcome = await engine.run(compiled, null, { name: 'tools', runId: 'tools-5' }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain("duplicate tool name 'lookup'");
    expect(providerCalls()).toBe(0);
  });

  it('a denied permission blocks the execution without running the tool', async () => {
    const { engine, toolExecutions } = fixture({ denyTool: true });
    const compiled = compileScript(TOOLS_SOURCE);
    const handle = engine.run(compiled, null, { name: 'tools', runId: 'tools-6' });
    const denied: string[] = [];
    handle.on('tool:end', (event) => {
      if (event.outcome === 'denied') {
        denied.push(event.toolName);
      }
    });
    const outcome = await handle.result;
    // The model sees the typed policy denial as an error tool result
    // and the turn continues; the tool never executes.
    expect(outcome.status).toBe('ok');
    expect(toolExecutions()).toBe(0);
    expect(denied).toEqual(['lookup']);
  });
});
