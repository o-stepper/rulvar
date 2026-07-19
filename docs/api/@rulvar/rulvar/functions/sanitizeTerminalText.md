[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sanitizeTerminalText

# Function: sanitizeTerminalText()

```ts
function sanitizeTerminalText(text): string;
```

Defined in: `packages/core/dist/index.d.ts`

Neutralizes terminal control sequences and control characters in one
untrusted string, collapsing each remaining control run to a single
space so a value can never inject a newline, an escape sequence, or a
hidden byte into a rendered line. Visible text is preserved.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

## Returns

`string`
