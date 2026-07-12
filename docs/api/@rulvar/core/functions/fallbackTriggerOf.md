[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / fallbackTriggerOf

# Function: fallbackTriggerOf()

```ts
function fallbackTriggerOf(outcome): 
  | FallbackTrigger
  | undefined;
```

Defined in: [packages/core/src/model/failover.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/failover.ts#L81)

Classifies a terminal agent outcome for the degenerate fallback
(docs/04, 11.3 as amended): schema-mismatch errors are
'schema-exhausted'; any other error is 'error'; limit terminals (the
no-progress abort included) are 'limit'; cancelled, escalated, and
skipped never trigger.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outcome` | \{ `error?`: `Pick`\&lt;[`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md), `"kind"`\&gt;; `status`: `string`; \} |
| `outcome.error?` | `Pick`\&lt;[`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md), `"kind"`\&gt; |
| `outcome.status` | `string` |

## Returns

  \| [`FallbackTrigger`](/api/@rulvar/core/type-aliases/FallbackTrigger.md)
  \| `undefined`
