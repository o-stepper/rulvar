[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / failoverTriggerOf

# Function: failoverTriggerOf()

```ts
function failoverTriggerOf(retryClass): 
  | FailoverTrigger
  | undefined;
```

Defined in: [packages/core/src/model/failover.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/failover.ts#L39)

Maps a retry class to its failover trigger once retries exhaust.
Overloaded (529) is transport-class for failover purposes; a
non-retryable error never fails over.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `retryClass` | \| [`RetryClass`](/api/@rulvar/core/type-aliases/RetryClass.md) \| `undefined` |

## Returns

  \| [`FailoverTrigger`](/api/@rulvar/core/type-aliases/FailoverTrigger.md)
  \| `undefined`
