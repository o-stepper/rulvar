[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnLineageOpt

# Interface: SpawnLineageOpt

Defined in: [packages/core/src/journal/lineage.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L97)

The spawn-options lineage block (ctx.agent, ctx.workflow, spawn_agent, add_task).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-causeref"></a> `causeRef` | `number` | Seq of the journal entry that caused the rebirth; mandatory. | [packages/core/src/journal/lineage.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L102) |
| <a id="property-continues"></a> `continues` | `string` | - | [packages/core/src/journal/lineage.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L98) |
| <a id="property-relation"></a> `relation?` | `"respawn"` \| `"rung-retry"` \| `"decompose-child"` \| `"unpark-restart"` | Default 'respawn'. | [packages/core/src/journal/lineage.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L100) |
