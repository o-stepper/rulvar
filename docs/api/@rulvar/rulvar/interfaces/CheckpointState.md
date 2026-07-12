[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CheckpointState

# Interface: CheckpointState

Defined in: `packages/core/dist/index.d.ts`

The canonical-history snapshot at a turn boundary.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-compaction"></a> `compaction` | `number`[] | Compaction points; producers arrive with M4-T03. | `packages/core/dist/index.d.ts` |
| <a id="property-messages"></a> `messages` | [`Msg`](/api/@rulvar/rulvar/interfaces/Msg.md)[] | Canonical history up to and including the boundary. | `packages/core/dist/index.d.ts` |
| <a id="property-pending"></a> `pending?` | [`PendingToolTurn`](/api/@rulvar/rulvar/interfaces/PendingToolTurn.md) | Present while an ask suspension holds the turn open (M3-T03). | `packages/core/dist/index.d.ts` |
| <a id="property-schemaattempts"></a> `schemaAttempts` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-toolcallsused"></a> `toolCallsUsed` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-turns"></a> `turns` | `number` | Model turns already paid. | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | Usage accumulated so far (not yet journaled: terminals carry totals). | `packages/core/dist/index.d.ts` |
| <a id="property-v"></a> `v` | `1` | - | `packages/core/dist/index.d.ts` |
