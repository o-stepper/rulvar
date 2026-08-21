[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimMapRow

# Interface: ClaimMapRow

Defined in: [packages/core/src/orchestrator/claim-map.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L31)

One row of the composition's claim map.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claim"></a> `claim` | `string` | The atomic claim, one assertion, never a compound sentence. | [packages/core/src/orchestrator/claim-map.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L35) |
| <a id="property-grade"></a> `grade` | [`ClaimGrade`](/api/@rulvar/core/type-aliases/ClaimGrade.md) | - | [packages/core/src/orchestrator/claim-map.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L36) |
| <a id="property-id"></a> `id` | `string` | Unique within the map; the judge and the journal address rows by it. | [packages/core/src/orchestrator/claim-map.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L33) |
| <a id="property-inference"></a> `inference?` | \{ `premises`: readonly `string`[]; `reasoning`: `string`; \} | Required exactly on 'inference': the bridge lives here, the grade never replaces it. | [packages/core/src/orchestrator/claim-map.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L40) |
| `inference.premises` | readonly `string`[] | - | [packages/core/src/orchestrator/claim-map.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L40) |
| `inference.reasoning` | `string` | - | [packages/core/src/orchestrator/claim-map.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L40) |
| <a id="property-runevidence"></a> `runEvidence?` | `string` | Required exactly on 'live-observed': what the run itself recorded. | [packages/core/src/orchestrator/claim-map.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L42) |
| <a id="property-sourceanchors"></a> `sourceAnchors` | readonly `string`[] | The document anchors (`path:line`) this claim rests on; empty only on 'assumption'. | [packages/core/src/orchestrator/claim-map.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L38) |
