[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / WorkerSandboxRunnerOptions

# Interface: WorkerSandboxRunnerOptions

Defined in: [packages/planner/src/sandbox-runner.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/sandbox-runner.ts#L25)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-execargv"></a> `execArgv?` | readonly `string`[] | Node CLI options for the worker thread; default `[]` (an isolated list). Without an explicit value Node would hand the worker `process.execArgv`, and host-only launch flags break a file-entry worker before the first sandbox operation: `--input-type=module` (any ESM stdin or `--eval` host) is rejected for file entries, and an inherited `--eval` carries the host's whole source text (v1.24.1 review P2-2). Hosts that need loader, coverage, or instrumentation flags inside the worker opt in explicitly; the list is passed to the worker verbatim. | [packages/planner/src/sandbox-runner.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/sandbox-runner.ts#L46) |
| <a id="property-memorymb"></a> `memoryMb?` | `number` | Worker old-generation heap ceiling; default 512 (Appendix A). | [packages/planner/src/sandbox-runner.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/sandbox-runner.ts#L29) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Wall-clock ceiling for one execution; default 300000 (Appendix A). | [packages/planner/src/sandbox-runner.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/sandbox-runner.ts#L27) |
| <a id="property-workerurl"></a> `workerUrl?` | `URL` | The worker entry module; defaults to the built sandbox-worker.js next to this module. Tests running from source point at the built dist. | [packages/planner/src/sandbox-runner.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/sandbox-runner.ts#L34) |
