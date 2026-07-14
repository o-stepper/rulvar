[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CollectedTurn

# Interface: CollectedTurn

Defined in: [packages/core/src/runtime/structured-output.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/structured-output.ts#L59)

One collected model turn, assembled from the stream by the agent loop.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-text"></a> `text` | `string` | [packages/core/src/runtime/structured-output.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/structured-output.ts#L60) |
| <a id="property-toolcalls"></a> `toolCalls` | \{ `args`: `unknown`; `id`: `string`; `name`: `string`; \}[] | [packages/core/src/runtime/structured-output.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/structured-output.ts#L61) |
