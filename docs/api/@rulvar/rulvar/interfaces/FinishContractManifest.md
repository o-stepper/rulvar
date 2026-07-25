[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishContractManifest

# Interface: FinishContractManifest

Defined in: `packages/core/dist/index.d.ts`

The single source of truth of a textual finish contract: what the
prompt promises IS what the validators enforce. Declare only textual
demands here (sections, length, citations); an object-shaped result
belongs to [requiredSectionsValidator](/api/@rulvar/rulvar/functions/requiredSectionsValidator.md)'s sibling
requiredFieldsValidator and a host-provided selfTest accept fixture.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citations"></a> `citations?` | [`FinishContractCitations`](/api/@rulvar/rulvar/interfaces/FinishContractCitations.md) | Citation demands over the result text. | `packages/core/dist/index.d.ts` |
| <a id="property-sections"></a> `sections?` | `string`[] | Literal section markers the result must contain. | `packages/core/dist/index.d.ts` |
| <a id="property-words"></a> `words?` | \{ `max?`: `number`; `min?`: `number`; \} | Word bounds over the result text (whitespace separated tokens). | `packages/core/dist/index.d.ts` |
| `words.max?` | `number` | - | `packages/core/dist/index.d.ts` |
| `words.min?` | `number` | - | `packages/core/dist/index.d.ts` |
