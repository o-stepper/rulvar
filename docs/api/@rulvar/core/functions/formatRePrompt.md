[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / formatRePrompt

# Function: formatRePrompt()

```ts
function formatRePrompt(
   issues, 
   attempt, 
   maxAttempts): Msg;
```

Defined in: [packages/core/src/runtime/structured-output.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/structured-output.ts#L131)

The bounded re-prompt message sent back to the model on a validation miss.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `issues` | [`Issue`](/api/@rulvar/core/type-aliases/Issue.md)[] |
| `attempt` | `number` |
| `maxAttempts` | `number` |

## Returns

[`Msg`](/api/@rulvar/core/interfaces/Msg.md)
