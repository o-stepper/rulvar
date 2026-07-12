[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalOperation

# Interface: JournalOperation

Defined in: [packages/core/src/journal/matching.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L22)

One logical journaled operation: its dispatch entry plus its terminal, when present.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-running"></a> `running` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) | [packages/core/src/journal/matching.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L23) |
| <a id="property-terminal"></a> `terminal?` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) | [packages/core/src/journal/matching.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L24) |
