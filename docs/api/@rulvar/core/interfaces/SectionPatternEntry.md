[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SectionPatternEntry

# Interface: SectionPatternEntry

Defined in: [packages/core/src/orchestrator/finish-validators.ts:778](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L778)

One counted per-section pattern demand of
[sectionPatternCountValidator](/api/@rulvar/core/functions/sectionPatternCountValidator.md) (RV2206).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flags"></a> `flags?` | `string` | - | [packages/core/src/orchestrator/finish-validators.ts:788](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L788) |
| <a id="property-label"></a> `label?` | `string` | Short human name for reasons (e.g. 'numbered negative scenarios'). | [packages/core/src/orchestrator/finish-validators.ts:792](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L792) |
| <a id="property-min"></a> `min` | `number` | Matches (distinct captures when capturing) required in the slice. | [packages/core/src/orchestrator/finish-validators.ts:790](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L790) |
| <a id="property-pattern"></a> `pattern` | `string` | Regex source. A capture group makes the count DISTINCT by the first capture (the parity contract's N01..N48 ids count once each, however often an id repeats); without a capture the raw match count applies. | [packages/core/src/orchestrator/finish-validators.ts:787](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L787) |
| <a id="property-section"></a> `section` | `string` | The section marker the demand binds to. | [packages/core/src/orchestrator/finish-validators.ts:780](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L780) |
