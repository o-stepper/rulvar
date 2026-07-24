[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/executor

# @rulvar/executor

## Classes

| Class | Description |
| ------ | ------ |
| [ExecutorError](/api/@rulvar/executor/classes/ExecutorError.md) | A failed isolated dispatch. The engine catches whatever a ToolExecutorProvider throws and turns it into the call's error tool result, so `message` is what the model sees: it is kept concise and carries a stderr tail on `exit`. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ChildResult](/api/@rulvar/executor/interfaces/ChildResult.md) | - |
| [ChildSpec](/api/@rulvar/executor/interfaces/ChildSpec.md) | - |
| [ConformanceExecutorConfig](/api/@rulvar/executor/interfaces/ConformanceExecutorConfig.md) | The executor options the shared contract exercises. |
| [ContainerExecutorOptions](/api/@rulvar/executor/interfaces/ContainerExecutorOptions.md) | - |
| [ExecutorConformanceCheck](/api/@rulvar/executor/interfaces/ExecutorConformanceCheck.md) | - |
| [ExecutorConformanceSuite](/api/@rulvar/executor/interfaces/ExecutorConformanceSuite.md) | - |
| [ExecutorTestRegistrar](/api/@rulvar/executor/interfaces/ExecutorTestRegistrar.md) | Structural subset of the Vitest/Jest registration API. |
| [SubprocessCommandSpec](/api/@rulvar/executor/interfaces/SubprocessCommandSpec.md) | The command a subprocess tool runs, carried on its `executorSpec`. |
| [SubprocessExecutorOptions](/api/@rulvar/executor/interfaces/SubprocessExecutorOptions.md) | @rulvar/executor: isolated tool executors (RV-216). Reference ToolExecutorProvider adapters that run a tool's work OUT of the engine process, so a tool whose input is hostile or model-generated cannot reach host capabilities the way an in-process tool (an ordinary function call) can. |
| [SubprocessToolInit](/api/@rulvar/executor/interfaces/SubprocessToolInit.md) | @rulvar/executor: isolated tool executors (RV-216). Reference ToolExecutorProvider adapters that run a tool's work OUT of the engine process, so a tool whose input is hostile or model-generated cannot reach host capabilities the way an in-process tool (an ordinary function call) can. |
| [ToolEffectLedger](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) | The side-effect ledger seam. An executor calls `record` once per dispatch (success or failure). Binding an approval to its effect is then a lookup: the approval entry and the effect share (runId, tool, argsHash), and the idempotency key is stable across a rerun of the same call. |
| [ToolEffectRecord](/api/@rulvar/executor/interfaces/ToolEffectRecord.md) | One dispatch's side-effect facts, for the ledger. |

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
| [memoryEffectLedger](/api/@rulvar/executor/functions/memoryEffectLedger.md) | An in-memory ledger for tests and single-process hosts. |
| [parseToolResult](/api/@rulvar/executor/functions/parseToolResult.md) | The tool-program result protocol: the child's stdout, trimmed, is the JSON result. Empty stdout is the null result; anything else must parse as JSON or the dispatch fails typed `protocol`. Diagnostics belong on stderr, which never enters the result. |
| [registerExecutorConformance](/api/@rulvar/executor/functions/registerExecutorConformance.md) | - |
| [runChildProcess](/api/@rulvar/executor/functions/runChildProcess.md) | Spawns one child and resolves with its captured output and exit status, or rejects if the process could not be spawned at all (e.g. the command is a bare name and PATH is not in `env`, so it cannot be resolved). A child that exits non-zero or is killed resolves normally; interpreting that is the caller's job. |
| [subprocessExecutor](/api/@rulvar/executor/functions/subprocessExecutor.md) | @rulvar/executor: isolated tool executors (RV-216). Reference ToolExecutorProvider adapters that run a tool's work OUT of the engine process, so a tool whose input is hostile or model-generated cannot reach host capabilities the way an in-process tool (an ordinary function call) can. |
| [subprocessTool](/api/@rulvar/executor/functions/subprocessTool.md) | @rulvar/executor: isolated tool executors (RV-216). Reference ToolExecutorProvider adapters that run a tool's work OUT of the engine process, so a tool whose input is hostile or model-generated cannot reach host capabilities the way an in-process tool (an ordinary function call) can. |
