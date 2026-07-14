[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / classifyAgentError

# Function: classifyAgentError()

```ts
function classifyAgentError(e): ErrorClass;
```

Defined in: [packages/core/src/journal/disposition.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/disposition.ts#L30)

task-class: schema-mismatch, terminal, non-retryable tool. transport,
rate-limit, and budget are never memoized.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | [`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md) |

## Returns

[`ErrorClass`](/api/@rulvar/core/type-aliases/ErrorClass.md)
