[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / ladderTriggerOf

# Function: ladderTriggerOf()

```ts
function ladderTriggerOf(settled): "no-progress" | "error" | "limit" | "schema-exhausted" | undefined;
```

Defined in: [packages/plan/src/ladder.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L92)

Classifies a settled attempt into the typed transition trigger:
schema-mismatch errors are 'schema-exhausted';
the engine's no-progress abort is first-class 'no-progress' (it rides
status 'limit' with the dedicated abort class, distinct from user
cancellation by construction); cancelled, escalated, and skipped never
trigger. 'verify-failed' comes from the acceptance gates, never from
the terminal status.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `settled` | `Pick`\&lt;[`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt;, `"status"`\&gt; & \{ `abortClass?`: `string`; `error?`: \{ `kind?`: `string`; \}; \} |

## Returns

`"no-progress"` \| `"error"` \| `"limit"` \| `"schema-exhausted"` \| `undefined`
