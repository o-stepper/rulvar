[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ContainerExecutorOptions

# Interface: ContainerExecutorOptions

Defined in: [packages/executor/src/container.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L68)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | readonly `string`[] | Argv prepended before the tool's own args. | [packages/executor/src/container.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L132) |
| <a id="property-capdrop"></a> `capDrop?` | readonly `string`[] | Capabilities to drop. Default ['ALL']. | [packages/executor/src/container.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L88) |
| <a id="property-command"></a> `command?` | `string` | Fallback command (inside the container) when executorSpec omits one. | [packages/executor/src/container.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L130) |
| <a id="property-cpus"></a> `cpus?` | `string` | `--cpus`. Default '1.0'. | [packages/executor/src/container.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L82) |
| <a id="property-credentials"></a> `credentials?` | (`request`) => \| `Record`\&lt;`string`, `string`\&gt; \| `Promise`\&lt;`Record`\&lt;`string`, `string`\&gt;\&gt; | Mints per-call short-lived credentials, forwarded into the container. | [packages/executor/src/container.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L116) |
| <a id="property-daemonenv"></a> `daemonEnv?` | readonly `string`[] | Host env names the docker CLI itself may read. Default the daemon set. | [packages/executor/src/container.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L114) |
| <a id="property-docker"></a> `docker?` | `string` | The docker-compatible CLI. Default 'docker'. | [packages/executor/src/container.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L76) |
| <a id="property-extradockerargs"></a> `extraDockerArgs?` | readonly `string`[] | Extra raw `docker run` flags, placed BEFORE the hardening flags (RV4915) so a repeated single valued flag (`--memory`, `--pids-limit`, `--read-only`) resolves to the fixed value and a conflicting `--network` fails the dispatch at the daemon instead of running with it. List valued flags such as `--cap-add` accumulate whatever the order, which is why the regulated floor refuses any extra flag rather than denylisting some. | [packages/executor/src/container.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L110) |
| <a id="property-forwardenv"></a> `forwardEnv?` | readonly `string`[] | Host env names forwarded INTO the container (not the daemon env). Default none. | [packages/executor/src/container.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L112) |
| <a id="property-image"></a> `image` | `string` | The image the tool runs in (required). A tool whose `executorSpec` names an `image` pinned by digest runs in that image instead (RV4915); the regulated floor requires this one to be pinned too. | [packages/executor/src/container.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L74) |
| <a id="property-killgracems"></a> `killGraceMs?` | `number` | Grace between SIGTERM and SIGKILL of the docker CLI. Default 5_000. | [packages/executor/src/container.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L122) |
| <a id="property-ledger"></a> `ledger?` | [`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) | Records every dispatch. | [packages/executor/src/container.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L128) |
| <a id="property-maxoutputbytes"></a> `maxOutputBytes?` | `number` | Max stdout/stderr bytes captured. Default 1 MiB. | [packages/executor/src/container.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L124) |
| <a id="property-memory"></a> `memory?` | `string` | `--memory`. Default '256m'. | [packages/executor/src/container.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L80) |
| <a id="property-network"></a> `network?` | `string` | `--network`. Default 'none' (no network at all). | [packages/executor/src/container.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L78) |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for the ledger's timing fields (tests). | [packages/executor/src/container.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L134) |
| <a id="property-pidslimit"></a> `pidsLimit?` | `number` | `--pids-limit`. Default 128. | [packages/executor/src/container.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L84) |
| <a id="property-readonly"></a> `readOnly?` | `boolean` | `--read-only` root filesystem. Default true. | [packages/executor/src/container.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L86) |
| <a id="property-scratchmount"></a> `scratchMount?` | `string` | Where the ephemeral workdir is mounted when the work mount is a worktree (RV4914); the tool program reads the path from `RULVAR_SCRATCH`. Default '/scratch'. | [packages/executor/src/container.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L100) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Hard wall-clock ceiling per call. Default 30_000. | [packages/executor/src/container.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L120) |
| <a id="property-workdirbase"></a> `workdirBase?` | `string` | Base directory for the per-call ephemeral workdir. Default os.tmpdir(). | [packages/executor/src/container.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L126) |
| <a id="property-workmount"></a> `workMount?` | `string` | Where the work directory is mounted inside the container: the ephemeral workdir, or the acquired worktree when the request carries a `cwd` (RV4914). Default '/work'. | [packages/executor/src/container.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L94) |
