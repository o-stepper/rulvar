[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CheckpointState

# Interface: CheckpointState

Defined in: [packages/core/src/journal/checkpoint.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L34)

The canonical-history snapshot at a turn boundary.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-compaction"></a> `compaction` | `number`[] | Compaction points; producers arrive with M4-T03. | [packages/core/src/journal/checkpoint.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L62) |
| <a id="property-messages"></a> `messages` | [`Msg`](/api/@rulvar/core/interfaces/Msg.md)[] | Canonical history up to and including the boundary. | [packages/core/src/journal/checkpoint.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L37) |
| <a id="property-pending"></a> `pending?` | [`PendingToolTurn`](/api/@rulvar/core/interfaces/PendingToolTurn.md) | Present while an ask suspension holds the turn open (M3-T03). | [packages/core/src/journal/checkpoint.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L64) |
| <a id="property-providercalls"></a> `providerCalls?` | [`ProviderCallRecord`](/api/@rulvar/core/interfaces/ProviderCallRecord.md)[] | The per-dispatch reconciliation ledger so far (P1.3), carried at every boundary so a kill-and-resume keeps pre-kill wire calls attributable. Absent before the first call and on checkpoints written before the ledger shipped: those restore none, and the invoice fold surfaces the restored usage as an unattributed remainder instead of losing it. | [packages/core/src/journal/checkpoint.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L58) |
| <a id="property-schemaattempts"></a> `schemaAttempts` | `number` | - | [packages/core/src/journal/checkpoint.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L60) |
| <a id="property-toolcallsused"></a> `toolCallsUsed` | `number` | - | [packages/core/src/journal/checkpoint.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L59) |
| <a id="property-turns"></a> `turns` | `number` | Model turns already paid. | [packages/core/src/journal/checkpoint.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L39) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | Usage accumulated so far (not yet journaled: terminals carry totals). | [packages/core/src/journal/checkpoint.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L41) |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | The same usage split by serving model, so a dangling redispatch restores the per-model breakdown instead of collapsing every paid turn onto the loop model. Absent on checkpoints written before the split shipped: those restore the aggregate against the loop model, exactly as they did then. | [packages/core/src/journal/checkpoint.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L49) |
| <a id="property-v"></a> `v` | `1` | - | [packages/core/src/journal/checkpoint.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L35) |
