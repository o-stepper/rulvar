[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / shouldCompact

# Function: shouldCompact()

```ts
function shouldCompact(options): boolean;
```

Defined in: [packages/core/src/runtime/compaction.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/compaction.ts#L34)

The threshold check (docs/06, M4-T03 committed semantics): the context
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
