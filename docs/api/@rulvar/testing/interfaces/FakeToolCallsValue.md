[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / FakeToolCallsValue

# Interface: FakeToolCallsValue

Defined in: [packages/testing/src/fake-adapter.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L37)

Marker value: the model answers this turn with tool calls (M3).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-__fake"></a> `__fake` | `"tool-calls"` | [packages/testing/src/fake-adapter.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L38) |
| <a id="property-calls"></a> `calls` | \{ `args`: `unknown`; `name`: `string`; \}[] | [packages/testing/src/fake-adapter.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L39) |
