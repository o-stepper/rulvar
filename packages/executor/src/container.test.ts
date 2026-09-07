/**
 * The container reference executor: the isolation a plain subprocess
 * cannot promise, proven against a real container runtime. Gated on
 * RULVAR_DOCKER_TESTS so CI hosts without docker skip cleanly; run locally
 * with `RULVAR_DOCKER_TESTS=1` and a docker daemon.
 *
 * The tool programs are busybox shell one-liners over the same
 * stdin/stdout protocol, so the image needs no Node.
 */
import { chmodSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { containerExecutor } from './container.js';
import {
  ExecutorError,
  memoryEffectLedger,
  type ToolEffectIntent,
  type ToolEffectLedger,
  type ToolEffectRecord,
} from './spi.js';
import { compileRegulatedProfile, type IsolatedExecRequest } from '@rulvar/core';

const RUN_DOCKER = process.env.RULVAR_DOCKER_TESTS === '1';
const IMAGE = process.env.RULVAR_DOCKER_IMAGE ?? 'busybox:1.36';
const DIGEST = `ghcr.io/acme/tool-sandbox@sha256:${'a'.repeat(64)}`;

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
    'host: process.env.RV_LEAKED ?? null,' +
    'scratch: process.env.RULVAR_SCRATCH ?? null' +
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

  it('records the intent before the container launch and the outcome after (RV404 twin)', async () => {
    const phases: string[] = [];
    const intents: ToolEffectIntent[] = [];
    const outcomes: ToolEffectRecord[] = [];
    const ledger: ToolEffectLedger = {
      intent(entry) {
        phases.push('intent');
        intents.push(entry);
      },
      record(entry) {
        phases.push('outcome');
        outcomes.push(entry);
      },
    };
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      daemonEnv: ['PATH'],
      ledger,
    });
    const result = (await executor.run(containerRequest('probe'))) as { tool: string | null };
    expect(result.tool).toBe('probe');
    expect(phases).toEqual(['intent', 'outcome']);
    expect(intents[0]?.idempotencyKey).toBe('stub-key');
    expect(intents[0]?.executor).toBe('container');
    expect(intents[0]?.argsHash).toBe(outcomes[0]?.argsHash);
    expect(intents[0]?.startedAt).toBe(outcomes[0]?.startedAt);
    expect(intents[0]?.workdir).toBe(outcomes[0]?.workdir);
    expect(outcomes[0]?.outcome).toBe('ok');
    // RV501: one attempt, one id, shared by both phases.
    expect(typeof intents[0]?.attemptId).toBe('string');
    expect(intents[0]?.attemptId).toBe(outcomes[0]?.attemptId);
  });

  it('removes the workdir and types the failure when the outcome record rejects (RV503 twin)', async () => {
    const workdirBase = mkdtempSync(join(tmpdir(), 'rulvar-crv503-'));
    const ledger: ToolEffectLedger = {
      record() {
        throw new Error('audit volume detached');
      },
    };
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      daemonEnv: ['PATH'],
      workdirBase,
      ledger,
    });
    await expect(executor.run(containerRequest('probe'))).rejects.toMatchObject({
      name: 'ExecutorError',
      code: 'ledger',
    });
    expect(readdirSync(workdirBase)).toHaveLength(0);
  });

  it('ledgers a pre-launch credentials failure as an error outcome, never ok', async () => {
    const ledger = memoryEffectLedger();
    const executor = containerExecutor({
      image: 'acme/img',
      docker: STUB,
      daemonEnv: ['PATH'],
      credentials: () => {
        throw new Error('vault unavailable');
      },
      ledger,
    });
    await expect(executor.run(containerRequest('probe'))).rejects.toThrow('vault unavailable');
    expect(ledger.entries()).toHaveLength(1);
    expect(ledger.entries()[0]?.outcome).toBe('error');
    expect(ledger.entries()[0]?.exitCode).toBeNull();
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

  it('ledgers a protocol failure at clean exit 0 as an error outcome, never ok (RV308, e12 direct)', async () => {
    // The direct container twin of conformance case e12 (judge P1.9):
    // the subprocess executor runs the shared battery, the container
    // executor only shared the source shape until now. The stub stands
    // in for docker, prints non-protocol garbage, and exits 0.
    const garbageStub = join(STUB_DIR, 'garbage-stub');
    writeFileSync(
      garbageStub,
      '#!/usr/bin/env node\n' +
        "process.stdin.resume();process.stdin.on('end',()=>{" +
        "process.stdout.write('this is not the protocol');process.exit(0);});",
      'utf8',
    );
    chmodSync(garbageStub, 0o755);
    const ledger = memoryEffectLedger();
    const executor = containerExecutor({
      image: 'acme/img',
      docker: garbageStub,
      daemonEnv: ['PATH'],
      ledger,
    });
    await expect(executor.run(containerRequest('sloppy'))).rejects.toMatchObject({
      name: 'ExecutorError',
      code: 'protocol',
    });
    const rows = ledger.entries();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.outcome).toBe('error');
    // The child itself exited clean; only its result violated the protocol.
    expect(rows[0]?.exitCode).toBe(0);
    expect(rows[0]?.executor).toBe('container');
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
      request(
        'ro',
        'if echo x > /rvtest 2>/dev/null; then printf \'{"wrote":true}\'; else printf \'{"wrote":false}\'; fi',
      ),
    )) as { wrote: boolean };
    expect(result.wrote).toBe(false);
  }, 60_000);

  it('gives the tool a writable ephemeral /work', async () => {
    const executor = containerExecutor({ image: IMAGE });
    const result = (await executor.run(
      request(
        'work',
        'echo hi > /work/f; printf \'{"work":"\'; tr -d "\\n" < /work/f; printf \'"}\'',
      ),
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
    await expect(
      executor.run(request('crash', 'echo boom-container >&2; exit 4')),
    ).rejects.toMatchObject({ name: 'ExecutorError', code: 'exit' });
    const rows = ledger.entries();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.outcome).toBe('error');
    expect(rows[0]?.executor).toBe('container');
  }, 60_000);

  it('ledgers a protocol failure at clean exit 0 as an error outcome against the real daemon (RV308)', async () => {
    const ledger = memoryEffectLedger();
    const executor = containerExecutor({ image: IMAGE, ledger });
    await expect(
      executor.run(request('sloppy', 'echo this-is-not-the-protocol')),
    ).rejects.toMatchObject({ name: 'ExecutorError', code: 'protocol' });
    const rows = ledger.entries();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.outcome).toBe('error');
    expect(rows[0]?.exitCode).toBe(0);
  }, 60_000);

  it('exposes ExecutorError for import ergonomics', () => {
    expect(new ExecutorError('config', 'x')).toBeInstanceOf(Error);
  });
});

