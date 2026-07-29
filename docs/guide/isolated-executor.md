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

Each dispatch mints its tool span under the agent span exactly like an inprocess call, and carries a stable **idempotency key**. Under the current derivation the key is a pure function of the run id, the run's **generation token** (`RunMeta.genesis`, minted at the fresh start), the **logical invocation** (the seq of the containing agent's journal entry plus the call's ordinal within that agent's tool loop), the tool name, and the canonical arguments. Every component is journal- and checkpoint-stable, which gives the key its three properties at once: a rerun of the same call after a crash reuses the same agent entry, the restored ordinal, and the carried token, so it derives the same key and a tool with external side effects folds an at-least-once retry into effectively-once; two intentionally separate calls in one run, even with byte-identical arguments, occupy different ordinals and never collide, so external dedupe never collapses two intended effects into one; and a `deleteRun` followed by a recreate of the same explicit runId mints a fresh generation token, so the new incarnation's intended effects are never falsely suppressed by dedup state the deleted incarnation left behind in a long-lived external store.

The derivation is versioned per run, not per engine: `RunMeta.execKeyDerivation` is stamped at the fresh start (current engines stamp 2, the incarnation-scoped derivation above) and carried verbatim by every resume segment, so an engine upgrade never flips the keys of an already-started run mid-incarnation. Runs recorded before the stamp shipped derive the original version 1 key (the same function without the generation token) for their whole life, which keeps external dedup state accumulated for them valid across the upgrade. A recorded derivation the resuming engine does not know is a typed refusal when executors are configured, never a silent fallback to some other version's keys; and both meta fields are store round-trip obligations the [store conformance kit](/guide/store-authors) checks.

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

