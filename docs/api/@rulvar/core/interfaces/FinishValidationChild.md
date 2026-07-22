[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishValidationChild

# Interface: FinishValidationChild

Defined in: [packages/core/src/orchestrator/finish-validators.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L20)

One child as the finish validators see it (the RV-202 provenance
contract): a pure read of the durable state the orchestrator already
tracks, identical live and on replay.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-handle"></a> `handle` | `readonly` | `number` | The spawn handle (the journal seq, stable across resume). | [packages/core/src/orchestrator/finish-validators.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L22) |
| <a id="property-nodeid"></a> `nodeId` | `readonly` | `string` | The child's node identity, the same one acceptance reasons use. | [packages/core/src/orchestrator/finish-validators.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L24) |
| <a id="property-status"></a> `status` | `readonly` | `string` | The terminal status, or 'running' for a child unsettled at finish time. | [packages/core/src/orchestrator/finish-validators.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L26) |
| <a id="property-text"></a> `text` | `readonly` | `string` | The child's full output serialized (a raw string verbatim, anything else JSON; a failed child's errorMessage), '' while unsettled. The same serialization the child result evidence tools page. | [packages/core/src/orchestrator/finish-validators.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L32) |
