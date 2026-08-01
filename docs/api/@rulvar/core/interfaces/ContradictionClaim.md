[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ContradictionClaim

# Interface: ContradictionClaim

Defined in: [packages/core/src/orchestrator/contradictions.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L36)

One reading of a disputed key, with everyone who reported it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-excerpt"></a> `excerpt` | `string` | The first sentence that asserted it, whitespace-collapsed and cut to `maxExcerptChars`. An excerpt, never a quotation: it exists so a reader can find the claim, not so a machine can re-parse it. | [packages/core/src/orchestrator/contradictions.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L46) |
| <a id="property-nodeids"></a> `nodeIds` | `string`[] | Children asserting it, in first-seen (spawn) order; never empty. | [packages/core/src/orchestrator/contradictions.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L40) |
| <a id="property-value"></a> `value` | `string` | The value asserted for the key, verbatim after the separator. | [packages/core/src/orchestrator/contradictions.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L38) |
