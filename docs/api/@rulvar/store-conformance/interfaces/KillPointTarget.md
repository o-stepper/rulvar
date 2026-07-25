[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointTarget

# Interface: KillPointTarget

Defined in: [packages/store-conformance/src/kill-points.ts:849](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L849)

Per-scenario isolation a consumer's `prepare` hands the suite.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cleanup"></a> `cleanup?` | () => `void` \| `Promise`\&lt;`void`\&gt; | Runs after the scenario, pass or fail (drop the schema, etc). | [packages/store-conformance/src/kill-points.ts:857](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L857) |
| <a id="property-closestore"></a> `closeStore?` | (`fixture`) => `void` \| `Promise`\&lt;`void`\&gt; | - | [packages/store-conformance/src/kill-points.ts:855](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L855) |
| <a id="property-env"></a> `env?` | `Record`\&lt;`string`, `string`\&gt; | Extra environment for the worker process. | [packages/store-conformance/src/kill-points.ts:853](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L853) |
| <a id="property-openstore"></a> `openStore` | () => \| [`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md) \| `Promise`\&lt;[`FencedTranscriptsFixture`](/api/@rulvar/store-conformance/interfaces/FencedTranscriptsFixture.md)\&gt; | - | [packages/store-conformance/src/kill-points.ts:854](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L854) |
| <a id="property-storepath"></a> `storePath?` | `string` | Store location for this scenario (worker config + referee). | [packages/store-conformance/src/kill-points.ts:851](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L851) |
