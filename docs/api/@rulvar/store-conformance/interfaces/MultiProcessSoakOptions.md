[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / MultiProcessSoakOptions

# Interface: MultiProcessSoakOptions

Defined in: [packages/store-conformance/src/multi-process-soak.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L167)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capms"></a> `capMs?` | `number` | Hard wall-clock cap on the storm; default 60000 ms. | [packages/store-conformance/src/multi-process-soak.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L195) |
| <a id="property-closestore"></a> `closeStore?` | (`fixture`) => `void` \| `Promise`\&lt;`void`\&gt; | Closes what [openStore](/api/@rulvar/store-conformance/interfaces/MultiProcessSoakOptions.md#property-openstore) opened. | [packages/store-conformance/src/multi-process-soak.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L183) |
| <a id="property-dir"></a> `dir` | `string` | Scratch directory for the store file, reports, and stop file. | [packages/store-conformance/src/multi-process-soak.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L176) |
| <a id="property-env"></a> `env?` | `Record`\&lt;`string`, `string`\&gt; | Extra environment for the writer processes. | [packages/store-conformance/src/multi-process-soak.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L197) |
| <a id="property-execargv"></a> `execArgv?` | `string`[] | Extra `node` arguments placed before the writer script. | [packages/store-conformance/src/multi-process-soak.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L199) |
| <a id="property-openstore"></a> `openStore` | (`storePath`) => \| [`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) \| `Promise`\&lt;[`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md)\&gt; | Opens the referee's own fixture over the SAME store location once the storm has ended, for state verification. | [packages/store-conformance/src/multi-process-soak.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L181) |
| <a id="property-quorum"></a> `quorum?` | `Partial`\&lt;[`SoakQuorum`](/api/@rulvar/store-conformance/interfaces/SoakQuorum.md)\&gt; | Activity quorum overrides; see [DEFAULT\_SOAK\_QUORUM](/api/@rulvar/store-conformance/variables/DEFAULT_SOAK_QUORUM.md). | [packages/store-conformance/src/multi-process-soak.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L193) |
| <a id="property-seed"></a> `seed?` | `number` | PRNG seed; default 1. | [packages/store-conformance/src/multi-process-soak.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L191) |
| <a id="property-storepath"></a> `storePath?` | `string` | Store location; default `join(dir, 'soak.db')`. | [packages/store-conformance/src/multi-process-soak.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L185) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | Lease ttl for the storm; default 250 ms (short = many takeovers). | [packages/store-conformance/src/multi-process-soak.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L189) |
| <a id="property-writers"></a> `writers?` | `number` | Concurrent writer processes; default 3. | [packages/store-conformance/src/multi-process-soak.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L187) |
| <a id="property-writerscript"></a> `writerScript` | `string` | Absolute path of the consumer's writer script. It must construct the store over `soakWriterConfigFromEnv().storePath` (bare, no retry wrapper: concurrent boot is part of the promise under test), call [runSoakWriter](/api/@rulvar/store-conformance/functions/runSoakWriter.md), and exit 0. | [packages/store-conformance/src/multi-process-soak.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L174) |
