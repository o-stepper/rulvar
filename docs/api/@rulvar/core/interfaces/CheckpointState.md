[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CheckpointState

# Interface: CheckpointState

Defined in: [packages/core/src/journal/checkpoint.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L33)

The canonical-history snapshot at a turn boundary.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-compaction"></a> `compaction` | `number`[] | Compaction points; producers arrive with M4-T03. | [packages/core/src/journal/checkpoint.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L44) |
| <a id="property-messages"></a> `messages` | [`Msg`](/api/@rulvar/core/interfaces/Msg.md)[] | Canonical history up to and including the boundary. | [packages/core/src/journal/checkpoint.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L36) |
| <a id="property-pending"></a> `pending?` | [`PendingToolTurn`](/api/@rulvar/core/interfaces/PendingToolTurn.md) | Present while an ask suspension holds the turn open (M3-T03). | [packages/core/src/journal/checkpoint.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L46) |
| <a id="property-schemaattempts"></a> `schemaAttempts` | `number` | - | [packages/core/src/journal/checkpoint.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L42) |
| <a id="property-toolcallsused"></a> `toolCallsUsed` | `number` | - | [packages/core/src/journal/checkpoint.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L41) |
| <a id="property-turns"></a> `turns` | `number` | Model turns already paid. | [packages/core/src/journal/checkpoint.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L38) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | Usage accumulated so far (not yet journaled: terminals carry totals). | [packages/core/src/journal/checkpoint.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L40) |
| <a id="property-v"></a> `v` | `1` | - | [packages/core/src/journal/checkpoint.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L34) |
