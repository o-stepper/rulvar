[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/executor

# @rulvar/executor

## Classes

| Class | Description |
| ------ | ------ |
| [ExecutorError](/api/@rulvar/executor/classes/ExecutorError.md) | A failed isolated dispatch. The engine catches whatever a ToolExecutorProvider throws and turns it into the call's error tool result, so `message` is what the model sees: it is kept concise and carries a stderr tail on `exit`. |
| [LedgerCorruptionError](/api/@rulvar/executor/classes/LedgerCorruptionError.md) | The fail-closed refusal of [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md) (RV502): the file holds at least one unparseable INTERIOR line, which the writer's tail repair can never produce, so it means external damage or a second writer, never a normal crash artifact. Reconciling from a partial scan would silently drop intents; triage the named lines instead (`tolerateCorrupt: true` surfaces them as data). |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ChildResult](/api/@rulvar/executor/interfaces/ChildResult.md) | - |
| [ChildSpec](/api/@rulvar/executor/interfaces/ChildSpec.md) | - |
| [ConformanceExecutorConfig](/api/@rulvar/executor/interfaces/ConformanceExecutorConfig.md) | The executor options the shared contract exercises. |
| [ContainerExecutorOptions](/api/@rulvar/executor/interfaces/ContainerExecutorOptions.md) | - |
| [CorruptLedgerLine](/api/@rulvar/executor/interfaces/CorruptLedgerLine.md) | One unparseable interior line of the ledger file, surfaced for triage. |
| [EffectLedgerScan](/api/@rulvar/executor/interfaces/EffectLedgerScan.md) | What [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md) reads back from a JSONL ledger file. |
| [ExecutorConformanceCheck](/api/@rulvar/executor/interfaces/ExecutorConformanceCheck.md) | - |
| [ExecutorConformanceSuite](/api/@rulvar/executor/interfaces/ExecutorConformanceSuite.md) | - |
| [ExecutorTestRegistrar](/api/@rulvar/executor/interfaces/ExecutorTestRegistrar.md) | Structural subset of the Vitest/Jest registration API. |
| [SubprocessCommandSpec](/api/@rulvar/executor/interfaces/SubprocessCommandSpec.md) | The command a subprocess tool runs, carried on its `executorSpec`. |
| [SubprocessExecutorOptions](/api/@rulvar/executor/interfaces/SubprocessExecutorOptions.md) | @rulvar/executor: isolated tool executors (RV-216). Reference ToolExecutorProvider adapters that run a tool's work OUT of the engine process, so a tool whose input is hostile or model-generated cannot reach host capabilities the way an in-process tool (an ordinary function call) can. |
| [SubprocessToolInit](/api/@rulvar/executor/interfaces/SubprocessToolInit.md) | @rulvar/executor: isolated tool executors (RV-216). Reference ToolExecutorProvider adapters that run a tool's work OUT of the engine process, so a tool whose input is hostile or model-generated cannot reach host capabilities the way an in-process tool (an ordinary function call) can. |
| [ToolEffectIntent](/api/@rulvar/executor/interfaces/ToolEffectIntent.md) | The pre-dispatch half of a two-phase ledger entry (RV404): everything the executor knows BEFORE the external effect is dispatched, which is exactly the set a host needs to reconcile an orphaned effect with the effect's provider (look the idempotency key up, correlate by tool and argsHash). `attemptId` is the attempt join key (RV501): the outcome record of the same attempt carries the identical value. `startedAt` remains the documented legacy join for rows written before the id shipped; a wall-clock millisecond is not unique, which is why the id exists. |
| [ToolEffectLedger](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) | The side-effect ledger seam. An executor calls `record` once per dispatch (success or failure). Binding an approval to its effect is then a lookup: the approval entry and the effect share (runId, tool, argsHash), and the idempotency key is stable across a rerun of the same call. |
| [ToolEffectRecord](/api/@rulvar/executor/interfaces/ToolEffectRecord.md) | One dispatch's side-effect facts, for the ledger. |
| [TornLedgerArtifact](/api/@rulvar/executor/interfaces/TornLedgerArtifact.md) | A torn fragment the writer quarantined while repairing a tail (RV502). |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ChildStopReason](/api/@rulvar/executor/type-aliases/ChildStopReason.md) | - |
| [ConformanceExecutorFactory](/api/@rulvar/executor/type-aliases/ConformanceExecutorFactory.md) | Builds the provider under test from a shared-contract config. |
| [ExecutorErrorCode](/api/@rulvar/executor/type-aliases/ExecutorErrorCode.md) | Why an isolated dispatch failed. |

