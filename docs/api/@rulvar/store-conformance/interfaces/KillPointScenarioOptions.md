[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointScenarioOptions

# Interface: KillPointScenarioOptions

Defined in: [packages/store-conformance/src/kill-points.ts:598](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L598)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-closestore"></a> `closeStore?` | (`fixture`) => `void` \| `Promise`\&lt;`void`\&gt; | Closes what [KillPointScenarioOptions.openStore](/api/@rulvar/store-conformance/interfaces/KillPointScenarioOptions.md#property-openstore) opened. | [packages/store-conformance/src/kill-points.ts:628](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L628) |
| <a id="property-dir"></a> `dir` | `string` | Scratch directory for the report file. | [packages/store-conformance/src/kill-points.ts:606](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L606) |
| <a id="property-env"></a> `env?` | `Record`\&lt;`string`, `string`\&gt; | Extra environment for the worker process. | [packages/store-conformance/src/kill-points.ts:630](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L630) |
| <a id="property-execargv"></a> `execArgv?` | `string`[] | Extra `node` arguments placed before the writer script. | [packages/store-conformance/src/kill-points.ts:632](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L632) |
| <a id="property-openstore"></a> `openStore` | () => \| [`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) \| `Promise`\&lt;[`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md)\&gt; | Opens the referee's own fixture over the SAME store location for the resume and the final state verification. | [packages/store-conformance/src/kill-points.ts:626](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L626) |
| <a id="property-resumedeadlinems"></a> `resumeDeadlineMs?` | `number` | Ceiling on lease-held resume retries; default 15000 ms. | [packages/store-conformance/src/kill-points.ts:634](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L634) |
| <a id="property-scenario"></a> `scenario` | \| `string` \| [`KillPointScenario`](/api/@rulvar/store-conformance/interfaces/KillPointScenario.md) | The scenario to execute, by table entry or id. | [packages/store-conformance/src/kill-points.ts:608](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L608) |
| <a id="property-storepath"></a> `storePath?` | `string` | Store location handed to the worker config; default `join(dir, 'kp.db')`. | [packages/store-conformance/src/kill-points.ts:610](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L610) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | The WORKER'S lease ttl; default 300 ms. The referee waits it out after the kill, so keep it short. It binds only the killed owner: the referee's own store (the `openStore` fixture) should keep its GENEROUS default ttl, so a scheduler stall under a loaded test runner cannot expire the resume's lease mid-scenario (a lost lease cancels the run by contract, and the fence then swallows its settle, which reads as a recovery violation when it is really a harness self-inflicted takeover). | [packages/store-conformance/src/kill-points.ts:621](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L621) |
| <a id="property-writerscript"></a> `writerScript` | `string` | Absolute path of the consumer's writer script. It must construct the store over `killPointWorkerConfigFromEnv()` and call [runKillPointWorker](/api/@rulvar/store-conformance/functions/runKillPointWorker.md). | [packages/store-conformance/src/kill-points.ts:604](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L604) |
