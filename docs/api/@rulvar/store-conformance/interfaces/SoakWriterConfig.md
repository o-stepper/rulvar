[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / SoakWriterConfig

# Interface: SoakWriterConfig

Defined in: [packages/store-conformance/src/multi-process-soak.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L89)

The per-writer contract, serialized as JSON into the
`RULVAR_SOAK_CONFIG` environment variable of each spawned writer.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-reportpath"></a> `reportPath` | `string` | JSONL report file this writer appends its events to. | [packages/store-conformance/src/multi-process-soak.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L101) |
| <a id="property-runid"></a> `runId` | `string` | The soaked run id every writer competes for. | [packages/store-conformance/src/multi-process-soak.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L93) |
| <a id="property-seed"></a> `seed` | `number` | Deterministic PRNG seed (writers derive per-index streams). | [packages/store-conformance/src/multi-process-soak.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L99) |
| <a id="property-stoppath"></a> `stopPath` | `string` | The storm ends when this file exists. | [packages/store-conformance/src/multi-process-soak.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L103) |
| <a id="property-storepath"></a> `storePath` | `string` | Store location the writer script constructs its store over. | [packages/store-conformance/src/multi-process-soak.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L91) |
| <a id="property-ttlms"></a> `ttlMs` | `number` | Lease ttl the writer's store MUST be constructed with. | [packages/store-conformance/src/multi-process-soak.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L97) |
| <a id="property-writer"></a> `writer` | `number` | This writer's index (0-based; also its report identity). | [packages/store-conformance/src/multi-process-soak.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L95) |
