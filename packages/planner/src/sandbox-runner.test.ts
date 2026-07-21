import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type {
  AgentProfile,
  CompiledWorkflow,
  Engine,
  JournalEntry,
  ToolsOption,
  TranscriptStore,
  Workflow,
} from '@rulvar/core';
import {
  ConfigError,
  createEngine,
  defineWorkflow,
  FileTranscriptStore,
  InMemoryStore,
  JsonlFileStore,
  tool,
} from '@rulvar/core';
import { FAKE_MODEL_REF, FakeAdapter } from '@rulvar/testing';
import { afterAll, describe, expect, it } from 'vitest';

import { ScriptRejected } from '@rulvar/core';

import { compileScript } from './compile.js';
import { WorkerSandboxRunner } from './sandbox-runner.js';

// Worker code executes from the built dist (worker_threads loads real
// .js); the repo builds before tests by convention.
const WORKER_URL = new URL('../dist/sandbox-worker.js', import.meta.url);

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeEngine(options?: {
  agents?: Record<string, unknown>;
  store?: InMemoryStore | JsonlFileStore;
  transcripts?: TranscriptStore;
  workflows?: Record<string, Workflow<never, unknown>>;
  profiles?: Record<string, AgentProfile>;
  toolsets?: Record<string, ToolsOption>;
  timeoutMs?: number;
  runner?: WorkerSandboxRunner;
}): { engine: Engine; store: InMemoryStore | JsonlFileStore; adapter: FakeAdapter } {
  const adapter = new FakeAdapter({
    agents: (options?.agents ?? { '*': 'fake answer' }) as ConstructorParameters<
      typeof FakeAdapter
    >[0]['agents'],
  });
  const store = options?.store ?? new InMemoryStore();
  const engine = createEngine({
    adapters: [adapter],
    stores: {
      journal: store,
      ...(options?.transcripts === undefined ? {} : { transcripts: options.transcripts }),
    },
    defaults: {
      routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
      ...(options?.workflows === undefined ? {} : { workflows: options.workflows }),
      ...(options?.profiles === undefined ? {} : { profiles: options.profiles }),
      ...(options?.toolsets === undefined ? {} : { toolsets: options.toolsets }),
    },
    runners: {
      sandbox:
        options?.runner ??
        new WorkerSandboxRunner({
          workerUrl: WORKER_URL,
          ...(options?.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
        }),
    },
  });
  return { engine, store, adapter };
}

describe('WorkerSandboxRunner constructor validation (v1.34.0 review P2-2/P2-3)', () => {
  it.each([Number.NaN, 0, -1, 1.5, 2_147_483_648])('refuses timeoutMs %s', (timeoutMs) => {
    // Above the Node timer maximum setTimeout clamps to 1 ms, so a
    // trivial worker was killed immediately with sandbox_limit; NaN and
    // friends now fail typed before any worker exists.
    expect(() => new WorkerSandboxRunner({ workerUrl: WORKER_URL, timeoutMs })).toThrow(
      ConfigError,
    );
    expect(() => new WorkerSandboxRunner({ workerUrl: WORKER_URL, timeoutMs })).toThrow(
      /timeoutMs must be an integer between 1 and 2147483647 ms/,
    );
  });

  it.each([Number.NaN, 0, -1, 1.5])('refuses memoryMb %s', (memoryMb) => {
    expect(() => new WorkerSandboxRunner({ workerUrl: WORKER_URL, memoryMb })).toThrow(
      /memoryMb must be a positive integer/,
    );
  });

  it('accepts the documented boundaries', () => {
    expect(
      () =>
        new WorkerSandboxRunner({ workerUrl: WORKER_URL, timeoutMs: 2_147_483_647, memoryMb: 1 }),
    ).not.toThrow();
  });
});

describe('WorkerSandboxRunner (M6-T02)', () => {
  it('executes a compiled workflow end to end through the engine', async () => {
    const { engine, store } = makeEngine({ agents: { '*': 'the verdict' } });
    const wf = compileScript(
      [
        "const a = await agent('judge this');",
        "const b = await step('decorate', () => a + '!');",
        'return { a, b };',
      ].join('\n'),
    );
    const outcome = await engine.run(wf, null).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ a: 'the verdict', b: 'the verdict!' });

    const entries = await store.load(
      (await store.listRuns()).find((m) => m.workflowName === 'compiled')?.runId ?? '',
    );
    expect(entries.some((e) => e.kind === 'agent' && e.status === 'ok')).toBe(true);
    expect(entries.some((e) => e.kind === 'step' && e.status === 'ok')).toBe(true);
  });

  it('refuses a traversal runId before persisting the compiled source (v1.36.0 review SEC-P1)', () => {
    // A compiled run persists its source at
    // transcripts.put(workflowSourceRef(runId)) as its FIRST store write,
    // ahead of the journal name guard. A runId of '..' used to write
    // '../workflow-source.bin' one level above the configured root. The
    // engine boundary now refuses the runId synchronously, before any
    // store side effect.
    const root = mkdtempSync(join(tmpdir(), 'sandbox-sec-'));
    tempDirs.push(root);
    const { engine } = makeEngine({
      store: new JsonlFileStore({ dir: join(root, 'journal') }),
      transcripts: new FileTranscriptStore({ dir: join(root, 'transcripts', 'base') }),
    });
    const wf = compileScript('return "done";');
    expect(() => engine.run(wf, null, { runId: '..' })).toThrow(ConfigError);
    expect(existsSync(join(root, 'transcripts', 'workflow-source.bin'))).toBe(false);
  });

  it('exposes exactly the docs global set and nothing else', async () => {
    const { engine } = makeEngine();
    const wf = compileScript(
      [
        'return {',
        '  agent: typeof agent, parallel: typeof parallel, pipeline: typeof pipeline,',
        '  step: typeof step, phase: typeof phase, log: typeof log,',
        '  budget: typeof budget, workflow: typeof workflow,',
        '  awaitExternal: typeof awaitExternal,',
        '  now: typeof now, random: typeof random, uuid: typeof uuid,',
        '  fetch: typeof fetch, process: typeof process,',
        '};',
      ].join('\n'),
    );
    const outcome = await engine.run(wf, null).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({
      agent: 'function',
      parallel: 'function',
      pipeline: 'function',
      step: 'function',
      phase: 'function',
      log: 'function',
      budget: 'object',
      workflow: 'function',
      awaitExternal: 'function',
      now: 'function',
      random: 'function',
      uuid: 'function',
      fetch: 'undefined',
      process: 'undefined',
    });
  });

  it('replaces Date.now with the seeded shim and journals its values', async () => {
    const { engine, store } = makeEngine();
    const wf = compileScript(
      [
        'const viaDateNow = Date.now();',
        'const viaNow = now();',
        'const viaMathRandom = Math.random();',
        'return { viaDateNow, viaNow, viaMathRandom };',
      ].join('\n'),
    );
    const handle = engine.run(wf, null, { runId: 'shim-run' });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const value = outcome.value as { viaDateNow: number; viaNow: number; viaMathRandom: number };
    // Seeded logical clock, not wall clock.
    expect(Math.abs(value.viaDateNow - Date.now())).toBeGreaterThan(1_000_000);

    const entries = await store.load('shim-run');
    const rands = entries.filter((e) => e.kind === 'rand');
    const nows = rands
      .filter((e) => (e.value as { subtype: string }).subtype === 'now')
      .map((e) => (e.value as { value: number }).value);
    // Both the Date.now replacement and the now() global journal as
    // ordinary rand entries with the generated values.
    expect(nows).toEqual([value.viaDateNow, value.viaNow]);
    const randoms = rands
      .filter((e) => (e.value as { subtype: string }).subtype === 'random')
      .map((e) => (e.value as { value: number }).value);
    expect(randoms).toEqual([value.viaMathRandom]);
  });

  it('produces identical journals across two fresh runs with one runId', async () => {
    const script = compileScript(
      [
        "const first = await agent('probe A');",
        "const both = await parallel([() => agent('branch 0'), () => agent('branch 1')]);",
        "const digest = await step('fold', () => [first, ...both].join(' | '), { deps: [now()] });",
        "log('info', 'progress ' + random());",
        'return { digest, id: uuid() };',
      ].join('\n'),
    );
    const normalize = (entries: readonly JournalEntry[]): unknown[] =>
      entries.map((entry) => {
        const copy: Record<string, unknown> = { ...entry };
        delete copy.startedAt;
        delete copy.endedAt;
        delete copy.spanId;
        delete copy.transcriptRef;
        delete copy.checkpointRef;
        return copy;
      });
    const runOnce = async (): Promise<unknown[]> => {
      const { engine, store } = makeEngine({
        agents: { '*': ({ prompt }: { prompt: string }) => `answer to ${prompt}` },
      });
      const outcome = await engine.run(script, null, { runId: 'det-1' }).result;
      expect(outcome.status).toBe('ok');
      return normalize(await store.load('det-1'));
    };
    const first = await runOnce();
    const second = await runOnce();
    expect(JSON.stringify(second, null, 2)).toBe(JSON.stringify(first, null, 2));
  });

  it('rejects a non-JSON value at the boundary with a typed error', async () => {
    const { engine } = makeEngine();
    const wf = compileScript(
      "return step('bad', () => ({ handler: () => 'functions never cross' }));",
    );
    const outcome = await engine.run(wf, null).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toMatch(/JSON-serializable/);
  });

  it('rejects a function smuggled into agent options at the call site', async () => {
    const { engine } = makeEngine();
    const wf = compileScript("return agent('x', { onError: () => 'nope' });");
    const outcome = await engine.run(wf, null).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toMatch(/JSON-serializable/);
  });

  it('proxies workflow by registered name and budget through the facade', async () => {
    const echo: Workflow<{ item: string }, string> = defineWorkflow(
      { name: 'echo' },
      (childCtx, args) => childCtx.step('echo', () => `child saw ${args.item}`),
    );
    const { engine } = makeEngine({
      workflows: { echo: echo as unknown as Workflow<never, unknown> },
    });
    const wf = compileScript(
      [
        "const child = await workflow('echo', { item: 'from sandbox' });",
        'const spent = await budget.spent();',
        'return { child, spawns: spent.agentsSpawned };',
      ].join('\n'),
    );
    const outcome = await engine.run(wf, null).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ child: 'child saw from sandbox', spawns: 1 });
  });

  it('suspends on awaitExternal and resumes WITHOUT the workflow value', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sandbox-'));
    tempDirs.push(dir);
    const store = new JsonlFileStore({ dir: join(dir, 'journal') });
    const transcripts = new FileTranscriptStore({ dir: join(dir, 'transcripts') });
    const first = makeEngine({ store, transcripts, agents: { '*': 'paid answer' } });
    const wf = compileScript(
      [
        "const paid = await agent('expensive prefix');",
        "const answer = await awaitExternal('question', { prompt: 'need input' });",
        "return paid + ' then ' + answer;",
      ].join('\n'),
    );
    const outcome = await first.engine.run(wf, null, { runId: 'suspend-1' }).result;
    expect(outcome.status).toBe('suspended');
    expect(outcome.pending.map((p) => p.key)).toEqual(['question']);
    const meta = (await store.listRuns()).find((m) => m.runId === 'suspend-1');
    expect(meta?.workflowSourceRef).toBe('suspend-1/workflow-source');
    expect(meta?.workflowName).toBe('compiled');

    // A fresh engine (fresh adapter): resume rehydrates the persisted
    // source, replays the paid prefix without a live call, and the
    // resolution completes the script.
    // The canonical ops loop (CLI driveRun): resume bare, resolve against
    // the settled handle (the resolution journals), resume again.
    const second = makeEngine({ store, transcripts, agents: { '*': 'MUST NOT BE CALLED' } });
    const resumedOnce = second.engine.resume('suspend-1');
    const suspendedAgain = await resumedOnce.result;
    expect(suspendedAgain.status).toBe('suspended');
    expect(suspendedAgain.pending.map((p) => p.key)).toEqual(['question']);
    const resolution = await resumedOnce.resolveExternal('question', '42');
    expect(resolution.applied).toBe(true);

    const resumedTwice = second.engine.resume('suspend-1');
    const finalOutcome = await resumedTwice.result;
    expect(finalOutcome.status).toBe('ok');
    expect(finalOutcome.value).toBe('paid answer then 42');
    // The paid prefix replayed: the fresh adapter never served a call.
    expect(second.adapter.calls).toHaveLength(0);
  });

  it('rejects resume with a compiled workflow whose source hash differs', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sandbox-'));
    tempDirs.push(dir);
    const store = new JsonlFileStore({ dir: join(dir, 'journal') });
    const transcripts = new FileTranscriptStore({ dir: join(dir, 'transcripts') });
    const first = makeEngine({ store, transcripts });
    const wf = compileScript("return awaitExternal('x');");
    const outcome = await first.engine.run(wf, null, { runId: 'mismatch-1' }).result;
    expect(outcome.status).toBe('suspended');

    const second = makeEngine({ store, transcripts });
    const other = compileScript("return 'entirely different';");
    await expect(second.engine.resume('mismatch-1', other).result).rejects.toThrow(ConfigError);
  });

  it('terminates the worker on timeout with the typed SandboxError', async () => {
    const { engine } = makeEngine({ timeoutMs: 300 });
    const wf = compileScript('await new Promise(() => {});\nreturn 1;');
    const outcome = await engine.run(wf, null).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error).toMatchObject({ code: 'sandbox_limit' });
    expect(outcome.error?.data).toMatchObject({ reason: 'timeout', limit: 300 });
  });

  it('requires a registered sandbox runner for compiled workflows', () => {
    const engine = createEngine({ adapters: [] });
    const wf = compileScript('return 1;');
    expect(() => engine.run(wf, null)).toThrow(ConfigError);
  });

  it('keeps closure-to-sandbox a compile-time type error', () => {
    const closure = defineWorkflow({ name: 'closure' }, () => Promise.resolve(1));
    const runner = new WorkerSandboxRunner({ workerUrl: WORKER_URL });
    const never = (): void => {
      // @ts-expect-error a closure Workflow is not admissible to the sandbox
      void runner.execute(closure, undefined as never, undefined);
    };
    expect(typeof never).toBe('function');

    const compiled: CompiledWorkflow = compileScript('return 1;');
    expect(compiled.kind).toBe('compiled-workflow');
  });
});

