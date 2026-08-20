[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunFactPairOptions

# Interface: RunFactPairOptions

Defined in: [packages/core/src/orchestrator/consistency.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L516)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-max"></a> `max?` | `number` | Bound on returned pairs; default [DEFAULT\_MAX\_RUN\_FACT\_PAIRS](/api/@rulvar/core/variables/DEFAULT_MAX_RUN_FACT_PAIRS.md). | [packages/core/src/orchestrator/consistency.ts:520](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L520) |
| <a id="property-maxexcerptchars"></a> `maxExcerptChars?` | `number` | Bound on the draft excerpt; default [DEFAULT\_MAX\_PAIR\_EXCERPT\_CHARS](/api/@rulvar/core/variables/DEFAULT_MAX_PAIR_EXCERPT_CHARS.md). | [packages/core/src/orchestrator/consistency.ts:522](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L522) |
| <a id="property-terms"></a> `terms?` | readonly `string`[] | Case-insensitive substring triggers, e.g. 'not run' or a locale phrase. | [packages/core/src/orchestrator/consistency.ts:518](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L518) |
