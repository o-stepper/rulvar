[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ContainerExecutorOptions

# Interface: ContainerExecutorOptions

Defined in: [packages/executor/src/container.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L45)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | readonly `string`[] | Argv prepended before the tool's own args. | [packages/executor/src/container.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L87) |
| <a id="property-capdrop"></a> `capDrop?` | readonly `string`[] | Capabilities to drop. Default ['ALL']. | [packages/executor/src/container.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L61) |
| <a id="property-command"></a> `command?` | `string` | Fallback command (inside the container) when executorSpec omits one. | [packages/executor/src/container.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L85) |
| <a id="property-cpus"></a> `cpus?` | `string` | `--cpus`. Default '1.0'. | [packages/executor/src/container.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L55) |
| <a id="property-credentials"></a> `credentials?` | (`request`) => \| `Record`\&lt;`string`, `string`\&gt; \| `Promise`\&lt;`Record`\&lt;`string`, `string`\&gt;\&gt; | Mints per-call short-lived credentials, forwarded into the container. | [packages/executor/src/container.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L71) |
| <a id="property-daemonenv"></a> `daemonEnv?` | readonly `string`[] | Host env names the docker CLI itself may read. Default the daemon set. | [packages/executor/src/container.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L69) |
| <a id="property-docker"></a> `docker?` | `string` | The docker-compatible CLI. Default 'docker'. | [packages/executor/src/container.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L49) |
| <a id="property-extradockerargs"></a> `extraDockerArgs?` | readonly `string`[] | Extra raw `docker run` flags, appended before the image. | [packages/executor/src/container.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L65) |
| <a id="property-forwardenv"></a> `forwardEnv?` | readonly `string`[] | Host env names forwarded INTO the container (not the daemon env). Default none. | [packages/executor/src/container.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L67) |
| <a id="property-image"></a> `image` | `string` | The image the tool runs in (required). | [packages/executor/src/container.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L47) |
| <a id="property-killgracems"></a> `killGraceMs?` | `number` | Grace between SIGTERM and SIGKILL of the docker CLI. Default 5_000. | [packages/executor/src/container.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L77) |
| <a id="property-ledger"></a> `ledger?` | [`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) | Records every dispatch. | [packages/executor/src/container.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L83) |
| <a id="property-maxoutputbytes"></a> `maxOutputBytes?` | `number` | Max stdout/stderr bytes captured. Default 1 MiB. | [packages/executor/src/container.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L79) |
| <a id="property-memory"></a> `memory?` | `string` | `--memory`. Default '256m'. | [packages/executor/src/container.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L53) |
| <a id="property-network"></a> `network?` | `string` | `--network`. Default 'none' (no network at all). | [packages/executor/src/container.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L51) |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for the ledger's timing fields (tests). | [packages/executor/src/container.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L89) |
| <a id="property-pidslimit"></a> `pidsLimit?` | `number` | `--pids-limit`. Default 128. | [packages/executor/src/container.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L57) |
| <a id="property-readonly"></a> `readOnly?` | `boolean` | `--read-only` root filesystem. Default true. | [packages/executor/src/container.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L59) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Hard wall-clock ceiling per call. Default 30_000. | [packages/executor/src/container.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L75) |
| <a id="property-workdirbase"></a> `workdirBase?` | `string` | Base directory for the per-call ephemeral workdir. Default os.tmpdir(). | [packages/executor/src/container.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L81) |
| <a id="property-workmount"></a> `workMount?` | `string` | Where the ephemeral workdir is mounted inside the container. Default '/work'. | [packages/executor/src/container.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L63) |
