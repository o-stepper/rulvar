[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SpawnLineageOpt

# Interface: SpawnLineageOpt

Defined in: `packages/core/dist/index.d.ts`

The spawn-options lineage block (ctx.agent, ctx.workflow, spawn_agent, add_task).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-causeref"></a> `causeRef` | `number` | Seq of the journal entry that caused the rebirth; mandatory. | `packages/core/dist/index.d.ts` |
| <a id="property-continues"></a> `continues` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-relation"></a> `relation?` | `"respawn"` \| `"rung-retry"` \| `"decompose-child"` \| `"unpark-restart"` | Default 'respawn'. | `packages/core/dist/index.d.ts` |
