/**
 * The container reference executor: the isolation a plain subprocess
 * cannot promise, proven against a real container runtime. Gated on
 * RULVAR_DOCKER_TESTS so CI hosts without docker skip cleanly; run locally
 * with `RULVAR_DOCKER_TESTS=1` and a docker daemon.
 *
 * The tool programs are busybox shell one-liners over the same
 * stdin/stdout protocol, so the image needs no Node.
 */
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { containerExecutor } from './container.js';
import { ExecutorError, memoryEffectLedger } from './spi.js';
import type { IsolatedExecRequest } from '@rulvar/core';

const RUN_DOCKER = process.env.RULVAR_DOCKER_TESTS === '1';
const IMAGE = process.env.RULVAR_DOCKER_IMAGE ?? 'busybox:1.36';

// A stub standing in for the docker CLI: it reports the argv it was given
// and which forwarded env vars reached it, then answers the protocol. This
// exercises the container executor's flag assembly and env-forwarding
// end to end without a daemon, so the security flags are asserted even
// where docker is absent.
const STUB_DIR = mkdtempSync(join(tmpdir(), 'rulvar-docker-stub-'));
// An executable stub standing in for the `docker` binary (shebang so the
// OS runs it; PATH in daemonEnv lets `env` find node).
const STUB = join(STUB_DIR, 'docker-stub');
writeFileSync(
  STUB,
  '#!/usr/bin/env node\n' +
    "let i='';process.stdin.on('data',c=>i+=c);process.stdin.on('end',()=>{" +
    'process.stdout.write(JSON.stringify({' +
    'argv: process.argv.slice(2),' +
    'tool: process.env.RULVAR_TOOL ?? null,' +
    'idem: process.env.RULVAR_IDEMPOTENCY_KEY ?? null,' +
    'cred: process.env.RV_CRED ?? null,' +
    'host: process.env.RV_LEAKED ?? null' +
    '}));process.exit(0);});',
  'utf8',
);
chmodSync(STUB, 0o755);

function containerRequest(tool: string): IsolatedExecRequest {
  return {
    executor: 'container',
    tool,
    args: {},
    spec: { command: '/bin/true', args: ['--flag'] },
    ctx: {
      runId: 'stub-run',
      spanId: 'stub-span',
      agentType: 'c',
      idempotencyKey: 'stub-key',
      signal: new AbortController().signal,
      log: () => undefined,
    },
  };
}

describe('containerExecutor argv assembly (stubbed docker, no daemon)', () => {
  it('assembles the hardening flags, mounts /work, and forwards vars by name', async () => {
    const ledger = memoryEffectLedger();
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      credentials: () => ({ RV_CRED: 'minted' }),
      daemonEnv: ['PATH'],
      ledger,
    });
    const result = (await executor.run(containerRequest('probe'))) as {
      argv: string[];
      tool: string | null;
      idem: string | null;
      cred: string | null;
    };
    const argv = result.argv;
    // The docker subcommand and the hardening flags.
    expect(argv.slice(0, 4)).toEqual(['run', '--rm', '-i', '--network']);
    expect(argv).toContain('none');
    expect(argv).toContain('--read-only');
    expect(argv.join(' ')).toContain('--cap-drop ALL');
    expect(argv.join(' ')).toContain('--memory 256m');
    expect(argv.join(' ')).toContain('--pids-limit 128');
    // The workdir is mounted at /work and set as the workdir.
    expect(argv.join(' ')).toMatch(/-v \S+:\/work -w \/work/);
    // The image precedes the tool command and its args.
    const imageIdx = argv.indexOf('acme/img:pinned');
    expect(imageIdx).toBeGreaterThan(0);
    expect(argv[imageIdx + 1]).toBe('/bin/true');
    expect(argv[imageIdx + 2]).toBe('--flag');
    // RULVAR_* and the minted credential were forwarded by name (value in
    // the docker process env, not the argv).
    expect(argv.join(' ')).toContain('-e RULVAR_TOOL');
    expect(argv.join(' ')).toContain('-e RV_CRED');
    expect(result.tool).toBe('probe');
    expect(result.idem).toBe('stub-key');
    expect(result.cred).toBe('minted');
    // The dispatch was recorded.
    expect(ledger.entries()).toHaveLength(1);
    expect(ledger.entries()[0]?.executor).toBe('container');
  });

  it('does not forward an un-listed host var into the container process', async () => {
    process.env.RV_LEAKED = 'host-only';
    try {
      const executor = containerExecutor({
        image: 'acme/img',
        docker: STUB,
        daemonEnv: ['PATH'],
      });
      const result = (await executor.run(containerRequest('probe'))) as { host: string | null };
      // RV_LEAKED is neither daemon env, forwardEnv, nor a credential, so
      // the docker process (and thus the container) never sees it.
      expect(result.host).toBeNull();
    } finally {
      delete process.env.RV_LEAKED;
    }
  });

  it('surfaces a non-zero docker exit as a typed error', async () => {
    const exitStub = join(STUB_DIR, 'exit-stub');
    writeFileSync(
      exitStub,
      "#!/usr/bin/env node\nprocess.stderr.write('docker: boom');process.exit(5);",
      'utf8',
    );
    chmodSync(exitStub, 0o755);
    const executor = containerExecutor({
      image: 'acme/img',
      docker: exitStub,
      daemonEnv: ['PATH'],
    });
    await expect(executor.run(containerRequest('probe'))).rejects.toMatchObject({
      name: 'ExecutorError',
      code: 'exit',
    });
  });

  it('rejects a missing command with a typed config error', async () => {
    const executor = containerExecutor({ image: 'acme/img', docker: STUB, daemonEnv: ['PATH'] });
    await expect(
      executor.run({
        executor: 'container',
        tool: 'nocmd',
        args: {},
        spec: {},
        ctx: {
          runId: 'r',
          spanId: 's',
          agentType: 'c',
          idempotencyKey: 'k',
          signal: new AbortController().signal,
          log: () => undefined,
        },
      }),
    ).rejects.toMatchObject({ name: 'ExecutorError', code: 'config' });
  });
});