describe('describeRegulatedPosture (RV4204, complete since RV4915)', () => {
  it('attests the ledger, the forwarded env, the ceilings, and the whole container seam', () => {
    const posture = containerExecutor({
      image: 'node:22-alpine',
      forwardEnv: ['CI'],
      network: 'none',
      timeoutMs: 10_000,
      extraDockerArgs: ['--label', 'team=acme'],
    }).describeRegulatedPosture?.();
    expect(posture).toEqual({
      regulatedPosture: 1,
      kind: 'tool-executor',
      name: 'container',
      ledger: false,
      allowEnv: ['CI'],
      bounds: { timeoutMs: 10_000, maxOutputBytes: 1024 * 1024 },
      isolation: {
        flavor: 'container',
        network: 'none',
        readOnlyRoot: true,
        image: 'node:22-alpine',
        capDrop: ['ALL'],
        memory: '256m',
        cpus: '1.0',
        pidsLimit: 128,
        workMount: '/work',
        scratchMount: '/scratch',
        extraDockerArgs: ['--label', 'team=acme'],
      },
    });
  });

  it('the real construction compiles under the regulated floor when hardened, and refuses by name when not', () => {
    const run = { budgetUsd: 5, scope: { tenant: 'acme' } };
    const compile = (options: Parameters<typeof containerExecutor>[0]) =>
      compileRegulatedProfile({
        engine: {
          adapters: [],
          executors: { container: containerExecutor({ ledger: memoryEffectLedger(), ...options }) },
        },
        run,
      });
    const compiled = compile({ image: DIGEST });
    expect(compiled.profileHash).toMatch(/^[0-9a-f]{64}$/);
    // A tagged image is not a pin.
    expect(() => compile({ image: 'ghcr.io/acme/tool:v3' })).toThrow(
      /construction\['container'\]\.isolation\.image/,
    );
    // A raw flag list is refused outright, not denylisted.
    expect(() => compile({ image: DIGEST, extraDockerArgs: ['--label', 'team=acme'] })).toThrow(
      /construction\['container'\]\.isolation\.extraDockerArgs must be empty/,
    );
    // The host network beneath a fingerprint that would read none.
    expect(() => compile({ image: DIGEST, network: 'host' })).toThrow(
      /construction\['container'\]\.isolation\.network must be 'none'/,
    );
    // The image moves the fingerprint.
    const other = compile({ image: `ghcr.io/acme/tool-sandbox@sha256:${'b'.repeat(64)}` });
    expect(other.profileHash).not.toBe(compiled.profileHash);
  });
});

