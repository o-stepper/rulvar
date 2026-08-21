[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimMapRow

# Interface: ClaimMapRow

Defined in: `packages/core/dist/index.d.ts`

One row of the composition's claim map.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claim"></a> `claim` | `string` | The atomic claim, one assertion, never a compound sentence. | `packages/core/dist/index.d.ts` |
| <a id="property-grade"></a> `grade` | [`ClaimGrade`](/api/@rulvar/rulvar/type-aliases/ClaimGrade.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-id"></a> `id` | `string` | Unique within the map; the judge and the journal address rows by it. | `packages/core/dist/index.d.ts` |
| <a id="property-inference"></a> `inference?` | \{ `premises`: readonly `string`[]; `reasoning`: `string`; \} | Required exactly on 'inference': the bridge lives here, the grade never replaces it. | `packages/core/dist/index.d.ts` |
| `inference.premises` | readonly `string`[] | - | `packages/core/dist/index.d.ts` |
| `inference.reasoning` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runevidence"></a> `runEvidence?` | `string` | Required exactly on 'live-observed': what the run itself recorded. | `packages/core/dist/index.d.ts` |
| <a id="property-sourceanchors"></a> `sourceAnchors` | readonly `string`[] | The document anchors (`path:line`) this claim rests on; empty only on 'assumption'. | `packages/core/dist/index.d.ts` |
