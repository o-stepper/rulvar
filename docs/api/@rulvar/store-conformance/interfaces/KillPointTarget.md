[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointTarget

# Interface: KillPointTarget

Defined in: [packages/store-conformance/src/kill-points.ts:841](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L841)

Per-scenario isolation a consumer's `prepare` hands the suite.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cleanup"></a> `cleanup?` | () => `void` \| `Promise`\&lt;`void`\&gt; | Runs after the scenario, pass or fail (drop the schema, etc). | [packages/store-conformance/src/kill-points.ts:849](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L849) |
| <a id="property-closestore"></a> `closeStore?` | (`fixture`) => `void` \| `Promise`\&lt;`void`\&gt; | - | [packages/store-conformance/src/kill-points.ts:847](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L847) |
| <a id="property-env"></a> `env?` | `Record`\&lt;`string`, `string`\&gt; | Extra environment for the worker process. | [packages/store-conformance/src/kill-points.ts:845](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L845) |
| <a id="property-openstore"></a> `openStore` | () => \| [`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) \| `Promise`\&lt;[`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md)\&gt; | - | [packages/store-conformance/src/kill-points.ts:846](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L846) |
| <a id="property-storepath"></a> `storePath?` | `string` | Store location for this scenario (worker config + referee). | [packages/store-conformance/src/kill-points.ts:843](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L843) |
