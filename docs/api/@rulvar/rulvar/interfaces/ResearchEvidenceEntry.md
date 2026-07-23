[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResearchEvidenceEntry

# Interface: ResearchEvidenceEntry

Defined in: `packages/core/dist/index.d.ts`

One verified evidence entry recorded by `record_evidence`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claim"></a> `claim` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-file"></a> `file` | `string` | Root-relative POSIX path, verified to exist at record time. | `packages/core/dist/index.d.ts` |
| <a id="property-lines"></a> `lines?` | `string` | 'N' or 'N-M', 1-based, verified inside the file's line count. | `packages/core/dist/index.d.ts` |
| <a id="property-quote"></a> `quote?` | `string` | Verified verbatim substring of the file at record time. | `packages/core/dist/index.d.ts` |
