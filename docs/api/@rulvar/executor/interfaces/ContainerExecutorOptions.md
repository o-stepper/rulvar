[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ContainerExecutorOptions

# Interface: ContainerExecutorOptions

Defined in: [packages/executor/src/container.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L42)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | readonly `string`[] | Argv prepended before the tool's own args. | [packages/executor/src/container.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L84) |
| <a id="property-capdrop"></a> `capDrop?` | readonly `string`[] | Capabilities to drop. Default ['ALL']. | [packages/executor/src/container.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L58) |
| <a id="property-command"></a> `command?` | `string` | Fallback command (inside the container) when executorSpec omits one. | [packages/executor/src/container.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L82) |
| <a id="property-cpus"></a> `cpus?` | `string` | `--cpus`. Default '1.0'. | [packages/executor/src/container.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L52) |
| <a id="property-credentials"></a> `credentials?` | (`request`) => \| `Record`\&lt;`string`, `string`\&gt; \| `Promise`\&lt;`Record`\&lt;`string`, `string`\&gt;\&gt; | Mints per-call short-lived credentials, forwarded into the container. | [packages/executor/src/container.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L68) |
| <a id="property-daemonenv"></a> `daemonEnv?` | readonly `string`[] | Host env names the docker CLI itself may read. Default the daemon set. | [packages/executor/src/container.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L66) |
| <a id="property-docker"></a> `docker?` | `string` | The docker-compatible CLI. Default 'docker'. | [packages/executor/src/container.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L46) |
| <a id="property-extradockerargs"></a> `extraDockerArgs?` | readonly `string`[] | Extra raw `docker run` flags, appended before the image. | [packages/executor/src/container.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L62) |
| <a id="property-forwardenv"></a> `forwardEnv?` | readonly `string`[] | Host env names forwarded INTO the container (not the daemon env). Default none. | [packages/executor/src/container.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L64) |
| <a id="property-image"></a> `image` | `string` | The image the tool runs in (required). | [packages/executor/src/container.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L44) |
| <a id="property-killgracems"></a> `killGraceMs?` | `number` | Grace between SIGTERM and SIGKILL of the docker CLI. Default 5_000. | [packages/executor/src/container.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L74) |
| <a id="property-ledger"></a> `ledger?` | [`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) | Records every dispatch. | [packages/executor/src/container.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L80) |
| <a id="property-maxoutputbytes"></a> `maxOutputBytes?` | `number` | Max stdout/stderr bytes captured. Default 1 MiB. | [packages/executor/src/container.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L76) |
| <a id="property-memory"></a> `memory?` | `string` | `--memory`. Default '256m'. | [packages/executor/src/container.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L50) |
| <a id="property-network"></a> `network?` | `string` | `--network`. Default 'none' (no network at all). | [packages/executor/src/container.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L48) |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for the ledger's timing fields (tests). | [packages/executor/src/container.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L86) |
| <a id="property-pidslimit"></a> `pidsLimit?` | `number` | `--pids-limit`. Default 128. | [packages/executor/src/container.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L54) |
| <a id="property-readonly"></a> `readOnly?` | `boolean` | `--read-only` root filesystem. Default true. | [packages/executor/src/container.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L56) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Hard wall-clock ceiling per call. Default 30_000. | [packages/executor/src/container.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L72) |
| <a id="property-workdirbase"></a> `workdirBase?` | `string` | Base directory for the per-call ephemeral workdir. Default os.tmpdir(). | [packages/executor/src/container.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L78) |
| <a id="property-workmount"></a> `workMount?` | `string` | Where the ephemeral workdir is mounted inside the container. Default '/work'. | [packages/executor/src/container.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L60) |
