[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PendingToolTurn

# Interface: PendingToolTurn

Defined in: [packages/core/src/journal/checkpoint.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L24)

Mid-turn suspension state (M3-T03): the turn's already-executed tool
results plus the call awaiting an approval resolution, so resume
continues the SAME turn without re-running executed tools.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-awaiting"></a> `awaiting` | \{ `args`: `unknown`; `id`: `string`; `name`: `string`; \} | The model-issued call whose ask verdict suspended the turn. | [packages/core/src/journal/checkpoint.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L28) |
| `awaiting.args` | `unknown` | - | [packages/core/src/journal/checkpoint.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L28) |
| `awaiting.id` | `string` | - | [packages/core/src/journal/checkpoint.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L28) |
| `awaiting.name` | `string` | - | [packages/core/src/journal/checkpoint.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L28) |
| <a id="property-executed"></a> `executed` | \{ `id`: `string`; `isError?`: `boolean`; `name`: `string`; `result`: `unknown`; \}[] | tool-result parts already produced this turn, in execution order. | [packages/core/src/journal/checkpoint.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L26) |
| <a id="property-remaining"></a> `remaining` | \{ `args`: `unknown`; `id`: `string`; `name`: `string`; \}[] | Calls after the awaiting one, still to execute on resume. | [packages/core/src/journal/checkpoint.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/checkpoint.ts#L30) |
