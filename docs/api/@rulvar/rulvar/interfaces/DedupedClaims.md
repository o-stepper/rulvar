[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DedupedClaims

# Interface: DedupedClaims

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-repeated"></a> `repeated` | [`RepeatedClaim`](/api/@rulvar/rulvar/interfaces/RepeatedClaim.md)[] | Claims seen more than once, in first-occurrence order. | `packages/core/dist/index.d.ts` |
| <a id="property-rows"></a> `rows` | \{ `nodeId`: `string`; `text`: `string`; \}[] | The input rows with every repeated line's later occurrences removed. | `packages/core/dist/index.d.ts` |
