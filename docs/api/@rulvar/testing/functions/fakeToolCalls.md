[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / fakeToolCalls

# Function: fakeToolCalls()

```ts
function fakeToolCalls(...calls): FakeToolCallsValue;
```

Defined in: [packages/testing/src/fake-adapter.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L43)

Scripts a tool-calling turn from a responder.

## Parameters

| Parameter | Type |
| ------ | ------ |
| ...`calls` | \{ `args`: `unknown`; `name`: `string`; \}[] |

## Returns

[`FakeToolCallsValue`](/api/@rulvar/testing/interfaces/FakeToolCallsValue.md)
