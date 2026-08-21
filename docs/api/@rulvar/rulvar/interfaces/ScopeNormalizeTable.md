[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ScopeNormalizeTable

# Interface: ScopeNormalizeTable

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-fields"></a> `fields` | `Partial`\&lt;`Record`\&lt;[`ExecutionScopeField`](/api/@rulvar/rulvar/type-aliases/ExecutionScopeField.md), readonly [`ScopeNormalizeOp`](/api/@rulvar/rulvar/type-aliases/ScopeNormalizeOp.md)[]\&gt;\&gt; | Per-dimension operation lists, applied in array order. | `packages/core/dist/index.d.ts` |
| <a id="property-version"></a> `version` | `1` | - | `packages/core/dist/index.d.ts` |
