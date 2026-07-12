[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / formatRePrompt

# Function: formatRePrompt()

```ts
function formatRePrompt(
   issues, 
   attempt, 
   maxAttempts): Msg;
```

Defined in: `packages/core/dist/index.d.ts`

The bounded re-prompt message sent back to the model on a validation miss.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `issues` | [`Issue`](/api/@rulvar/rulvar/type-aliases/Issue.md)[] |
| `attempt` | `number` |
| `maxAttempts` | `number` |

## Returns

[`Msg`](/api/@rulvar/rulvar/interfaces/Msg.md)
