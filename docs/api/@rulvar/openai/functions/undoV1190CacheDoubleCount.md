[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / undoV1190CacheDoubleCount

# Function: undoV1190CacheDoubleCount()

```ts
function undoV1190CacheDoubleCount(usage): Usage;
```

Defined in: [packages/openai/src/audit.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/audit.ts#L34)

The exact inverse of the v1.19.0 double count for one usage:
subtracts `cacheWriteTokens` back out of `inputTokens` and leaves
every other field untouched. A usage without cache writes is returned
unchanged (v1.19.0 recorded those correctly). Throws a typed
ConfigError when the arithmetic cannot be the v1.19.0 shape (the
recorded input has no room for the subtraction), which means the
usage was NOT recorded by the affected adapter; do not guess.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)
