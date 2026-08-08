[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishContractCitations

# Interface: FinishContractCitations

Defined in: [packages/core/src/orchestrator/output-contract.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L36)

The citation demands of a [FinishContractManifest](/api/@rulvar/core/interfaces/FinishContractManifest.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flags"></a> `flags?` | `string` | - | [packages/core/src/orchestrator/output-contract.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L39) |
| <a id="property-min"></a> `min?` | `number` | Total matches required across the whole result text. | [packages/core/src/orchestrator/output-contract.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L41) |
| <a id="property-pattern"></a> `pattern?` | `string` | Regex source over the result text; default [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md). | [packages/core/src/orchestrator/output-contract.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L38) |
| <a id="property-persection"></a> `perSection?` | `number` | Matches required inside EVERY declared section; requires `sections`. | [packages/core/src/orchestrator/output-contract.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L43) |
| <a id="property-sample"></a> `sample?` | `string` | A literal string matching `pattern`, embedded in the golden fixtures (a regex cannot be sampled mechanically). REQUIRED with a custom pattern; defaults to [DEFAULT\_CITATION\_SAMPLE](/api/@rulvar/core/variables/DEFAULT_CITATION_SAMPLE.md) for the default pattern. Must contain no whitespace and no declared section marker. | [packages/core/src/orchestrator/output-contract.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L51) |