function worktreeRequest(
  tool: string,
  cwd: string,
  spec?: IsolatedExecRequest['spec'],
): IsolatedExecRequest {
  return {
    executor: 'container',
    tool,
    args: {},
    spec: spec ?? { command: '/bin/true' },
    cwd,
    ctx: {
      runId: 'wt-run',
      spanId: 'wt-span',
      agentType: 'c',
      idempotencyKey: 'wt-key',
      signal: new AbortController().signal,
      log: () => undefined,
    },
  };
}

describe('the worktree cwd reaches the container (RV4914, stubbed docker)', () => {
  it('bind mounts the request cwd as the work mount, keeps the ephemeral dir as scratch, and ledgers the mount', async () => {
    const worktree = mkdtempSync(join(tmpdir(), 'rulvar-cwt-'));
    const workdirBase = mkdtempSync(join(tmpdir(), 'rulvar-cwt-scratch-'));
    const ledger = memoryEffectLedger();
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      daemonEnv: ['PATH'],
      workdirBase,
      ledger,
    });
    const result = (await executor.run(worktreeRequest('patch', worktree))) as {
      argv: string[];
      scratch: string | null;
    };
    const argv = result.argv.join(' ');
    // The worktree is the work mount and the working directory.
    expect(argv).toContain(`-v ${worktree}:/work -w /work`);
    // The ephemeral directory rides beside it as scratch, and the tool
    // program is told where.
    expect(argv).toMatch(new RegExp(`-v ${workdirBase}/rulvar-cexec-patch-\\S+:/scratch`));
    expect(argv).toContain('-e RULVAR_SCRATCH');
    expect(result.scratch).toBe('/scratch');
    // The extra flags still precede the image, and the hardening flags hold.
    expect(argv).toContain('--network none');
    expect(argv).toContain('--read-only');
    // Both ledger phases name the mount.
    expect(ledger.intents()).toHaveLength(1);
    expect(ledger.intents()[0]?.cwd).toBe(worktree);
    expect(ledger.intents()[0]?.workMount).toBe('/work');
    expect(ledger.entries()[0]?.cwd).toBe(worktree);
    expect(ledger.entries()[0]?.workMount).toBe('/work');
    // The scratch directory never survives the dispatch.
    expect(readdirSync(workdirBase)).toHaveLength(0);
  });

  it('a request without a cwd keeps the historical shape: one mount, no scratch, no ledger field', async () => {
    const ledger = memoryEffectLedger();
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      daemonEnv: ['PATH'],
      ledger,
    });
    const result = (await executor.run(containerRequest('plain'))) as {
      argv: string[];
      scratch: string | null;
    };
    const argv = result.argv.join(' ');
    expect(argv).toMatch(/-v \S+:\/work -w \/work/);
    expect(argv).not.toContain('/scratch');
    expect(argv).not.toContain('RULVAR_SCRATCH');
    expect(result.scratch).toBeNull();
    expect(Object.hasOwn(ledger.intents()[0] ?? {}, 'cwd')).toBe(false);
    expect(Object.hasOwn(ledger.entries()[0] ?? {}, 'cwd')).toBe(false);
    expect(Object.hasOwn(ledger.entries()[0] ?? {}, 'workMount')).toBe(false);
  });
});

describe('the extra flags precede the hardening flags (RV4915, stubbed docker)', () => {
  it('a hostile --network host, --memory and --read-only=false in extraDockerArgs are trailed by the fixed flags', async () => {
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      daemonEnv: ['PATH'],
      extraDockerArgs: ['--network', 'host', '--memory', '8g', '--read-only=false'],
    });
    const result = (await executor.run(containerRequest('probe'))) as { argv: string[] };
    const argv = result.argv;
    // The extras sit right after the subcommand, before every hardening flag.
    expect(argv.slice(0, 8)).toEqual([
      'run',
      '--rm',
      '-i',
      '--network',
      'host',
      '--memory',
      '8g',
      '--read-only=false',
    ]);
    // Each fixed flag is the LAST occurrence of its name, which is the one
    // docker resolves a single valued flag to.
    expect(argv[argv.lastIndexOf('--network') + 1]).toBe('none');
    expect(argv[argv.lastIndexOf('--memory') + 1]).toBe('256m');
    expect(argv.lastIndexOf('--read-only')).toBeGreaterThan(argv.indexOf('--read-only=false'));
    // The image still comes after everything.
    expect(argv.indexOf('acme/img:pinned')).toBeGreaterThan(argv.lastIndexOf('--cap-drop'));
  });

  it('with no extra flags the argv is byte identical to before', async () => {
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      daemonEnv: ['PATH'],
    });
    const result = (await executor.run(containerRequest('probe'))) as { argv: string[] };
    expect(result.argv.slice(0, 5)).toEqual(['run', '--rm', '-i', '--network', 'none']);
  });
});