## Functions

| Function | Description |
| ------ | ------ |
| [containerExecutor](/api/@rulvar/executor/functions/containerExecutor.md) | Builds a container ToolExecutorProvider over a docker-compatible CLI. Register it as `createEngine({ executors: { container: containerExecutor({ image }) } })`; tools declaring `executor: 'container'` dispatch through it. Define such tools with [subprocessTool](/api/@rulvar/executor/functions/subprocessTool.md) and set `executor` to 'container', or hand-build a ToolDef. |
| [executorConformance](/api/@rulvar/executor/functions/executorConformance.md) | Builds the conformance suite. `factory` produces the provider under test from a shared config; the kit supplies the command (its own runner, run by `runtime`, default the current Node) and the per-check options. |
| [hashArgs](/api/@rulvar/executor/functions/hashArgs.md) | A stable content hash of the arguments for the ledger's `argsHash`. It canonicalizes object key order so equal arguments hash equally regardless of property order. |
| [jsonlEffectLedger](/api/@rulvar/executor/functions/jsonlEffectLedger.md) | A two-phase ToolEffectLedger appending JSON lines to `path` (`{ phase: 'intent' | 'outcome', ... }`). Pass it to `subprocessExecutor({ ledger })` or `containerExecutor({ ledger })`; scan it back with [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md). The first append lazily repairs a torn tail left by a crashed predecessor (RV502). |
| [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md) | Scans a JSONL ledger file into intents, outcomes, and the orphaned intents a host must reconcile, pairing attempts exactly (RV501). A torn TRAILING fragment (the crash-mid-write artifact) is tolerated and reported; an unparseable INTERIOR line fails the scan closed with a typed [LedgerCorruptionError](/api/@rulvar/executor/classes/LedgerCorruptionError.md) unless `tolerateCorrupt` asks for the lines as data (RV502). |
| [memoryEffectLedger](/api/@rulvar/executor/functions/memoryEffectLedger.md) | An in-memory ledger for tests and single-process hosts. It implements the two-phase capability: `intents()` exposes the pre-dispatch rows, `entries()` the outcomes, exactly as before. |
| [parseToolResult](/api/@rulvar/executor/functions/parseToolResult.md) | The tool-program result protocol: the child's stdout, trimmed, is the JSON result. Empty stdout is the null result; anything else must parse as JSON or the dispatch fails typed `protocol`. Diagnostics belong on stderr, which never enters the result. |
| [registerExecutorConformance](/api/@rulvar/executor/functions/registerExecutorConformance.md) | - |
| [runChildProcess](/api/@rulvar/executor/functions/runChildProcess.md) | Spawns one child and resolves with its captured output and exit status, or rejects if the process could not be spawned at all (e.g. the command is a bare name and PATH is not in `env`, so it cannot be resolved). A child that exits non-zero or is killed resolves normally; interpreting that is the caller's job. |
| [subprocessExecutor](/api/@rulvar/executor/functions/subprocessExecutor.md) | @rulvar/executor: isolated tool executors (RV-216). Reference ToolExecutorProvider adapters that run a tool's work OUT of the engine process, so a tool whose input is hostile or model-generated cannot reach host capabilities the way an in-process tool (an ordinary function call) can. |
| [subprocessTool](/api/@rulvar/executor/functions/subprocessTool.md) | @rulvar/executor: isolated tool executors (RV-216). Reference ToolExecutorProvider adapters that run a tool's work OUT of the engine process, so a tool whose input is hostile or model-generated cannot reach host capabilities the way an in-process tool (an ordinary function call) can. |
