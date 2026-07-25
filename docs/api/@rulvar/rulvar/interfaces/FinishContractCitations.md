[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishContractCitations

# Interface: FinishContractCitations

Defined in: `packages/core/dist/index.d.ts`

The citation demands of a [FinishContractManifest](/api/@rulvar/rulvar/interfaces/FinishContractManifest.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flags"></a> `flags?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-min"></a> `min?` | `number` | Total matches required across the whole result text. | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern?` | `string` | Regex source over the result text; default [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_PATTERN.md). | `packages/core/dist/index.d.ts` |
| <a id="property-persection"></a> `perSection?` | `number` | Matches required inside EVERY declared section; requires `sections`. | `packages/core/dist/index.d.ts` |
| <a id="property-sample"></a> `sample?` | `string` | A literal string matching `pattern`, embedded in the golden fixtures (a regex cannot be sampled mechanically). REQUIRED with a custom pattern; defaults to [DEFAULT\_CITATION\_SAMPLE](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_SAMPLE.md) for the default pattern. Must contain no whitespace and no declared section marker. | `packages/core/dist/index.d.ts` |