describe('a per tool image on the executorSpec (RV4915, stubbed docker)', () => {
  it('a digest pinned executorSpec.image selects the image for that dispatch', async () => {
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      daemonEnv: ['PATH'],
    });
    const result = (await executor.run({
      ...containerRequest('pinned'),
      spec: { command: '/bin/true', image: DIGEST },
    })) as { argv: string[] };
    expect(result.argv).toContain(DIGEST);
    expect(result.argv).not.toContain('acme/img:pinned');
    expect(result.argv[result.argv.indexOf(DIGEST) + 1]).toBe('/bin/true');
  });

  it('a tagged executorSpec.image refuses typed before any launch: a tag is not a pin', async () => {
    const ledger = memoryEffectLedger();
    const workdirBase = mkdtempSync(join(tmpdir(), 'rulvar-cimg-'));
    const executor = containerExecutor({
      image: 'acme/img:pinned',
      docker: STUB,
      daemonEnv: ['PATH'],
      workdirBase,
      ledger,
    });
    await expect(
      executor.run({
        ...containerRequest('tagged'),
        spec: { command: '/bin/true', image: 'acme/img:latest' },
      }),
    ).rejects.toMatchObject({ name: 'ExecutorError', code: 'config' });
    // Refused before the workdir and before the ledger: nothing ran.
    expect(ledger.intents()).toHaveLength(0);
    expect(ledger.entries()).toHaveLength(0);
    expect(readdirSync(workdirBase)).toHaveLength(0);
  });
});

describe.skipIf(!RUN_DOCKER)(
  'the worktree cwd against the real daemon (RV4914, docker-gated)',
  () => {
    it('the tool writes into the mounted worktree and the scratch mount, and only the scratch dir is removed', async () => {
      const worktree = mkdtempSync(join(tmpdir(), 'rulvar-cwt-real-'));
      writeFileSync(join(worktree, 'seed.txt'), 'seed', 'utf8');
      const workdirBase = mkdtempSync(join(tmpdir(), 'rulvar-cwt-real-scratch-'));
      const executor = containerExecutor({ image: IMAGE, workdirBase });
      const result = (await executor.run(
        worktreeRequest('patch', worktree, {
          command: 'sh',
          args: [
            '-c',
            'cp /work/seed.txt /work/out.txt && echo scratch-ok > "$RULVAR_SCRATCH/s" && ' +
              'printf \'{"seed":"%s","scratch":"%s","pwd":"%s"}\' "$(cat /work/seed.txt)" ' +
              '"$(cat "$RULVAR_SCRATCH/s")" "$(pwd)"',
          ],
        }),
      )) as { seed: string; scratch: string; pwd: string };
      expect(result.seed).toBe('seed');
      expect(result.scratch).toBe('scratch-ok');
      expect(result.pwd).toBe('/work');
      // The write landed in the host worktree, where the patch is collected.
      expect(readFileSync(join(worktree, 'out.txt'), 'utf8')).toBe('seed');
      // The scratch directory did not survive the dispatch.
      expect(readdirSync(workdirBase)).toHaveLength(0);
    }, 60_000);

    it('a hostile extra flag is overridden by the trailing hardening flag (RV4915)', async () => {
      const executor = containerExecutor({
        image: IMAGE,
        extraDockerArgs: ['--read-only=false', '--memory', '8g'],
      });
      const result = (await executor.run(
        request(
          'hardened',
          'if echo x > /rvtest 2>/dev/null; then w=true; else w=false; fi; ' +
            'm=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || cat /sys/fs/cgroup/memory/memory.limit_in_bytes); ' +
            'printf \'{"wrote":%s,"memory":"%s"}\' "$w" "$m"',
        ),
      )) as { wrote: boolean; memory: string };
      expect(result.wrote).toBe(false);
      expect(result.memory).toBe(String(256 * 1024 * 1024));
    }, 60_000);
  },
);
