[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PendingToolTurn

# Interface: PendingToolTurn

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Mid-turn suspension state (M3-T03): the turn's already-executed tool
results plus the call awaiting an approval resolution, so resume
continues the SAME turn without re-running executed tools.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-awaiting"></a> `awaiting` | \{ `args`: `unknown`; `id`: `string`; `name`: `string`; \} | The model-issued call whose ask verdict suspended the turn. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `awaiting.args` | `unknown` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `awaiting.id` | `string` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `awaiting.name` | `string` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-executed"></a> `executed` | \{ `id`: `string`; `isError?`: `boolean`; `name`: `string`; `result`: `unknown`; \}[] | tool-result parts already produced this turn, in execution order. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-remaining"></a> `remaining` | \{ `args`: `unknown`; `id`: `string`; `name`: `string`; \}[] | Calls after the awaiting one, still to execute on resume. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