function request(tool: string, command: string): IsolatedExecRequest {
  return {
    executor: 'container',
    tool,
    args: {},
    spec: { command: 'sh', args: ['-c', command] },
    ctx: {
      runId: 'c-run',
      spanId: 'c-span',
      agentType: 'c',
      idempotencyKey: 'c-key',
      signal: new AbortController().signal,
      log: () => undefined,
    },
  };
}

describe.skipIf(!RUN_DOCKER)('containerExecutor (docker-gated, RV-216)', () => {
  it('round-trips the tool-program protocol', async () => {
    const executor = containerExecutor({ image: IMAGE });
    const result = (await executor.run(request('echo', 'printf \'{"ran":true}\''))) as {
      ran: boolean;
    };
    expect(result.ran).toBe(true);
  }, 60_000);

  it('drops the network entirely (an outbound connection fails)', async () => {
    const executor = containerExecutor({ image: IMAGE });
    const result = (await executor.run(
      request(
        'net',
        'if nc -w 2 8.8.8.8 53 </dev/null >/dev/null 2>&1; then printf \'{"reached":true}\'; else printf \'{"reached":false}\'; fi',
      ),
    )) as { reached: boolean };
    expect(result.reached).toBe(false);
  }, 60_000);

  it('mounts the root filesystem read-only', async () => {
    const executor = containerExecutor({ image: IMAGE });
    const result = (await executor.run(
      request('ro', 'if echo x > /rvtest 2>/dev/null; then printf \'{"wrote":true}\'; else printf \'{"wrote":false}\'; fi'),
    )) as { wrote: boolean };
    expect(result.wrote).toBe(false);
  }, 60_000);

  it('gives the tool a writable ephemeral /work', async () => {
    const executor = containerExecutor({ image: IMAGE });
    const result = (await executor.run(
      request('work', 'echo hi > /work/f; printf \'{"work":"\'; tr -d "\\n" < /work/f; printf \'"}\''),
    )) as { work: string };
    expect(result.work).toBe('hi');
  }, 60_000);

  it('scrubs the host environment (a host secret does not enter the container)', async () => {
    process.env.RV_CONTAINER_SECRET = 'sk-live-container';
    try {
      const executor = containerExecutor({ image: IMAGE });
      const result = (await executor.run(
        request('secret', 'printf \'{"secret":"%s"}\' "${RV_CONTAINER_SECRET:-null}"'),
      )) as { secret: string };
      expect(result.secret).toBe('null');
    } finally {
      delete process.env.RV_CONTAINER_SECRET;
    }
  }, 60_000);

  it('forwards per-call short-lived credentials into the container', async () => {
    const executor = containerExecutor({
      image: IMAGE,
      credentials: () => ({ RV_TOKEN: 'minted' }),
    });
    const result = (await executor.run(
      request('creds', 'printf \'{"token":"%s"}\' "${RV_TOKEN:-null}"'),
    )) as { token: string };
    expect(result.token).toBe('minted');
  }, 60_000);

  it('surfaces a non-zero exit as a typed error with the stderr tail and records the ledger', async () => {
    const ledger = memoryEffectLedger();
    const executor = containerExecutor({ image: IMAGE, ledger });
    await expect(executor.run(request('crash', 'echo boom-container >&2; exit 4'))).rejects.toMatchObject(
      { name: 'ExecutorError', code: 'exit' },
    );
    const rows = ledger.entries();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.outcome).toBe('error');
    expect(rows[0]?.executor).toBe('container');
  }, 60_000);

  it('exposes ExecutorError for import ergonomics', () => {
    expect(new ExecutorError('config', 'x')).toBeInstanceOf(Error);
  });
});