Binding an approval to the effect it authorized is then a lookup: an [ask-approval](/guide/tools#ask-approvals-surface-to-the-host) entry and its effect share `(runId, tool, argsHash)`, and the idempotency key is stable across a rerun of the same call. Pair a side-effecting tool's `needsApproval: true` with the ledger to prove that only approved calls ran, and to COUNT the attempts each approved call took: execution is at-least-once (a crash between the effect and the checkpoint re-runs the tool, the [security policy](https://github.com/o-stepper/rulvar/blob/main/SECURITY.md)'s documented non-guarantee), and the honest audit is one ledger row per attempt under one stable idempotency key, not an assumed single execution.

### The two-phase intent contract and the crash window

A single outcome record has a window the run journal cannot close on its own: the record is written AFTER the effect, so a host process killed between the external effect and the ledger write leaves an effect with no row anywhere. The two-phase capability closes it. A ledger that implements the optional `intent` method opts in: the executor mints a unique `attemptId` for the dispatch, durably records the intent (the idempotency key, tool, `argsHash`, runId, spanId, workdir, `startedAt`, and the `attemptId`) and AWAITS it strictly before the effect is dispatched, then writes the outcome `record` after, carrying the identical `attemptId`, so the two phases of one attempt pair exactly (rows written before the id shipped pair by the legacy `(idempotencyKey, startedAt)` join). A failed intent write refuses the dispatch with the typed `ledger` error code, because proceeding would reopen exactly the untracked-effect window; a ledger without the method keeps the historical single-record contract, byte for byte.

The crash between the phases now leaves an **orphan intent**, and that orphan is a contract, not a curiosity: an intent whose OWN attempt has no outcome row means "an effect may have happened that nothing accounts for", and the host's reconciliation procedure is mandatory before retrying or compensating: look the idempotency key up with the effect's provider (the key was forwarded to the tool, so a well-built tool program attached it to the external call), correlate by `(runId, tool, argsHash)`, and only then decide. An outcome resolves ONLY its own attempt, whatever its class: a sibling retry that completed, failed, or timed out says nothing about another attempt whose effect may already have applied, so it never clears one. Closing the logical idempotency key is the host reconciler's decision, made against the effect provider's receipt, never an inference the scan makes for you. The reference `jsonlEffectLedger(path)` writes both phases as JSON lines and `loadEffectLedger(path)` scans them back with `orphanedIntents` precomputed under exactly that rule:

```ts
import { subprocessExecutor, jsonlEffectLedger, loadEffectLedger } from '@rulvar/executor';

const executor = subprocessExecutor({ ledger: jsonlEffectLedger('/var/lib/app/effects.jsonl') });
// After a crash, at boot, before resuming anything:
const scan = await loadEffectLedger('/var/lib/app/effects.jsonl');
for (const orphan of scan.orphanedIntents) {
  // Mandatory: reconcile with the provider by orphan.idempotencyKey
  // before the run's at-least-once redispatch is allowed to re-fire.
}
```

The file itself is defended at both ends. Before its first append, `jsonlEffectLedger` repairs a torn tail left by a crashed predecessor: a complete record missing only its newline is terminated in place, and an unparseable fragment is truncated and quarantined verbatim as a `{"phase":"torn"}` line (surfaced by the scan as `tornArtifacts`), so a new append can never glue onto torn bytes and hide a valid record. The destructive half of that repair is mutually exclusive between processes: a sidecar `<path>.repair-lock` taken with `O_EXCL` serializes repairers, the file is re-read after the lock is held so a boundary computed from a stale read is never truncated, and a lock left by a crashed repairer is stolen after a ten-second TTL. Two writer processes that meet on the same torn file therefore cannot erase each other's confirmed rows, which is exactly the loss a lockless repair permitted.

The scan is equally strict about what it admits. It tolerates and names a LIVE unterminated trailing fragment (`tornTail`), but everything else it cannot decode, parse, and validate is refused: an unparseable interior line, invalid UTF-8 (a replacement character would forge an idempotency key), a JSON value that is not an object (`null`, `42`, `"str"`), a row missing a required field or carrying it mistyped, and an unknown phase, because one flipped character in a phase must not silently erase an orphan, and compatibility with future phases is versioning's job, never silence's. Each refusal fails the scan closed with a typed `LedgerCorruptionError` carrying line numbers, byte offsets, and sha256 hashes of the exact bytes; pass `{ tolerateCorrupt: true }` to receive the same lines as data for triage instead, and in that mode nothing rawer than the typed shape ever escapes (a `null` line used to pierce both modes as a bare `TypeError`). Reconciling from a partial scan would silently drop intents, which is exactly the failure the ledger exists to prevent.

**Several workers, one host.** The supported deployment is still one writer per path: give each worker process its own `effects.<worker>.jsonl` and merge the scans at reconciliation time, since per-line append atomicity is a local-filesystem property and neither `O_APPEND` nor `O_EXCL` is dependable on network filesystems. The repair lock exists so that the moment two writers DO meet on one local path, at a rolling deploy, a supervisor restart overlap, a misconfigured pair, the meeting costs duplicated effort at worst, never a truncated confirmed intent.

The boundary stays honest in both directions. An awaited JSONL append survives a process crash, not necessarily a power loss before the OS flushes; a host that needs power-loss durability implements the same two-method seam over its own fsync or transactional store. And the library deliberately stops at the strict interface plus this checkable contract (the conformance kit's e13 kills a simulated host between the phases and demands the orphan, and a SIGKILL test drives the real crash window against the built package): a full transactional outbox, business authorization, and monetary reconciliation remain host obligations, built ON the ledger, not inside it.

### The guarantee matrix

Who provides what, stated once and flatly (RV508, the ninth comparison experiment's review). The library's layers give **at-least-once execution with attempt binding and intent-before-effect**; exactly-once effect execution is promised by NO layer of the library, and any doc sentence that says otherwise is a bug (a lint rule enforces exactly that, with this section as the vetted place to talk about it). What IS exactly-once in Rulvar is pay and replay: a completed journal entry is never re-paid, which is the [never-pay-twice invariant](/guide/durability#at-least-once-dispatch-exactly-once-pay), a statement about money and journal folds, not about external side effects.

| Concern | The library provides | The host must provide | The effect provider must provide |
|---|---|---|---|
| Dispatch | At-least-once: a crash between execution and the checkpoint re-runs the tool ([security policy](https://github.com/o-stepper/rulvar/blob/main/SECURITY.md)) | Idempotent tool programs, or reconciliation before retry | Tolerance of repeated identical requests |
| Effect accounting | TWO ledger rows per completed two-phase attempt (the intent awaited BEFORE the effect, the outcome after, both carrying the same `attemptId`); a crash between the phases leaves the intent row alone, the orphan the host reconciles; a legacy ledger without `intent` keeps the one-outcome-row contract | A durable ledger implementation (the JSONL reference, or its own transactional store) | Nothing |
| Approval binding | `(runId, tool, argsHash)` joins an ask-approval entry to its effect rows; only approved calls can dispatch | IAM around who may resolve (`ResolutionBy` is a channel, not a verified principal) | Nothing |
| Attempt identity | A unique `attemptId` per dispatch; an outcome resolves only its own attempt; orphaned intents are surfaced, never auto-closed | The reconciliation procedure: look the idempotency key up with the provider before retrying or compensating | A receipt correlated by the forwarded idempotency key |
| Business idempotency | A stable idempotency key per logical invocation, forwarded to the tool program | A `domainEffectId` outbox keyed by BUSINESS identity: the V2 executor key is provenance and deliberately changes when a run is deleted and recreated | Effect deduplication by the business key, where the domain supports it |
| Receipts and settlement | The journal and the ledger: which attempts ran, when, and what they reported | Monetary and domain reconciliation against provider receipts | The receipts themselves |

Read the rows bottom-up when something external went wrong: the receipt says what happened, the ledger says what was attempted, the journal says what was paid, and no layer above pretends to close a gap a lower layer left open.

## Conformance

`executorConformance` is the executable shared-contract battery any command-based executor must pass, mirroring the [store conformance kit](/guide/stores):

```ts
import { executorConformance, registerExecutorConformance, subprocessExecutor } from '@rulvar/executor';
import { describe, it } from 'vitest';

const suite = executorConformance((cfg) => subprocessExecutor(cfg));
registerExecutorConformance(suite, { describe, it });
```

It drives a provider through the protocol and asserts the properties the seam promises, foremost the gate the epic exists for: a hostile tool cannot read the host's ambient credentials. It also proves the environment allowlist passes named variables through, per-call credentials are injected, the timeout kills a slow tool, the output cap kills a flood, a non-zero exit surfaces typed with its stderr tail, unparseable output is rejected, each call gets a fresh empty workdir that is removed afterward, every dispatch reaches the ledger with the outcome it actually had (a protocol failure ledgers `error`, never `ok`), and, against a two-phase ledger, a simulated kill between the effect and the outcome write leaves the orphan intent with the full reconciliation lookup set, recorded strictly before the effect (e13). The subprocess reference passes all of it; the container reference additionally proves the network and filesystem isolation only a container can enforce.

## Next steps

- [Tools and permissions](/guide/tools): defining tools, the permission chain, and the honest limit of in-process execution.
- [Orchestration modes](/guide/orchestration-modes): the worker sandbox for compiled workflows, a determinism boundary distinct from this security one.
- [Data protection](/guide/data-protection): the persistence and telemetry boundaries that isolation complements.
