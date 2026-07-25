[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointConformanceOptions

# Interface: KillPointConformanceOptions

Defined in: [packages/store-conformance/src/kill-points.ts:858](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L858)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | `string` | Scratch directory for report files. | [packages/store-conformance/src/kill-points.ts:862](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L862) |
| <a id="property-execargv"></a> `execArgv?` | `string`[] | Extra `node` arguments placed before the writer script. | [packages/store-conformance/src/kill-points.ts:868](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L868) |
| <a id="property-prepare"></a> `prepare` | (`scenario`) => \| [`KillPointTarget`](/api/@rulvar/store-conformance/interfaces/KillPointTarget.md) \| `Promise`\&lt;[`KillPointTarget`](/api/@rulvar/store-conformance/interfaces/KillPointTarget.md)\&gt; | Fresh isolation per scenario: store location and referee opener. | [packages/store-conformance/src/kill-points.ts:864](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L864) |
| <a id="property-resumedeadlinems"></a> `resumeDeadlineMs?` | `number` | Ceiling on lease-held resume retries; default 15000 ms. | [packages/store-conformance/src/kill-points.ts:870](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L870) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | The worker's lease ttl (see [KillPointScenarioOptions.ttlMs](/api/@rulvar/store-conformance/interfaces/KillPointScenarioOptions.md#property-ttlms)); default 300 ms. | [packages/store-conformance/src/kill-points.ts:866](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L866) |
| <a id="property-writerscript"></a> `writerScript` | `string` | Absolute path of the consumer's writer script. | [packages/store-conformance/src/kill-points.ts:860](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L860) |
