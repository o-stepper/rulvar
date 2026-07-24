[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / SubprocessExecutorOptions

# Interface: SubprocessExecutorOptions

Defined in: [packages/executor/src/subprocess.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L55)

@rulvar/executor: isolated tool executors (RV-216). Reference
ToolExecutorProvider adapters that run a tool's work OUT of the engine
process, so a tool whose input is hostile or model-generated cannot
reach host capabilities the way an in-process tool (an ordinary
function call) can.

- `subprocessExecutor` runs the tool in a child process with a scrubbed
  environment, an ephemeral workdir, a hard timeout, and bounded
  output; pair it with a `sandbox` launcher for filesystem and network
  isolation.
- `containerExecutor` runs it in a one-shot container with the network
  dropped, the filesystem read-only, and resource caps: the isolation
  the subprocess adapter cannot promise on its own.
- `subprocessTool` defines a tool that dispatches through them.
- `executorConformance` is the executable shared-contract battery.

The provider seam itself lives in @rulvar/core
(`createEngine({ executors })`). Docs:
https://docs.rulvar.com/guide/isolated-executor.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowenv"></a> `allowEnv?` | readonly `string`[] | Host environment variable names copied into the child. DEFAULT: none. The child's environment is otherwise empty except the per-call vars the executor injects, so host credentials in process.env never reach the tool. A bare command name needs 'PATH' here to be resolvable; prefer an absolute command path instead. | [packages/executor/src/subprocess.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L63) |
| <a id="property-args"></a> `args?` | readonly `string`[] | Argv prepended before the tool's own args (e.g. a fixed runner script). | [packages/executor/src/subprocess.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L94) |
| <a id="property-command"></a> `command?` | `string` | Fallback command when a tool's executorSpec omits one. | [packages/executor/src/subprocess.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L92) |
| <a id="property-credentials"></a> `credentials?` | (`request`) => \| `Record`\&lt;`string`, `string`\&gt; \| `Promise`\&lt;`Record`\&lt;`string`, `string`\&gt;\&gt; | Mints short-lived credentials for one dispatch, injected as child environment variables. Called fresh per call, so a rotating or request-scoped token is minted at use and never lives in the host environment. Return an empty object to inject none. | [packages/executor/src/subprocess.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L70) |
| <a id="property-killgracems"></a> `killGraceMs?` | `number` | Grace between SIGTERM and SIGKILL. Default 2_000. | [packages/executor/src/subprocess.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L76) |
| <a id="property-ledger"></a> `ledger?` | [`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) | Records every dispatch; the host owns retention and approval binding. | [packages/executor/src/subprocess.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L90) |
| <a id="property-maxoutputbytes"></a> `maxOutputBytes?` | `number` | Max stdout/stderr bytes captured; exceeding it kills the child. Default 1 MiB. | [packages/executor/src/subprocess.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L78) |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for the ledger's timing fields (tests). | [packages/executor/src/subprocess.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L96) |
| <a id="property-sandbox"></a> `sandbox?` | (`context`) => readonly `string`[] | A sandbox launcher whose argv is prepended to the command: the real filesystem and network isolation plug in here. It receives the resolved workdir and the request and returns the wrapper argv (for example `['bwrap', '--unshare-net', '--bind', workdir, workdir, ...]`). Default: none. | [packages/executor/src/subprocess.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L88) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Hard wall-clock ceiling per call; the child is killed on expiry. Default 30_000. | [packages/executor/src/subprocess.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L74) |
| <a id="property-workdirbase"></a> `workdirBase?` | `string` | Base directory for the per-call ephemeral workdir. Default os.tmpdir(). | [packages/executor/src/subprocess.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L80) |