describe('the allowImports contract end to end (v1.22.0 review P2-7)', () => {
  it('an allowlisted literal dynamic import executes; the default rejects it at compile', async () => {
    // Mirrors docs/guide/planner.md: allowImports is a host trust
    // decision; the ONLY import shape it unlocks is a literal
    // `await import('specifier')` with an allowlisted specifier.
    const source = "const os = await import('node:os'); return typeof os.cpus;";
    expect(() => compileScript(source)).toThrow(ScriptRejected);
    const allowed = compileScript(source, { allowImports: ['node:os'] });
    const { engine } = makeEngine();
    const outcome = await engine.run(allowed, null, { runId: 'imports-e2e' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('function');
  });
});

describe('tools strings resolve as registered toolsets in the dialect (v1.23.0 review P2-1)', () => {
  const lookup = tool({
    name: 'lookup_web',
    description: 'test lookup tool',
    parameters: { type: 'object' },
    execute: () => Promise.resolve('looked-up'),
  });
  const profiles = { analyst: { description: 'analyzes things', tools: ['lookup'] } };
  const toolsets = { lookup: [lookup] };

  it('a registered toolset name with an agentType profile succeeds end to end', async () => {
    const { engine, adapter } = makeEngine({
      agents: { '*': 'used the toolset' },
      profiles,
      toolsets,
    });
    const wf = compileScript(
      "return agent('use the registered toolset', { agentType: 'analyst', tools: ['lookup'] });",
    );
    const outcome = await engine.run(wf, null).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('used the toolset');
    expect(adapter.calls.length).toBeGreaterThan(0);
  });

  it('a profile name in tools is a typed pre-call ConfigError with zero provider calls', async () => {
    const { engine, adapter } = makeEngine({
      agents: { '*': 'MUST NOT BE CALLED' },
      profiles,
      toolsets,
    });
    const wf = compileScript("return agent('misuse the profile name', { tools: ['analyst'] });");
    const outcome = await engine.run(wf, null).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('config');
    expect(outcome.error?.message).toContain("unknown registered toolset 'analyst'");
    expect(adapter.calls).toHaveLength(0);
  });
});

describe('worker execArgv isolation (v1.24.1 review P2-2)', () => {
  // A worker that speaks the runner's init protocol and reports its own
  // execArgv as the run value: the test observes exactly what the
  // worker booted with.
  function echoArgvRunner(execArgv?: readonly string[]): WorkerSandboxRunner {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-execargv-'));
    tempDirs.push(dir);
    const workerPath = join(dir, 'echo-execargv-worker.mjs');
    writeFileSync(
      workerPath,
      "import { parentPort } from 'node:worker_threads';\n" +
        "parentPort.on('message', (message) => {\n" +
        "  if (message.t === 'init') {\n" +
        "    message.port.postMessage({ t: 'done', value: process.execArgv });\n" +
        '  }\n' +
        '});\n',
    );
    return new WorkerSandboxRunner({
      workerUrl: pathToFileURL(workerPath),
      ...(execArgv === undefined ? {} : { execArgv }),
    });
  }

  it('the worker boots with an empty execArgv by default, never the host list', async () => {
    const { engine } = makeEngine({ runner: echoArgvRunner() });
    const outcome = await engine.run(compileScript('return 0;'), null).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual([]);
  });

  it('an opt-in execArgv list reaches the worker verbatim', async () => {
    const { engine } = makeEngine({ runner: echoArgvRunner(['--no-warnings']) });
    const outcome = await engine.run(compileScript('return 0;'), null).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual(['--no-warnings']);
  });

  // The real launch modes the inherited execArgv killed: the same host
  // code runs the same compiled workflow from a file, from ESM stdin,
  // and via ESM --eval. Before the isolation the last two failed at
  // worker boot ("--input-type can only be used with string input")
  // ahead of the first sandbox operation.
  const HOST_SOURCE = [
    `const core = await import(${JSON.stringify(new URL('../../core/dist/index.js', import.meta.url).href)});`,
    `const testing = await import(${JSON.stringify(new URL('../../testing/dist/index.js', import.meta.url).href)});`,
    `const planner = await import(${JSON.stringify(new URL('../dist/index.js', import.meta.url).href)});`,
    "const adapter = new testing.FakeAdapter({ agents: { '*': 'x' } });",
    'const engine = core.createEngine({',
    '  adapters: [adapter],',
    '  defaults: { routing: { loop: testing.FAKE_MODEL_REF, extract: testing.FAKE_MODEL_REF } },',
    `  runners: { sandbox: new planner.WorkerSandboxRunner({ workerUrl: new URL(${JSON.stringify(WORKER_URL.href)}) }) },`,
    '});',
    'const outcome = await engine.run(planner.compileScript("return \'sandbox-ran\';"), null).result;',
    'console.log(JSON.stringify({ status: outcome.status, value: outcome.value ?? null, message: outcome.error ? outcome.error.message : null }));',
  ].join('\n');

  interface HostReport {
    status: string;
    value: unknown;
    message: string | null;
  }

  function launch(argv: string[], input?: string): HostReport {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.OPENAI_API_KEY;
    const child = spawnSync(process.execPath, argv, {
      encoding: 'utf8',
      env,
      ...(input === undefined ? {} : { input }),
    });
    // On failure the object diff surfaces the child's stderr.
    expect({ status: child.status, stderr: child.status === 0 ? '' : child.stderr }).toEqual({
      status: 0,
      stderr: '',
    });
    return JSON.parse(child.stdout.trim().split('\n').at(-1) as string) as HostReport;
  }

  it('the compiled workflow succeeds when the host runs from a file', { timeout: 20_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-host-'));
    tempDirs.push(dir);
    const hostPath = join(dir, 'host.mjs');
    writeFileSync(hostPath, HOST_SOURCE);
    expect(launch([hostPath])).toEqual({ status: 'ok', value: 'sandbox-ran', message: null });
  });

  it('the same host succeeds via ESM stdin (--input-type=module)', { timeout: 20_000 }, () => {
    expect(launch(['--input-type=module'], HOST_SOURCE)).toEqual({
      status: 'ok',
      value: 'sandbox-ran',
      message: null,
    });
  });

  it('the same host succeeds via ESM --eval', { timeout: 20_000 }, () => {
    expect(launch(['--input-type=module', '--eval', HOST_SOURCE])).toEqual({
      status: 'ok',
      value: 'sandbox-ran',
      message: null,
    });
  });
});
