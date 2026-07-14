[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / fallbackTriggerOf

# Function: fallbackTriggerOf()

```ts
function fallbackTriggerOf(outcome): 
  | FallbackTrigger
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Classifies a terminal agent outcome for the degenerate fallback:
schema-mismatch errors are
'schema-exhausted'; any other error is 'error'; limit terminals (the
no-progress abort included) are 'limit'; cancelled, escalated, and
skipped never trigger.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outcome` | \{ `error?`: `Pick`\&lt;[`AgentError`](/api/@rulvar/rulvar/type-aliases/AgentError.md), `"kind"`\&gt;; `status`: `string`; \} |
| `outcome.error?` | `Pick`\&lt;[`AgentError`](/api/@rulvar/rulvar/type-aliases/AgentError.md), `"kind"`\&gt; |
| `outcome.status` | `string` |

## Returns

  \| [`FallbackTrigger`](/api/@rulvar/rulvar/type-aliases/FallbackTrigger.md)
  \| `undefined`
