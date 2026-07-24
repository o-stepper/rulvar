---
title: Isolated executor
description: "Running tool work out of process so hostile or model-generated scripts cannot reach host capabilities: the ToolExecutorProvider seam, the subprocess and container reference adapters, per-call credentials and the side-effect ledger, and the executable conformance kit."
---

# Isolated executor

An in-process tool is an ordinary function call. It runs in the engine's process with the engine's full capabilities: its `execute` closure can read `process.env`, open any file the host user can, and reach the network. That is exactly right for a tool you wrote and trust, and it is the wrong place to run a script the model generated or a payload a user supplied. The gate this page serves: **a hostile script cannot reach host capabilities.**

The division of labor is deliberate:

| Tool input | Executor | Why |
|---|---|---|
| Trusted (you wrote it) | **`'inprocess'`** (default) | A function call. No process boundary, no marshaling; the [permission chain](/guide/tools#the-permission-chain) governs whether it is dispatched, isolation is not the concern. |
| Untrusted (a code interpreter, a shell, model-generated code) | **`'subprocess'` / `'container'`** | The work runs OUT of the engine process under host-owned isolation, so what it can reach is what the executor grants, not what the host happens to hold. |

## The seam

`executor` on a tool declares where its work runs. A non-inprocess tag routes dispatch through a `ToolExecutorProvider` registered on the engine, instead of calling the tool's `execute` closure:

```ts
import { createEngine } from '@rulvar/core';
import { subprocessExecutor, subprocessTool } from '@rulvar/executor';
import { anthropic } from '@rulvar/anthropic';

const runPython = subprocessTool({
  name: 'run_python',
  description: 'run a Python snippet and return its JSON result',
  parameters: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
  command: '/usr/bin/python3',
  args: ['/opt/tools/python_runner.py'],
  risk: 'execute',
});

const engine = createEngine({
  adapters: [anthropic()],
  executors: { subprocess: subprocessExecutor({ timeoutMs: 10_000 }) },
});
```

An agent given `runPython` dispatches every call through the provider. A tool declaring an executor tag that is not registered is a typed `ConfigError` at spawn time, before any provider or model call, so a misconfiguration never reaches production as a silent in-process fallback. The tag never enters `toolsetHash`: opting a tool into isolation does not change run identity, and inprocess dispatch stays byte-identical to before.

Each dispatch mints its tool span under the agent span exactly like an inprocess call, and carries a stable **idempotency key**, a pure function of the run id, the tool name, and the canonical arguments. Identical calls derive the same key (a rerun after a crash reuses it; distinct calls never collide), so a tool whose work has external side effects can fold an at-least-once retry into effectively-once.

### The tool-program protocol

An out-of-process tool is a program, not a closure. The executor spawns it, writes one JSON line to its stdin, `{ tool, args, idempotencyKey }`, and reads its result:

```js
// python_runner.py equivalent, in Node for the example:
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const { args } = JSON.parse(input);
  const result = doWork(args.code); // your sandboxed interpreter
  process.stdout.write(JSON.stringify(result)); // stdout is the result
});
```

The child's stdout, trimmed, is the JSON result; empty stdout is the null result; anything else fails the call as a typed `protocol` error. Diagnostics go to stderr, which never enters the result but is captured for the error message when the tool exits non-zero.

## The subprocess executor

`subprocessExecutor` runs the tool in a child process and removes the capability that matters most:

- **The environment is replaced, not inherited.** The child sees only the variables you allowlist (`allowEnv`) plus the ones the executor injects, so host credentials in `process.env` never reach the tool. This is the usual exfiltration path, closed by default.
- **Per-call short-lived credentials.** `credentials` is called fresh for each dispatch and its result is injected as child environment; a rotating or request-scoped token is minted at use and never lives in the host environment.
- **A fresh ephemeral working directory per call**, removed afterward, so nothing leaks between calls and the tool has scratch space that is not the host cwd.
- **A hard timeout** (`timeoutMs`) that escalates SIGTERM to SIGKILL, and a **bounded output capture** (`maxOutputBytes`) that kills a runaway writer, so neither a hang nor a flood of output can wedge or exhaust the host.

What it does NOT do on its own: a plain child process still shares the host filesystem and network, so it can read world-readable files and open sockets. Two honest options close that gap. Pass a **`sandbox` launcher** whose argv is prepended to the command, where a real sandbox plugs in:

```ts
import { subprocessExecutor } from '@rulvar/executor';

const executor = subprocessExecutor({
  // bwrap gives the child a private mount namespace and no network.
  sandbox: ({ workdir }) => [
    'bwrap',
    '--unshare-all',
    '--die-with-parent',
    '--bind',
    workdir,
    workdir,
    '--chdir',
    workdir,
  ],
});
```

`bwrap` (Linux), `firejail`, `sandbox-exec` (macOS), and `nsjail` all fit this hook. Or use the container executor, which brings the isolation batteries included.

## The container executor

`containerExecutor` runs the tool in a one-shot container, which is where the strong isolation holds:

```ts
import { createEngine } from '@rulvar/core';
import { containerExecutor } from '@rulvar/executor';
import { anthropic } from '@rulvar/anthropic';

const engine = createEngine({
  adapters: [anthropic()],
  executors: {
    container: containerExecutor({
      image: 'ghcr.io/acme/tool-sandbox:pinned',
      memory: '256m',
      cpus: '1.0',
      pidsLimit: 128,
    }),
  },
});
```

By default it drops the network entirely (`--network none`), mounts the root filesystem read-only (`--read-only`, with the ephemeral workdir the one writable path at `/work`), caps memory, CPU, and process count, and drops all Linux capabilities (`--cap-drop ALL`). Host credentials never enter the container: it starts from the image environment plus exactly the variables the executor forwards by name, and those values live in the docker CLI process's environment, not in the argv. A microVM adapter (Firecracker, gVisor, Kata) implements the same `ToolExecutorProvider` seam; this docker adapter is the batteries-included reference.

## The side-effect ledger and approval binding

Every dispatch, success or failure, is recorded to the executor's `ToolEffectLedger`: the idempotency key, the tool, a content `argsHash`, the workdir, the outcome, and timing.

```ts
import { subprocessExecutor, memoryEffectLedger } from '@rulvar/executor';

const ledger = memoryEffectLedger();
const executor = subprocessExecutor({ ledger });
// After a run, ledger.entries() is the audit of what actually executed.
```

Binding an approval to the effect it authorized is then a lookup: an [ask-approval](/guide/tools#ask-approval-suspensions) entry and its effect share `(runId, tool, argsHash)`, and the idempotency key is stable across a rerun of the same call. Pair a side-effecting tool's `needsApproval: true` with the ledger to prove that only approved calls ran, and each ran once.

## Conformance

`executorConformance` is the executable shared-contract battery any command-based executor must pass, mirroring the [store conformance kit](/guide/stores):

```ts
import { executorConformance, registerExecutorConformance, subprocessExecutor } from '@rulvar/executor';
import { describe, it } from 'vitest';

const suite = executorConformance((cfg) => subprocessExecutor(cfg));
registerExecutorConformance(suite, { describe, it });
```

It drives a provider through the protocol and asserts the properties the seam promises, foremost the gate the epic exists for: a hostile tool cannot read the host's ambient credentials. It also proves the environment allowlist passes named variables through, per-call credentials are injected, the timeout kills a slow tool, the output cap kills a flood, a non-zero exit surfaces typed with its stderr tail, unparseable output is rejected, each call gets a fresh empty workdir that is removed afterward, and every dispatch reaches the ledger. The subprocess reference passes all of it; the container reference additionally proves the network and filesystem isolation only a container can enforce.

## Next steps

- [Tools and permissions](/guide/tools): defining tools, the permission chain, and the honest limit of in-process execution.
- [Orchestration modes](/guide/orchestration-modes): the worker sandbox for compiled workflows, a determinism boundary distinct from this security one.
- [Data protection](/guide/data-protection): the persistence and telemetry boundaries that isolation complements.
