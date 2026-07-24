/**
 * The executable executor conformance kit (RV-216): the shared-contract
 * battery every command-based ToolExecutorProvider must pass, mirroring
 * @rulvar/store-conformance. It drives a provider through the tool-program
 * protocol and asserts the isolation and durability properties the seam
 * promises, foremost the gate the epic exists for: a hostile tool cannot
 * read the host's ambient credentials.
 *
 * The subprocess reference executor passes it directly. A container or
 * microVM adapter passes it too when its runtime can run the kit's runner
 * (see the docker-gated container test), and additionally proves the
 * network and filesystem isolation only a container can enforce.
 *
 * Usage under Vitest:
 *
 *   const suite = executorConformance((cfg) => subprocessExecutor(cfg));
 *   registerExecutorConformance(suite, { describe, it });
 *
 * Docs: https://docs.rulvar.com/guide/isolated-executor.
 */
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IsolatedExecRequest, ToolExecutorProvider } from '@rulvar/core';
import { ExecutorError, memoryEffectLedger } from './spi.js';

/** The executor options the shared contract exercises. */
export interface ConformanceExecutorConfig {
  command: string;
  args: string[];
  allowEnv?: string[];
  credentials?: (request: IsolatedExecRequest) => Record<string, string>;
  timeoutMs?: number;
  maxOutputBytes?: number;
  ledger?: ReturnType<typeof memoryEffectLedger>;
}

/** Builds the provider under test from a shared-contract config. */
export type ConformanceExecutorFactory = (
  config: ConformanceExecutorConfig,
) => ToolExecutorProvider;

export interface ExecutorConformanceCheck {
  id: string;
  title: string;
  run(): Promise<void>;
}

export interface ExecutorConformanceSuite {
  name: string;
  checks: readonly ExecutorConformanceCheck[];
  run(): Promise<void>;
}

/** Structural subset of the Vitest/Jest registration API. */
export interface ExecutorTestRegistrar {
  describe(name: string, factory: () => void): void;
  it(name: string, fn: () => Promise<void>): void;
}

export function registerExecutorConformance(
  suite: ExecutorConformanceSuite,
  api: ExecutorTestRegistrar,
): void {
  api.describe(suite.name, () => {
    for (const check of suite.checks) {
      api.it(`${check.id}: ${check.title}`, () => check.run());
    }
  });
}

function ensure(condition: boolean, id: string, message: string): asserts condition {
  if (!condition) throw new Error(`executor-conformance ${id}: ${message}`);
}

// A single CommonJS runner interprets every behavior the kit needs, so a
// harness only has to run one command. It reads the protocol line on
// stdin, branches on args.behavior, and writes its JSON result to stdout.
const RUNNER_SOURCE = `
let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let msg;
  try { msg = JSON.parse(input || '{}'); } catch { process.stderr.write('bad protocol input'); process.exit(2); }
  const args = (msg && msg.args) || {};
  const done = (v) => { process.stdout.write(JSON.stringify(v)); process.exit(0); };
  switch (args.behavior) {
    case 'echo': return done({ tool: msg.tool, payload: args.payload ?? null, idempotencyKey: msg.idempotencyKey });
    case 'read-env': return done({ value: process.env[args.name] ?? null });
    case 'sleep': return setTimeout(() => done({ slept: true }), args.ms ?? 100000);
    case 'huge': {
      const chunk = 'x'.repeat(64 * 1024);
      for (let i = 0; i < (args.chunks ?? 128); i++) process.stdout.write(chunk);
      return;
    }
    case 'exit': { if (args.stderr) process.stderr.write(String(args.stderr)); return process.exit(args.code ?? 1); }
    case 'garbage': { process.stdout.write('this is not json'); return process.exit(0); }
    case 'workdir': {
      const fs = require('node:fs');
      const before = fs.readdirSync(process.cwd()).length;
      fs.writeFileSync('marker.txt', 'x');
      return done({ before });
    }
    default: return done({ unknown: args.behavior ?? null });
  }
});
`;

/**
 * Builds the conformance suite. `factory` produces the provider under
 * test from a shared config; the kit supplies the command (its own
 * runner, run by `runtime`, default the current Node) and the per-check
 * options.
 */
