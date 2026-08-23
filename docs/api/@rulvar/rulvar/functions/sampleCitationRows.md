[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sampleCitationRows

# Function: sampleCitationRows()

```ts
function sampleCitationRows(
   document, 
   plan, 
   seed): Omit<CitationAuditRow, "excerpt">[];
```

Defined in: `packages/core/dist/index.d.ts`

The deterministic stratified sample (RV4004): per H2 section, up to
`samplePerSection` citing sentences, selected by a hash chain seeded
from the audited document's own hash, so the same candidate always
yields the same sample (replay-stable, no clock, no randomness) and
a repaired candidate re-samples afresh from its new hash. The whole
sample is capped at `maxSampled` by pick rank across sections (every
section's first pick seats before any section's second), so a
many-section document degrades to one citation per section instead
of auditing the first sections only.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `document` | `string` |
| `plan` | \{ `auditScope?`: `"sample"` \| `"all"`; `maxSampled`: `number`; `pattern`: `string`; `resolver?`: `2` \| `1`; `samplePerSection`: `number`; \} |
| `plan.auditScope?` | `"sample"` \| `"all"` |
| `plan.maxSampled` | `number` |
| `plan.pattern` | `string` |
| `plan.resolver?` | `2` \| `1` |
| `plan.samplePerSection` | `number` |
| `seed` | `string` |

## Returns

`Omit`\&lt;[`CitationAuditRow`](/api/@rulvar/rulvar/interfaces/CitationAuditRow.md), `"excerpt"`\&gt;[]
