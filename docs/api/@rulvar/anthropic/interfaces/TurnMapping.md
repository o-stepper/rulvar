[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / TurnMapping

# Interface: TurnMapping

Defined in: [packages/anthropic/src/wire.ts:436](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L436)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-assistantcontent"></a> `assistantContent` | [`Block`](/api/@rulvar/anthropic/type-aliases/Block.md)[] | Assistant content blocks collected verbatim (pause_turn continuation). | [packages/anthropic/src/wire.ts:438](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L438) |
| <a id="property-finished"></a> `finished` | `boolean` | - | [packages/anthropic/src/wire.ts:440](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L440) |
| <a id="property-pauseturn"></a> `pauseTurn` | `boolean` | - | [packages/anthropic/src/wire.ts:439](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L439) |
| <a id="property-responseid"></a> `responseId?` | `string` | The segment's provider message id, captured for paused and finished segments alike so the adapter can account every wire request of a pause_turn absorption (RV905). | [packages/anthropic/src/wire.ts:446](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L446) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | The SEGMENT's own normalized usage (RV1003): a paused segment yields no finish, so this is how its counts reach the adapter's whole-turn accumulation. The terminal finish EVENT carries the turn total (usagePrior folded in); this field stays segment-only. | [packages/anthropic/src/wire.ts:453](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L453) |
