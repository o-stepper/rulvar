/**
 * The subprocess reference executor: the shared conformance battery plus
 * end-to-end wiring through the engine, including the gate the epic
 * exists for, a hostile tool dispatched by the model cannot read the
 * host's ambient credentials.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineWorkflow } from '@rulvar/core';
import { createTestEngine, fakeToolCalls, type FakeCall } from '@rulvar/testing';
import { describe, expect, it } from 'vitest';
import {
  executorConformance,
  registerExecutorConformance,
} from './conformance.js';
import { ExecutorError, memoryEffectLedger } from './spi.js';
import { subprocessExecutor, subprocessTool } from './subprocess.js';

// The shared-contract battery, run against the subprocess reference.
registerExecutorConformance(
  executorConformance((cfg) => subprocessExecutor(cfg)),
  { describe, it },
);

const SCRIPTS = mkdtempSync(join(tmpdir(), 'rulvar-exec-tests-'));

/** Writes a CommonJS tool program and returns its path. */
function script(name: string, body: string): string {
  const path = join(SCRIPTS, name);
  writeFileSync(
    path,
    `let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{` +
      `const msg=JSON.parse(input||'{}');const args=msg.args||{};` +
      `const done=v=>{process.stdout.write(JSON.stringify(v));process.exit(0);};` +
      body +
      `});`,
    'utf8',
  );
  return path;
}

// Reports the child pid and whether it could read a host secret.
const PROBE = script(
  'probe.cjs',
  `done({ pid: process.pid, secret: process.env.RV216_ENGINE_SECRET ?? null });`,
);

// A sandbox launcher that ignores the wrapped command and answers itself,
// proving the wrapper argv sits in front of the tool command.
const WRAPPER = script(
  'wrapper.cjs',
  `done({ sandboxed: true, wrapped: process.argv[2] ?? null });`,
);

function lastToolResult(call: FakeCall): { result: unknown } | undefined {
  const messages = (call.req as { messages?: Array<{ parts?: Array<Record<string, unknown>> }> })
    .messages;
  const parts = (messages ?? []).flatMap((m) => m.parts ?? []);
  const found = [...parts].reverse().find((p) => p.type === 'tool-result');
  return found === undefined ? undefined : { result: found.result };
}

describe('subprocessTool + engine end-to-end (RV-216)', () => {
  it('dispatches a subprocess tool through the engine and returns its out-of-process result', async () => {
    const ledger = memoryEffectLedger();
    let toolResult: { pid?: number; secret?: unknown } | undefined;
    const probe = subprocessTool({
      name: 'probe',
      description: 'reports the executing process',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      command: process.execPath,
      args: [PROBE],
    });
    const engine = createTestEngine({
      agents: {
        '*': (call: FakeCall) => {
          const prior = lastToolResult(call);
          if (prior !== undefined) {
            toolResult = prior.result as { pid?: number; secret?: unknown };
            return 'done';
          }
          return fakeToolCalls({ name: 'probe', args: {} });
        },
      },
      executors: { subprocess: subprocessExecutor({ ledger }) },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('probe the host', { tools: [probe] });
    });
    const res = await engine.run(wf, undefined).result;
    expect(res.status).toBe('ok');
    expect(toolResult).toBeDefined();
    expect(typeof toolResult?.pid).toBe('number');
    // The tool ran in a child, not this process.
    expect(toolResult?.pid).not.toBe(process.pid);
    // One dispatch recorded through the executor's ledger.
    expect(ledger.entries()).toHaveLength(1);
    expect(ledger.entries()[0]?.tool).toBe('probe');
    expect(ledger.entries()[0]?.outcome).toBe('ok');
  });

  it('a model-dispatched tool cannot read a host secret (the gate)', async () => {
    process.env.RV216_ENGINE_SECRET = 'sk-live-DEADBEEF';
    try {
      let toolResult: { secret?: unknown } | undefined;
      const probe = subprocessTool({
        name: 'probe',
        description: 'reports the executing process',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
        command: process.execPath,
        args: [PROBE],
      });
      const engine = createTestEngine({
        agents: {
          '*': (call: FakeCall) => {
            const prior = lastToolResult(call);
            if (prior !== undefined) {
              toolResult = prior.result as { secret?: unknown };
              return 'done';
            }
            return fakeToolCalls({ name: 'probe', args: {} });
          },
        },
        executors: { subprocess: subprocessExecutor({}) },
      });
      const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
        await ctx.agent('read the secret', { tools: [probe] });
      });
      const res = await engine.run(wf, undefined).result;
      expect(res.status).toBe('ok');
      // The host secret was scrubbed: the tool saw null, not the value.
      expect(toolResult?.secret).toBeNull();
    } finally {
      delete process.env.RV216_ENGINE_SECRET;
    }
  });

  it('rejects an unregistered executor tag at spawn, before any provider call', async () => {
    const probe = subprocessTool({
      name: 'probe',
      description: 'x',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      command: process.execPath,
      args: [PROBE],
    });
    // No executors registered.
    const engine = createTestEngine({ agents: { '*': 'done' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('go', { tools: [probe] });
    });
    const res = await engine.run(wf, undefined).result;
    expect(res.status).toBe('error');
    expect(res.error?.code).toBe('config');
    expect(res.error?.message).toContain('no such executor is registered');
  });

  it('subprocessTool.execute throws if ever called in process (defense in depth)', async () => {
    const probe = subprocessTool({
      name: 'probe',
      description: 'x',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      command: process.execPath,
      args: [PROBE],
    });
    await expect(
      probe.execute({}, {
        runId: 'r',
        spanId: 's',
        agent: { agentType: 'a' },
        cwd: process.cwd(),
        isolation: 'none',
        signal: new AbortController().signal,
        log: () => undefined,
      }),
    ).rejects.toBeInstanceOf(ExecutorError);
  });

  it('prepends a sandbox launcher argv in front of the tool command', async () => {
    const executor = subprocessExecutor({
      sandbox: () => [process.execPath, WRAPPER],
    });
    const result = (await executor.run({
      executor: 'subprocess',
      tool: 'probe',
      args: {},
      spec: { command: process.execPath, args: [PROBE] },
      ctx: {
        runId: 'r',
        spanId: 's',
        agentType: 'a',
        idempotencyKey: 'k',
        signal: new AbortController().signal,
        log: () => undefined,
      },
    })) as { sandboxed?: boolean; wrapped?: string };
    expect(result.sandboxed).toBe(true);
    // The wrapper received the real tool command as its first argv.
    expect(result.wrapped).toBe(process.execPath);
  });
});
