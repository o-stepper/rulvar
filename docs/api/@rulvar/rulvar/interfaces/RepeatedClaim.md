[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RepeatedClaim

# Interface: RepeatedClaim

Defined in: `packages/core/dist/index.d.ts`

One claim reported more than once across the input rows.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claim"></a> `claim` | `string` | The first-seen line, verbatim. | `packages/core/dist/index.d.ts` |
| <a id="property-count"></a> `count` | `number` | Total occurrences across all rows, the surviving one included. | `packages/core/dist/index.d.ts` |
| <a id="property-nodeids"></a> `nodeIds` | `string`[] | Reporters in input order; the first entry made the surviving copy. | `packages/core/dist/index.d.ts` |
