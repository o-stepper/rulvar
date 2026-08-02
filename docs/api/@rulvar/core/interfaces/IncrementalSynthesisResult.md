[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IncrementalSynthesisResult

# Interface: IncrementalSynthesisResult

Defined in: [packages/core/src/orchestrator/orchestrate.ts:800](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L800)

The deterministic reconciliation envelope an 'incremental' synthesis
returns as the run result (RV-211 remainder): the coordination draft
plus one section per settled child in spawn order, each carrying the
child's terminal status and its note (the note invocation's finish
output, or the child's raw digest summary when the note fell back).
With `dedupeClaims`, repeated claim lines keep their first occurrence
only and the `repeatedClaims` index lists each with its reporters.
Everything here derives from journaled state, so a resume reproduces
the envelope byte for byte with zero paid calls.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-draft"></a> `draft` | `unknown` | [packages/core/src/orchestrator/orchestrate.ts:802](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L802) |
| <a id="property-repeatedclaims"></a> `repeatedClaims?` | [`RepeatedClaim`](/api/@rulvar/core/interfaces/RepeatedClaim.md)[] | [packages/core/src/orchestrator/orchestrate.ts:812](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L812) |
| <a id="property-sections"></a> `sections` | \{ `logicalTaskId`: `string`; `nodeId`: `string`; `note`: `string`; `noteStatus`: `string`; `status`: `string`; \}[] | [packages/core/src/orchestrator/orchestrate.ts:803](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L803) |
| <a id="property-synthesis"></a> `synthesis` | `"incremental"` | [packages/core/src/orchestrator/orchestrate.ts:801](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L801) |
