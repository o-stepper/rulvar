[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / failoverTriggerOf

# Function: failoverTriggerOf()

```ts
function failoverTriggerOf(retryClass): 
  | FailoverTrigger
  | undefined;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Maps a retry class to its failover trigger once retries exhaust.
Overloaded (529) is transport-class for failover purposes; a
non-retryable error never fails over.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `retryClass` | \| [`RetryClass`](/api/@rulvar/rulvar/type-aliases/RetryClass.md) \| `undefined` |

## Returns

  \| [`FailoverTrigger`](/api/@rulvar/rulvar/type-aliases/FailoverTrigger.md)
  \| `undefined`
