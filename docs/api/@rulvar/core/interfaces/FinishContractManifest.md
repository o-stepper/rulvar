[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishContractManifest

# Interface: FinishContractManifest

Defined in: [packages/core/src/orchestrator/output-contract.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L58)

The single source of truth of a textual finish contract: what the
prompt promises IS what the validators enforce. Declare only textual
demands here (sections, length, citations); an object-shaped result
belongs to [requiredSectionsValidator](/api/@rulvar/core/functions/requiredSectionsValidator.md)'s sibling
requiredFieldsValidator and a host-provided selfTest accept fixture.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citations"></a> `citations?` | [`FinishContractCitations`](/api/@rulvar/core/interfaces/FinishContractCitations.md) | Citation demands over the result text. | [packages/core/src/orchestrator/output-contract.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L64) |
| <a id="property-sections"></a> `sections?` | `string`[] | Literal section markers the result must contain. | [packages/core/src/orchestrator/output-contract.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L60) |
| <a id="property-words"></a> `words?` | \{ `max?`: `number`; `min?`: `number`; \} | Word bounds over the result text (whitespace separated tokens). | [packages/core/src/orchestrator/output-contract.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L62) |
| `words.max?` | `number` | - | [packages/core/src/orchestrator/output-contract.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L62) |
| `words.min?` | `number` | - | [packages/core/src/orchestrator/output-contract.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L62) |
