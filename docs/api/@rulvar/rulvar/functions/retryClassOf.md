[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / retryClassOf

# Function: retryClassOf()

```ts
function retryClassOf(error): 
  | RetryClass
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Classifies a WireError for the retry engine. Task-class failures are
never retryable by construction: adapters mark them retryable: false
and this returns undefined. The kind travels in WireError.data.kind;
anything retryable without a specific kind is transport.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) |

## Returns

  \| [`RetryClass`](/api/@rulvar/rulvar/type-aliases/RetryClass.md)
  \| `undefined`
