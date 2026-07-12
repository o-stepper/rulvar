[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / matchArgvPattern

# Function: matchArgvPattern()

```ts
function matchArgvPattern(pattern, argv): boolean;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

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
