[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IncrementalSynthesisResult

# Interface: IncrementalSynthesisResult

Defined in: [packages/core/src/orchestrator/orchestrate.ts:1991](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1991)

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
| <a id="property-draft"></a> `draft` | `unknown` | [packages/core/src/orchestrator/orchestrate.ts:1993](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1993) |
| <a id="property-repeatedclaims"></a> `repeatedClaims?` | [`RepeatedClaim`](/api/@rulvar/core/interfaces/RepeatedClaim.md)[] | [packages/core/src/orchestrator/orchestrate.ts:2003](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L2003) |
| <a id="property-sections"></a> `sections` | \{ `logicalTaskId`: `string`; `nodeId`: `string`; `note`: `string`; `noteStatus`: `string`; `status`: `string`; \}[] | [packages/core/src/orchestrator/orchestrate.ts:1994](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1994) |
| <a id="property-synthesis"></a> `synthesis` | `"incremental"` | [packages/core/src/orchestrator/orchestrate.ts:1992](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1992) |
