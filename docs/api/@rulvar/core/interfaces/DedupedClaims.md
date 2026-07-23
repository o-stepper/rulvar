[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DedupedClaims

# Interface: DedupedClaims

Defined in: [packages/core/src/orchestrator/claims.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claims.ts#L25)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-repeated"></a> `repeated` | [`RepeatedClaim`](/api/@rulvar/core/interfaces/RepeatedClaim.md)[] | Claims seen more than once, in first-occurrence order. | [packages/core/src/orchestrator/claims.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claims.ts#L29) |
| <a id="property-rows"></a> `rows` | \{ `nodeId`: `string`; `text`: `string`; \}[] | The input rows with every repeated line's later occurrences removed. | [packages/core/src/orchestrator/claims.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claims.ts#L27) |
