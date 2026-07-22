[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishValidationChild

# Interface: FinishValidationChild

Defined in: `packages/core/dist/index.d.ts`

One child as the finish validators see it (the RV-202 provenance
contract): a pure read of the durable state the orchestrator already
tracks, identical live and on replay.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-handle"></a> `handle` | `readonly` | `number` | The spawn handle (the journal seq, stable across resume). | `packages/core/dist/index.d.ts` |
| <a id="property-nodeid"></a> `nodeId` | `readonly` | `string` | The child's node identity, the same one acceptance reasons use. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `readonly` | `string` | The terminal status, or 'running' for a child unsettled at finish time. | `packages/core/dist/index.d.ts` |
| <a id="property-text"></a> `text` | `readonly` | `string` | The child's full output serialized (a raw string verbatim, anything else JSON; a failed child's errorMessage), '' while unsettled. The same serialization the child result evidence tools page. | `packages/core/dist/index.d.ts` |
