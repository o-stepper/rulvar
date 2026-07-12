[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / fakeWireError

# Function: fakeWireError()

```ts
function fakeWireError(error): FakeWireErrorValue;
```

Defined in: [packages/testing/src/fake-adapter.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L53)

Scripts a typed wire failure (e.g. a retryable rate limit).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) |

## Returns

[`FakeWireErrorValue`](/api/@rulvar/testing/interfaces/FakeWireErrorValue.md)
