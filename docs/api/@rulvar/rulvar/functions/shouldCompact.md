[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / shouldCompact

# Function: shouldCompact()

```ts
function shouldCompact(options): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

The threshold check (M4-T03 committed semantics): the context
estimate is the last loop turn's inputTokens + outputTokens; the Usage
invariant makes inputTokens the full prompt, and the turn's output
joins the next prompt.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `contextWindow`: `number`; `lastTurnUsage`: \{ `inputTokens`: `number`; `outputTokens`: `number`; \}; `threshold?`: `number`; \} |
| `options.contextWindow` | `number` |
| `options.lastTurnUsage` | \{ `inputTokens`: `number`; `outputTokens`: `number`; \} |
| `options.lastTurnUsage.inputTokens` | `number` |
| `options.lastTurnUsage.outputTokens` | `number` |
| `options.threshold?` | `number` |

## Returns

`boolean`
