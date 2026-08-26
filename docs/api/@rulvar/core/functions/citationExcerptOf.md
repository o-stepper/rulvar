[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / citationExcerptOf

# Function: citationExcerptOf()

```ts
function citationExcerptOf(
   resolve, 
   row, 
   window): string | undefined;
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:447](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L447)

Resolves one sampled citation's excerpt through the host's pure
snapshot resolver. The FIRST cited line failing to resolve returns
undefined (an unsupported citation by doctrine); later lines simply
end the excerpt (a range past the file's end reads as far as the
snapshot goes).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `resolve` | (`target`) => `string` \| `undefined` |
| `row` | `Pick`\&lt;[`CitationAuditRow`](/api/@rulvar/core/interfaces/CitationAuditRow.md), `"path"` \| `"line"` \| `"endLine"`\&gt; |
| `window` | `number` |

## Returns

`string` \| `undefined`
