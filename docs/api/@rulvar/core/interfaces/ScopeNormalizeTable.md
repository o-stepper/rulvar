[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ScopeNormalizeTable

# Interface: ScopeNormalizeTable

Defined in: [packages/core/src/engine/engine.ts:909](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L909)

The declarative scope value normalization table (RV4302, deferred
from RV4205): without it, `Region` and `region` values produce two
digests for one identity, splitting quota buckets and FinOps joins.
Versioned so a future vocabulary is a new declared shape, never a
silent reinterpretation; JCS-serializable by construction, so the
genesis decision journals it verbatim and resume compares canonical
bytes. Applied strictly AFTER the existing per-field validation,
with the result re-validated by the same rule.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fields"></a> `fields` | `Partial`\&lt;`Record`\&lt;[`ExecutionScopeField`](/api/@rulvar/core/type-aliases/ExecutionScopeField.md), readonly [`ScopeNormalizeOp`](/api/@rulvar/core/type-aliases/ScopeNormalizeOp.md)[]\&gt;\&gt; | Per-dimension operation lists, applied in array order. | [packages/core/src/engine/engine.ts:912](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L912) |
| <a id="property-version"></a> `version` | `1` | - | [packages/core/src/engine/engine.ts:910](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L910) |
