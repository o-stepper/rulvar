[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RepeatedClaim

# Interface: RepeatedClaim

Defined in: [packages/core/src/orchestrator/claims.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claims.ts#L16)

One claim reported more than once across the input rows.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claim"></a> `claim` | `string` | The first-seen line, verbatim. | [packages/core/src/orchestrator/claims.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claims.ts#L18) |
| <a id="property-count"></a> `count` | `number` | Total occurrences across all rows, the surviving one included. | [packages/core/src/orchestrator/claims.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claims.ts#L22) |
| <a id="property-nodeids"></a> `nodeIds` | `string`[] | Reporters in input order; the first entry made the surviving copy. | [packages/core/src/orchestrator/claims.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claims.ts#L20) |
