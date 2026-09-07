[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResearchEvidenceEntry

# Interface: ResearchEvidenceEntry

Defined in: [packages/core/src/tools/research.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L66)

One verified evidence entry recorded by `record_evidence`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claim"></a> `claim` | `string` | - | [packages/core/src/tools/research.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L67) |
| <a id="property-file"></a> `file` | `string` | Root-relative POSIX path, verified to exist at record time. | [packages/core/src/tools/research.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L69) |
| <a id="property-lines"></a> `lines?` | `string` | 'N' or 'N-M', 1-based, verified inside the file's line count. | [packages/core/src/tools/research.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L71) |
| <a id="property-quote"></a> `quote?` | `string` | Verified verbatim substring of the file at record time. | [packages/core/src/tools/research.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L73) |
