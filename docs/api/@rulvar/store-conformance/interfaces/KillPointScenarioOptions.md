[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointScenarioOptions

# Interface: KillPointScenarioOptions

Defined in: [packages/store-conformance/src/kill-points.ts:598](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L598)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-closestore"></a> `closeStore?` | (`fixture`) => `void` \| `Promise`\&lt;`void`\&gt; | Closes what [KillPointScenarioOptions.openStore](/api/@rulvar/store-conformance/interfaces/KillPointScenarioOptions.md#property-openstore) opened. | [packages/store-conformance/src/kill-points.ts:629](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L629) |
| <a id="property-dir"></a> `dir` | `string` | Scratch directory for the report file. | [packages/store-conformance/src/kill-points.ts:606](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L606) |
| <a id="property-env"></a> `env?` | `Record`\&lt;`string`, `string`\&gt; | Extra environment for the worker process. | [packages/store-conformance/src/kill-points.ts:631](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L631) |
| <a id="property-execargv"></a> `execArgv?` | `string`[] | Extra `node` arguments placed before the writer script. | [packages/store-conformance/src/kill-points.ts:633](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L633) |
| <a id="property-openstore"></a> `openStore` | () => \| [`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) \| `Promise`\&lt;[`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md)\&gt; | Opens the referee's own fixture over the SAME store location for the resume and the final state verification. | [packages/store-conformance/src/kill-points.ts:627](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L627) |
| <a id="property-resumedeadlinems"></a> `resumeDeadlineMs?` | `number` | Ceiling on lease-held resume retries; default 15000 ms. | [packages/store-conformance/src/kill-points.ts:635](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L635) |
| <a id="property-scenario"></a> `scenario` | \| `string` \| [`KillPointScenario`](/api/@rulvar/store-conformance/interfaces/KillPointScenario.md) | The scenario to execute, by table entry or id. | [packages/store-conformance/src/kill-points.ts:608](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L608) |
| <a id="property-storepath"></a> `storePath?` | `string` | Store location handed to the worker config; default `join(dir, 'kp.db')`. | [packages/store-conformance/src/kill-points.ts:610](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L610) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | The WORKER'S lease ttl; default 2000 ms. The referee waits it out after the kill (retrying the resume on the typed rejection), so it stays short, but NOT so short that a scheduler stall on a loaded test runner can expire the WORKER'S own lease between its renewals before the kill point is even reached: a lost lease cancels the run by contract, the worker then exits zero as ran-to-completion, and the scenario reads a self-inflicted takeover as a violation. The same reasoning keeps the referee's own store (the `openStore` fixture) on its GENEROUS default ttl. | [packages/store-conformance/src/kill-points.ts:622](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L622) |
| <a id="property-writerscript"></a> `writerScript` | `string` | Absolute path of the consumer's writer script. It must construct the store over `killPointWorkerConfigFromEnv()` and call [runKillPointWorker](/api/@rulvar/store-conformance/functions/runKillPointWorker.md). | [packages/store-conformance/src/kill-points.ts:604](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L604) |
