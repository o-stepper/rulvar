[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / stripFencedBlocks

# Function: stripFencedBlocks()

```ts
function stripFencedBlocks(text): string;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L133)

Removes fenced code blocks from a text, the delimiter lines
included, and returns the remaining lines joined by newlines. The
grammar is the CommonMark shape as a deliberate line heuristic: a
fence opens at a line starting (after at most three spaces) with
three or more backticks or tildes, an optional info string allowed;
it closes at the next line carrying only at least as many of the
SAME character; an unclosed fence runs to the end of the text.
Indented (four space) code blocks are not treated as code. This is
the exact exclusion the `fencedCode: 'excluded'` validator option
applies, exported so custom host validators can stay symmetric.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

## Returns

`string`
