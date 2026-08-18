[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / citationExcerptOf

# Function: citationExcerptOf()

```ts
function citationExcerptOf(
   resolve, 
   row, 
   window): string | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Resolves one sampled citation's excerpt through the host's pure
snapshot resolver. The FIRST cited line failing to resolve returns
undefined (an unsupported citation by doctrine); later lines simply
end the excerpt (a range past the file's end reads as far as the
snapshot goes).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `resolve` | (`target`) => `string` \| `undefined` |
| `row` | `Pick`\&lt;[`CitationAuditRow`](/api/@rulvar/rulvar/interfaces/CitationAuditRow.md), `"path"` \| `"line"` \| `"endLine"`\&gt; |
| `window` | `number` |

## Returns

`string` \| `undefined`
