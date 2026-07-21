[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / retryClassOf

# Function: retryClassOf()

```ts
function retryClassOf(error): 
  | RetryClass
  | undefined;
```

Defined in: [packages/core/src/model/retry.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L45)

Classifies a WireError for the retry engine. Task-class failures are
never retryable by construction: adapters mark them retryable: false
and this returns undefined. The kind travels in WireError.data.kind;
anything retryable without a specific kind is transport.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) |

## Returns

  \| [`RetryClass`](/api/@rulvar/core/type-aliases/RetryClass.md)
  \| `undefined`