export function executorConformance(
  factory: ConformanceExecutorFactory,
  options: { runtime?: string } = {},
): ExecutorConformanceSuite {
  const runtime = options.runtime ?? process.execPath;
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-exec-conf-'));
  const runner = join(dir, 'runner.cjs');
  writeFileSync(runner, RUNNER_SOURCE, 'utf8');
  const baseArgs = [runner];

  const request = (
    tool: string,
    args: Record<string, unknown>,
    over: Partial<IsolatedExecRequest['ctx']> = {},
  ): IsolatedExecRequest => ({
    executor: 'subprocess',
    tool,
    args: args as IsolatedExecRequest['args'],
    spec: {},
    ctx: {
      runId: 'conf-run',
      spanId: 'conf-span',
      agentType: 'conf',
      idempotencyKey: 'conf-key',
      signal: new AbortController().signal,
      log: () => undefined,
      ...over,
    },
  });

  const asExecutorError = async (id: string, promise: Promise<unknown>): Promise<ExecutorError> => {
    try {
      await promise;
    } catch (err) {
      ensure(err instanceof ExecutorError, id, `expected ExecutorError, got ${String(err)}`);
      return err;
    }
    throw new Error(`executor-conformance ${id}: expected the dispatch to reject`);
  };

  const checks: ExecutorConformanceCheck[] = [
    {
      id: 'e1',
      title: 'round-trips the tool-program protocol (stdin args to stdout JSON result)',
      async run() {
        const provider = factory({ command: runtime, args: baseArgs });
        const result = (await provider.run(
          request('echo_tool', { behavior: 'echo', payload: { hello: 'world', n: 7 } }),
        )) as { tool: string; payload: unknown };
        ensure(result.tool === 'echo_tool', 'e1', 'the tool name did not reach the program');
        ensure(
          JSON.stringify(result.payload) === JSON.stringify({ hello: 'world', n: 7 }),
          'e1',
          'the arguments did not round-trip',
        );
      },
    },
    {
      id: 'e2',
      title: 'scrubs the host environment: a hostile tool cannot read a host secret',
      async run() {
        const secretName = 'RV_CONFORMANCE_SECRET';
        process.env[secretName] = 'sk-live-should-never-reach-a-tool';
        try {
          const provider = factory({ command: runtime, args: baseArgs });
          const result = (await provider.run(
            request('reader', { behavior: 'read-env', name: secretName }),
          )) as { value: string | null };
          ensure(
            result.value === null,
            'e2',
            `the host secret reached the tool (${String(result.value)}); the environment was not scrubbed`,
          );
        } finally {
          delete process.env[secretName];
        }
      },
    },
    {
      id: 'e3',
      title: 'honors the environment allowlist (a named var passes through)',
      async run() {
        const name = 'RV_CONFORMANCE_ALLOWED';
        process.env[name] = 'passed-through';
        try {
          const provider = factory({ command: runtime, args: baseArgs, allowEnv: [name] });
          const result = (await provider.run(
            request('reader', { behavior: 'read-env', name }),
          )) as { value: string | null };
          ensure(
            result.value === 'passed-through',
            'e3',
            'an allowlisted var did not pass through',
          );
        } finally {
          delete process.env[name];
        }
      },
    },
    {
      id: 'e4',
      title: 'injects per-call short-lived credentials',
      async run() {
        const provider = factory({
          command: runtime,
          args: baseArgs,
          credentials: () => ({ RV_CRED: 'minted-token' }),
        });
        const result = (await provider.run(
          request('reader', { behavior: 'read-env', name: 'RV_CRED' }),
        )) as { value: string | null };
        ensure(
          result.value === 'minted-token',
          'e4',
          'the minted credential did not reach the tool',
        );
      },
    },
    {
      id: 'e5',
      title: 'forwards the idempotency key to the tool',
      async run() {
        const provider = factory({ command: runtime, args: baseArgs });
        const result = (await provider.run(
          request(
            'reader',
            { behavior: 'read-env', name: 'RULVAR_IDEMPOTENCY_KEY' },
            { idempotencyKey: 'key-abc' },
          ),
        )) as { value: string | null };
        ensure(result.value === 'key-abc', 'e5', 'the idempotency key did not reach the tool');
      },
    },
    {
      id: 'e6',
      title: 'kills a tool that exceeds its wall-clock timeout',
      async run() {
        const provider = factory({ command: runtime, args: baseArgs, timeoutMs: 300 });
        const startedAt = Date.now();
        const err = await asExecutorError(
          'e6',
          provider.run(request('slow', { behavior: 'sleep', ms: 100000 })),
        );
        ensure(err.code === 'timeout', 'e6', `expected code 'timeout', got '${err.code}'`);
        ensure(Date.now() - startedAt < 5000, 'e6', 'the timeout did not fire promptly');
      },
    },
    {
      id: 'e7',
      title: 'bounds captured output and kills a runaway writer',
      async run() {
        const provider = factory({
          command: runtime,
          args: baseArgs,
          maxOutputBytes: 32 * 1024,
        });
        const err = await asExecutorError(
          'e7',
          provider.run(request('flood', { behavior: 'huge', chunks: 256 })),
        );
        ensure(err.code === 'output-cap', 'e7', `expected code 'output-cap', got '${err.code}'`);
      },
    },
    {
      id: 'e8',
      title: 'surfaces a non-zero exit as a typed error carrying the stderr tail',
      async run() {
        const provider = factory({ command: runtime, args: baseArgs });
        const err = await asExecutorError(
          'e8',
          provider.run(
            request('crasher', { behavior: 'exit', code: 3, stderr: 'boom-diagnostic' }),
          ),
        );
        ensure(err.code === 'exit', 'e8', `expected code 'exit', got '${err.code}'`);
        ensure(err.message.includes('boom-diagnostic'), 'e8', 'the stderr tail was not surfaced');
      },
    },
    {
      id: 'e9',
      title: 'rejects a tool that does not write a JSON result',
      async run() {
        const provider = factory({ command: runtime, args: baseArgs });
        const err = await asExecutorError(
          'e9',
          provider.run(request('sloppy', { behavior: 'garbage' })),
        );
        ensure(err.code === 'protocol', 'e9', `expected code 'protocol', got '${err.code}'`);
      },
    },
    {
      id: 'e10',
      title: 'gives each call a fresh, empty, ephemeral working directory',
      async run() {
        const ledger = memoryEffectLedger();
        const provider = factory({ command: runtime, args: baseArgs, ledger });
        const first = (await provider.run(request('w', { behavior: 'workdir' }))) as {
          before: number;
        };
        const second = (await provider.run(request('w', { behavior: 'workdir' }))) as {
          before: number;
        };
        ensure(first.before === 0, 'e10', 'the first workdir was not empty');
        ensure(second.before === 0, 'e10', 'the second call saw leftovers from the first');
        for (const record of ledger.entries()) {
          ensure(
            !existsSync(record.workdir),
            'e10',
            'the ephemeral workdir was not removed after the call',
          );
        }
      },
    },
    {
      id: 'e11',
      title: 'records every dispatch to the side-effect ledger',
      async run() {
        const ledger = memoryEffectLedger();
        const provider = factory({ command: runtime, args: baseArgs, ledger });
        await provider.run(
          request('ok_tool', { behavior: 'echo', payload: 1 }, { idempotencyKey: 'k-ok' }),
        );
        await asExecutorError(
          'e11',
          provider.run(
            request('bad_tool', { behavior: 'exit', code: 1 }, { idempotencyKey: 'k-bad' }),
          ),
        );
        const rows = ledger.entries();
        ensure(rows.length === 2, 'e11', `expected 2 ledger records, got ${rows.length}`);
        const ok = rows.find((r) => r.tool === 'ok_tool');
        const bad = rows.find((r) => r.tool === 'bad_tool');
        ensure(
          ok?.outcome === 'ok' && ok.idempotencyKey === 'k-ok',
          'e11',
          'the ok record is wrong',
        );
        ensure(bad?.outcome === 'error' && bad.exitCode === 1, 'e11', 'the error record is wrong');
        ensure(
          rows.every((r) => typeof r.argsHash === 'string' && r.argsHash.length === 64),
          'e11',
          'every record must carry a content argsHash',
        );
      },
    },
  ];

  return {
    name: 'executor conformance (RV-216 shared contract)',
    checks,
    async run() {
      for (const check of checks) await check.run();
    },
  };
}
