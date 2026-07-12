[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / FakeToolCallsValue

# Interface: FakeToolCallsValue

Defined in: [packages/testing/src/fake-adapter.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L34)

Marker value: the model answers this turn with tool calls (M3).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-__fake"></a> `__fake` | `"tool-calls"` | [packages/testing/src/fake-adapter.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L35) |
| <a id="property-calls"></a> `calls` | \{ `args`: `unknown`; `name`: `string`; \}[] | [packages/testing/src/fake-adapter.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L36) |
