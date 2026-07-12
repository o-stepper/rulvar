[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / atCompactionThreshold

# Function: atCompactionThreshold()

```ts
function atCompactionThreshold(
   usedTokens, 
   contextWindow, 
   threshold): boolean;
```

Defined in: [packages/core/src/model/roles.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L109)

The summarize trigger: the compaction threshold on the context window
(docs/06, Appendix A: default 0.8). Pure predicate; the compaction
pipeline that acts on it is M4-T03.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usedTokens` | `number` |
| `contextWindow` | `number` |
| `threshold` | `number` |

## Returns

`boolean`
