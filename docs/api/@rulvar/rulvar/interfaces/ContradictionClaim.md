[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ContradictionClaim

# Interface: ContradictionClaim

Defined in: `packages/core/dist/index.d.ts`

One reading of a disputed key, with everyone who reported it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-excerpt"></a> `excerpt` | `string` | The first sentence that asserted it, whitespace-collapsed and cut to `maxExcerptChars`. An excerpt, never a quotation: it exists so a reader can find the claim, not so a machine can re-parse it. | `packages/core/dist/index.d.ts` |
| <a id="property-nodeids"></a> `nodeIds` | `string`[] | Children asserting it, in first-seen (spawn) order; never empty. | `packages/core/dist/index.d.ts` |
| <a id="property-value"></a> `value` | `string` | The value asserted for the key, verbatim after the separator. | `packages/core/dist/index.d.ts` |
