[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / atCompactionThreshold

# Function: atCompactionThreshold()

```ts
function atCompactionThreshold(
   usedTokens, 
   contextWindow, 
   threshold): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

The summarize trigger: the compaction threshold on the context window
(default 0.8). Pure predicate; the compaction
pipeline that acts on it is M4-T03.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usedTokens` | `number` |
| `contextWindow` | `number` |
| `threshold` | `number` |

## Returns

`boolean`
