[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / matchArgvPattern

# Function: matchArgvPattern()

```ts
function matchArgvPattern(pattern, argv): boolean;
```

Defined in: [packages/core/src/tools/shell-matcher.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/shell-matcher.ts#L179)

Pattern grammar (5.1): literal words match one identical token; `*`
matches exactly one token; `**` matches zero or more remaining tokens
and may appear only as the final word. A pattern matches only if it
consumes the segment's ENTIRE argv.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pattern` | `string` |
| `argv` | `string`[] |

## Returns

`boolean`
