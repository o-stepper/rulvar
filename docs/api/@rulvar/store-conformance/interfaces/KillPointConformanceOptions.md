[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointConformanceOptions

# Interface: KillPointConformanceOptions

Defined in: [packages/store-conformance/src/kill-points.ts:852](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L852)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | `string` | Scratch directory for report files. | [packages/store-conformance/src/kill-points.ts:856](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L856) |
| <a id="property-execargv"></a> `execArgv?` | `string`[] | Extra `node` arguments placed before the writer script. | [packages/store-conformance/src/kill-points.ts:862](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L862) |
| <a id="property-prepare"></a> `prepare` | (`scenario`) => \| [`KillPointTarget`](/api/@rulvar/store-conformance/interfaces/KillPointTarget.md) \| `Promise`\&lt;[`KillPointTarget`](/api/@rulvar/store-conformance/interfaces/KillPointTarget.md)\&gt; | Fresh isolation per scenario: store location and referee opener. | [packages/store-conformance/src/kill-points.ts:858](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L858) |
| <a id="property-resumedeadlinems"></a> `resumeDeadlineMs?` | `number` | Ceiling on lease-held resume retries; default 15000 ms. | [packages/store-conformance/src/kill-points.ts:864](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L864) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | Lease ttl for both sides; default 300 ms. | [packages/store-conformance/src/kill-points.ts:860](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L860) |
| <a id="property-writerscript"></a> `writerScript` | `string` | Absolute path of the consumer's writer script. | [packages/store-conformance/src/kill-points.ts:854](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L854) |
